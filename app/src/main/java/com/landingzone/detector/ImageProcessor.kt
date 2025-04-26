package com.landingzone.detector

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.SystemClock
import android.widget.ImageView
import com.landingzone.detector.ml.FeatureExtractor
import com.landingzone.detector.ml.TerrainClassifier
import com.landingzone.detector.util.ImageUtils
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.MatOfPoint2f
import org.opencv.core.Point
import org.opencv.core.Rect
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.min

class ImageProcessor(private val context: Context) {

    data class ProcessingResult(
        val isFlatTerrain: Boolean,
        val debugImage: Bitmap,
        val flatContours: List<MatOfPoint> = emptyList(),
        val confidenceScore: Float = 0.0f,
        val mlEnabled: Boolean = false,
        val processingTimeMs: Long = 0L
    )
    
    // ML components
    private var terrainClassifier: TerrainClassifier? = null
    private val featureExtractor = FeatureExtractor()
    private var useMachineLearning = true  // Can be toggled by user

    init {
        // Initialize the ML model
        setupTerrainClassifier()
    }
    
    private fun setupTerrainClassifier() {
        try {
            terrainClassifier = TerrainClassifier(context)
        } catch (e: Exception) {
            // If model loading fails, we'll fall back to traditional computer vision methods
            terrainClassifier = null
            useMachineLearning = false
            e.printStackTrace()
        }
    }
    
    fun toggleMachineLearning(enabled: Boolean) {
        useMachineLearning = enabled
        // Make sure the classifier is initialized if enabling ML
        if (enabled && terrainClassifier == null) {
            setupTerrainClassifier()
        }
    }
    
    fun processImage(bitmap: Bitmap, previewImageView: ImageView): ProcessingResult {
        val startTime = SystemClock.elapsedRealtime()
        
        // Try to use ML-based classification if enabled and available
        if (useMachineLearning && terrainClassifier != null) {
            return processImageWithML(bitmap)
        } else {
            // Fall back to traditional computer vision methods
            return processImageTraditional(bitmap, startTime)
        }
    }
    
    private fun processImageWithML(bitmap: Bitmap): ProcessingResult {
        val startTime = SystemClock.elapsedRealtime()
        
        // First run traditional processing to get contours for visualization
        val traditionalResult = processImageTraditional(bitmap, startTime, skipDebugImage = true)
        val flatContours = traditionalResult.flatContours
        
        // Run ML classification
        val mlResult = classifyTerrainWithML(bitmap)
        val isFlatTerrain = mlResult.isSafeLandingZone
        val confidenceScore = mlResult.confidenceScore
        
        // Create a debug image that includes both CV results and ML classification
        val debugImage = createEnhancedDebugImage(
            bitmap,
            flatContours,
            isFlatTerrain,
            confidenceScore,
            mlResult.safeScore,
            mlResult.unsafeScore
        )
        
        val processingTime = SystemClock.elapsedRealtime() - startTime
        
        return ProcessingResult(
            isFlatTerrain = isFlatTerrain,
            debugImage = debugImage,
            flatContours = flatContours,
            confidenceScore = confidenceScore,
            mlEnabled = true,
            processingTimeMs = processingTime
        )
    }
    
    private fun classifyTerrainWithML(bitmap: Bitmap): TerrainClassifier.TerrainClassificationResult {
        // Extract additional features using OpenCV that might help classification
        val ruggednessFeatures = featureExtractor.extractRuggednessFeatures(bitmap)
        
        // Run the main classifier
        val classificationResult = terrainClassifier!!.classifyTerrain(bitmap)
        
        // We could use the ruggedness features to further refine results
        // For example, boost confidence if ruggedness features agree with ML classification
        
        return classificationResult
    }
    
    private fun processImageTraditional(
        bitmap: Bitmap, 
        startTime: Long = SystemClock.elapsedRealtime(),
        skipDebugImage: Boolean = false
    ): ProcessingResult {
        // Convert Bitmap to OpenCV Mat
        val mat = ImageUtils.bitmapToMat(bitmap)
        
        // Convert to grayscale
        val grayMat = Mat()
        Imgproc.cvtColor(mat, grayMat, Imgproc.COLOR_BGR2GRAY)
        
        // Apply Gaussian blur with 5x5 kernel
        val blurredMat = Mat()
        Imgproc.GaussianBlur(grayMat, blurredMat, Size(5.0, 5.0), 0.0)
        
        // Apply Canny edge detection with thresholds 50 and 150
        val edgesMat = Mat()
        Imgproc.Canny(blurredMat, edgesMat, 50.0, 150.0)
        
        // Dilate the edges to connect nearby edges
        val dilatedMat = Mat()
        val kernel = Imgproc.getStructuringElement(Imgproc.MORPH_RECT, Size(3.0, 3.0))
        Imgproc.dilate(edgesMat, dilatedMat, kernel)
        
        // Find contours
        val contours = ArrayList<MatOfPoint>()
        val hierarchy = Mat()
        Imgproc.findContours(
            dilatedMat.clone(),  // Use clone to avoid modifying the source
            contours,
            hierarchy,
            Imgproc.RETR_EXTERNAL,  // Only find external contours
            Imgproc.CHAIN_APPROX_SIMPLE
        )
        
        // Process contours to identify flat landing zones
        val flatContours = ArrayList<MatOfPoint>()
        val potentialLandingZones = ArrayList<Rect>()
        
        // Maximum image area (for relative size comparison)
        val imageArea = bitmap.width * bitmap.height
        
        for (contour in contours) {
            // Calculate contour area
            val contourArea = Imgproc.contourArea(contour)
            
            // Get bounding rectangle
            val rect = Imgproc.boundingRect(contour)
            val rectArea = rect.width.toDouble() * rect.height.toDouble()
            
            // Check if the contour is large enough (filters out noise)
            // but not too large (like the entire image border)
            val relativeArea = contourArea / imageArea
            if (contourArea > 500 && relativeArea < 0.7) {
                // Approximate the contour to reduce number of points
                val approxCurve = MatOfPoint2f()
                val contourPerimeter = Imgproc.arcLength(MatOfPoint2f(*contour.toArray()), true)
                Imgproc.approxPolyDP(
                    MatOfPoint2f(*contour.toArray()),
                    approxCurve,
                    0.02 * contourPerimeter,
                    true
                )
                
                // Convert back to MatOfPoint
                val approxPoints = Array(approxCurve.toArray().size) { i ->
                    approxCurve.toArray()[i]
                }
                val approxContour = MatOfPoint(*approxPoints.map { Point(it.x, it.y) }.toTypedArray())
                
                // Check ratio of contour area to bounding rectangle area
                // Flat areas will have a higher ratio
                val areaRatio = contourArea / rectArea
                
                // If the contour has few corners and a high area ratio, it's likely flat
                if (approxPoints.size < 8 && areaRatio > 0.8) {
                    flatContours.add(approxContour)
                    potentialLandingZones.add(rect)
                }
            }
        }
        
        // For landing zone detection, we look at both the number of flat areas
        // and their spatial distribution
        val isFlatTerrain = detectLandingSafety(flatContours, potentialLandingZones, bitmap.width, bitmap.height)
        
        // Create debug image with contours - unless we're skipping it
        val debugImage = if (skipDebugImage) {
            bitmap.copy(bitmap.config, true)
        } else {
            createDebugImage(bitmap, contours, flatContours, isFlatTerrain)
        }
        
        // Calculate processing time
        val processingTime = SystemClock.elapsedRealtime() - startTime
        
        // Release OpenCV resources
        mat.release()
        grayMat.release()
        blurredMat.release()
        edgesMat.release()
        dilatedMat.release()
        hierarchy.release()
        kernel.release()
        
        return ProcessingResult(
            isFlatTerrain = isFlatTerrain, 
            debugImage = debugImage, 
            flatContours = flatContours,
            confidenceScore = 0.0f,
            mlEnabled = false,
            processingTimeMs = processingTime
        )
    }
    
    // Helper method to determine if the detected flat areas constitute a safe landing zone
    private fun detectLandingSafety(
        flatContours: List<MatOfPoint>,
        potentialZones: List<Rect>,
        imageWidth: Int,
        imageHeight: Int
    ): Boolean {
        // First check: minimum number of flat areas
        if (flatContours.size < 2) {
            return false
        }
        
        // Second check: minimum total flat area relative to image
        val totalImageArea = imageWidth * imageHeight
        var totalFlatArea = 0.0
        
        for (contour in flatContours) {
            totalFlatArea += Imgproc.contourArea(contour)
        }
        
        val flatAreaRatio = totalFlatArea / totalImageArea
        if (flatAreaRatio < 0.15) {  // At least 15% of the image should be flat
            return false
        }
        
        // Third check: check if the largest flat area is significant enough
        val largestArea = flatContours.maxOfOrNull { Imgproc.contourArea(it) } ?: 0.0
        val largestAreaRatio = largestArea / totalImageArea
        
        if (largestAreaRatio < 0.1) {  // Largest zone should be at least 10% of image
            return false
        }
        
        // Check if we have at least one large enough landing zone rectangle
        val largestZone = potentialZones.maxByOrNull { it.width * it.height }
        if (largestZone != null) {
            val zoneArea = largestZone.width * largestZone.height
            if (zoneArea > 0.2 * totalImageArea) {
                return true
            }
        }
        
        // If all the above criteria are met, it's likely a safe landing zone
        return true
    }
    
    private fun createDebugImage(
        originalBitmap: Bitmap,
        allContours: List<MatOfPoint>,
        flatContours: List<MatOfPoint>,
        isFlatTerrain: Boolean
    ): Bitmap {
        // Create a copy of the original bitmap for drawing
        val debugBitmap = originalBitmap.copy(originalBitmap.config, true)
        val canvas = Canvas(debugBitmap)
        
        // Create paint for drawing contours
        val allContoursPaint = Paint().apply {
            color = Color.RED
            style = Paint.Style.STROKE
            strokeWidth = 2f
        }
        
        val flatContoursPaint = Paint().apply {
            color = Color.GREEN
            style = Paint.Style.STROKE
            strokeWidth = 3f
        }
        
        // Draw all contours in red
        for (contour in allContours) {
            drawContour(canvas, contour, allContoursPaint)
        }
        
        // Draw flat contours in green
        for (contour in flatContours) {
            drawContour(canvas, contour, flatContoursPaint)
        }
        
        // Add text indicating terrain status
        val textPaint = Paint().apply {
            color = if (isFlatTerrain) Color.GREEN else Color.RED
            textSize = 60f
            textAlign = Paint.Align.CENTER
            style = Paint.Style.FILL
            strokeWidth = 5f
        }
        
        val statusText = if (isFlatTerrain) "FLAT TERRAIN" else "ROUGH TERRAIN"
        canvas.drawText(
            statusText,
            canvas.width / 2f,
            100f,
            textPaint
        )
        
        // Add CV method indicator
        val methodPaint = Paint().apply {
            color = Color.WHITE
            textSize = 40f
            textAlign = Paint.Align.LEFT
            style = Paint.Style.FILL
            strokeWidth = 3f
        }
        
        canvas.drawText(
            "CV Analysis",
            20f,
            canvas.height - 20f,
            methodPaint
        )
        
        return debugBitmap
    }
    
    private fun createEnhancedDebugImage(
        originalBitmap: Bitmap,
        flatContours: List<MatOfPoint>,
        isFlatTerrain: Boolean,
        confidenceScore: Float,
        safeScore: Float,
        unsafeScore: Float
    ): Bitmap {
        // Create a copy of the original bitmap for drawing
        val debugBitmap = originalBitmap.copy(originalBitmap.config, true)
        val canvas = Canvas(debugBitmap)
        
        // Create paint for drawing flat contours
        val flatContoursPaint = Paint().apply {
            color = Color.GREEN
            style = Paint.Style.STROKE
            strokeWidth = 3f
        }
        
        // Draw flat contours in green - these help visualize what areas the CV algorithm thinks are flat
        for (contour in flatContours) {
            drawContour(canvas, contour, flatContoursPaint)
        }
        
        // Create semi-transparent overlay for ML classification visualization
        val overlayPaint = Paint().apply {
            color = if (isFlatTerrain) Color.argb(80, 0, 255, 0) else Color.argb(80, 255, 0, 0)
            style = Paint.Style.FILL
        }
        
        // Draw overlay rectangle based on ML classification result
        if (isFlatTerrain) {
            // For safe terrain, highlight the center area as the landing zone
            val centerX = canvas.width / 2f
            val centerY = canvas.height / 2f
            val zoneSize = min(canvas.width, canvas.height) * 0.5f
            
            canvas.drawRect(
                centerX - zoneSize / 2,
                centerY - zoneSize / 2,
                centerX + zoneSize / 2,
                centerY + zoneSize / 2,
                overlayPaint
            )
        } else {
            // For unsafe terrain, just add a warning border
            val borderWidth = 50f
            canvas.drawRect(
                borderWidth,
                borderWidth,
                canvas.width - borderWidth,
                canvas.height - borderWidth,
                overlayPaint
            )
        }
        
        // Add text indicating terrain status with confidence score
        val textPaint = Paint().apply {
            color = if (isFlatTerrain) Color.GREEN else Color.RED
            textSize = 60f
            textAlign = Paint.Align.CENTER
            style = Paint.Style.FILL
            strokeWidth = 5f
        }
        
        val confidencePercent = (confidenceScore * 100).toInt()
        val statusText = if (isFlatTerrain) 
            "SAFE LANDING ZONE ($confidencePercent%)" 
        else 
            "UNSAFE TERRAIN ($confidencePercent%)"
            
        canvas.drawText(
            statusText,
            canvas.width / 2f,
            100f,
            textPaint
        )
        
        // Add detailed ML classification information
        val infoPaint = Paint().apply {
            color = Color.WHITE
            textSize = 40f
            textAlign = Paint.Align.LEFT
            style = Paint.Style.FILL
            setShadowLayer(3f, 1f, 1f, Color.BLACK)
        }
        
        // Format scores as percentages
        val safePercent = (safeScore * 100).toInt()
        val unsafePercent = (unsafeScore * 100).toInt()
        
        canvas.drawText(
            "ML Analysis: Safe: $safePercent% | Unsafe: $unsafePercent%",
            20f,
            canvas.height - 20f,
            infoPaint
        )
        
        return debugBitmap
    }
    
    private fun drawContour(canvas: Canvas, contour: MatOfPoint, paint: Paint) {
        val points = contour.toArray()
        
        for (i in 0 until points.size - 1) {
            canvas.drawLine(
                points[i].x.toFloat(),
                points[i].y.toFloat(),
                points[i + 1].x.toFloat(),
                points[i + 1].y.toFloat(),
                paint
            )
        }
        
        // Close the contour
        if (points.isNotEmpty()) {
            canvas.drawLine(
                points[points.size - 1].x.toFloat(),
                points[points.size - 1].y.toFloat(),
                points[0].x.toFloat(),
                points[0].y.toFloat(),
                paint
            )
        }
    }
}
