import sys
import os
from huggingface_hub import HfApi

def main():
    if len(sys.argv) > 1:
        token = sys.argv[1].strip()
    else:
        token = os.environ.get("HF_TOKEN")

    if not token:
        print("❌ Error: Hugging Face token not provided!")
        print("Usage: python3 upload_to_hf.py <YOUR_HF_TOKEN>")
        sys.exit(1)

    repo_id = "Simran09/shelfknows-api"
    print(f"🚀 Uploading ShelfKnows AI backend to Hugging Face Space: {repo_id}...")
    print("📦 Uploading only the 20 clean production backend files (no venv, no videos)...")

    api = HfApi(token=token)

    # ONLY upload the exact backend files needed by Hugging Face
    allow_patterns = [
        "app.py",
        "requirements.txt",
        "src/**",
        "data/books_cleaned.csv",
        "data/chroma_db/**"
    ]

    try:
        api.upload_folder(
            folder_path=".",
            repo_id=repo_id,
            repo_type="space",
            commit_message="Deploy ShelfKnows clean backend to Hugging Face Spaces",
            allow_patterns=allow_patterns
        )
        print("\n✅ SUCCESS! All clean production files uploaded successfully!")
        print(f"🔗 View your Space building live at: https://huggingface.co/spaces/{repo_id}")
    except Exception as e:
        print(f"\n❌ Upload failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
