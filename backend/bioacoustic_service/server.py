import os
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
from model_trainer import audio_to_spectrogram

app = FastAPI(title="Bioacoustic Pest Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

MODEL_PATH = "pest_audio_model.h5"
model = None

@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            model = tf.keras.models.load_model(MODEL_PATH)
            print(f"Loaded model from {MODEL_PATH}")
        except Exception as e:
            print(f"Error loading model: {e}")
    else:
        print(f"Warning: Model file {MODEL_PATH} not found. Please run model_trainer.py first.")

@app.post("/analyze-audio")
async def analyze_audio(file: UploadFile = File(...)):
    # Strict error handling for file types
    if not file.content_type.startswith('audio/'):
        if file.filename and not file.filename.lower().endswith('.wav'):
             raise HTTPException(status_code=400, detail="Invalid file type. Only audio files (.wav) are supported.")

    temp_file_path = f"temp_{file.filename}"
    try:
        # Save uploaded file temporarily
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        if model is None:
            raise HTTPException(status_code=500, detail="Model is not loaded.")

        # Convert to spectrogram
        try:
             spectrogram = audio_to_spectrogram(temp_file_path)
             # Add batch dimension
             spectrogram_batch = np.expand_dims(spectrogram, axis=0)
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Error processing audio file: {e}")

        # Run inference
        prediction = model.predict(spectrogram_batch)
        pest_detected = bool(prediction[0][0] > 0.5)
        confidence = float(prediction[0][0]) if pest_detected else float(1.0 - prediction[0][0])
        
        # Estimate specific pest type based on audio frequency (spectral centroid) if pest is detected
        pest_type = "None"
        if pest_detected:
            try:
                import librosa
                y, sr = librosa.load(temp_file_path, sr=None)
                centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
                avg_freq = np.mean(centroids)
                
                # Simple acoustic heuristic for insect classification
                if avg_freq > 5000:
                    pest_type = "Cicada / Leafhopper"
                elif avg_freq > 3000:
                    pest_type = "Locust / Cricket"
                elif avg_freq > 1500:
                    pest_type = "Beetle / Weevil"
                else:
                    pest_type = "Grub / Stem Borer"
            except Exception:
                pest_type = "Unidentified Pest"

        return JSONResponse(content={
            "pest_detected": pest_detected,
            "confidence": round(confidence, 4),
            "pest_type": pest_type
        })

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
