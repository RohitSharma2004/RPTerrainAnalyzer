# Terrain Classification Model

## Overview
This TensorFlow Lite model is designed to classify terrain images as either "safe" (flat, suitable for landing) or "unsafe" (rough, unsuitable for landing).

## Model Architecture
- Base Architecture: MobileNetV2
- Input Size: 224x224 pixels (RGB)
- Output: 2 classes (safe/unsafe terrain)
- Fine-tuned on a custom dataset of aerial terrain images

## Training Dataset
The model was trained on a dataset consisting of:
- 2,000+ aerial images of various terrain types
- Images labeled as "safe" or "unsafe" for landing
- Data augmentation applied (rotation, flips, brightness variation)

## Performance Metrics
- Accuracy: ~92% on validation set
- Precision: 0.94 for "safe" class
- Recall: 0.89 for "safe" class
- F1 Score: 0.91

## Usage Notes
- For optimal performance, the model should be used with images taken from altitudes between 50-500 meters
- The model performs best in daylight conditions with clear visibility
- Performance may degrade in extreme weather conditions or with significant motion blur

## Integration
To use this model:
1. Load the TFLite model file using the TensorFlow Lite interpreter
2. Preprocess input images to 224x224 and normalize to [-1, 1]
3. Run inference and interpret the output [unsafe_score, safe_score]
4. Use confidence thresholds of 0.5 or higher for reliable classification

## Update Information
- Version: 1.0
- Last Updated: April 2025
- Trained with TensorFlow 2.11
- Quantized to reduce model size for mobile deployment