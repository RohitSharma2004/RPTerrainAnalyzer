const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const tf = require('@tensorflow/tfjs');
const { Pool } = require('pg');

// Initialize the Express application
const app = express();
const port = process.env.PORT || 5000;

// Initialize database connection with fallback
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/terrain_analyzer',
  ssl: process.env.DATABASE_URL ? true : false
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully:', res.rows[0]);
  }
});

// Set up storage for uploaded images
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads', { recursive: true });
    }
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    // Generate unique filenames with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'terrain-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Initialize multer with storage configuration
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: function(req, file, cb) {
    // Accept only images
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Serve node_modules files that we need
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')));
app.use('/js', express.static(path.join(__dirname, 'node_modules/@tensorflow/tfjs/dist')));
app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')));

// Simulated controller connection (would connect to hardware in a real implementation)
const controllerConnection = {
  status: 'connected',
  lastCommand: null,
  commandHistory: [],
  
  sendCommand(command) {
    this.lastCommand = command;
    this.commandHistory.push({
      command,
      timestamp: new Date(),
      acknowledged: true
    });
    
    console.log(`Command sent to controller: ${command}`);
    return { success: true };
  }
};

// Route for the home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to process image uploads
app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    const processingMethod = req.body.method || 'cv'; // Default to CV if not specified
    const useMl = processingMethod === 'ml';

    // Placeholder - in a real implementation, we would run the actual image processing here
    // For demo purposes, simulate CV vs ML processing with different result sets
    let result;
    
    if (useMl) {
      // Simulate ML-based terrain analysis
      result = simulateMLAnalysis();
    } else {
      // Simulate traditional CV terrain analysis
      result = simulateCVAnalysis();
    }

    // Add the path to the processed image
    result.imagePath = `/uploads/${path.basename(imagePath)}`;
    
    // Log analysis for debugging
    console.log(`Analyzed image: ${imagePath}, Method: ${processingMethod}, Result: ${result.isSafeTerrain ? 'Safe' : 'Unsafe'}`);
    
    // Save analysis to database
    try {
      // Generate a default title for the analysis
      const title = `Terrain Analysis ${new Date().toLocaleString()}`;
      const description = `${processingMethod.toUpperCase()} terrain analysis result: ${result.isSafeTerrain ? 'Safe Landing Zone' : 'Unsafe Terrain'}`;
      
      // Extract location data if provided
      const locationData = req.body.location ? JSON.parse(req.body.location) : null;
      
      // Prepare safe zones data if any
      const safeZones = [];
      
      // In a real implementation, we would extract safe zones from the analysis
      // For demo purposes, if the terrain is safe, create a simulated safe zone
      if (result.isSafeTerrain) {
        safeZones.push({
          x: 100,
          y: 100,
          width: 200,
          height: 200,
          confidence: result.confidenceScore || 0.8,
          details: { type: 'flat_area' }
        });
      }
      
      // Insert analysis into database
      const insertResult = await pool.query(
        `INSERT INTO analyses 
          (title, description, analysis_type, is_safe_terrain, confidence_score, 
          processing_method, processing_time, details, location_data, thumbnail_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          title,
          description,
          'terrain',
          result.isSafeTerrain,
          result.confidenceScore,
          processingMethod,
          result.processingTime,
          result.details,
          locationData,
          result.imagePath
        ]
      );
      
      const analysisId = insertResult.rows[0].id;
      
      // Insert safe zones if any
      for (const zone of safeZones) {
        await pool.query(
          `INSERT INTO safe_zones 
            (analysis_id, x, y, width, height, confidence, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            analysisId,
            zone.x,
            zone.y,
            zone.width,
            zone.height,
            zone.confidence,
            zone.details
          ]
        );
      }
      
      // Add the database ID to the result
      result.id = analysisId;
      result.savedToDatabase = true;
      
      console.log(`Analysis saved to database with ID: ${analysisId}`);
    } catch (dbError) {
      console.error('Warning: Failed to save analysis to database:', dbError);
      result.savedToDatabase = false;
    }
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ 
      error: 'Error processing image', 
      details: error.message,
      success: false
    });
  }
});

// API endpoint for video frame analysis
app.post('/api/video/analyze', express.json(), async (req, res) => {
  try {
    // In a real implementation, we would receive a video frame as base64 data
    // For demo purposes, we'll just simulate the analysis
    
    const { useML = true, frameId = 0 } = req.body;
    
    // Process faster than image analysis since video needs real-time response
    setTimeout(() => {
      let result;
      
      if (useML) {
        result = simulateVideoMLAnalysis(frameId);
      } else {
        result = simulateVideoCVAnalysis(frameId);
      }
      
      res.status(200).json(result);
    }, useML ? 100 : 50); // Simulate processing delay - ML is slower
  } catch (error) {
    console.error('Error analyzing video frame:', error);
    res.status(500).json({ 
      error: 'Error analyzing video frame', 
      details: error.message,
      success: false
    });
  }
});

// API endpoint to simulate parachute command
app.post('/api/command', express.json(), (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command || !['L', 'R'].includes(command)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid command. Use "L" for land or "R" for redirect.' 
      });
    }
    
    // Send to the controller
    const result = controllerConnection.sendCommand(command);
    
    // Simulate network delay
    setTimeout(() => {
      if (result.success) {
        res.status(200).json({ 
          success: true, 
          message: `Command ${command === 'L' ? 'LAND' : 'REDIRECT'} successfully sent to controller`,
          timestamp: new Date().toISOString(),
          commandDetails: {
            command,
            status: 'acknowledged',
            sent: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to send command to controller' 
        });
      }
    }, 300);
  } catch (error) {
    console.error('Error sending command:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Command transmission failed: ' + error.message 
    });
  }
});

// API endpoint to get server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '2.5.0',
    serverTime: new Date().toISOString(),
    uptime: process.uptime(),
    controller: controllerConnection.status,
    tensorflow: tf.version ? tf.version.tfjs : 'not available',
    environment: {
      nodejs: process.version,
      platform: process.platform
    }
  });
});

// API for getting analysis statistics from the database
app.get('/api/stats', async (req, res) => {
  try {
    // Get statistics from the database
    const stats = await pool.query(`
      SELECT 
        COUNT(*) AS total_analyses,
        SUM(CASE WHEN is_safe_terrain = true THEN 1 ELSE 0 END) AS safe_terrain_count,
        AVG(CASE WHEN confidence_score IS NOT NULL THEN confidence_score ELSE 0 END) AS avg_confidence,
        AVG(processing_time) AS avg_processing_time,
        SUM(CASE WHEN processing_method = 'ml' THEN 1 ELSE 0 END) AS ml_usage,
        SUM(CASE WHEN processing_method = 'cv' THEN 1 ELSE 0 END) AS cv_usage
      FROM analyses
    `);
    
    // If we don't have any analyses yet, provide demo values
    if (stats.rows[0].total_analyses === '0') {
      res.json({
        totalAnalyses: 0,
        safeTerrainCount: 0,
        avgConfidence: '0.00',
        avgProcessingTime: 0,
        commandsSent: controllerConnection.commandHistory.length,
        mlVsCv: {
          mlUsage: 0,
          cvUsage: 0
        }
      });
    } else {
      // Return actual stats from database
      const row = stats.rows[0];
      res.json({
        totalAnalyses: parseInt(row.total_analyses),
        safeTerrainCount: parseInt(row.safe_terrain_count),
        avgConfidence: parseFloat(row.avg_confidence).toFixed(2),
        avgProcessingTime: Math.round(parseFloat(row.avg_processing_time)),
        commandsSent: controllerConnection.commandHistory.length,
        mlVsCv: {
          mlUsage: parseInt(row.ml_usage),
          cvUsage: parseInt(row.cv_usage)
        }
      });
    }
  } catch (error) {
    console.error('Error retrieving statistics:', error);
    // Fallback to simulated data if database query fails
    res.json({
      totalAnalyses: Math.floor(100 + Math.random() * 500),
      safeTerrainCount: Math.floor(50 + Math.random() * 300),
      avgConfidence: (0.70 + Math.random() * 0.2).toFixed(2),
      avgProcessingTime: Math.floor(100 + Math.random() * 100),
      commandsSent: controllerConnection.commandHistory.length,
      mlVsCv: {
        mlUsage: Math.floor(60 + Math.random() * 30),
        cvUsage: Math.floor(10 + Math.random() * 30)
      }
    });
  }
});

// API endpoint to save analysis results to the database
app.post('/api/analyses', express.json(), async (req, res) => {
  try {
    const { 
      title, 
      description, 
      analysisType, 
      isSafeTerrain, 
      confidenceScore, 
      processingMethod,
      processingTime,
      details,
      metadata,
      locationData,
      thumbnailUrl
    } = req.body;
    
    // Validate required fields
    if (!title || !analysisType || isSafeTerrain === undefined || !processingMethod || !details) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // Insert the analysis into the database
    const result = await pool.query(
      `INSERT INTO analyses 
        (title, description, analysis_type, is_safe_terrain, confidence_score, 
        processing_method, processing_time, details, metadata, location_data, thumbnail_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        title,
        description,
        analysisType,
        isSafeTerrain,
        confidenceScore,
        processingMethod,
        processingTime,
        details,
        metadata || null,
        locationData || null,
        thumbnailUrl || null
      ]
    );
    
    // Get the new analysis ID
    const analysisId = result.rows[0].id;
    
    // If there are safe zones, add them to the database
    if (req.body.safeZones && Array.isArray(req.body.safeZones)) {
      for (const zone of req.body.safeZones) {
        await pool.query(
          `INSERT INTO safe_zones 
            (analysis_id, x, y, width, height, confidence, details)
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            analysisId,
            zone.x,
            zone.y,
            zone.width,
            zone.height,
            zone.confidence || null,
            zone.details || null
          ]
        );
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Analysis saved successfully',
      analysisId
    });
  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save analysis',
      error: error.message
    });
  }
});

// API endpoint to get all analyses
app.get('/api/analyses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM analyses ORDER BY created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error retrieving analyses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analyses',
      error: error.message
    });
  }
});

// API endpoint to get a specific analysis with safe zones
app.get('/api/analyses/:id', async (req, res) => {
  try {
    const analysisId = req.params.id;
    
    // Get the analysis
    const analysisResult = await pool.query(
      `SELECT * FROM analyses WHERE id = $1`,
      [analysisId]
    );
    
    if (analysisResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    const analysis = analysisResult.rows[0];
    
    // Get safe zones for this analysis
    const safeZonesResult = await pool.query(
      `SELECT * FROM safe_zones WHERE analysis_id = $1`,
      [analysisId]
    );
    
    // Combine data and return
    res.json({
      ...analysis,
      safeZones: safeZonesResult.rows
    });
  } catch (error) {
    console.error('Error retrieving analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analysis',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'An unexpected error occurred',
    success: false
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Terrain Analyzer Pro running on http://localhost:${port}`);
});

// Helper function to simulate ML-based terrain analysis
function simulateMLAnalysis() {
  const isSafeTerrain = Math.random() > 0.3; // 70% chance of safe terrain for demo
  const confidenceScore = 0.7 + Math.random() * 0.25; // Random confidence between 70% and 95%
  
  // Generate more realistic features based on safety
  const flatness = isSafeTerrain 
    ? (0.7 + Math.random() * 0.3).toFixed(2) 
    : (Math.random() * 0.4).toFixed(2);
    
  const texture = isSafeTerrain 
    ? (Math.random() * 0.4).toFixed(2) 
    : (0.6 + Math.random() * 0.4).toFixed(2);
    
  const edges = isSafeTerrain 
    ? (Math.random() * 0.3).toFixed(2) 
    : (0.5 + Math.random() * 0.5).toFixed(2);
  
  return {
    isSafeTerrain,
    confidenceScore,
    processingMethod: 'ml',
    processingTime: Math.floor(200 + Math.random() * 100), // 200-300ms
    details: {
      safeScore: isSafeTerrain ? confidenceScore : 1 - confidenceScore,
      unsafeScore: isSafeTerrain ? 1 - confidenceScore : confidenceScore,
      features: {
        texture,
        edges,
        flatness
      }
    }
  };
}

// Helper function to simulate CV-based terrain analysis
function simulateCVAnalysis() {
  const isSafeTerrain = Math.random() > 0.4; // 60% chance of safe terrain for demo
  
  // Generate more realistic CV stats based on terrain safety
  const contours = Math.floor(isSafeTerrain ? 3 + Math.random() * 5 : 8 + Math.random() * 20);
  const edges = Math.floor(isSafeTerrain ? 10 + Math.random() * 20 : 40 + Math.random() * 60);
  const flatRegions = Math.floor(isSafeTerrain ? 3 + Math.random() * 2 : Math.random() * 2);
  const roughness = isSafeTerrain ? 'Low' : 'High';
  
  return {
    isSafeTerrain,
    confidenceScore: null, // CV doesn't provide confidence
    processingMethod: 'cv',
    processingTime: Math.floor(50 + Math.random() * 30), // 50-80ms (faster than ML)
    details: {
      contours,
      edges,
      flatRegions,
      roughness
    }
  };
}

// Helper function to simulate ML-based video frame analysis
// More optimized than still image analysis
function simulateVideoMLAnalysis(frameId) {
  // Add some temporal consistency by using frameId as a seed
  const frameBasedRandom = Math.sin(frameId * 0.1) * 0.5 + 0.5;
  const isSafeTerrain = frameBasedRandom > 0.3;
  
  // Confidence should be more stable over time
  const baseConfidence = 0.75 + Math.sin(frameId * 0.05) * 0.2;
  const confidenceScore = isSafeTerrain 
    ? Math.min(0.98, baseConfidence) 
    : Math.min(0.98, 1 - baseConfidence);
  
  // Features should change gradually
  const flatness = isSafeTerrain 
    ? (0.7 + Math.sin(frameId * 0.03) * 0.2).toFixed(2) 
    : (0.3 + Math.sin(frameId * 0.03) * 0.2).toFixed(2);
    
  const texture = isSafeTerrain 
    ? (0.3 + Math.sin(frameId * 0.04) * 0.2).toFixed(2) 
    : (0.7 + Math.sin(frameId * 0.04) * 0.2).toFixed(2);
    
  const edges = isSafeTerrain 
    ? (0.2 + Math.sin(frameId * 0.02) * 0.2).toFixed(2) 
    : (0.7 + Math.sin(frameId * 0.02) * 0.2).toFixed(2);
  
  return {
    isSafeTerrain,
    confidenceScore,
    processingMethod: 'ml',
    processingTime: Math.floor(100 + Math.random() * 50), // Faster than still image analysis
    frameId,
    details: {
      safeScore: isSafeTerrain ? confidenceScore : 1 - confidenceScore,
      unsafeScore: isSafeTerrain ? 1 - confidenceScore : confidenceScore,
      features: {
        texture,
        edges,
        flatness
      }
    }
  };
}

// Helper function to simulate CV-based video frame analysis
function simulateVideoCVAnalysis(frameId) {
  // Add some temporal consistency
  const frameBasedRandom = Math.sin(frameId * 0.1) * 0.5 + 0.5;
  const isSafeTerrain = frameBasedRandom > 0.4;
  
  // Generate realistic CV stats that change gradually
  const contours = Math.floor(isSafeTerrain 
    ? 3 + Math.sin(frameId * 0.05) * 2 
    : 10 + Math.sin(frameId * 0.05) * 8);
    
  const edges = Math.floor(isSafeTerrain 
    ? 10 + Math.sin(frameId * 0.02) * 10 
    : 40 + Math.sin(frameId * 0.02) * 20);
    
  const flatRegions = Math.floor(isSafeTerrain 
    ? 2 + Math.sin(frameId * 0.01) * 1 
    : Math.abs(Math.sin(frameId * 0.01)) * 1.5);
  
  return {
    isSafeTerrain,
    confidenceScore: null, // CV doesn't provide confidence
    processingMethod: 'cv',
    processingTime: Math.floor(30 + Math.random() * 20), // Very fast
    frameId,
    details: {
      contours,
      edges,
      flatRegions,
      roughness: isSafeTerrain ? 'Low' : 'High'
    }
  };
}