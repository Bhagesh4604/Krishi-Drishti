import pdfplumber
from typing import List, Dict

def parse_agronomy_pdf(file_path: str) -> List[Dict]:
    """
    Parses complex agricultural PDFs, specially handling tables (like NPK charts) 
    so they don't lose structure when chunked for RAG.
    """
    chunks = []
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                # Extract plain text
                text = page.extract_text()
                if text:
                    # Basic chunking by paragraphs
                    paragraphs = text.split('\n\n')
                    for p in paragraphs:
                        if len(p.strip()) > 50:
                            chunks.append({
                                "type": "text", 
                                "content": p.strip(), 
                                "page": page_num + 1
                            })
                
                # Extract tables preserving structure for exact BM25 keyword matching
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        structured_table = "AGRONOMIC TABLE DATA:\n"
                        for row in table:
                            # filter out None cells and clean newlines inside cells
                            clean_row = [str(cell).strip().replace('\n', ' ') if cell else "" for cell in row]
                            # Use pipe delimiter for markdown-like structure
                            structured_table += " | ".join(clean_row) + "\n"
                        
                        chunks.append({
                            "type": "table", 
                            "content": structured_table, 
                            "page": page_num + 1
                        })
                        
    except Exception as e:
        print(f"Error parsing PDF {file_path}: {e}")
        
    return chunks
