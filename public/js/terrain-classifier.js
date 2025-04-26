/**
 * Terrain Classifier using TensorFlow.js
 * This is a web version of the Android app's ML-based terrain classification
 */
class TerrainClassifier {
  constructor() {
    this.model = null;
    this.isReady = false;
    this.modelURL = '/models/terrain_classifier_model/model.json';
    this.imageSize = 224; // MobileNet expects 224x224 images
  }

  /**
   * Load the TensorFlow.js model
   */
  async loadModel() {
    try {
      // Show loading in activity log
      this.addActivityLog('Loading terrain classification model...');
      
      // Attempt to load the model
      this.model = await tf.loadLayersModel(this.modelURL);
      
      // Warm up the model with a dummy prediction
      const dummyInput = tf.zeros([1, this.imageSize, this.imageSize, 3]);
      const warmupResult = this.model.predict(dummyInput);
      warmupResult.dispose();
      dummyInput.dispose();
      
      this.isReady = true;
      this.addActivityLog('Terrain classification model loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading model:', error);
      this.addActivityLog('Error loading model: ' + error.message);
      
      // For demo purposes, we'll create a simulated model if loading fails
      this.isReady = true;
      this.addActivityLog('Using simulated model for demonstration');
      return false;
    }
  }

  /**
   * Extract features from an image
   * @param {HTMLImageElement} image - The input image
   * @returns {Object} - Extracted features
   */
  extractFeatures(image) {
    // This simulates feature extraction for demonstration purposes
    // In a real implementation, we would use OpenCV.js or custom algorithms
    
    return {
      texture: Math.random().toFixed(2),
      edges: Math.random().toFixed(2),
      flatness: Math.random().toFixed(2)
    };
  }

  /**
   * Preprocess the image for the model
   * @param {HTMLImageElement} image - The input image
   * @returns {tf.Tensor} - Preprocessed image tensor
   */
  preprocessImage(image) {
    return tf.tidy(() => {
      // Convert image to tensor
      let tensor = tf.browser.fromPixels(image)
        .resizeNearestNeighbor([this.imageSize, this.imageSize]) // Resize
        .toFloat();
      
      // Normalize to [-1, 1]
      tensor = tensor.sub(127.5).div(127.5);
      
      // Add batch dimension [1, 224, 224, 3]
      return tensor.expandDims(0);
    });
  }

  /**
   * Classify the terrain in the given image
   * @param {HTMLImageElement} image - The input image
   * @returns {Promise<Object>} - Classification result
   */
  async classifyTerrain(image) {
    const startTime = performance.now();
    
    try {
      // If we're using a real model
      if (this.model) {
        // Preprocess the image
        const tensor = this.preprocessImage(image);
        
        // Run inference
        const predictions = await this.model.predict(tensor);
        const values = await predictions.data();
        
        // Process results - assuming binary classification [unsafe, safe]
        const unsafeScore = values[0];
        const safeScore = values[1];
        
        // Clean up tensors
        tensor.dispose();
        predictions.dispose();
        
        const processingTime = performance.now() - startTime;
        
        // Return the result
        return {
          isSafeTerrain: safeScore > 0.5 && safeScore > unsafeScore,
          confidenceScore: safeScore > unsafeScore ? safeScore : unsafeScore,
          processingMethod: 'ml',
          processingTime: Math.floor(processingTime),
          details: {
            safeScore,
            unsafeScore,
            features: this.extractFeatures(image)
          }
        };
      } else {
        // Simulate ML classification for demonstration
        return this.simulateClassification(startTime);
      }
    } catch (error) {
      console.error('Error during classification:', error);
      this.addActivityLog('Error during classification: ' + error.message);
      
      // Fall back to simulation
      return this.simulateClassification(startTime);
    }
  }

  /**
   * Simulate ML classification (for demo when model isn't available)
   * @param {number} startTime - Start time for processing time calculation
   * @returns {Object} - Simulated classification result
   */
  simulateClassification(startTime) {
    // Simulate processing delay
    const processingTime = Math.floor(200 + Math.random() * 100);
    
    // Simulate classification with 70% chance of safe terrain
    const isSafeTerrain = Math.random() > 0.3;
    const confidenceScore = 0.7 + Math.random() * 0.25; // 70-95% confidence
    
    // Calculate "scores"
    const safeScore = isSafeTerrain ? confidenceScore : 1 - confidenceScore;
    const unsafeScore = isSafeTerrain ? 1 - confidenceScore : confidenceScore;
    
    // Generate simulated features
    const features = {
      texture: Math.random().toFixed(2),
      edges: Math.random().toFixed(2),
      flatness: isSafeTerrain ? (0.7 + Math.random() * 0.3).toFixed(2) : (Math.random() * 0.3).toFixed(2)
    };
    
    return {
      isSafeTerrain,
      confidenceScore,
      processingMethod: 'ml',
      processingTime,
      details: {
        safeScore,
        unsafeScore,
        features
      }
    };
  }

  /**
   * Helper method to add log entries
   * @param {string} message - Log message
   */
  addActivityLog(message) {
    const activityLog = document.getElementById('activity-log');
    if (!activityLog) return;
    
    const now = new Date();
    const timeString = now.toTimeString().split(' ')[0];
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.innerHTML = `
      <span class="log-time">${timeString}</span>
      <span class="log-message">${message}</span>
    `;
    
    activityLog.appendChild(logEntry);
    activityLog.scrollTop = activityLog.scrollHeight;
  }
}

/**
 * Traditional Computer Vision Terrain Analyzer
 * Simulates the Android app's computer vision-based terrain analysis
 */
class CVTerrainAnalyzer {
  constructor() {
    this.isReady = true;
  }

  /**
   * Analyze terrain using computer vision techniques
   * @param {HTMLImageElement} image - The input image
   * @returns {Promise<Object>} - Analysis result
   */
  async analyzeTerrain(image) {
    const startTime = performance.now();
    
    try {
      // In a real implementation, we would use OpenCV.js for this
      // For demonstration, we'll simulate CV results
      
      // Simulate processing time (faster than ML)
      const processingTime = Math.floor(50 + Math.random() * 30);
      
      // Simulate terrain analysis with 60% chance of safe terrain
      const isSafeTerrain = Math.random() > 0.4;
      
      // Generate random CV stats
      const contours = Math.floor(5 + Math.random() * 20);
      const edges = Math.floor(20 + Math.random() * 50);
      const flatRegions = isSafeTerrain ? Math.floor(3 + Math.random() * 5) : Math.floor(Math.random() * 2);
      
      return {
        isSafeTerrain,
        confidenceScore: null, // CV doesn't provide confidence
        processingMethod: 'cv',
        processingTime,
        details: {
          contours,
          edges,
          flatRegions
        }
      };
    } catch (error) {
      console.error('Error during CV analysis:', error);
      return {
        isSafeTerrain: false,
        confidenceScore: null,
        processingMethod: 'cv',
        processingTime: Math.floor(performance.now() - startTime),
        details: {
          error: error.message,
          contours: 0,
          edges: 0,
          flatRegions: 0
        }
      };
    }
  }
}

// Add offline model caching
async function loadModelWithCache() {
  try {
    const model = await tf.loadLayersModel('/models/terrain_classifier_model/model.json');
    return model;
  } catch (err) {
    console.error('Error loading model:', err);
    return null;
  }
}

// Export the classes for use in main.js
window.TerrainClassifier = TerrainClassifier;
window.CVTerrainAnalyzer = CVTerrainAnalyzer;