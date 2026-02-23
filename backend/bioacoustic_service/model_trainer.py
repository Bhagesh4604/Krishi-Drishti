import os
import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout

def audio_to_spectrogram(file_path):
    """
    Load a .wav file and convert it to a Mel-spectrogram optimized for 
    high-frequency micro-sounds (e.g., pest feeding vibrations).
    """
    # High sample rate for high-frequency capture
    sr = 44100
    y, _ = librosa.load(file_path, sr=sr)
    
    # Parameters optimized for high-frequency transients rather than human speech
    n_fft = 1024       # Shorter window for better time resolution of clicks/bites
    hop_length = 256   # Frequent sampling of the window
    n_mels = 128       # High resolution in the frequency domain
    fmin = 1000        # Ignore low-frequency background noise (wind, distant machinery)
    fmax = sr // 2     # Capture up to Nyquist frequency
    
    ms = librosa.feature.melspectrogram(
        y=y, 
        sr=sr, 
        n_fft=n_fft, 
        hop_length=hop_length, 
        n_mels=n_mels,
        fmin=fmin,
        fmax=fmax
    )
    
    log_ms = librosa.power_to_db(ms, ref=np.max)
    
    # Ensure consistent shape (padding/truncating to a fixed length, e.g., ~10 seconds)
    target_frames = 1723 # approx 10 seconds at sr=44100, hop=256
    if log_ms.shape[1] < target_frames:
        pad_width = target_frames - log_ms.shape[1]
        log_ms = np.pad(log_ms, pad_width=((0, 0), (0, pad_width)), mode='constant')
    else:
        log_ms = log_ms[:, :target_frames]
        
    # Add channel dimension for CNN (Height, Width, Channels)
    log_ms = np.expand_dims(log_ms, axis=-1)
    return log_ms

def create_model(input_shape):
    """
    Lightweight CNN architecture for 2D image classification (spectrograms).
    """
    model = Sequential([
        Conv2D(16, (3, 3), activation='relu', input_shape=input_shape),
        MaxPooling2D((2, 2)),
        Conv2D(32, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D((2, 2)),
        Flatten(),
        Dense(64, activation='relu'),
        Dropout(0.5),
        Dense(1, activation='sigmoid') # Binary classification: Pest / No Pest
    ])
    
    model.compile(optimizer='adam',
                  loss='binary_crossentropy',
                  metrics=['accuracy'])
    return model

def train_model():
    """
    Compiles the model, loads actual data from insect_sounds, and trains.
    """
    input_shape = (128, 1723, 1) # Matches the output of audio_to_spectrogram
    model = create_model(input_shape)
    
    data_dir = "insect_sounds"
    if not os.path.exists(data_dir):
        print(f"Data directory {data_dir} not found. Ensure it exists.")
        return

    print(f"Loading actual training data from {data_dir}...")
    X = []
    y = []
    
    files = [f for f in os.listdir(data_dir) if f.endswith('.wav')]
    for f in files:
        file_path = os.path.join(data_dir, f)
        try:
            spec = audio_to_spectrogram(file_path)
            X.append(spec)
            # Assume files in `insect_sounds` are pests (1)
            y.append(1)
        except Exception as e:
            print(f"Error processing {f}: {e}")
            
    # Add negative examples (random noise) to balance dataset
    num_negatives = len(X) if len(X) > 0 else 10
    print(f"Adding {num_negatives} synthetic negative (noise) examples...")
    for _ in range(num_negatives):
        X.append(np.random.rand(128, 1723, 1) * -80)  # low dB noise
        y.append(0)
        
    if len(X) == 0:
        print("No data available to train.")
        return

    X = np.array(X)
    y = np.array(y)
    
    # Shuffle data
    indices = np.arange(len(X))
    np.random.shuffle(indices)
    X = X[indices]
    y = y[indices]

    print(f"Training on {len(X)} samples ({np.sum(y)} positive cases)...")
    
    # Train the model
    model.fit(X, y, epochs=5, batch_size=8, validation_split=0.2)
    
    model_path = "pest_audio_model.h5"
    model.save(model_path)
    print(f"Model saved to {model_path}")

if __name__ == "__main__":
    train_model()
