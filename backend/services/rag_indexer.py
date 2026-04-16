"""
RAG Corpus Indexer for Krishi-Drishti
Reads the 'Machine Learning in Agriculture.txt' corpus and indexes it into
the HybridSearchEngine (FAISS + BM25) so AI chat answers are grounded in
real agricultural knowledge instead of 4 hardcoded mock strings.
"""

import os
import re
from .hybrid_search import HybridSearchEngine

# Singleton — built once on first use, reused for all chat requests
_rag_engine: HybridSearchEngine | None = None


def _chunk_text(text: str, chunk_size: int = 600, overlap: int = 100) -> list[str]:
    """
    Splits large text into overlapping chunks.
    - chunk_size: characters per chunk (600 ≈ ~100 words, fits in context well)
    - overlap: shared chars between consecutive chunks so no sentence is cut mid-thought
    """
    # Normalize whitespace — collapse multiple newlines/spaces
    text = re.sub(r'\n{3,}', '\n\n', text.strip())
    text = re.sub(r'[ \t]+', ' ', text)

    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]

        # Try to end at a sentence boundary (. or \n) for cleaner chunks
        if end < len(text):
            last_period = max(chunk.rfind('. '), chunk.rfind('\n'))
            if last_period > chunk_size // 2:  # Only trim if we found a good break
                chunk = chunk[:last_period + 1]

        chunk = chunk.strip()
        if len(chunk) > 50:  # Skip tiny fragments
            chunks.append(chunk)

        start += len(chunk) - overlap  # Slide forward with overlap
        if start <= 0:
            break

    return chunks


def _get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Uses Gemini text-embedding-004 to produce dense vectors for FAISS.
    Falls back to empty list (BM25-only mode) if API key is missing.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("[RAG] No GEMINI_API_KEY — running in BM25-only mode (no dense embeddings)")
        return []

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        embeddings = []
        # Gemini embed_content accepts one text at a time
        for text in texts:
            result = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
                config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
            )
            embeddings.append(result.embeddings[0].values)
        return embeddings
    except Exception as e:
        print(f"[RAG] Embedding error: {e} — falling back to BM25-only")
        return []


def get_rag_engine() -> HybridSearchEngine:
    """
    Returns the singleton RAG engine, building it on first call.
    Reads the agriculture corpus from the project root and indexes every chunk.
    """
    global _rag_engine
    if _rag_engine is not None:
        return _rag_engine

    print("[RAG] Initializing corpus-backed RAG engine...")

    # Locate the corpus file — it sits at the project root (parent of backend/)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    corpus_path = os.path.join(backend_dir, "Machine Learning in Agriculture.txt")

    # Build search engine (768-dim for Gemini text-embedding-004)
    engine = HybridSearchEngine(embedding_function=_get_embeddings, dimension=768)

    # --- Load the primary agriculture corpus ---
    if os.path.exists(corpus_path):
        try:
            with open(corpus_path, "r", encoding="utf-8", errors="ignore") as f:
                corpus_text = f.read()

            chunks = _chunk_text(corpus_text, chunk_size=600, overlap=100)
            print(f"[RAG] Indexing {len(chunks)} chunks from 'Machine Learning in Agriculture.txt'...")

            # Index in batches of 50 to avoid Gemini API rate limits
            batch_size = 50
            for i in range(0, len(chunks), batch_size):
                batch = chunks[i: i + batch_size]
                meta = [{"source": "ML_in_Agriculture", "chunk_id": i + j} for j in range(len(batch))]
                engine.add_documents(batch, meta)
                print(f"[RAG]   Indexed chunks {i}–{i + len(batch) - 1}")

            print(f"[RAG] ✓ Corpus indexed: {len(chunks)} chunks ready for retrieval.")
        except Exception as e:
            print(f"[RAG] ✗ Failed to index corpus: {e}")
    else:
        print(f"[RAG] ✗ Corpus file not found at: {corpus_path}")

    # --- Fallback: hardcoded domain facts (always present as a safety net) ---
    fallback_docs = [
        "Late Blight (Phytophthora infestans) in potato and tomato is treated with chlorothalonil or mancozeb. Apply at first sign of disease and repeat every 7 days.",
        "FERTILIZER RECOMMENDATIONS (NPK kg/ha): Wheat: N=120, P=60, K=40. Rice: N=100, P=50, K=50. Potato: N=150, P=80, K=100. Cotton: N=120, P=60, K=60. Maize: N=120, P=60, K=40.",
        "Optimal soil pH ranges by crop: Rice: 5.5–6.5. Wheat: 6.0–7.5. Cotton: 5.8–8.0. Sugarcane: 6.0–7.5. Soybean: 6.0–7.0.",
        "For stem borer in rice, apply Cartap hydrochloride 4G at 18 kg/ha at tillering stage. For leaf folder apply Chlorpyrifos 20EC at 1.25 L/ha.",
        "Drip irrigation increases water use efficiency by 40–50% compared to flood irrigation. Recommended for sugarcane, vegetables, and orchards in Maharashtra.",
        "PM-Kisan scheme provides Rs 6000/year direct income support to eligible farmer families in three installments of Rs 2000 each.",
        "Kharif crops (sown June–July, harvested Oct–Nov): Rice, Maize, Jowar, Bajra, Cotton, Groundnut, Soybean.",
        "Rabi crops (sown Oct–Nov, harvested Mar–Apr): Wheat, Gram, Mustard, Sugarcane, Peas, Linseed.",
        "Soil Organic Carbon (SOC) above 1.5% indicates healthy soil. Below 0.5% is critically degraded. Cover cropping and zero-tillage increase SOC by 0.1–0.3% per year.",
        "NDVI (Normalized Difference Vegetation Index) range: <0.2 = bare soil/dead vegetation, 0.2–0.4 = sparse vegetation, 0.4–0.6 = moderate crop, >0.6 = healthy dense crop.",
        "Powdery Mildew in wheat: spray wettable sulphur (80%) at 2.5 kg/ha or propiconazole at 0.1% at first appearance and repeat after 15 days.",
        "Integrated Pest Management (IPM): use yellow sticky traps for whitefly, neem oil (3 mL/L) for soft-bodied insects, Trichogramma cards for stem borer biocontrol.",
    ]
    engine.add_documents(fallback_docs, [{"source": "fallback_agri_facts"} for _ in fallback_docs])

    _rag_engine = engine
    return _rag_engine
