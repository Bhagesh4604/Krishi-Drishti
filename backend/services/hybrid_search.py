import numpy as np
try:
    import faiss
except ImportError:
    faiss = None
from rank_bm25 import BM25Okapi

class HybridSearchEngine:
    def __init__(self, embedding_function, dimension=768):
        self.embedding_fn = embedding_function
        self.dimension = dimension
        
        self.corpus = []
        self.metadata = []
        self.bm25 = None
        
        if faiss:
            self.index = faiss.IndexFlatL2(self.dimension)
        else:
            self.index = None
            print("Warning: FAISS not installed. Falling back to pure BM25 search.")
            
    def add_documents(self, documents: list[str], metadata: list[dict] = None):
        """Adds text documents and their metadata to the index."""
        if not documents:
            return
            
        self.corpus.extend(documents)
        
        if metadata:
            self.metadata.extend(metadata)
        else:
            self.metadata.extend([{} for _ in documents])
            
        # 1. Update BM25 Sparse Index
        tokenized_corpus = [doc.lower().split(" ") for doc in self.corpus]
        self.bm25 = BM25Okapi(tokenized_corpus)
        
        # 2. Update FAISS Dense Index
        if self.index is not None:
            try:
                embeddings = self.embedding_fn(documents)
                if not embeddings:
                    return
                vectors = np.array(embeddings).astype('float32')
                self.index.add(vectors)
            except Exception as e:
                print(f"Error adding to FAISS: {e}")
                
    def search(self, query: str, top_k: int = 3, alpha: float = 0.5):
        """
        Retrieves using both Semantic (FAISS) and Sparse (BM25) search.
        alpha: weight given to Semantic relative to Sparse (0.0 to 1.0).
        """
        if not self.corpus:
            return []
            
        # 1. BM25 Sparse Search
        tokenized_query = query.lower().split(" ")
        bm25_scores = self.bm25.get_scores(tokenized_query)
        
        max_bm25 = max(bm25_scores) if len(bm25_scores) > 0 and max(bm25_scores) > 0 else 1.0
        norm_bm25_scores = [s / max_bm25 for s in bm25_scores]
        
        # 2. FAISS Dense Search
        norm_dense_scores = [0.0] * len(self.corpus)
        if self.index is not None and self.index.ntotal > 0:
            try:
                query_embedding = self.embedding_fn([query])[0]
                q_vec = np.array([query_embedding]).astype('float32')
                
                # Search all to get relative scores
                k_search = min(len(self.corpus), self.index.ntotal)
                distances, indices = self.index.search(q_vec, k_search)
                
                max_dist = np.max(distances[0]) if len(distances[0]) > 0 and np.max(distances[0]) > 0 else 1.0
                
                for rank, corpus_idx in enumerate(indices[0]):
                    if corpus_idx != -1:
                        # Convert distance to similarity
                        similarity = 1.0 - (distances[0][rank] / max_dist)
                        norm_dense_scores[corpus_idx] = similarity
            except Exception as e:
                print(f"FAISS search error: {e}")
            
        # 3. Combine Scores
        final_scores = []
        for i in range(len(self.corpus)):
            combined = (alpha * norm_dense_scores[i]) + ((1.0 - alpha) * norm_bm25_scores[i])
            final_scores.append({
                "score": combined,
                "content": self.corpus[i],
                "metadata": self.metadata[i]
            })
            
        # Sort and return top_k
        final_scores.sort(key=lambda x: x["score"], reverse=True)
        return final_scores[:top_k]
