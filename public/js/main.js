// Terrain Analyzer Pro - Main JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements - Common
  const activityLog = document.getElementById('activity-log');
  const clearLogBtn = document.getElementById('clear-log-btn');
  
  // DOM Elements - Status Indicators
  const cameraStatus = document.getElementById('camera-status');
  const mlStatus = document.getElementById('ml-status');
  const bluetoothStatus = document.getElementById('bluetooth-status');
  const cameraStatusText = document.getElementById('camera-status-text');
  const mlStatusText = document.getElementById('ml-status-text');
  const bluetoothStatusText = document.getElementById('bluetooth-status-text');
  
  // DOM Elements - Image Analysis
  const uploadForm = document.getElementById('upload-form');
  const imageInput = document.getElementById('imageInput');
  const previewImage = document.getElementById('preview-image');
  const uploadPrompt = document.getElementById('upload-prompt');
  const previewContainer = document.getElementById('preview-container');
  const analyzeBtn = document.getElementById('analyze-btn');
  const processingIndicator = document.getElementById('processing-indicator');
  const resultsContainer = document.getElementById('results-container');
  const mlToggle = document.getElementById('mlToggle');
  const sendCommandBtn = document.getElementById('send-command-btn');
  const resetBtn = document.getElementById('reset-btn');
  const analysisVisualization = document.getElementById('analysis-visualization');
  
  // DOM Elements - Results Display
  const terrainIndicator = document.getElementById('terrain-indicator');
  const terrainStatusText = document.getElementById('terrain-status-text');
  const processingMethod = document.getElementById('processing-method');
  const processingTime = document.getElementById('processing-time');
  const confidenceContainer = document.getElementById('confidence-container');
  const confidenceScore = document.getElementById('confidence-score');
  const featureDetails = document.getElementById('feature-details');
  
  // DOM Elements - Video Analysis
  const videoFeed = document.getElementById('video-feed');
  const canvasCapture = document.getElementById('canvas-capture');
  const canvasOverlay = document.getElementById('canvas-overlay');
  const cameraToggleBtn = document.getElementById('camera-toggle-btn');
  const recordBtn = document.getElementById('record-btn');
  const pauseVideoBtn = document.getElementById('pause-video-btn');
  const analyzeVideoBtn = document.getElementById('analyze-video-btn');
  const captureFrameBtn = document.getElementById('capture-frame-btn');
  const toggleOverlayBtn = document.getElementById('toggle-overlay-btn');
  const recordingIndicator = document.getElementById('recording-indicator');
  const toggleCV = document.getElementById('toggleCV');
  const toggleML = document.getElementById('toggleML');
  const fpsDownBtn = document.getElementById('fps-down-btn');
  const fpsDisplayBtn = document.getElementById('fps-display');
  const fpsUpBtn = document.getElementById('fps-up-btn');
  
  // DOM Elements - Video Results
  const videoTerrainIndicator = document.getElementById('video-terrain-indicator');
  const videoStatusText = document.getElementById('video-status-text');
  const safeFrames = document.getElementById('safe-frames');
  const avgConfidence = document.getElementById('avg-confidence');
  const totalFrames = document.getElementById('total-frames');
  const processingTimeAvg = document.getElementById('processing-time-avg');
  const featureFlatness = document.getElementById('feature-flatness');
  const featureTexture = document.getElementById('feature-texture');
  const featureEdges = document.getElementById('feature-edges');
  
  // DOM Elements - Terrain 3D View
  const terrainGrid = document.getElementById('terrain-grid');
  
  // State Management
  let darkModeEnabled = false;
  let currentRecording = null;
  
  // Initialize analyzers
  const imageTerrainClassifier = new TerrainClassifier();
  const imageCVAnalyzer = new CVTerrainAnalyzer();
  const videoAnalyzer = new VideoTerrainAnalyzer();
  
  // Initialize application
  async function initializeApp() {
    // Set initial status indicators
    initializeStatusIndicators();
    
    // Initialize terrain grid
    initializeTerrain3D();
    
    // Initialize image analyzer
    try {
      mlStatus.className = 'status-dot status-inactive';
      mlStatusText.textContent = 'Loading...';
      
      const modelLoaded = await imageTerrainClassifier.loadModel();
      
      // Update UI to reflect ML status
      mlStatus.className = 'status-dot ' + (modelLoaded ? 'status-active' : 'status-inactive');
      mlStatusText.textContent = modelLoaded ? 'Active' : 'Simulated';
    } catch (error) {
      console.error('Error initializing ML:', error);
      logActivity('Error initializing ML: ' + error.message);
      
      mlStatus.className = 'status-dot status-error';
      mlStatusText.textContent = 'Error';
    }
    
    // Initialize video analyzer if available
    if (videoFeed && canvasCapture && canvasOverlay) {
      try {
        await videoAnalyzer.initialize({
          videoElement: videoFeed,
          canvasElement: canvasCapture,
          canvasOverlay: canvasOverlay,
          onAnalysisResult: handleVideoAnalysisResult,
          onStatusChange: handleVideoStatusChange,
          onError: handleVideoError
        });
      } catch (error) {
        console.error('Error initializing video analyzer:', error);
        logActivity('Error initializing video analyzer: ' + error.message);
      }
    }
  }
  
  // Call initialization
  initializeApp();
  
  // Common Event Listeners
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', function() {
      if (activityLog) {
        activityLog.innerHTML = '';
        logActivity('Activity log cleared');
      }
    });
  }
  
  // Dark Mode Toggle
  const darkModeToggle = document.querySelector('.dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', function() {
      document.body.classList.toggle('dark-mode');
      darkModeEnabled = !darkModeEnabled;
      const icon = darkModeToggle.querySelector('i');
      if (darkModeEnabled) {
        icon.className = 'fas fa-sun';
      } else {
        icon.className = 'fas fa-moon';
      }
      
      logActivity(`${darkModeEnabled ? 'Dark' : 'Light'} mode enabled`);
    });
  }
  
  //
  // Image Analysis Section
  //
  
  // Preview image handling
  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        previewImageFile(file);
      }
    });
  }
  
  // Drag and drop handling
  if (previewContainer) {
    previewContainer.addEventListener('dragover', function(e) {
      e.preventDefault();
      previewContainer.classList.add('active');
    });
    
    previewContainer.addEventListener('dragleave', function() {
      previewContainer.classList.remove('active');
    });
    
    previewContainer.addEventListener('drop', function(e) {
      e.preventDefault();
      previewContainer.classList.remove('active');
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        imageInput.files = e.dataTransfer.files;
        previewImageFile(file);
      }
    });
    
    previewContainer.addEventListener('click', function() {
      imageInput.click();
    });
  }
  
  // ML toggle handling
  if (mlToggle) {
    mlToggle.addEventListener('change', function() {
      const isChecked = mlToggle.checked;
      logActivity(`${isChecked ? 'Enabled' : 'Disabled'} Machine Learning mode for image analysis`);
    });
  }
  
  // Form submission for image analysis
  if (uploadForm) {
    uploadForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (!imageInput.files || imageInput.files.length === 0) {
        showToast('Please select an image first', 'warning');
        return;
      }
      
      analyzeImage();
    });
  }
  
  // Send command button
  if (sendCommandBtn) {
    sendCommandBtn.addEventListener('click', function() {
      const command = terrainIndicator.classList.contains('terrain-safe') ? 'L' : 'R';
      sendCommandToController(command);
    });
  }
  
  // Reset button for image analysis
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      resetImageAnalysis();
    });
  }
  
  //
  // Video Analysis Section
  //
  
  // Camera toggle button
  if (cameraToggleBtn) {
    cameraToggleBtn.addEventListener('click', async function() {
      if (videoAnalyzer.isStreaming) {
        stopCamera();
      } else {
        startCamera();
      }
    });
  }
  
  // Video analysis controls
  if (analyzeVideoBtn) {
    analyzeVideoBtn.addEventListener('click', function() {
      if (videoAnalyzer.isAnalyzing) {
        stopVideoAnalysis();
      } else {
        startVideoAnalysis();
      }
    });
  }
  
  // Pause button
  if (pauseVideoBtn) {
    pauseVideoBtn.addEventListener('click', function() {
      if (!videoAnalyzer.isStreaming) return;
      
      const isPaused = videoAnalyzer.togglePause();
      pauseVideoBtn.innerHTML = isPaused ? 
        '<i class="fas fa-play"></i>' : 
        '<i class="fas fa-pause"></i>';
    });
  }
  
  // Capture frame button
  if (captureFrameBtn) {
    captureFrameBtn.addEventListener('click', captureVideoFrame);
  }
  
  // Toggle overlay button
  if (toggleOverlayBtn) {
    toggleOverlayBtn.addEventListener('click', function() {
      if (!videoAnalyzer.isAnalyzing) return;
      
      videoAnalyzer.showOverlay = !videoAnalyzer.showOverlay;
      toggleOverlayBtn.innerHTML = videoAnalyzer.showOverlay ?
        '<i class="fas fa-eye"></i>' :
        '<i class="fas fa-eye-slash"></i>';
        
      logActivity(`Analysis overlay ${videoAnalyzer.showOverlay ? 'shown' : 'hidden'}`);
    });
  }
  
  // Record button
  if (recordBtn) {
    recordBtn.addEventListener('click', async function() {
      if (!videoAnalyzer.isStreaming) return;
      
      if (videoAnalyzer.isRecording) {
        // Stop recording
        try {
          const recording = await videoAnalyzer.stopRecording();
          currentRecording = recording;
          
          // Show recording saved notification
          showToast('Recording saved!', 'success');
          
          // Update UI
          recordBtn.innerHTML = '<i class="fas fa-circle"></i> Record';
          recordingIndicator.style.display = 'none';
          
          // Offer download
          const downloadLink = document.createElement('a');
          downloadLink.href = recording.url;
          downloadLink.download = `terrain-analysis-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
          downloadLink.click();
        } catch (error) {
          showToast('Error saving recording: ' + error.message, 'danger');
        }
      } else {
        // Start recording
        const success = videoAnalyzer.startRecording();
        if (success) {
          // Update UI
          recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop';
          recordingIndicator.style.display = 'flex';
        } else {
          showToast('Failed to start recording', 'danger');
        }
      }
    });
  }
  
  // Analysis method toggle (CV vs ML)
  if (toggleCV && toggleML) {
    toggleCV.addEventListener('change', function() {
      if (this.checked) {
        videoAnalyzer.useML = false;
        updateVideoAnalysisMethod();
      }
    });
    
    toggleML.addEventListener('change', function() {
      if (this.checked) {
        videoAnalyzer.useML = true;
        updateVideoAnalysisMethod();
      }
    });
  }
  
  // FPS controls
  if (fpsDownBtn && fpsUpBtn && fpsDisplayBtn) {
    fpsDownBtn.addEventListener('click', function() {
      if (!videoAnalyzer.isAnalyzing) return;
      
      const currentFPS = videoAnalyzer.analysisFPS;
      if (currentFPS > 1) {
        videoAnalyzer.analysisFPS = currentFPS - 1;
        videoAnalyzer.analysisInterval = 1000 / videoAnalyzer.analysisFPS;
        fpsDisplayBtn.textContent = `${videoAnalyzer.analysisFPS} FPS`;
      }
    });
    
    fpsUpBtn.addEventListener('click', function() {
      if (!videoAnalyzer.isAnalyzing) return;
      
      const currentFPS = videoAnalyzer.analysisFPS;
      if (currentFPS < 15) {
        videoAnalyzer.analysisFPS = currentFPS + 1;
        videoAnalyzer.analysisInterval = 1000 / videoAnalyzer.analysisFPS;
        fpsDisplayBtn.textContent = `${videoAnalyzer.analysisFPS} FPS`;
      }
    });
  }
  
  //
  // Functions - Common
  //
  
  function initializeStatusIndicators() {
    // Set initial status
    cameraStatus.className = 'status-dot status-inactive';
    mlStatus.className = 'status-dot status-inactive';
    bluetoothStatus.className = 'status-dot status-inactive';
    
    cameraStatusText.textContent = 'Ready';
    mlStatusText.textContent = 'Loading...';
    bluetoothStatusText.textContent = 'Simulated';
    
    logActivity('System initialized');
    logActivity('Controller simulation ready');
  }
  
  function initializeTerrain3D() {
    if (!terrainGrid) return;
    
    // Clear the grid
    terrainGrid.innerHTML = '';
    
    // Create grid points
    for (let i = 0; i < 20; i++) {
      for (let j = 0; j < 20; j++) {
        const point = document.createElement('div');
        point.className = 'terrain-point';
        point.dataset.row = i;
        point.dataset.col = j;
        
        const inner = document.createElement('div');
        inner.className = 'terrain-point-inner';
        inner.style.backgroundColor = '#4caf50';
        inner.style.opacity = '0.2';
        inner.style.transform = `translateZ(0px)`;
        
        point.appendChild(inner);
        terrainGrid.appendChild(point);
      }
    }
  }
  
  function updateTerrain3D(result) {
    if (!terrainGrid || !result) return;
    
    // Get all terrain points
    const points = terrainGrid.querySelectorAll('.terrain-point-inner');
    
    // Generate a height map based on analysis result
    const heightMap = generateHeightMap(result);
    
    // Update each point
    points.forEach((point, index) => {
      const row = Math.floor(index / 20);
      const col = index % 20;
      
      // Get height for this point
      const height = heightMap[row][col];
      
      // Update point
      point.style.backgroundColor = height > 5 ? '#d32f2f' : '#4caf50';
      point.style.opacity = height > 5 ? '0.6' : '0.4';
      point.style.transform = `translateZ(${height}px)`;
    });
  }
  
  function generateHeightMap(result) {
    // This is a simplified simulation - in a real application,
    // this would be based on actual terrain data from the analysis
    const heightMap = [];
    const isSafe = result.isSafeTerrain;
    
    for (let i = 0; i < 20; i++) {
      heightMap[i] = [];
      for (let j = 0; j < 20; j++) {
        if (isSafe) {
          // Safe terrain - mostly flat with small variations
          const centerDist = Math.sqrt(Math.pow((i - 10), 2) + Math.pow((j - 10), 2));
          heightMap[i][j] = Math.min(20, Math.max(0, centerDist / 2)) * Math.random();
        } else {
          // Unsafe terrain - more varied heights
          const noise = (Math.sin(i * 0.5) + Math.cos(j * 0.5)) * 5;
          heightMap[i][j] = Math.abs(noise * (1 + Math.random()));
        }
      }
    }
    
    return heightMap;
  }
  
  function logActivity(message) {
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
    
    // Limit log entries to prevent excessive memory usage
    if (activityLog.children.length > 100) {
      activityLog.removeChild(activityLog.children[0]);
    }
  }
  
  //
  // Functions - Image Analysis
  //
  
  function previewImageFile(file) {
    if (!file.type.match('image.*')) {
      showToast('Please select an image file', 'warning');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
      previewImage.src = e.target.result;
      previewImage.classList.remove('d-none');
      uploadPrompt.classList.add('d-none');
      analyzeBtn.disabled = false;
      
      logActivity(`Image loaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
  }
  
  async function analyzeImage() {
    // Show processing indicator
    processingIndicator.classList.remove('d-none');
    resultsContainer.classList.add('d-none');
    analyzeBtn.disabled = true;
    
    // Check if image is loaded
    if (!previewImage.src) {
      showToast('No image to analyze', 'warning');
      processingIndicator.classList.add('d-none');
      analyzeBtn.disabled = false;
      return;
    }
    
    // Log the activity
    const methodText = mlToggle.checked ? 'ML' : 'CV';
    logActivity(`Started terrain analysis using ${methodText} method`);
    
    try {
      let result;
      
      // Use the appropriate analyzer based on toggle setting
      if (mlToggle.checked) {
        // Use machine learning classification
        result = await imageTerrainClassifier.classifyTerrain(previewImage);
      } else {
        // Use traditional computer vision
        result = await imageCVAnalyzer.analyzeTerrain(previewImage);
      }
      
      // Display results
      displayImageResults(result);
    } catch (error) {
      console.error('Error analyzing terrain:', error);
      showToast('Error analyzing terrain: ' + error.message, 'danger');
      logActivity('Error: Analysis failed - ' + error.message);
      
      // Reset UI
      processingIndicator.classList.add('d-none');
      analyzeBtn.disabled = false;
    }
  }
  
  function displayImageResults(result) {
    // Hide processing indicator and show results
    processingIndicator.classList.add('d-none');
    resultsContainer.classList.remove('d-none');
    
    // Set terrain status
    const isSafe = result.isSafeTerrain;
    terrainIndicator.className = 'terrain-indicator ' + (isSafe ? 'terrain-safe' : 'terrain-unsafe');
    terrainIndicator.innerHTML = isSafe ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
    terrainStatusText.className = 'terrain-status-text ' + (isSafe ? 'safe' : 'unsafe');
    terrainStatusText.textContent = isSafe ? 'SAFE LANDING ZONE' : 'UNSAFE TERRAIN';
    
    // Set processing details
    processingMethod.textContent = result.processingMethod === 'ml' ? 'Machine Learning' : 'Computer Vision';
    processingTime.textContent = `${result.processingTime}ms`;
    
    // Handle confidence score (ML only)
    if (result.processingMethod === 'ml' && result.confidenceScore !== null) {
      confidenceContainer.style.display = 'block';
      const confidencePercent = Math.round(result.confidenceScore * 100);
      confidenceScore.textContent = `${confidencePercent}%`;
    } else {
      confidenceContainer.style.display = 'none';
    }
    
    // Set feature details based on processing method
    featureDetails.innerHTML = '';
    if (result.processingMethod === 'ml') {
      // ML features
      const features = result.details.features;
      for (const [key, value] of Object.entries(features)) {
        const featureRow = document.createElement('div');
        featureRow.className = 'mb-2';
        featureRow.innerHTML = `
          <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
          <div class="progress">
            <div class="progress-bar" role="progressbar" style="width: ${value * 100}%"
                 aria-valuenow="${value * 100}" aria-valuemin="0" aria-valuemax="100">
              ${(value * 100).toFixed(0)}%
            </div>
          </div>
        `;
        featureDetails.appendChild(featureRow);
      }
      
      // Show safe/unsafe scores
      const scoreRow = document.createElement('div');
      scoreRow.className = 'mt-3';
      scoreRow.innerHTML = `
        <strong>Classification:</strong><br>
        Safe: ${(result.details.safeScore * 100).toFixed(1)}% | 
        Unsafe: ${(result.details.unsafeScore * 100).toFixed(1)}%
      `;
      featureDetails.appendChild(scoreRow);
      
      // Show analysis visualization
      analysisVisualization.src = '/images/ml-analysis.svg';
    } else {
      // CV features
      const details = result.details;
      for (const [key, value] of Object.entries(details)) {
        const detailRow = document.createElement('div');
        detailRow.innerHTML = `<strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}`;
        featureDetails.appendChild(detailRow);
      }
      
      // Show analysis visualization
      analysisVisualization.src = '/images/cv-analysis.svg';
    }
    
    // Show visualization
    analysisVisualization.classList.remove('d-none');
    
    // Log the result
    logActivity(`Analysis complete: ${isSafe ? 'Safe' : 'Unsafe'} terrain detected`);
    if (result.processingMethod === 'ml') {
      logActivity(`Confidence: ${Math.round(result.confidenceScore * 100)}%`);
    }
    
    // Highlight safe landing zones on the image
    if (isSafe && previewImage) {
      highlightSafeLandingZones(previewImage, result);
    }
    
    // Enable the analyze button again
    analyzeBtn.disabled = false;
  }
  
  /**
   * Highlight safe landing zones on the image
   * @param {HTMLImageElement} image - The analyzed image
   * @param {Object} result - The analysis result
   */
  function highlightSafeLandingZones(image, result) {
    // Get the container for the image
    const container = image.parentElement;
    if (!container) return;
    
    // Clear any existing highlights
    const existingHighlights = container.querySelectorAll('.safe-landing-zone');
    existingHighlights.forEach(el => el.remove());
    
    if (!result.isSafeTerrain) return;
    
    // For ML-based results, generate more accurate zones
    if (result.processingMethod === 'ml') {
      // Create zones based on feature values
      const features = result.details.features;
      const flatness = parseFloat(features.flatness);
      
      // More flat areas = more safe zones
      const zoneCount = flatness > 0.7 ? 2 : 1;
      
      // Create landing zones
      for (let i = 0; i < zoneCount; i++) {
        // Create safe zone element
        const safeZone = document.createElement('div');
        safeZone.className = 'safe-landing-zone';
        
        // Size based on confidence and feature values
        const size = 40 + (result.confidenceScore * 40);
        
        // Position somewhat randomly but influenced by features
        const imgWidth = image.width || image.offsetWidth;
        const imgHeight = image.height || image.offsetHeight;
        
        // Center the first zone, randomize others
        let left, top;
        if (i === 0) {
          left = (imgWidth / 2) - (size / 2);
          top = (imgHeight / 2) - (size / 2);
        } else {
          // Position other zones with some spread
          left = Math.max(20, Math.min(imgWidth - size - 20, 
                         (imgWidth / 2) - (size / 2) + (Math.random() * 100 - 50)));
          top = Math.max(20, Math.min(imgHeight - size - 20, 
                        (imgHeight / 2) - (size / 2) + (Math.random() * 100 - 50)));
        }
        
        // Set zone properties
        safeZone.style.width = `${size}px`;
        safeZone.style.height = `${size}px`;
        safeZone.style.left = `${left}px`;
        safeZone.style.top = `${top}px`;
        
        // Add to container
        container.appendChild(safeZone);
      }
    } 
    // For CV-based results, use contour-based zones
    else {
      // Use details from CV result to create landing zones
      const { contours, flatRegions } = result.details;
      
      // Create one zone per flat region, max 3
      const zoneCount = Math.min(3, flatRegions || 1);
      
      for (let i = 0; i < zoneCount; i++) {
        // Create safe zone element
        const safeZone = document.createElement('div');
        safeZone.className = 'safe-landing-zone';
        
        // Size and shape based on CV metrics
        const imgWidth = image.width || image.offsetWidth;
        const imgHeight = image.height || image.offsetHeight;
        
        // Randomize size somewhat
        const width = 60 + Math.random() * 50;
        const height = 60 + Math.random() * 50;
        
        // Position zones with some distribution
        const left = Math.max(10, Math.min(imgWidth - width - 10, 
                      (imgWidth * (i + 1) / (zoneCount + 1)) - (width / 2)));
        const top = Math.max(10, Math.min(imgHeight - height - 10, 
                     (imgHeight / 2) - (height / 2) + (Math.random() * 60 - 30)));
        
        // Set zone properties
        safeZone.style.width = `${width}px`;
        safeZone.style.height = `${height}px`;
        safeZone.style.left = `${left}px`;
        safeZone.style.top = `${top}px`;
        
        // Add to container
        container.appendChild(safeZone);
      }
    }
  }
  
  function sendCommandToController(command) {
    // Update status to indicate transmission
    bluetoothStatus.className = 'status-dot status-active';
    bluetoothStatusText.textContent = 'Transmitting...';
    
    logActivity(`Sending ${command === 'L' ? 'LAND' : 'REDIRECT'} command to controller`);
    
    // Send the command to the server
    fetch('/api/command', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Command transmission failed');
      }
      return response.json();
    })
    .then(result => {
      if (result.success) {
        showToast(`Command ${command === 'L' ? 'LAND' : 'REDIRECT'} sent successfully`, 'success');
        logActivity('Command sent successfully');
        
        // Simulate command acknowledgment after a delay
        setTimeout(() => {
          bluetoothStatus.className = 'status-dot status-inactive';
          bluetoothStatusText.textContent = 'Acknowledged';
          logActivity('Command acknowledged by controller');
        }, 1500);
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    })
    .catch(error => {
      showToast('Error sending command: ' + error.message, 'danger');
      bluetoothStatus.className = 'status-dot status-error';
      bluetoothStatusText.textContent = 'Error';
      logActivity('Error: Command transmission failed');
    });
  }
  
  function resetImageAnalysis() {
    // Reset the form and UI
    uploadForm.reset();
    previewImage.classList.add('d-none');
    uploadPrompt.classList.remove('d-none');
    resultsContainer.classList.add('d-none');
    analysisVisualization.classList.add('d-none');
    analyzeBtn.disabled = true;
    
    // Reset controller status
    bluetoothStatus.className = 'status-dot status-inactive';
    bluetoothStatusText.textContent = 'Simulated';
    
    logActivity('Image analysis reset');
  }
  
  //
  // Functions - Video Analysis
  //
  
  async function startCamera() {
    // Try to start the camera
    const success = await videoAnalyzer.startCamera();
    
    if (success) {
      // Update UI
      cameraToggleBtn.innerHTML = '<i class="fas fa-video-slash"></i> Stop Camera';
      cameraStatus.className = 'status-dot status-active';
      cameraStatusText.textContent = 'Active';
      
      // Enable video controls
      pauseVideoBtn.disabled = false;
      analyzeVideoBtn.disabled = false;
      captureFrameBtn.disabled = false;
      recordBtn.disabled = false;
      
      logActivity('Camera started successfully');
    } else {
      showToast('Failed to start camera', 'danger');
    }
  }
  
  function stopCamera() {
    // Stop the camera
    videoAnalyzer.stopCamera();
    
    // Stop analysis if running
    if (videoAnalyzer.isAnalyzing) {
      stopVideoAnalysis();
    }
    
    // Update UI
    cameraToggleBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
    cameraStatus.className = 'status-dot status-inactive';
    cameraStatusText.textContent = 'Off';
    
    // Disable video controls
    pauseVideoBtn.disabled = true;
    analyzeVideoBtn.disabled = true;
    captureFrameBtn.disabled = true;
    recordBtn.disabled = true;
    toggleOverlayBtn.disabled = true;
    fpsDownBtn.disabled = true;
    fpsDisplayBtn.disabled = true;
    fpsUpBtn.disabled = true;
    
    logActivity('Camera stopped');
  }
  
  function startVideoAnalysis() {
    // Set options based on toggle settings
    const options = {
      useML: toggleML.checked,
      showOverlay: true,
      analysisFPS: 5
    };
    
    // Start analysis
    const success = videoAnalyzer.startAnalysis(options);
    
    if (success) {
      // Update UI
      analyzeVideoBtn.innerHTML = '<i class="fas fa-stop"></i>';
      toggleOverlayBtn.disabled = false;
      fpsDownBtn.disabled = false;
      fpsDisplayBtn.disabled = false;
      fpsUpBtn.disabled = false;
      
      logActivity(`Started real-time ${options.useML ? 'ML' : 'CV'} analysis`);
    }
  }
  
  function stopVideoAnalysis() {
    // Stop analysis
    videoAnalyzer.stopAnalysis();
    
    // Update UI
    analyzeVideoBtn.innerHTML = '<i class="fas fa-play"></i>';
    toggleOverlayBtn.disabled = true;
    fpsDownBtn.disabled = true;
    fpsDisplayBtn.disabled = true;
    fpsUpBtn.disabled = true;
    
    logActivity('Stopped real-time analysis');
  }
  
  function captureVideoFrame() {
    if (!videoAnalyzer.isStreaming) return;
    
    // Capture current frame
    const frame = videoAnalyzer.captureFrame();
    
    if (frame) {
      // Convert canvas to data URL
      const dataURL = frame.toDataURL('image/png');
      
      // Create link and trigger download
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `terrain-frame-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
      link.click();
      
      logActivity('Frame captured and saved');
      showToast('Frame captured and saved', 'success');
    }
  }
  
  function updateVideoAnalysisMethod() {
    if (!videoAnalyzer.isAnalyzing) return;
    
    // Update analysis method
    videoAnalyzer.toggleAnalysisMode();
    
    logActivity(`Switched to ${videoAnalyzer.useML ? 'Machine Learning' : 'Computer Vision'} analysis`);
  }
  
  function handleVideoAnalysisResult(result) {
    if (!result) return;
    
    // Update video terrain indicator
    const isSafe = result.isSafeTerrain;
    videoTerrainIndicator.className = 'terrain-indicator ' + (isSafe ? 'terrain-safe' : 'terrain-unsafe');
    videoTerrainIndicator.innerHTML = isSafe ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>';
    videoStatusText.className = 'terrain-status-text ' + (isSafe ? 'safe' : 'unsafe');
    videoStatusText.textContent = isSafe ? 'SAFE TERRAIN' : 'UNSAFE TERRAIN';
    
    // Update stats display
    const stats = videoAnalyzer.getStats();
    safeFrames.textContent = `${stats.safePercentage}%`;
    totalFrames.textContent = stats.totalFrames;
    processingTimeAvg.textContent = `${stats.processingTime}ms`;
    
    if (result.processingMethod === 'ml' && result.confidenceScore !== null) {
      avgConfidence.textContent = `${Math.round(result.confidenceScore * 100)}%`;
      
      // Update feature bars if ML result contains features
      if (result.details && result.details.features) {
        const features = result.details.features;
        if (features.flatness) {
          featureFlatness.style.width = `${features.flatness * 100}%`;
          featureFlatness.setAttribute('aria-valuenow', features.flatness * 100);
        }
        if (features.texture) {
          featureTexture.style.width = `${features.texture * 100}%`;
          featureTexture.setAttribute('aria-valuenow', features.texture * 100);
        }
        if (features.edges) {
          featureEdges.style.width = `${features.edges * 100}%`;
          featureEdges.setAttribute('aria-valuenow', features.edges * 100);
        }
      }
    } else {
      avgConfidence.textContent = 'N/A';
    }
    
    // Update 3D terrain visualization
    updateTerrain3D(result);
  }
  
  function handleVideoStatusChange(status) {
    // Log status changes
    if (status.message) {
      logActivity(status.message);
    }
  }
  
  function handleVideoError(error) {
    // Handle errors
    console.error('Video analysis error:', error);
    logActivity(`Error: ${error.message}`);
    showToast(error.message, 'danger');
  }
  
  //
  // Helper Functions
  //
  
  function showToast(message, type = 'info') {
    // Create a Bootstrap toast
    const toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    const toastBody = document.createElement('div');
    toastBody.className = 'd-flex';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'toast-body';
    messageDiv.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    toastBody.appendChild(messageDiv);
    toastBody.appendChild(closeButton);
    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);
    document.body.appendChild(toastContainer);
    
    // Initialize and show the toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // Remove from DOM after hiding
    toast.addEventListener('hidden.bs.toast', function() {
      document.body.removeChild(toastContainer);
    });
  }
});