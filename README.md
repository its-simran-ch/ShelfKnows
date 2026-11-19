---
title: ShelfKnows AI Backend
emoji: 📚
colorFrom: yellow
colorTo: indigo
sdk: docker
app_port: 7860
---

# ShelfKnows — Production Hybrid AI Book Recommendation & Discovery Engine

An intelligent library crafted for lovers of deep reading. Powered by BM25 lexical search, Dense Semantic Embeddings (`all-MiniLM-L6-v2`), Neural Cross-Encoder Reranking (`ms-marco-MiniLM-L-6-v2`), and FastAPI.

## Architecture
- **Hybrid Retrieval:** Sparse BM25 + Dense Sentence-Transformers + Reciprocal Rank Fusion (RRF)
- **Neural Reranking:** Cross-Encoder transformer model for subtle query nuance
- **Dataset:** 50,000+ curated Goodreads titles with rich thematic metadata
- **Backend Framework:** FastAPI & Uvicorn
- **Live Frontend:** Hosted on Vercel