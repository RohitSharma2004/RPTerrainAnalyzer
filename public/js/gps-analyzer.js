/**
 * RPTerrain Analyzer - GPS-based Terrain Analysis Module
 * Handles real-time GPS location tracking and terrain analysis
 */

class GPSTerrainAnalyzer {
  constructor() {
    // DOM Elements
    this.locateBtn = document.getElementById('locate-btn');
    this.analyzeLocationBtn = document.getElementById('analyze-location-btn');
    this.showSafeZonesToggle = document.getElementById('show-safe-zones');
    this.terrainHeatmapToggle = document.getElementById('terrain-heatmap');
    
    // Display elements
    this.latitudeDisplay = document.getElementById('latitude-display');
    this.longitudeDisplay = document.getElementById('longitude-display');
    this.altitudeDisplay = document.getElementById('altitude-display');
    this.elevationValue = document.getElementById('elevation-value');
    this.slopeValue = document.getElementById('slope-value');
    this.roughnessValue = document.getElementById('roughness-value');
    this.surfaceValue = document.getElementById('surface-value');
    this.obstaclesValue = document.getElementById('obstacles-value');
    this.safeZonesCount = document.getElementById('safe-zones-count');
    this.largestZoneValue = document.getElementById('largest-zone-value');
    this.gpsTerrainIndicator = document.getElementById('gps-terrain-indicator');
    this.gpsStatusText = document.getElementById('gps-status-text');
    
    // Map & image containers
    this.locationMap = document.getElementById('location-map');
    this.satelliteImage = document.getElementById('satellite-image');
    this.landingZonesOverlay = document.getElementById('landing-zones-overlay');
    
    // Weather elements
    this.windValue = document.getElementById('wind-value');
    this.humidityValue = document.getElementById('humidity-value');
    this.pressureValue = document.getElementById('pressure-value');
    
    // State variables
    this.currentPosition = null;
    this.watchId = null;
    this.isAnalyzing = false;
    this.safeZones = [];
    
    // Bind event handlers
    this.bindEvents();
  }
  
  /**
   * Initialize event listeners
   */
  bindEvents() {
    if (this.locateBtn) {
      this.locateBtn.addEventListener('click', () => this.getCurrentLocation());
    }
    
    if (this.analyzeLocationBtn) {
      this.analyzeLocationBtn.addEventListener('click', () => this.analyzeCurrentLocation());
    }
    
    if (this.showSafeZonesToggle) {
      this.showSafeZonesToggle.addEventListener('change', () => this.toggleSafeZones());
    }
    
    if (this.terrainHeatmapToggle) {
      this.terrainHeatmapToggle.addEventListener('change', () => this.toggleTerrainHeatmap());
    }
  }
  
  /**
   * Check if geolocation is available
   */
  isGeolocationAvailable() {
    return 'geolocation' in navigator;
  }
  
  /**
   * Get current location from device GPS
   */
  getCurrentLocation() {
    if (!this.isGeolocationAvailable()) {
      this.showNotification('Geolocation is not supported by your browser', 'error');
      return;
    }
    
    this.locateBtn.disabled = true;
    this.locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
    
    const options = {
      enableHighAccuracy: true,  // Get high accuracy if available
      timeout: 10000,            // Time to wait for position (10 seconds)
      maximumAge: 0              // Do not use cached position
    };
    
    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => this.handlePositionSuccess(position),
      (error) => this.handlePositionError(error),
      options
    );
  }
  
  /**
   * Start continuous location watching
   */
  startLocationWatch() {
    if (!this.isGeolocationAvailable() || this.watchId) return;
    
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      options
    );
    
    this.showNotification('Location tracking started', 'info');
  }
  
  /**
   * Stop location watching
   */
  stopLocationWatch() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.showNotification('Location tracking stopped', 'info');
    }
  }
  
  /**
   * Handle successful position acquisition
   */
  handlePositionSuccess(position) {
    // Store position
    this.currentPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
    
    // Update UI
    this.updateLocationDisplay();
    this.simulateMapDisplay();
    
    // Enable analysis button
    this.analyzeLocationBtn.disabled = false;
    
    // Reset button
    this.locateBtn.disabled = false;
    this.locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Update Location';
    
    // Show notification
    this.showNotification('Location acquired successfully', 'success');
    
    // Start continuous tracking
    this.startLocationWatch();
  }
  
  /**
   * Handle position update in watch mode
   */
  handlePositionUpdate(position) {
    // Update position data
    this.currentPosition = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };
    
    // Update display
    this.updateLocationDisplay();
    
    // If analysis is ongoing, update it
    if (this.isAnalyzing) {
      this.updateAnalysis();
    }
  }
  
  /**
   * Handle position acquisition error
   */
  handlePositionError(error) {
    let message;
    
    switch(error.code) {
      case error.PERMISSION_DENIED:
        message = "User denied the request for geolocation";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Location information is unavailable";
        break;
      case error.TIMEOUT:
        message = "The request to get user location timed out";
        break;
      default:
        message = "An unknown error occurred";
        break;
    }
    
    // Show error
    this.showNotification(`Error getting location: ${message}`, 'error');
    
    // Reset button
    this.locateBtn.disabled = false;
    this.locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Get Current Location';
  }
  
  /**
   * Update location display with current position
   */
  updateLocationDisplay() {
    if (!this.currentPosition) return;
    
    // Update coordinate displays
    if (this.latitudeDisplay) {
      this.latitudeDisplay.textContent = this.currentPosition.latitude.toFixed(6);
    }
    
    if (this.longitudeDisplay) {
      this.longitudeDisplay.textContent = this.currentPosition.longitude.toFixed(6);
    }
    
    if (this.altitudeDisplay && this.currentPosition.altitude) {
      this.altitudeDisplay.textContent = `${this.currentPosition.altitude.toFixed(1)} m`;
    } else if (this.altitudeDisplay) {
      this.altitudeDisplay.textContent = 'N/A';
    }
  }
  
  /**
   * Simulate map display with current position
   * In a real application, this would use a mapping API like Google Maps or Leaflet
   */
  simulateMapDisplay() {
    if (!this.locationMap || !this.currentPosition) return;
    
    // Clear any existing content
    this.locationMap.innerHTML = '';
    
    // Create a simple map visualization
    const mapContent = document.createElement('div');
    mapContent.className = 'simulated-map';
    mapContent.style.width = '100%';
    mapContent.style.height = '100%';
    mapContent.style.position = 'relative';
    mapContent.style.backgroundColor = '#b3d1ff';
    
    // Add location marker
    const marker = document.createElement('div');
    marker.className = 'location-marker';
    marker.style.position = 'absolute';
    marker.style.top = '50%';
    marker.style.left = '50%';
    marker.style.transform = 'translate(-50%, -50%)';
    marker.style.width = '20px';
    marker.style.height = '20px';
    marker.style.borderRadius = '50%';
    marker.style.backgroundColor = 'red';
    marker.style.border = '2px solid white';
    marker.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
    
    // Add pulse effect
    const pulse = document.createElement('div');
    pulse.style.position = 'absolute';
    pulse.style.top = '50%';
    pulse.style.left = '50%';
    pulse.style.transform = 'translate(-50%, -50%)';
    pulse.style.width = '40px';
    pulse.style.height = '40px';
    pulse.style.borderRadius = '50%';
    pulse.style.backgroundColor = 'rgba(255,0,0,0.3)';
    pulse.style.animation = 'pulse 2s infinite';
    
    // Add coordinates label
    const coordsLabel = document.createElement('div');
    coordsLabel.textContent = `${this.currentPosition.latitude.toFixed(6)}, ${this.currentPosition.longitude.toFixed(6)}`;
    coordsLabel.style.position = 'absolute';
    coordsLabel.style.top = 'calc(50% + 25px)';
    coordsLabel.style.left = '50%';
    coordsLabel.style.transform = 'translateX(-50%)';
    coordsLabel.style.padding = '5px 10px';
    coordsLabel.style.backgroundColor = 'white';
    coordsLabel.style.borderRadius = '3px';
    coordsLabel.style.fontSize = '12px';
    coordsLabel.style.fontWeight = 'bold';
    coordsLabel.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    
    // Assemble map
    mapContent.appendChild(pulse);
    mapContent.appendChild(marker);
    mapContent.appendChild(coordsLabel);
    this.locationMap.appendChild(mapContent);
    
    // Simulate loading satellite imagery
    this.loadSatelliteImage();
  }
  
  /**
   * Load satellite image based on current position
   * In a real application, this would use a satellite imagery API
   */
  loadSatelliteImage() {
    if (!this.satelliteImage || !this.currentPosition) return;
    
    // Clear any existing content
    this.satelliteImage.innerHTML = '';
    
    // Create a simple visualization of a satellite image
    const imageContent = document.createElement('div');
    imageContent.style.width = '100%';
    imageContent.style.height = '100%';
    imageContent.style.background = 'linear-gradient(45deg, #3a6f34, #6ba26a, #90c290)';
    imageContent.style.position = 'relative';
    
    // Add some terrain features
    for (let i = 0; i < 20; i++) {
      const feature = document.createElement('div');
      const size = 5 + Math.random() * 20;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      
      feature.style.position = 'absolute';
      feature.style.width = `${size}px`;
      feature.style.height = `${size}px`;
      feature.style.backgroundColor = Math.random() > 0.5 ? '#567d52' : '#8fb48a';
      feature.style.left = `${x}%`;
      feature.style.top = `${y}%`;
      feature.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      
      imageContent.appendChild(feature);
    }
    
    // Add some "rivers" or "roads"
    const river = document.createElement('div');
    river.style.position = 'absolute';
    river.style.width = '80%';
    river.style.height = '5px';
    river.style.backgroundColor = '#4a87cb';
    river.style.left = '10%';
    river.style.top = '40%';
    river.style.borderRadius = '5px';
    river.style.transform = 'rotate(' + (Math.random() * 30 - 15) + 'deg)';
    
    imageContent.appendChild(river);
    this.satelliteImage.appendChild(imageContent);
  }
  
  /**
   * Analyze terrain at current location
   */
  analyzeCurrentLocation() {
    if (!this.currentPosition) {
      this.showNotification('Please get your location first', 'warning');
      return;
    }
    
    // Set analyzing state
    this.isAnalyzing = true;
    this.analyzeLocationBtn.disabled = true;
    this.analyzeLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    // Simulate analysis delay
    setTimeout(() => {
      this.performTerrainAnalysis();
      
      // Reset button
      this.analyzeLocationBtn.disabled = false;
      this.analyzeLocationBtn.innerHTML = '<i class="fas fa-search-location"></i> Update Analysis';
      
      this.showNotification('Terrain analysis complete', 'success');
    }, 2000);
  }
  
  /**
   * Perform terrain analysis based on current location
   * In a real application, this would use elevation APIs and satellite imagery analysis
   */
  performTerrainAnalysis() {
    // Simulate terrain analysis results
    const isSafe = Math.random() > 0.3; // 70% chance of safe terrain
    
    // Generate reasonable terrain characteristics based on safety
    const elevation = 100 + Math.random() * 500; // 100-600m
    const slope = isSafe ? Math.random() * 10 : 10 + Math.random() * 25; // Safe: 0-10%, Unsafe: 10-35%
    const roughness = isSafe ? 'Low' : Math.random() > 0.5 ? 'Medium' : 'High';
    const surface = isSafe ? 
      (Math.random() > 0.5 ? 'Grass' : 'Dirt') : 
      (Math.random() > 0.5 ? 'Rocky' : 'Uneven');
    const obstacles = isSafe ? 'None' : Math.random() > 0.5 ? 'Some' : 'Many';
    
    // Generate safe landing zones
    this.safeZones = [];
    const zoneCount = isSafe ? Math.floor(2 + Math.random() * 3) : Math.floor(Math.random() * 2);
    
    for (let i = 0; i < zoneCount; i++) {
      const width = 30 + Math.random() * 100;
      const height = 30 + Math.random() * 100;
      const x = Math.random() * (100 - width);
      const y = Math.random() * (100 - height);
      
      this.safeZones.push({
        x: `${x}%`,
        y: `${y}%`,
        width: `${width}px`,
        height: `${height}px`,
        size: width * height
      });
    }
    
    // Sort by size, largest first
    this.safeZones.sort((a, b) => b.size - a.size);
    
    // Update UI with analysis results
    this.updateAnalysisDisplay({
      isSafe,
      elevation,
      slope,
      roughness,
      surface,
      obstacles,
      zoneCount
    });
    
    // Draw safe zones on the satellite image
    this.drawSafeZones();
  }
  
  /**
   * Update analysis display with results
   */
  updateAnalysisDisplay(results) {
    // Update terrain indicator
    if (this.gpsTerrainIndicator) {
      this.gpsTerrainIndicator.className = 'terrain-indicator ' + 
        (results.isSafe ? 'terrain-safe' : 'terrain-unsafe');
      this.gpsTerrainIndicator.innerHTML = results.isSafe ? 
        '<i class="fas fa-check"></i>' : 
        '<i class="fas fa-times"></i>';
    }
    
    if (this.gpsStatusText) {
      this.gpsStatusText.className = 'terrain-status-text ' + 
        (results.isSafe ? 'safe' : 'unsafe');
      this.gpsStatusText.textContent = results.isSafe ? 
        'SAFE LANDING ZONE' : 
        'UNSAFE TERRAIN';
    }
    
    // Update terrain characteristics
    if (this.elevationValue) {
      this.elevationValue.textContent = `${Math.round(results.elevation)} m`;
    }
    
    if (this.slopeValue) {
      this.slopeValue.textContent = `${results.slope.toFixed(1)}%`;
    }
    
    if (this.roughnessValue) {
      this.roughnessValue.textContent = results.roughness;
    }
    
    if (this.surfaceValue) {
      this.surfaceValue.textContent = results.surface;
    }
    
    if (this.obstaclesValue) {
      this.obstaclesValue.textContent = results.obstacles;
    }
    
    // Update safe zones info
    if (this.safeZonesCount) {
      this.safeZonesCount.textContent = results.zoneCount;
    }
    
    if (this.largestZoneValue && this.safeZones.length > 0) {
      const largestSize = Math.round(this.safeZones[0].size);
      this.largestZoneValue.textContent = `${largestSize} m²`;
    } else if (this.largestZoneValue) {
      this.largestZoneValue.textContent = '0 m²';
    }
  }
  
  /**
   * Draw safe landing zones on satellite image
   */
  drawSafeZones() {
    if (!this.landingZonesOverlay || !this.safeZones.length) return;
    
    // Clear previous zones
    this.landingZonesOverlay.innerHTML = '';
    
    // If zones should be hidden, return
    if (this.showSafeZonesToggle && !this.showSafeZonesToggle.checked) {
      return;
    }
    
    // Draw each safe zone
    this.safeZones.forEach((zone, index) => {
      const zoneElement = document.createElement('div');
      zoneElement.className = 'safe-landing-zone';
      zoneElement.style.left = zone.x;
      zoneElement.style.top = zone.y;
      zoneElement.style.width = zone.width;
      zoneElement.style.height = zone.height;
      
      // Add zone number for multiple zones
      if (this.safeZones.length > 1) {
        zoneElement.dataset.zone = index + 1;
        zoneElement.style.setProperty('--zone-number', index + 1);
      }
      
      this.landingZonesOverlay.appendChild(zoneElement);
    });
  }
  
  /**
   * Toggle safe zones visibility
   */
  toggleSafeZones() {
    const showZones = this.showSafeZonesToggle && this.showSafeZonesToggle.checked;
    
    if (showZones) {
      this.drawSafeZones();
    } else if (this.landingZonesOverlay) {
      this.landingZonesOverlay.innerHTML = '';
    }
  }
  
  /**
   * Toggle terrain heatmap display
   */
  toggleTerrainHeatmap() {
    const showHeatmap = this.terrainHeatmapToggle && this.terrainHeatmapToggle.checked;
    
    // In a real application, this would generate a terrain slope/elevation heatmap
    // For demo purposes, just show a notification
    this.showNotification(
      showHeatmap ? 'Terrain heatmap enabled' : 'Terrain heatmap disabled',
      'info'
    );
    
    // Apply a filter to the satellite image to simulate a heatmap
    if (this.satelliteImage) {
      if (showHeatmap) {
        this.satelliteImage.style.filter = 'hue-rotate(180deg) saturate(150%)';
      } else {
        this.satelliteImage.style.filter = '';
      }
    }
  }
  
  /**
   * Update ongoing analysis with new position data
   */
  updateAnalysis() {
    if (!this.isAnalyzing || !this.currentPosition) return;
    
    // In a real application, this would refresh the analysis with the new position
    // For demo purposes, just update the position marker on the map
    this.updateLocationDisplay();
  }
  
  /**
   * Show a notification to the user
   */
  showNotification(message, type = 'info') {
    // Log to console
    console.log(`[GPS Analyzer] ${message}`);
    
    // In the context of the main application, this would use the showToast function
    // For standalone usage, create a simple notification
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert-banner ${type}`;
    notification.innerHTML = `
      <div class="alert-icon ${type}">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation' : 'info-circle'}"></i>
      </div>
      <div class="alert-content">${message}</div>
      <div class="alert-close"><i class="fas fa-times"></i></div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Add close handler
    const closeBtn = notification.querySelector('.alert-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.body.removeChild(notification);
      });
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
    
    // Log to activity log if available
    const activityLog = document.getElementById('activity-log');
    if (activityLog) {
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Feature selection screen handling
  const featureSelectionScreen = document.getElementById('feature-selection');
  const mainApp = document.getElementById('main-app');
  const startAppBtn = document.getElementById('start-app-btn');
  
  if (startAppBtn && featureSelectionScreen && mainApp) {
    startAppBtn.addEventListener('click', function() {
      // Get selected features
      const selectedFeatures = {
        videoAnalysis: document.getElementById('select-video-analysis').checked,
        imageAnalysis: document.getElementById('select-image-analysis').checked,
        gpsAnalysis: document.getElementById('select-gps-analysis').checked,
        threeDVisualization: document.getElementById('select-3d-visualization').checked
      };
      
      // Log selected features
      console.log('Selected features:', selectedFeatures);
      
      // Hide selection screen and show main app
      featureSelectionScreen.style.display = 'none';
      mainApp.style.display = 'block';
      
      // Optionally, hide sections based on selections
      const videoSection = document.getElementById('video-analysis');
      const imageSection = document.getElementById('image-analysis');
      const gpsSection = document.getElementById('gps-analysis');
      const threeDContainer = document.getElementById('terrain-3d-container');
      
      if (videoSection) videoSection.style.display = selectedFeatures.videoAnalysis ? 'block' : 'none';
      if (imageSection) imageSection.style.display = selectedFeatures.imageAnalysis ? 'block' : 'none';
      if (gpsSection) gpsSection.style.display = selectedFeatures.gpsAnalysis ? 'block' : 'none';
      if (threeDContainer) threeDContainer.style.display = selectedFeatures.threeDVisualization ? 'block' : 'none';
      
      // Scroll to the first selected feature
      if (selectedFeatures.videoAnalysis && videoSection) {
        videoSection.scrollIntoView({ behavior: 'smooth' });
      } else if (selectedFeatures.imageAnalysis && imageSection) {
        imageSection.scrollIntoView({ behavior: 'smooth' });
      } else if (selectedFeatures.gpsAnalysis && gpsSection) {
        gpsSection.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Initialize color theme toggle
      initColorThemeToggle();
    });
  }
  
  // Initialize GPS analyzer if GPS analysis is part of the page
  const gpsSection = document.getElementById('gps-analysis');
  if (gpsSection) {
    const gpsAnalyzer = new GPSTerrainAnalyzer();
    
    // Add to window for debugging
    window.gpsAnalyzer = gpsAnalyzer;
  }
});

/**
 * Initialize color theme toggle functionality
 */
function initColorThemeToggle() {
  const themeButtons = document.querySelectorAll('.theme-btn');
  
  themeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      themeButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Get theme name
      const theme = this.getAttribute('data-theme');
      
      // Remove all theme classes from body
      document.body.classList.remove('theme-blue', 'theme-green', 'theme-purple', 'theme-orange');
      
      // Add new theme class if not default
      if (theme !== 'default') {
        document.body.classList.add(`theme-${theme}`);
      }
      
      // Log theme change to activity log
      const activityLog = document.getElementById('activity-log');
      if (activityLog) {
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
          <span class="log-time">${timeString}</span>
          <span class="log-message">Color theme changed to ${theme}</span>
        `;
        
        activityLog.appendChild(logEntry);
        activityLog.scrollTop = activityLog.scrollHeight;
      }
    });
  });
}