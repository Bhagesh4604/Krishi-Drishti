import os
import json
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers
from tensorflow.keras.applications import EfficientNetB0
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
DATASET_DIR = r"C:\Users\bhage\.cache\kagglehub\datasets\emmarex\plantdisease\versions\1\PlantVillage"
MODEL_SAVE_PATH = BASE_DIR / "backend" / "ml_models" / "plant_disease_efficientnet.h5"
LABELS_SAVE_PATH = BASE_DIR / "backend" / "ml_models" / "class_labels_disease.json"

IMG_SIZE = 224
BATCH_SIZE = 16 # Perfect for RTX 2050 (4GB VRAM)

print("==================================================")
print("Krishi-Drishti: Local RTX 2050 Training Started")
print("==================================================")
print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))

# 1. Low-RAM Data Generators
print("Scanning dataset directory...")
train_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2,
    horizontal_flip=True,
    vertical_flip=True,
    rotation_range=20
)

val_datagen = ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2
)

train_gen = train_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical', # Use categorical to fix the 9% accuracy bug from Colab!
    subset='training'
)

val_gen = val_datagen.flow_from_directory(
    DATASET_DIR,
    target_size=(IMG_SIZE, IMG_SIZE),
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation'
)

class_names = list(train_gen.class_indices.keys())
num_classes = len(class_names)
print(f"Found {num_classes} classes.")

# 2. Build Model
print("Building EfficientNetB0 architecture...")
base = EfficientNetB0(input_shape=(IMG_SIZE, IMG_SIZE, 3), include_top=False, weights='imagenet')
base.trainable = False

inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
x = base(inputs, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
x = layers.Dense(512, activation='relu')(x)
outputs = layers.Dense(num_classes, activation='softmax')(x)
model = tf.keras.Model(inputs, outputs)

# 3. Train Phase 1 (Frozen Base)
print("\n--- Phase 1: Training Top Layers ---")
model.compile(optimizer=optimizers.Adam(1e-3), loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(train_gen, validation_data=val_gen, epochs=5)

# 4. Train Phase 2 (Fine-tuning)
print("\n--- Phase 2: Fine-tuning Base Model ---")
base.trainable = True
# Only unfreeze the very top layers of the base model to prevent the accuracy collapse we saw in Colab
for layer in base.layers[:-30]: 
    layer.trainable = False

# Use an extremely small learning rate so it learns carefully!
model.compile(optimizer=optimizers.Adam(1e-5), loss='categorical_crossentropy', metrics=['accuracy'])
model.fit(train_gen, validation_data=val_gen, epochs=5)

# 5. Save Model directly to backend
print("\nSaving model...")
model.save(str(MODEL_SAVE_PATH))

labels = {"classes": class_names, "class_to_idx": train_gen.class_indices}
with open(LABELS_SAVE_PATH, "w") as f:
    json.dump(labels, f)

print(f"✅ Training Complete! Model saved natively for TF 2.10.")
