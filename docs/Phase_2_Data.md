# 📘 ShelfKnows Study Guide - Phase 2: Data Acquisition & Preprocessing

## 🎯 Phase Objective
To acquire, inspect, clean, and enrich a 50,000 multi-genre book dataset from open research archives, ensuring zero missing values and engineering the primary `combined_text` feature representation for downstream AI retrieval models.

---

## 🧠 Skills Used in Phase 2

Here are the specific engineering and data science skills developed and practiced in Phase 2:

### 1. Automated Data Ingestion & Pipeline Scripting (`requests` & `pandas`)
* **What is this skill?** Programmatically fetching, streaming, and storing raw dataset files over HTTP networks into structured local storage formats.
* **Why did we use it in ShelfKnows?** Manually downloading datasets from web browsers is slow, error-prone, and not reproducible. An automated download script ensures anyone running the project can acquire the exact raw dataset with a single terminal command.
* **How did we use it?** Built `src/utils/download_raw_data.py` to stream 50,000 raw book records into `data/raw_books.csv`.

### 2. Exploratory Data Analysis (EDA) & Statistical Visualization (`matplotlib` & `seaborn`)
* **What is this skill?** The ability to visually inspect a dataset's distributions, spot missing values, identify outliers, and understand feature relationships using statistical plots before feeding data into AI models.
* **Why did we use it in ShelfKnows?** Machine learning models are "garbage in, garbage out." Running EDA revealed that 105 books were missing publication years and showed how reader ratings were distributed across the 1.0 to 5.0 star range.
* **How did we use it?** Created `notebook/01_eda_and_cleaning.ipynb` with:
  * Missing value bar charts to pinpoint data gaps.
  * Rating distribution histograms and Kernel Density Estimates (KDE) to understand reader behavior.
  * Multi-genre count bar plots to verify balanced category representation.

### 3. Missing Value Handling & Data Imputation (`pandas` & `numpy`)
* **What is this skill?** Detecting `NaN` (Not a Number) or `Null` values in tabular data and applying domain-appropriate imputation strategies (such as median filling or sensible default assignment) without introducing bias.
* **Why did we use it in ShelfKnows?** Deep learning embedding models and vector databases crash or generate corrupt vectors if fed `None` or `NaN` strings.
* **How did we use it?** 
  * Filled missing publication years with the median benchmark year (`2000`).
  * Replaced missing book titles with original titles or `'Unknown Title'`.
  * Assigned default community baselines for missing ratings (4.0 stars, 1,000 reviews).

### 4. Rule-Based Heuristic NLP Classification
* **What is this skill?** Creating rule-based text processing logic using keywords and domain heuristics to classify unstructured text into structured categorical labels.
* **Why did we use it in ShelfKnows?** The raw Goodreads dataset lacked high-level, standardized genre tags for easy filtering. 
* **How did we use it?** Implemented `assign_multi_genre()` in `clean_data.py` to parse book titles and author names, categorizing 50,000 books into 9 distinct multi-genres (*Sci-Fi & Dystopian, Fantasy & Magic, Mystery & Crime Thriller, Romance & Drama, History & Biography, Business & Self-Help, Technology & AI Science, Classics & Philosophy, General Fiction*).

### 5. NLP Feature Engineering (`combined_text`)
* **What is this skill?** Transforming raw, isolated tabular columns into rich, unified textual representations designed specifically for Transformer embedding models.
* **Why did we use it in ShelfKnows?** If you only embed a book's title (e.g., *"Dune"*), the AI misses the author, published year, genre, and plot details. Combining metadata into a structured prompt gives the embedding model maximum semantic signal.
* **How did we use it?** Engineered the `combined_text` feature for every single book:
  ```text
  Title: {title} | Author: {authors} | Published: {year} | Genre: {genres} | Summary: {description}
  ```

---

## 🔑 Key Concepts Explained

### 1. Data Cleaning & Null Imputation
* **Why do we clean data?** Machine Learning models require consistent data types. Missing values produce errors during vectorization.
* **Imputation Strategy:**
  * Publication Year: Converted float years (e.g. `2008.0`) to clean integers, filling missing values with `2000`.
  * Titles & Authors: Cleaned missing strings to prevent empty prompt errors.
  * Community Ratings: Standardized to numerical floats between 1.0 and 5.0.

### 2. Multi-Genre Categorization Engine
* Analyzed keywords across titles and authors to group books into 9 balanced categories.
* Allowed our search engine to support genre-specific discovery and multi-category diversity.

### 3. Primary Feature: `combined_text`
* Formatted string merging all metadata into a single contextual paragraph.
* This feature is what `SentenceTransformers` reads in Phase 3 to generate 384-dimensional dense vectors.

---

## 🛠️ Summary of Steps Completed
1. Created `src/utils/download_raw_data.py` to stream 50,000 raw book records into `data/raw_books.csv`.
2. Created interactive exploratory notebook `notebook/01_eda_and_cleaning.ipynb` with visual distribution charts (missing values bar plot, rating distribution KDE, genre frequency bar chart).
3. Created production cleaning pipeline `src/utils/clean_data.py`.
4. Successfully generated `data/books_cleaned.csv` containing 50,000 processed books.

---

## ✅ Phase 2 Outcome
A pristine, fully cleaned 50,000-book dataset with zero missing values and engineered text features, ready for Dense Vector Search, BM25 indexing, and Collaborative Filtering!
