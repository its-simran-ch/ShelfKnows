import sys
import os
import time
import urllib.request
import re
import html
import pandas as pd
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure project root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.retrieval.hybrid_engine import HybridRetrievalEngine
from src.reranker.reranker import NeuralReranker
from src.reranker.explainer import RecommendationExplainer
from src.utils.synopsis_enricher import synopsis_enricher

# Initialize FastAPI application
app = FastAPI(
    title="ShelfKnows API",
    description="Production Hybrid AI Book Recommendation & Discovery Engine",
    version="1.0.0"
)

# Allow frontend applications to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
hybrid_engine = None
reranker = None
explainer = None

@app.on_event("startup")
def startup_event():
    """
    Loads all AI models into memory once when the server starts up.
    """
    global hybrid_engine, reranker, explainer
    print("Starting up ShelfKnows Backend Services...")
    hybrid_engine = HybridRetrievalEngine()
    reranker = NeuralReranker()
    explainer = RecommendationExplainer()
    print("All models loaded into memory. Server is ready.")

# --- Pydantic Request & Response Schemas ---

class RecommendationRequest(BaseModel):
    query: str = Field(..., example="books about space exploration and philosophical depth")
    top_k: int = Field(default=5, ge=1, le=20, example=5)
    rerank: bool = Field(default=True, example=True)

class BookResponse(BaseModel):
    book_id: Optional[int] = None
    title: str
    authors: str
    genres: str
    average_rating: float
    description: Optional[str] = None
    image_url: Optional[str] = None
    ai_explanation: Optional[str] = None

class RecommendationResponse(BaseModel):
    query: str
    total_results: int
    latency_ms: float
    recommendations: List[BookResponse]

# --- API Endpoints ---

@app.get("/")
def root():
    return {
        "message": "Welcome to ShelfKnows AI API!",
        "documentation": "/docs"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint to verify backend service status.
    """
    return {
        "status": "healthy",
        "service": "ShelfKnows API",
        "models_loaded": hybrid_engine is not None and reranker is not None
    }

@app.post("/api/recommend", response_model=RecommendationResponse)
def get_recommendations(req: RecommendationRequest):
    """
    End-to-End Recommendation Pipeline:
    1. Stage 1: Fast Hybrid Retrieval (Vector + BM25 + CF + RRF)
    2. Stage 2: Neural Cross-Encoder Reranking
    3. Stage 3: Explainable AI Rationale Generation
    """
    if not hybrid_engine or not reranker or not explainer:
        raise HTTPException(status_code=503, detail="Models are still loading into memory.")

    start_time = time.time()

    try:
        # Stage 1: Fast Hybrid Retrieval (fetch top candidates)
        candidate_pool_size = max(req.top_k * 2, 10)
        candidates = hybrid_engine.search(req.query, top_k=candidate_pool_size)

        if not candidates:
            return RecommendationResponse(
                query=req.query,
                total_results=0,
                latency_ms=round((time.time() - start_time) * 1000, 2),
                recommendations=[]
            )

        # Stage 2: Neural Cross-Encoder Reranking
        if req.rerank:
            final_books = reranker.rerank(req.query, candidates, top_k=req.top_k)
        else:
            final_books = candidates[:req.top_k]

        # Sort recommendations by highest rating first (descending)
        final_books = sorted(
            final_books,
            key=lambda b: float(b.get('average_rating', 0.0) if b.get('average_rating') is not None else 0.0),
            reverse=True
        )

        # Stage 3: Attach Explainable AI Rationale
        explained_books = explainer.attach_explanations(req.query, final_books)

        elapsed_ms = round((time.time() - start_time) * 1000, 2)

        # Format response
        formatted_recommendations = [
            BookResponse(
                book_id=b.get('book_id'),
                title=b.get('title', 'Unknown Title'),
                authors=b.get('authors', 'Unknown Author'),
                genres=b.get('genres', 'Fiction'),
                average_rating=float(b.get('average_rating', 4.0)),
                description=synopsis_enricher.get_synopsis(b),
                image_url=b.get('image_url'),
                ai_explanation=b.get('ai_explanation')
            )
            for b in explained_books
        ]

        return RecommendationResponse(
            query=req.query,
            total_results=len(formatted_recommendations),
            latency_ms=elapsed_ms,
            recommendations=formatted_recommendations
        )
    except Exception as e:
        import traceback
        print("❌ Error in recommendation pipeline:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {str(e)}")

@app.get("/api/authors/popular")
def get_popular_authors(q: Optional[str] = None, limit: int = 80):
    """
    Returns popular authors in the Goodreads dataset with book counts and top genre.
    Supports query parameter 'q' to search authors by name.
    """
    if not hybrid_engine or not hybrid_engine.bm25_engine or hybrid_engine.bm25_engine.df is None:
        raise HTTPException(status_code=503, detail="Dataset is still loading into memory.")

    df = hybrid_engine.bm25_engine.df.drop_duplicates(subset=['title'])

    if q and q.strip():
        search_term = q.strip()
        matched = df[df['authors'].str.contains(search_term, case=False, na=False)]
        matched_authors = matched['authors'].value_counts()
    else:
        matched_authors = df['authors'].value_counts()

    popular_list = []
    for author, count in matched_authors.head(limit).items():
        if not author or pd.isna(author) or str(author).strip() == "":
            continue
        sub = df[df['authors'] == author]
        mode_genre = "Literary Fiction"
        if not sub['genres'].empty:
            genre_modes = sub['genres'].mode()
            if not genre_modes.empty and pd.notna(genre_modes.iloc[0]):
                mode_genre = str(genre_modes.iloc[0])

        popular_list.append({
            "name": str(author),
            "book_count": int(count),
            "genre": mode_genre
        })

    return {
        "total": len(popular_list),
        "authors": popular_list
    }

@app.get("/api/authors/books")
def get_books_by_author(author: str, limit: int = 60):
    """
    Returns all unique books by the specified author from the dataset,
    sorted by popularity (ratings count) and rating.
    """
    if not hybrid_engine or not hybrid_engine.bm25_engine or hybrid_engine.bm25_engine.df is None:
        raise HTTPException(status_code=503, detail="Dataset is still loading into memory.")

    if not author or not author.strip():
        raise HTTPException(status_code=400, detail="Author name parameter is required.")

    df = hybrid_engine.bm25_engine.df
    matches = df[df['authors'].str.contains(author.strip(), case=False, na=False)].drop_duplicates(subset=['title'])

    if matches.empty:
        return {
            "author": author,
            "total_books": 0,
            "books": []
        }

    # Sort by average_rating descending (highest rating first), then ratings_count
    if "average_rating" in matches.columns and "ratings_count" in matches.columns:
        matches = matches.sort_values(by=["average_rating", "ratings_count"], ascending=[False, False])
    elif "average_rating" in matches.columns:
        matches = matches.sort_values(by="average_rating", ascending=False)
    elif "ratings_count" in matches.columns:
        matches = matches.sort_values(by="ratings_count", ascending=False)

    books = []
    for _, row in matches.head(limit).iterrows():
        title = str(row['title']) if pd.notna(row.get('title')) else "Untitled"
        authors_val = str(row['authors']) if pd.notna(row.get('authors')) else author
        genres_val = str(row['genres']) if pd.notna(row.get('genres')) else "Fiction"
        rating_val = float(row['average_rating']) if pd.notna(row.get('average_rating')) else 4.0
        desc_val = str(row['description']) if pd.notna(row.get('description')) and len(str(row.get('description')).strip()) > 15 else f"A celebrated work by {authors_val} exploring captivating themes, rich character depth, and narrative resonance."
        img_val = str(row['image_url']) if pd.notna(row.get('image_url')) and str(row.get('image_url')).startswith("http") else None

        books.append({
            "book_id": int(row['book_id']) if pd.notna(row.get('book_id')) else None,
            "title": title,
            "authors": authors_val,
            "genres": genres_val,
            "average_rating": round(rating_val, 2),
            "description": synopsis_enricher.get_synopsis(row.to_dict()),
            "image_url": img_val
        })

    return {
        "author": author,
        "total_books": len(books),
        "books": books
    }

@app.get("/api/genres/books")
def get_books_by_genre(genre: str, limit: int = 20):
    """
    Returns approx. 20 top-rated, celebrated books for the requested genre from the dataset.
    """
    if not hybrid_engine or not hybrid_engine.bm25_engine or hybrid_engine.bm25_engine.df is None:
        raise HTTPException(status_code=503, detail="Dataset is still loading into memory.")

    if not genre or not genre.strip():
        raise HTTPException(status_code=400, detail="Genre parameter is required.")

    genre_clean = genre.strip()
    df = hybrid_engine.bm25_engine.df.drop_duplicates(subset=['title'])

    # Map user genre names to dataset keyword variations
    genre_lower = genre_clean.lower()
    if genre_lower in ["all", "all genres", "all genre", ""]:
        genre_clean = "All Genres"
        genre_patterns = [
            ("Fantasy & Magic", r"Fantasy & Magic|Fantasy|Magic"),
            ("Science Fiction", r"Sci-Fi & Dystopian|Sci-Fi|Dystopian|Science Fiction"),
            ("Mystery & Thriller", r"Mystery & Crime Thriller|Mystery|Thriller|Crime"),
            ("Romance", r"Romance & Drama|Romance|Drama"),
            ("History & Biography", r"History & Biography|History|Biography"),
            ("Business & Self-Help", r"Business & Self-Help|Business|Self-Help"),
            ("Technology & AI Science", r"Technology & AI Science|Technology|AI Science"),
            ("General Fiction", r"General Fiction|Fiction")
        ]
        mixed_rows = []
        for g_name, pattern in genre_patterns:
            sub = df[df['genres'].str.contains(pattern, case=False, na=False)]
            if "ratings_count" in sub.columns:
                sub_filtered = sub[(sub['average_rating'] >= 4.0) & (sub['ratings_count'] >= 500)]
                if len(sub_filtered) < 3:
                    sub_filtered = sub[sub['average_rating'] >= 3.8]
                sub_sorted = sub_filtered.sort_values(by=["average_rating", "ratings_count"], ascending=[False, False])
            else:
                sub_sorted = sub[sub['average_rating'] >= 3.8].sort_values(by="average_rating", ascending=False)
            mixed_rows.append(sub_sorted.head(3))

        top_books = pd.concat(mixed_rows).drop_duplicates(subset=['title']).head(limit)
    else:
        if "science fiction" in genre_lower or "sci-fi" in genre_lower:
            query_pattern = r"Sci-Fi & Dystopian|Sci-Fi|Dystopian|Science Fiction"
        elif "technology" in genre_lower or "ai" in genre_lower:
            query_pattern = r"Technology & AI Science|Technology|AI Science"
        elif "mystery" in genre_lower or "thriller" in genre_lower:
            query_pattern = r"Mystery & Crime Thriller|Mystery|Thriller|Crime"
        elif "romance" in genre_lower:
            query_pattern = r"Romance & Drama|Romance|Drama"
        elif "fantasy" in genre_lower:
            query_pattern = r"Fantasy & Magic|Fantasy|Magic"
        elif "history" in genre_lower or "biography" in genre_lower:
            query_pattern = r"History & Biography|History|Biography"
        elif "business" in genre_lower or "self-help" in genre_lower:
            query_pattern = r"Business & Self-Help|Business|Self-Help"
        elif "general" in genre_lower or "fiction" in genre_lower:
            query_pattern = r"General Fiction|Fiction"
        else:
            query_pattern = genre_clean

        matches = df[df['genres'].str.contains(query_pattern, case=False, na=False)]

        if matches.empty:
            matches = df

        # Prioritize well-read masterworks with solid ratings count
        if "ratings_count" in matches.columns:
            popular_matches = matches[(matches['average_rating'] >= 3.8) & (matches['ratings_count'] >= 500)].copy()
            if len(popular_matches) >= limit:
                valid_matches = popular_matches
            else:
                popular_matches_50 = matches[(matches['average_rating'] >= 3.8) & (matches['ratings_count'] >= 50)].copy()
                if len(popular_matches_50) >= limit:
                    valid_matches = popular_matches_50
                else:
                    valid_matches = matches[matches['average_rating'] >= 3.8].copy()
        else:
            valid_matches = matches[matches['average_rating'] >= 3.8].copy()

        if len(valid_matches) < limit:
            valid_matches = matches.copy()

        # Sort by highest rating first, and break ties with ratings count
        if "ratings_count" in valid_matches.columns:
            sorted_matches = valid_matches.sort_values(by=["average_rating", "ratings_count"], ascending=[False, False])
        else:
            sorted_matches = valid_matches.sort_values(by="average_rating", ascending=False)

        top_books = sorted_matches.head(limit)

    global explainer
    import importlib
    import src.reranker.explainer
    importlib.reload(src.reranker.explainer)
    from src.reranker.explainer import RecommendationExplainer
    explainer = RecommendationExplainer()

    results = []
    for idx, (_, row) in enumerate(top_books.iterrows()):
        book_dict = row.to_dict()
        title = str(row.get('title', 'Untitled'))
        authors = str(row.get('authors', 'Unknown Author'))
        rating = float(row.get('average_rating', 4.0)) if pd.notna(row.get('average_rating')) else 4.0
        ratings_count = int(row.get('ratings_count', 0)) if pd.notna(row.get('ratings_count')) else 0
        genres_val = str(row.get('genres', genre_clean))
        img = str(row.get('image_url')) if pd.notna(row.get('image_url')) and str(row.get('image_url')).startswith('http') else None
        
        # Enrich synopsis
        synopsis = synopsis_enricher.get_synopsis(book_dict)
        
        # Dynamic, meaningful AI curation rationale
        book_payload = {
            "title": title,
            "authors": authors,
            "genres": genres_val,
            "average_rating": rating,
            "ratings_count": ratings_count,
            "description": synopsis
        }
        why_picked = explainer.explain_genre(book_payload, genre_clean, index=idx)

        results.append({
            "book_id": int(row['book_id']) if pd.notna(row.get('book_id')) else None,
            "title": title,
            "authors": authors,
            "genres": genres_val,
            "average_rating": round(rating, 2),
            "ratings_count": ratings_count,
            "description": synopsis,
            "image_url": img,
            "ai_explanation": why_picked
        })

    return {
        "genre": genre_clean,
        "total_books": len(results),
        "books": results
    }

@app.get("/api/articles/preview")
def preview_article(url: str):
    """
    Extracts Open Graph metadata (title, description, cover image, platform) from an article URL
    (Substack, Medium, LinkedIn, or external blog).
    """
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="URL is required")

    clean_url = url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = "https://" + clean_url

    # Detect platform
    lower_url = clean_url.lower()
    platform = "Substack"
    if "medium.com" in lower_url:
        platform = "Medium"
    elif "linkedin.com" in lower_url:
        platform = "LinkedIn"
    elif "substack.com" in lower_url:
        platform = "Substack"

    try:
        req = urllib.request.Request(
            clean_url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw_html = resp.read(512000).decode("utf-8", errors="ignore")

        def find_tag(prop_name: str) -> Optional[str]:
            patterns = [
                rf'<meta\s+[^>]*?(?:property|name)=["\']{re.escape(prop_name)}["\'][^>]*?content=["\'](.*?)["\']',
                rf'<meta\s+[^>]*?content=["\'](.*?)["\'][^>]*?(?:property|name)=["\']{re.escape(prop_name)}["\']',
            ]
            for p in patterns:
                m = re.search(p, raw_html, re.IGNORECASE | re.DOTALL)
                if m:
                    val = m.group(1).strip()
                    if val:
                        return html.unescape(val)
            return None

        title = find_tag("og:title") or find_tag("twitter:title")
        if not title:
            title_match = re.search(r'<title[^>]*>(.*?)</title>', raw_html, re.IGNORECASE | re.DOTALL)
            if title_match:
                title = html.unescape(title_match.group(1).strip())

        description = (
            find_tag("og:description")
            or find_tag("twitter:description")
            or find_tag("description")
        )
        image = find_tag("og:image") or find_tag("twitter:image")
        author = find_tag("author") or find_tag("article:author") or find_tag("twitter:creator")

        # Clean title suffix (e.g. " | Substack", " - Medium")
        if title:
            title = re.sub(r'\s*([|–—-])\s*(Substack|Medium|LinkedIn).*$', '', title, flags=re.IGNORECASE).strip()

        return {
            "success": True,
            "url": clean_url,
            "platform": platform,
            "title": title or "",
            "description": description or "",
            "image": image or "",
            "author": author or ""
        }
    except Exception as e:
        return {
            "success": False,
            "url": clean_url,
            "platform": platform,
            "title": "",
            "description": "",
            "image": "",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True)
