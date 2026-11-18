import pandas as pd
import time
import os
import sys

# Ensure project root is in Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from src.retrieval.vector_search import VectorSearchEngine
from src.retrieval.bm25_search import BM25SearchEngine
from src.retrieval.collaborative_filtering import CollaborativeFilteringEngine

class HybridRetrievalEngine:
    def __init__(self, data_path="data/books_cleaned.csv", chroma_dir="data/chroma_db", rrf_k=60):
        self.data_path = data_path
        self.chroma_dir = chroma_dir
        self.rrf_k = rrf_k
        
        print("Initializing Hybrid Retrieval Engines (Vector + BM25 + Collaborative Filtering)...")
        self.vector_engine = VectorSearchEngine(db_dir=self.chroma_dir)
        self.bm25_engine = BM25SearchEngine(csv_path=self.data_path)
        self.cf_engine = CollaborativeFilteringEngine(csv_path=self.data_path)
        print("All three engines loaded successfully.")

    def compute_rrf(self, ranked_lists):
        """
        Applies Reciprocal Rank Fusion to merge multiple ranked candidate lists.
        Formula: RRF_Score = sum( 1 / (k + rank) )
        """
        rrf_scores = {}
        book_metadata = {}

        for ranked_list in ranked_lists:
            for rank, book in enumerate(ranked_list, start=1):
                book_id = book.get('book_id')
                if not book_id:
                    continue

                reciprocal_rank = 1.0 / (self.rrf_k + rank)

                if book_id not in rrf_scores:
                    rrf_scores[book_id] = 0.0
                    book_metadata[book_id] = book

                rrf_scores[book_id] += reciprocal_rank

        # Sort books by combined RRF score descending
        sorted_ids = sorted(rrf_scores.keys(), key=lambda b: rrf_scores[b], reverse=True)

        merged_results = []
        for bid in sorted_ids:
            item = dict(book_metadata[bid])
            item['rrf_score'] = round(rrf_scores[bid], 5)
            merged_results.append(item)

        return merged_results

    def search(self, query_text, top_k=10, include_cf=True):
        """
        Executes unified Hybrid Retrieval:
        1. Dense Vector Search (semantic context)
        2. Sparse BM25 Search (exact keywords)
        3. Collaborative Filtering (behavioral patterns)
        4. Reciprocal Rank Fusion (merging & ranking)
        """
        start_time = time.time()

        # Step 1: Dense Vector Retrieval
        vector_candidates = self.vector_engine.search(query_text, top_k=top_k * 2)

        # Step 2: Sparse BM25 Retrieval
        bm25_candidates = self.bm25_engine.search(query_text, top_k=top_k * 2)

        # Step 3: Collaborative Filtering Retrieval (if top keyword match found)
        cf_candidates = []
        if include_cf and len(bm25_candidates) > 0:
            top_title = bm25_candidates[0].get('title', '')
            cf_candidates = self.cf_engine.recommend(top_title, top_k=top_k)

        # Step 4: Reciprocal Rank Fusion
        fused_candidates = self.compute_rrf([vector_candidates, bm25_candidates, cf_candidates])

        # Step 5: Deduplicate by title to ensure distinct recommendations
        seen_titles = set()
        deduped_results = []
        for book in fused_candidates:
            clean_title = str(book.get('title', '')).strip().lower()
            if clean_title not in seen_titles:
                seen_titles.add(clean_title)
                deduped_results.append(book)
            if len(deduped_results) >= top_k:
                break

        elapsed_ms = (time.time() - start_time) * 1000
        print(f"Hybrid Retrieval completed for '{query_text}' in {elapsed_ms:.2f} ms")
        return deduped_results

if __name__ == "__main__":
    engine = HybridRetrievalEngine()

    test_query = "The Hunger Games dystopian survival"
    print(f"\nTesting Hybrid Search for Query: '{test_query}'\n")
    results = engine.search(test_query, top_k=5)

    for rank, b in enumerate(results, 1):
        print(f"Rank #{rank}: {b['title']} by {b['authors']}")
        print(f"Genre: {b['genres']} | Rating: {b['average_rating']} | RRF Score: {b['rrf_score']}\n")
