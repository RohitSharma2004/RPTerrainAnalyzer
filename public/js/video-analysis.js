/**
 * Terrain Analyzer - Video Analysis Module
 * Handles real-time video analysis for terrain classification
 */

class VideoTerrainAnalyzer {
  constructor() {
    // Video elements
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasContext = null;
    this.canvasOverlay = null;
    this.overlayContext = null;
    
    // Stream handling
    this.stream = null;
    this.isStreaming = false;
    this.isAnalyzing = false;
    this.isPaused = false;
    this.isRecording = false;
    this.recordedChunks = [];
    this.mediaRecorder = null;
    
    // Analysis options
    this.useML = true;
    this.showOverlay = true;
    this.analysisFPS = 5; // Frames to analyze per second
    this.lastAnalysisTime = 0;
    this.analysisInterval = 1000 / this.analysisFPS;
    
    // Analyzers
    this.mlAnalyzer = new TerrainClassifier();
    this.cvAnalyzer = new CVTerrainAnalyzer();
    
    // Analysis results
    this.currentResult = null;
    this.safeRegions = [];
    this.unsafeRegions = [];
    this.confidenceHistory = [];
    this.frameCount = 0;
    
    // Stats
    this.stats = {
      totalFrames: 0,
      safeFrames: 0,
      unsafeFrames: 0,
      averageConfidence: 0,
      processingTime: 0
    };
    
    // Callbacks
    this.onAnalysisResult = null;
    this.onStatusChange = null;
    this.onError = null;
  }
  
  /**
   * Initialize the video analyzer with required elements
   * @param {Object} config - Configuration object
   */
  async initialize(config) {
    try {
      // Set up DOM elements
      this.videoElement = config.videoElement;
      this.canvasElement = config.canvasElement;
      this.canvasOverlay = config.canvasOverlay;
      
      // Handle callbacks
      this.onAnalysisResult = config.onAnalysisResult || function() {};
      this.onStatusChange = config.onStatusChange || function() {};
      this.onError = config.onError || function() {};
      
      // Set up canvas contexts
      if (this.canvasElement) {
        this.canvasContext = this.canvasElement.getContext('2d');
      }
      
      if (this.canvasOverlay) {
        this.overlayContext = this.canvasOverlay.getContext('2d');
      }
      
      // Initialize ML analyzer
      await this.mlAnalyzer.loadModel();
      
      // Set initial status
      this.onStatusChange({
        status: 'ready',
        message: 'Video analyzer initialized'
      });
      
      return true;
    } catch (error) {
      console.error('Error initializing video analyzer:', error);
      this.onError({
        type: 'initialization',
        message: error.message
      });
      return false;
    }
  }
  
  /**
   * Start capturing video from camera
   */
  async startCamera() {
    try {
      // Check if already streaming
      if (this.isStreaming) {
        return true;
      }
      
      // Set status
      this.onStatusChange({
        status: 'connecting',
        message: 'Connecting to camera'
      });
      
      // Request camera access
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment'
        }
      };
      
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set video source
      this.videoElement.srcObject = this.stream;
      this.isStreaming = true;
      
      // Wait for video to be ready
      await new Promise(resolve => {
        this.videoElement.onloadedmetadata = () => {
          // Set canvas dimensions to match video
          if (this.canvasElement) {
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;
          }
          
          if (this.canvasOverlay) {
            this.canvasOverlay.width = this.videoElement.videoWidth;
            this.canvasOverlay.height = this.videoElement.videoHeight;
          }
          
          resolve();
        };
      });
      
      // Start playback
      await this.videoElement.play();
      
      // Set status
      this.onStatusChange({
        status: 'connected',
        message: 'Camera connected'
      });
      
      return true;
    } catch (error) {
      console.error('Error starting camera:', error);
      this.onError({
        type: 'camera',
        message: error.message
      });
      return false;
    }
  }
  
  /**
   * Stop camera stream
   */
  stopCamera() {
    if (!this.isStreaming) return;
    
    // Stop all tracks
    this.stream.getTracks().forEach(track => track.stop());
    this.videoElement.srcObject = null;
    this.isStreaming = false;
    
    // Clear canvas
    if (this.canvasContext) {
      this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    
    if (this.overlayContext) {
      this.overlayContext.clearRect(0, 0, this.canvasOverlay.width, this.canvasOverlay.height);
    }
    
    // Set status
    this.onStatusChange({
      status: 'stopped',
      message: 'Camera stopped'
    });
  }
  
  /**
   * Pause or resume video
   */
  togglePause() {
    if (!this.isStreaming) return;
    
    if (this.isPaused) {
      // Resume
      this.videoElement.play();
      this.isPaused = false;
      this.onStatusChange({
        status: 'resumed',
        message: 'Video resumed'
      });
    } else {
      // Pause
      this.videoElement.pause();
      this.isPaused = true;
      this.onStatusChange({
        status: 'paused',
        message: 'Video paused'
      });
    }
    
    return this.isPaused;
  }
  
  /**
   * Start real-time analysis
   * @param {Object} options - Analysis options
   */
  startAnalysis(options = {}) {
    if (!this.isStreaming) {
      this.onError({
        type: 'analysis',
        message: 'Cannot start analysis: No active video stream'
      });
      return false;
    }
    
    // Set options
    this.useML = options.useML !== undefined ? options.useML : true;
    this.showOverlay = options.showOverlay !== undefined ? options.showOverlay : true;
    this.analysisFPS = options.analysisFPS || 5;
    this.analysisInterval = 1000 / this.analysisFPS;
    
    // Reset stats
    this.resetStats();
    
    // Start analysis
    this.isAnalyzing = true;
    this.analyzeFrame();
    
    // Set status
    this.onStatusChange({
      status: 'analyzing',
      message: `Started ${this.useML ? 'ML' : 'CV'} analysis at ${this.analysisFPS} FPS`
    });
    
    return true;
  }
  
  /**
   * Stop real-time analysis
   */
  stopAnalysis() {
    this.isAnalyzing = false;
    
    // Clear overlay
    if (this.overlayContext) {
      this.overlayContext.clearRect(0, 0, this.canvasOverlay.width, this.canvasOverlay.height);
    }
    
    // Set status
    this.onStatusChange({
      status: 'stopped',
      message: 'Analysis stopped'
    });
  }
  
  /**
   * Toggle between ML and CV analysis
   */
  toggleAnalysisMode() {
    this.useML = !this.useML;
    
    // Update status
    this.onStatusChange({
      status: 'mode_change',
      message: `Switched to ${this.useML ? 'Machine Learning' : 'Computer Vision'} analysis`
    });
    
    return this.useML;
  }
  
  /**
   * Start video recording
   */
  startRecording() {
    if (!this.isStreaming || this.isRecording) return false;
    
    try {
      // Create media recorder
      const options = { mimeType: 'video/webm;codecs=vp9' };
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      
      // Set up data handling
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Set status
      this.onStatusChange({
        status: 'recording',
        message: 'Recording started'
      });
      
      return true;
    } catch (error) {
      console.error('Error starting recording:', error);
      this.onError({
        type: 'recording',
        message: error.message
      });
      return false;
    }
  }
  
  /**
   * Stop video recording and save
   */
  stopRecording() {
    if (!this.isRecording) return null;
    
    return new Promise((resolve) => {
      // Set up stop callback
      this.mediaRecorder.onstop = () => {
        // Create blob from chunks
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        this.isRecording = false;
        this.recordedChunks = [];
        
        // Set status
        this.onStatusChange({
          status: 'recorded',
          message: 'Recording saved'
        });
        
        resolve({ blob, url });
      };
      
      // Stop recording
      this.mediaRecorder.stop();
    });
  }
  
  /**
   * Capture a single frame for analysis
   */
  captureFrame() {
    if (!this.isStreaming) return null;
    
    // Draw current frame to canvas
    this.canvasContext.drawImage(
      this.videoElement, 
      0, 0, 
      this.canvasElement.width, 
      this.canvasElement.height
    );
    
    return this.canvasElement;
  }
  
  /**
   * Analyze a single video frame
   */
  async analyzeFrame() {
    if (!this.isAnalyzing || this.isPaused) return;
    
    const now = performance.now();
    const elapsed = now - this.lastAnalysisTime;
    
    // Throttle analysis to maintain target FPS
    if (elapsed >= this.analysisInterval) {
      this.lastAnalysisTime = now;
      
      try {
        // Capture current frame
        const frame = this.captureFrame();
        if (!frame) return;
        
        let result;
        // Use appropriate analyzer
        if (this.useML) {
          result = await this.mlAnalyzer.classifyTerrain(frame);
        } else {
          result = await this.cvAnalyzer.analyzeTerrain(frame);
        }
        
        // Store result
        this.currentResult = result;
        
        // Update stats
        this.updateStats(result);
        
        // Draw visualization
        if (this.showOverlay) {
          this.drawAnalysisOverlay(result);
        }
        
        // Call result callback
        this.onAnalysisResult(result);
      } catch (error) {
        console.error('Error analyzing frame:', error);
        this.onError({
          type: 'analysis',
          message: error.message
        });
      }
    }
    
    // Continue analysis loop
    if (this.isAnalyzing) {
      requestAnimationFrame(() => this.analyzeFrame());
    }
  }
  
  /**
   * Draw analysis visualization overlay
   * @param {Object} result - Analysis result
   */
  drawAnalysisOverlay(result) {
    if (!this.overlayContext) return;
    
    // Clear previous overlay
    this.overlayContext.clearRect(0, 0, this.canvasOverlay.width, this.canvasOverlay.height);
    
    // Different visualization based on analysis method
    if (result.processingMethod === 'ml') {
      this.drawMLOverlay(result);
    } else {
      this.drawCVOverlay(result);
    }
  }
  
  /**
   * Draw ML-specific visualization
   * @param {Object} result - ML analysis result
   */
  drawMLOverlay(result) {
    const ctx = this.overlayContext;
    const { width, height } = this.canvasOverlay;
    
    // Color based on safety
    const color = result.isSafeTerrain ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
    
    // Draw border
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    
    // Draw info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, height - 80, 300, 70);
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`ML Analysis: ${result.isSafeTerrain ? 'SAFE' : 'UNSAFE'} (${Math.round(result.confidenceScore * 100)}%)`, 20, height - 55);
    ctx.fillText(`Processing: ${result.processingTime}ms | Frame: ${this.frameCount}`, 20, height - 30);
    
    // Draw confidence meter
    const meterWidth = 280;
    const meterHeight = 8;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(20, height - 15, meterWidth, meterHeight);
    
    ctx.fillStyle = result.isSafeTerrain ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
    ctx.fillRect(20, height - 15, meterWidth * result.confidenceScore, meterHeight);
    
    // Draw safe regions (simulated)
    if (result.isSafeTerrain) {
      // Center region simulation
      const regionWidth = width * 0.5;
      const regionHeight = height * 0.4;
      const x = (width - regionWidth) / 2;
      const y = (height - regionHeight) / 2;
      
      // Draw region
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(x, y, regionWidth, regionHeight);
      ctx.setLineDash([]);
      
      // Draw label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x, y - 25, 140, 25);
      ctx.fillStyle = '#4caf50';
      ctx.font = '14px Arial';
      ctx.fillText('SAFE LANDING ZONE', x + 10, y - 8);
    }
  }
  
  /**
   * Draw CV-specific visualization
   * @param {Object} result - CV analysis result
   */
  drawCVOverlay(result) {
    const ctx = this.overlayContext;
    const { width, height } = this.canvasOverlay;
    
    // Color based on safety
    const color = result.isSafeTerrain ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)';
    
    // Draw edge detection visualization (simulated)
    if (result.isSafeTerrain) {
      // Draw grid pattern to simulate CV edge detection
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      
      // Horizontal grid lines
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      
      // Draw safe regions
      const regions = [
        { x: width * 0.2, y: height * 0.4, w: width * 0.3, h: height * 0.3 },
        { x: width * 0.6, y: height * 0.5, w: width * 0.25, h: height * 0.2 }
      ];
      
      regions.forEach(region => {
        // Draw region
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(region.x, region.y, region.w, region.h);
        
        // Fill with transparent color
        ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
        ctx.fillRect(region.x, region.y, region.w, region.h);
      });
    } else {
      // Draw simulated edge detection for unsafe terrain
      const numEdges = 50;
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.8)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < numEdges; i++) {
        const x1 = Math.random() * width;
        const y1 = Math.random() * height;
        const length = 30 + Math.random() * 50;
        const angle = Math.random() * Math.PI * 2;
        
        const x2 = x1 + Math.cos(angle) * length;
        const y2 = y1 + Math.sin(angle) * length;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    
    // Draw info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(10, height - 70, 300, 60);
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.fillText(`CV Analysis: ${result.isSafeTerrain ? 'SAFE' : 'UNSAFE'}`, 20, height - 45);
    ctx.fillText(`Processing: ${result.processingTime}ms | Frame: ${this.frameCount}`, 20, height - 20);
  }
  
  /**
   * Update analysis statistics
   * @param {Object} result - Analysis result
   */
  updateStats(result) {
    this.frameCount++;
    this.stats.totalFrames++;
    
    if (result.isSafeTerrain) {
      this.stats.safeFrames++;
    } else {
      this.stats.unsafeFrames++;
    }
    
    // Update confidence history (ML only)
    if (result.processingMethod === 'ml' && result.confidenceScore !== null) {
      this.confidenceHistory.push(result.confidenceScore);
      
      // Limit history to last 100 frames
      if (this.confidenceHistory.length > 100) {
        this.confidenceHistory.shift();
      }
      
      // Calculate average confidence
      const sum = this.confidenceHistory.reduce((total, score) => total + score, 0);
      this.stats.averageConfidence = sum / this.confidenceHistory.length;
    }
    
    // Update processing time
    this.stats.processingTime = result.processingTime;
  }
  
  /**
   * Reset analysis statistics
   */
  resetStats() {
    this.frameCount = 0;
    this.stats = {
      totalFrames: 0,
      safeFrames: 0,
      unsafeFrames: 0,
      averageConfidence: 0,
      processingTime: 0
    };
    this.confidenceHistory = [];
  }
  
  /**
   * Get current statistics
   */
  getStats() {
    const safePercentage = this.stats.totalFrames > 0 
      ? (this.stats.safeFrames / this.stats.totalFrames) * 100 
      : 0;
    
    return {
      ...this.stats,
      safePercentage: Math.round(safePercentage),
      unsafePercentage: Math.round(100 - safePercentage),
      averageConfidence: Math.round(this.stats.averageConfidence * 100)
    };
  }
  
  /**
   * Get current analysis result
   */
  getCurrentResult() {
    return this.currentResult;
  }
}

// Export for use in main.js
window.VideoTerrainAnalyzer = VideoTerrainAnalyzer;