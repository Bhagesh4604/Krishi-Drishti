import sys
try:
    from transformers import pipeline
except ImportError:
    print("Please install the required libraries first:")
    print("Run: pip install torch transformers")
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print("Usage: python check_ai.py <path_to_text_file>")
        sys.exit(1)

    file_path = sys.argv[1]
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        sys.exit(1)

    if not text.strip():
        print("The file is empty.")
        sys.exit(1)

    print("Loading AI detector model (this may take a minute the first time to download)...")
    # Load the pre-trained RoBERTa model fine-tuned for AI detection
    detector = pipeline("text-classification", model="roberta-base-openai-detector", truncation=True, max_length=510)
    
    # Language models have token limits (usually 512 tokens). 
    # To check a whole document, we split it into chunks of roughly 800 characters.
    chunk_size = 800
    chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]
    
    print(f"\nAnalyzing document in {len(chunks)} chunks...\n")
    
    total_ai_probability = 0
    valid_chunks = 0
    
    for i, chunk in enumerate(chunks):
        if not chunk.strip():
            continue
            
        results = detector(chunk)
        label = results[0]['label']
        confidence = results[0]['score'] * 100
        
        # 'Fake' means AI generated, 'Real' means Human written
        if label == "Fake":
            ai_score = confidence
        else:
            ai_score = 100 - confidence
            
        total_ai_probability += ai_score
        valid_chunks += 1
        print(f"Chunk {i+1}: {ai_score:.2f}% AI")
            
    if valid_chunks == 0:
        print("No valid text found to analyze.")
        sys.exit(1)
        
    average_ai = total_ai_probability / valid_chunks
    
    print("\n" + "="*40)
    print("FINAL RESULT")
    print("="*40)
    print(f"Overall AI-Generated Probability: {average_ai:.2f}%")
    
    if average_ai > 60:
        print("Conclusion: This document is highly likely to be AI-generated.")
    elif average_ai > 30:
        print("Conclusion: This document has a mix of Human and AI writing.")
    else:
        print("Conclusion: This document is likely Human-written.")
        
if __name__ == "__main__":
    main()
