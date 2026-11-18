import pandas as pd
import numpy as np
import os

def clean_and_prepare_data():
    print("STEP 1: Loading Raw 50,000 Dataset...")
    raw_path = "data/raw_books.csv"
    output_path = "data/books_cleaned.csv"
    
    if not os.path.exists(raw_path):
        print(f"Error: {raw_path} not found. Run download_raw_data.py first!")
        return

    df = pd.read_csv(raw_path)
    print(f"Raw Rows Loaded: {len(df)}")

    print("\n STEP 2: Inspecting Missing Values (NaNs):")
    print(df[['title', 'authors', 'average_rating', 'ratings_count', 'original_publication_year']].isna().sum())

    print("\n STEP 3: Cleaning & Filling Null Values...")
    
    # 1. Title & Authors
    df['title'] = df['title'].fillna(df['original_title']).fillna('Unknown Title')
    df['authors'] = df['authors'].fillna('Unknown Author')

    # 2. Publication Year
    df['original_publication_year'] = pd.to_numeric(df['original_publication_year'], errors='coerce').fillna(2000)
    df['published_year'] = df['original_publication_year'].astype(int)

    # 3. Average Rating & Ratings Count
    df['average_rating'] = pd.to_numeric(df['average_rating'], errors='coerce').fillna(4.0)
    df['ratings_count'] = pd.to_numeric(df['ratings_count'], errors='coerce').fillna(1000)
    df['image_url'] = df['image_url'].fillna('https://via.placeholder.com/150')

    print("\n STEP 4: Categorizing Books into 9 Distinct Multi-Genres...")
    
    # Multi-Genre tagging logic based on title & author keywords
    def assign_multi_genre(row):
        title = str(row['title']).lower()
        authors = str(row['authors']).lower()
        
        if any(w in title or w in authors for w in ['dune', 'hunger', 'game', 'space', 'star', 'martian', 'galaxy', '1984', 'robot', 'cyber', 'future']):
            return 'Sci-Fi & Dystopian'
        elif any(w in title or w in authors for w in ['potter', 'hobbit', 'lord', 'ring', 'dragon', 'witch', 'magic', 'king', 'narnia', 'shadow', 'spell']):
            return 'Fantasy & Magic'
        elif any(w in title or w in authors for w in ['murder', 'girl', 'code', 'mystery', 'detective', 'sherlock', 'gone', 'silent', 'lie', 'blood']):
            return 'Mystery & Crime Thriller'
        elif any(w in title or w in authors for w in ['love', 'pride', 'prejudice', 'heart', 'romance', 'notebook', 'kiss', 'forever']):
            return 'Romance & Drama'
        elif any(w in title or w in authors for w in ['history', 'war', 'world', 'revolution', 'empire', 'churchill', 'lincoln', 'biography', 'freedom']):
            return 'History & Biography'
        elif any(w in title or w in authors for w in ['habit', 'think', 'money', 'rich', 'leader', 'power', 'success', 'mind', 'work', 'life']):
            return 'Business & Self-Help'
        elif any(w in title or w in authors for w in ['data', 'code', 'algorithm', 'ai', 'python', 'science', 'math', 'universe', 'physics', 'tech']):
            return 'Technology & AI Science'
        elif any(w in title or w in authors for w in ['plato', 'socrates', 'republic', 'art', 'philosophy', 'god', 'truth', 'odyssey', 'iliad']):
            return 'Classics & Philosophy'
        else:
            return 'General Fiction'

    df['genres'] = df.apply(assign_multi_genre, axis=1)

    print("\n STEP 5: Generating Plot Summaries & Primary AI Feature ('combined_text')...")
    
    # Creating rich descriptive plot text for vector embeddings
    df['description'] = (
        "A captivating " + df['genres'] + " book titled '" + df['title'] + 
        "' authored by " + df['authors'] + " published in " + df['published_year'].astype(str) + 
        ". It holds an average community rating of " + df['average_rating'].astype(str) + 
        " stars out of 5 based on " + df['ratings_count'].astype(str) + " reader reviews."
    )

    # Combined text feature for SentenceTransformers & BM25
    df['combined_text'] = (
        "Title: " + df['title'] + 
        " | Author: " + df['authors'] + 
        " | Published: " + df['published_year'].astype(str) + 
        " | Genre: " + df['genres'] + 
        " | Summary: " + df['description']
    )

    # Assign clean sequential book_ids from 1 to 50,000
    df['book_id'] = range(1, len(df) + 1)

    # Select clean columns
    clean_cols = [
        'book_id', 'title', 'authors', 'published_year', 
        'genres', 'average_rating', 'ratings_count', 
        'image_url', 'description', 'combined_text'
    ]
    df_clean = df[clean_cols]

    # Save to CSV
    df_clean.to_csv(output_path, index=False)
    
    print("\n STEP 6: DATA CLEANING & PREPROCESSING COMPLETE!")
    print(f" Cleaned Dataset Size: {len(df_clean)} books")
    print(f" Saved to: {output_path}")
    
    print("\n Genre Distribution in Cleaned Dataset:")
    print(df_clean['genres'].value_counts())
    
    print("\n Sample Record (Row 1):")
    sample = df_clean.iloc[0].to_dict()
    for k, v in sample.items():
        print(f"  • {k}: {v}")

if __name__ == "__main__":
    clean_and_prepare_data()
