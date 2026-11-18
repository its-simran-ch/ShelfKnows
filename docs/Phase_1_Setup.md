# 📘 ShelfKnows Study Guide - Phase 1: Environment & Architecture Setup

## 🎯 Phase Objective
The goal of Phase 1 was to establish a professional software engineering foundation for "ShelfKnows" by creating an isolated Python environment, structuring project directories, and installing core AI/ML dependencies.

---

## 🧠 Skills Used in Phase 1

Here are the specific engineering skills developed and practiced in Phase 1:

### 1. Python Virtual Environment Isolation (`venv`)
* **What is this skill?** The ability to create an isolated runtime sandbox for a specific Python project, separating its dependencies from the computer's global operating system Python.
* **Why did we use it in ShelfKnows?** Different AI libraries have strict, competing requirements (for example, PyTorch and ChromaDB require specific versions of numpy and urllib3). Using a virtual environment ensures `ShelfKnows` runs without version conflicts or breaking other projects.
* **How did we use it?** Created the virtual environment using `python3 -m venv venv` and activated it via `source venv/bin/activate`.

### 2. Dependency Management & Build Reproducibility (`pip` & `requirements.txt`)
* **What is this skill?** Specifying and locking exact external library versions using semantic version pinning (`==`) to guarantee 100% reproducible software builds.
* **Why did we use it in ShelfKnows?** In professional AI engineering, an application must run identically on your local machine, on a teammate's computer, inside a Docker container, and on a cloud production server. Version locking prevents unexpected breaking changes when libraries update.
* **How did we use it?** Created a centralized `requirements.txt` file pinning exact releases for all 12 core AI, backend, and data visualization packages, and installed them via `pip install -r requirements.txt`.

### 3. Modular Software Architecture & Directory Structuring
* **What is this skill?** Designing clean project folder hierarchies based on the software engineering principle of **"Separation of Concerns"** (SoC).
* **Why did we use it in ShelfKnows?** Traditional amateur projects dump data, models, and scripts into one messy folder. A modular architecture separates data storage from retrieval algorithms, reranking logic, and API endpoints, making the codebase clean, testable, and scalable.
* **How did we use it?** Created dedicated packages:
  * `data/` -> Raw and cleaned data storage
  * `src/retrieval/` -> Search engines (Vector DB, BM25, Collaborative Filtering)
  * `src/reranker/` -> Neural cross-encoder and explanation logic
  * `src/api/` -> FastAPI backend endpoints
  * `src/utils/` -> Helper functions
  * `notebook/` -> Interactive experimentation
  * `docs/` -> Engineering study guides and system documentation

### 4. Unix/macOS Command-Line Navigation (CLI & Shell)
* **What is this skill?** Using terminal shell commands (`zsh`/`bash`) to navigate directories, manage system paths, control background processes, and execute software toolchains.
* **Why did we use it in ShelfKnows?** Production AI systems are deployed and managed on headless Linux servers where graphical user interfaces (GUIs) do not exist. CLI fluency is a mandatory core competency for AI Engineers.
* **How did we use it?** Executed commands to create nested directories (`mkdir -p`), activate virtual environments, install dependencies, and run Python modules.

### 5. Technical Documentation & Engineering Journaling (Markdown)
* **What is this skill?** Writing clear, structured technical documentation that captures system goals, architectural decisions, mathematical formulas, and implementation steps.
* **Why did we use it in ShelfKnows?** In industry, great code is useless if no one understands how it works. Documenting each phase ensures easy onboarding, technical interview preparation, and clean PDF report generation.
* **How did we use it?** Created standardized Markdown study guides in the `docs/` folder formatted cleanly with tables, code snippets, and explanations.

---

## 🔑 Key Concepts Explained

### 1. Virtual Environment (`venv`)
* A virtual environment is an isolated directory tree that contains a private Python installation and a set of independent packages.
* **Key Commands:**
  * Create: `python3 -m venv venv`
  * Activate: `source venv/bin/activate`

### 2. Core Tech Stack Installed (`requirements.txt`)
* `pandas` & `numpy` -> Data manipulation & matrix operations.
* `sentence-transformers` -> Converts book summaries into dense 384-dimensional vector embeddings.
* `chromadb` -> Embedded vector database to store & search embeddings in milliseconds.
* `rank-bm25` -> Sparse lexical algorithm for keyword matching (author/title).
* `scikit-learn` -> Data splitting & matrix calculations for Collaborative Filtering.
* `torch` -> PyTorch deep learning framework supporting sentence-transformers.
* `fastapi` & `uvicorn` -> High-performance async Python backend framework.
* `streamlit` -> Framework for building the interactive web UI.
* `matplotlib` & `seaborn` -> Statistical data visualization & exploratory plotting.

---

## 🛠️ Summary of Steps Completed
1. Initialized empty project directory `ShelfKnows`.
2. Created and activated Python 3 virtual environment (`venv`).
3. Created directory structure using `mkdir -p data src/retrieval src/reranker src/api src/utils notebook docs`.
4. Created `requirements.txt` with locked dependency versions.
5. Successfully installed all dependencies via `pip install -r requirements.txt`.

---

## ✅ Phase 1 Outcome
A fully configured, isolated development environment with all required AI, Vector DB, Backend, and Frontend packages installed, ready for production data processing and model development.
