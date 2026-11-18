import pandas as pd
import chromadb
from chromadb.utils import embedding_functions
import time
import os

class VectorSearchEngine:
    def __init__(self, db_dir="data/chroma_db", collection_name="shelfknows_books"):
        self.db_dir = db_dir
        self.collection_name = collection_name
        self.model_name = "all-MiniLM-L6-v2"
        
        print(f"Initializing Embedding Model ('{self.model_name}')...")
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=self.model_name
        )
        
        # Initialize persistent local ChromaDB vector store
        print(f"Connecting to local ChromaDB vector store at '{self.db_dir}'...")
        self.client = chromadb.PersistentClient(path=self.db_dir)
        
        # Get or create vector collection with Cosine Distance
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"}
        )

    def build_index(self, csv_path="data/books_cleaned.csv", batch_size=2000, max_items=10000):
        """
        Generates vector embeddings for books and indexes them in ChromaDB.
        Indexed in batches for optimal memory usage and speed.
        """
        if not os.path.exists(csv_path):
            print(f"Error: Cleaned data file '{csv_path}' not found! Run clean_data.py first.")
            return

        print(f"\n Loading cleaned dataset from '{csv_path}'...")
        df = pd.read_csv(csv_path)
        
        # We index 10,000 items for instant embedding speed
        if len(df) > max_items:
            print(f"⚡ Indexing top {max_items} books for ultra-fast vector search...")
            df = df.head(max_items).copy()

        existing_count = self.collection.count()
        if existing_count >= len(df):
            print(f"ChromaDB Vector Database is ALREADY indexed with {existing_count} books!")
            return

        print(f"⏳ Generating vector embeddings for {len(df)} books in batches of {batch_size}...")
        start_time = time.time()
        
        ids = [str(bid) for bid in df['book_id']]
        documents = df['combined_text'].tolist()
        metadatas = df[['book_id', 'title', 'authors', 'published_year', 'genres', 'average_rating', 'image_url']].to_dict('records')
        
        # Batch upload to ChromaDB
        for i in range(0, len(df), batch_size):
            end_i = min(i + batch_size, len(df))
            print(f"  • Embedding & Indexing batch [{i} : {end_i}]...")
            self.collection.add(
                ids=ids[i:end_i],
                documents=documents[i:end_i],
                metadatas=metadatas[i:end_i]
            )
            
        elapsed = time.time() - start_time
        print(f"\n VECTOR INDEXING COMPLETE!")
        print(f"Total Vectors Stored in ChromaDB: {self.collection.count()}")
        print(f"Indexing Time: {elapsed:.2f} seconds")

    def search(self, query_text, top_k=10):
        """
        Performs semantic vector search for any natural language query.
        Returns top_k semantically matched books with similarity scores.
        """
        start_time = time.time()
        results = self.collection.query(
            query_texts=[query_text],
            n_results=top_k
        )
        elapsed_ms = (time.time() - start_time) * 1000
        
        books = []
        if results and 'metadatas' in results and len(results['metadatas']) > 0:
            for idx, meta in enumerate(results['metadatas'][0]):
                distance = results['distances'][0][idx] if 'distances' in results else 0
                similarity_score = round(max(0.0, 1.0 - distance), 4) # Cosine Similarity Score
                
                book_entry = dict(meta)
                book_entry['similarity_score'] = similarity_score
                books.append(book_entry)
                
        print(f"⚡ Vector Search for '{query_text}' returned {len(books)} matches in {elapsed_ms:.2f} ms")
        return books

if __name__ == "__main__":
    # Test the Vector Search Engine
    engine = VectorSearchEngine()
    engine.build_index(max_items=10000)
    
    # Test query
    test_prompt = "futuristic dystopian society ruled by artificial intelligence and surveillance"
    print(f"\n Testing Semantic Query: '{test_prompt}'\n")
    results = engine.search(test_prompt, top_k=3)
    
    for rank, b in enumerate(results, 1):
        print(f"  Rank #{rank}: {b['title']} by {b['authors']}")
        print(f"  Genre: {b['genres']} | Rating: {b['average_rating']} ⭐ | Cosine Similarity: {b['similarity_score']}\n")
