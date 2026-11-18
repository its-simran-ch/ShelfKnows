import sys
import os
import time
from sentence_transformers import CrossEncoder

# Ensure project root is in path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

class NeuralReranker:
    def __init__(self, model_name="cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        print(f"Loading Cross-Encoder model ('{self.model_name}')...")
        self.model = CrossEncoder(self.model_name)
        print("Cross-Encoder loaded successfully.")

    def rerank(self, query, candidates, top_k=10):
        """
        Reranks a list of candidate books using deep cross-attention between
        the user query and each book's text representation.
        """
        if not candidates:
            return []

        start_time = time.time()

        # Construct (Query, Document) pairs safely
        pairs = []
        for book in candidates:
            desc = book.get('description') or f"A {book.get('genres', 'Fiction')} book titled '{book.get('title', '')}' by {book.get('authors', '')}."
            text_rep = f"Title: {book.get('title', '')} | Genre: {book.get('genres', '')} | Summary: {desc}"
            pairs.append([query, text_rep])

        # Compute neural relevance logits
        scores = self.model.predict(pairs)

        # Attach scores to candidate books
        for idx, book in enumerate(candidates):
            book['rerank_score'] = round(float(scores[idx]), 4)

        # Sort by rerank score descending
        reranked = sorted(candidates, key=lambda b: b['rerank_score'], reverse=True)
        elapsed_ms = (time.time() - start_time) * 1000

        print(f"Neural Reranking completed for {len(candidates)} books in {elapsed_ms:.2f} ms")
        return reranked[:top_k]

if __name__ == "__main__":
    from src.retrieval.hybrid_engine import HybridRetrievalEngine

    hybrid_engine = HybridRetrievalEngine()
    reranker = NeuralReranker()

    test_query = "books about high-stakes survival games and rebellion"
    print(f"\nTesting Two-Stage Search for: '{test_query}'\n")

    # Stage 1: Fast Hybrid Retrieval (top 15)
    stage1_candidates = hybrid_engine.search(test_query, top_k=15)

    # Stage 2: Deep Cross-Encoder Reranking (top 5)
    final_books = reranker.rerank(test_query, stage1_candidates, top_k=5)

    print("\nFinal Top Recommendations after Neural Reranking:")
    for rank, b in enumerate(final_books, 1):
        print(f"Rank #{rank}: {b['title']} by {b['authors']}")
        print(f"Genre: {b['genres']} | Rerank Score: {b['rerank_score']}\n")
