import sys
import os
import gradio as gr

# Ensure project root is in python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from src.api.main import app as fastapi_app, get_recommendations, RecommendationRequest

def search_books_gradio(query, top_k):
    if not query or not query.strip():
        return "Please enter a book vibe, theme, or mood."
    try:
        req = RecommendationRequest(query=query.strip(), top_k=int(top_k), rerank=True)
        res = get_recommendations(req)
        
        output = f"### 📚 AI Recommendations for: *\"{query}\"*\n\n"
        output += f"*Total matches: {res.total_results} | Latency: {res.latency_ms} ms*\n\n---\n"
        for i, book in enumerate(res.recommendations, 1):
            output += f"### {i}. {book.title}\n"
            output += f"**Author:** {book.authors} | **Rating:** ⭐ {book.average_rating} | **Genre:** `{book.genres}`\n\n"
            if book.ai_explanation:
                output += f"💡 **Why ShelfKnows chose this:** *{book.ai_explanation}*\n\n"
            if book.description:
                output += f"📖 **Synopsis:** {book.description[:280]}...\n\n"
            output += "---\n"
        return output
    except Exception as e:
        return f"Error running recommendation engine: {str(e)}"

# Custom styling for Gradio Space
with gr.Blocks(title="ShelfKnows — AI Book Discovery Backend", theme=gr.themes.Base()) as demo:
    gr.Markdown(
        """
        # 📚 ShelfKnows AI Discovery Engine
        **Production Hybrid Recommendation System** combining Dense Semantic Vector Search, BM25 Lexical Matching, and Cross-Encoder Neural Reranking.
        
        *This Hugging Face Space powers the live backend API and interactive testing portal for ShelfKnows.*
        """
    )
    with gr.Row():
        with gr.Column(scale=4):
            query_input = gr.Textbox(
                lines=2,
                placeholder="e.g. atmospheric mystery set in rain-drenched coastal town with quiet melancholy...",
                label="Explore by Vibe, Feeling, or Theme"
            )
            top_k_slider = gr.Slider(minimum=1, maximum=10, value=5, step=1, label="Number of Recommendations")
            submit_btn = gr.Button("Find Matching Stories", variant="primary")
        with gr.Column(scale=5):
            results_markdown = gr.Markdown("Enter a theme or vibe above to test the hybrid AI retrieval engine.")

    submit_btn.click(
        fn=search_books_gradio,
        inputs=[query_input, top_k_slider],
        outputs=results_markdown
    )

# Mount Gradio UI directly onto FastAPI app
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
