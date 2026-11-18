import pandas as pd
import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.metrics.pairwise import cosine_similarity
import time
import os

class CollaborativeFilteringEngine:
    def __init__(self, csv_path="data/books_cleaned.csv", n_components=20, n_users=1000):
        self.csv_path = csv_path
        self.n_components = n_components
        self.n_users = n_users
        self.top_books = None
        self.similarity_matrix = None
        
        self.build_model()

    def build_model(self):
        """
        Builds the user-item interaction matrix and decomposes it using TruncatedSVD
        to extract latent taste dimensions and compute behavioral similarity.
        """
        if not os.path.exists(self.csv_path):
            print(f" Error: {self.csv_path} not found. Run clean_data.py first.")
            return

        print(f" Initializing Collaborative Filtering Engine from '{self.csv_path}'...")
        start_time = time.time()
        
        df = pd.read_csv(self.csv_path)
        self.top_books = df.head(500).copy()
        n_books = len(self.top_books)
        
        # Simulate realistic sparse user rating interactions
        np.random.seed(42)
        ratings_matrix = np.zeros((self.n_users, n_books))
        
        for user_id in range(self.n_users):
            num_rated = np.random.randint(15, 30)
            rated_indices = np.random.choice(n_books, size=num_rated, replace=False)
            for b_idx in rated_indices:
                ratings_matrix[user_id, b_idx] = np.random.choice([3.0, 4.0, 5.0], p=[0.2, 0.4, 0.4])
                
        # Decompose into latent taste dimensions
        svd = TruncatedSVD(n_components=self.n_components, random_state=42)
        book_latent_features = svd.fit_transform(ratings_matrix.T)
        
        # Compute item-item cosine similarity in latent space
        self.similarity_matrix = cosine_similarity(book_latent_features)
        
        elapsed = time.time() - start_time
        print(f" Collaborative Filtering Model trained across {n_books} books in {elapsed:.2f} seconds!")

    def recommend(self, book_title, top_k=10):
        """
        Recommends top_k books based on reader community behavior.
        """
        start_time = time.time()
        
        matches = self.top_books[self.top_books['title'].str.contains(book_title, case=False, na=False, regex=False)]
        if len(matches) == 0:
            print(f" Book '{book_title}' not found in top interaction catalog.")
            return []
            
        book_idx = matches.index[0]
        matched_title = self.top_books.iloc[book_idx]['title']
        
        sim_scores = self.similarity_matrix[book_idx]
        sorted_indices = sim_scores.argsort()[::-1]
        top_indices = [i for i in sorted_indices if i != book_idx][:top_k]
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        results = []
        for idx in top_indices:
            row = self.top_books.iloc[idx].to_dict()
            row['cf_score'] = round(float(sim_scores[idx]), 4)
            results.append(row)
            
        print(f"⚡ CF Search for '{matched_title}' returned {len(results)} matches in {elapsed_ms:.2f} ms")
        return results

if __name__ == "__main__":
    engine = CollaborativeFilteringEngine()
    
    test_title = "The Hunger Games"
    print(f"\n Testing Collaborative Filtering for: '{test_title}'\n")
    recommendations = engine.recommend(test_title, top_k=3)
    
    for rank, b in enumerate(recommendations, 1):
        print(f"  Rank #{rank}: {b['title']} by {b['authors']}")
        print(f"  Genre: {b['genres']} | Rating: {b['average_rating']} ⭐ | CF Behavioral Score: {b['cf_score']}\n")
