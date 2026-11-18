import pandas as pd
from rank_bm25 import BM25Okapi
import time
import os

class BM25SearchEngine:
    def __init__(self, csv_path="data/books_cleaned.csv"):
        self.csv_path = csv_path
        self.bm25 = None
        self.df = None
        self.corpus_tokens = []
        
        self.build_index()

    def build_index(self):
        """
        Tokenizes the dataset's 'combined_text' and builds the BM25 lexical index.
        """
        if not os.path.exists(self.csv_path):
            print(f" Error: {self.csv_path} not found. Run clean_data.py first.")
            return

        print(f" Building BM25 Sparse Index from '{self.csv_path}'...")
        start_time = time.time()
        
        self.df = pd.read_csv(self.csv_path)
        
        # Lowercase and tokenize combined_text into words
        self.corpus_tokens = [
            str(text).lower().split() for text in self.df['combined_text']
        ]
        
        # Initialize BM25 algorithm
        self.bm25 = BM25Okapi(self.corpus_tokens)
        
        elapsed = time.time() - start_time
        print(f" BM25 Index successfully built for {len(self.df)} books in {elapsed:.2f} seconds!")

    def search(self, query_text, top_k=10):
        """
        Performs BM25 keyword matching for any search term.
        Returns top_k matching books with BM25 relevance scores.
        """
        start_time = time.time()
        
        # Tokenize query
        tokenized_query = str(query_text).lower().split()
        
        # Calculate BM25 scores across all books
        doc_scores = self.bm25.get_scores(tokenized_query)
        
        # Get indices of top_k highest scoring books
        top_indices = doc_scores.argsort()[::-1][:top_k]
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        results = []
        for idx in top_indices:
            score = doc_scores[idx]
            if score > 0: # Only return items with non-zero keyword match
                row = self.df.iloc[idx].to_dict()
                row['bm25_score'] = round(float(score), 4)
                results.append(row)
                
        print(f"⚡ BM25 Search for '{query_text}' returned {len(results)} matches in {elapsed_ms:.2f} ms")
        return results

if __name__ == "__main__":
    # Test BM25 Engine
    engine = BM25SearchEngine()
    
    # Test keyword query
    query = "Suzanne Collins Hunger Games"
    print(f"\n Testing BM25 Query: '{query}'\n")
    matches = engine.search(query, top_k=3)
    
    for rank, b in enumerate(matches, 1):
        print(f"  Rank #{rank}: {b['title']} by {b['authors']}")
        print(f"  Genre: {b['genres']} | Rating: {b['average_rating']} ⭐ | BM25 Score: {b['bm25_score']}\n")
