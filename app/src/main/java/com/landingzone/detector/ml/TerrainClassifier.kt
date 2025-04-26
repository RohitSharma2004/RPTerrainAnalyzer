package com.landingzone.detector.ml

import android.content.Context
import android.graphics.Bitmap
import android.graphics.RectF
import android.os.SystemClock
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.GpuDelegate
import org.tensorflow.lite.support.common.FileUtil
import org.tensorflow.lite.support.common.ops.NormalizeOp
import org.tensorflow.lite.support.image.ImageProcessor
import org.tensorflow.lite.support.image.TensorImage
import org.tensorflow.lite.support.image.ops.ResizeOp
import org.tensorflow.lite.support.image.ops.ResizeWithCropOrPadOp
import org.tensorflow.lite.support.image.ops.Rot90Op
import java.io.Closeable
import java.nio.MappedByteBuffer
import java.util.PriorityQueue

/**
 * TerrainClassifier uses a TensorFlow Lite model to classify terrain as safe (flat) or unsafe (rough)
 * It uses MobileNetV2 architecture trained on a dataset of terrain images
 */
class TerrainClassifier(
    private val context: Context,
    private val modelPath: String = "terrain_classifier_model.tflite",
    private val useGPU: Boolean = true
) : Closeable {

    companion object {
        private const val INPUT_SIZE = 224 // Standard MobileNet input size
        private const val MAX_RESULTS = 3 // Return top 3 classifications
        private const val THRESHOLD = 0.5f // Classification confidence threshold
    }

    private var gpuDelegate: GpuDelegate? = null
    private var interpreter: Interpreter? = null
    private val imageTensorProcessor = ImageProcessor.Builder()
        .add(ResizeWithCropOrPadOp(INPUT_SIZE, INPUT_SIZE))
        .add(NormalizeOp(127.5f, 127.5f)) // Normalize to [-1, 1]
        .build()

    init {
        setupInterpreter()
    }

    private fun setupInterpreter() {
        val options = Interpreter.Options().apply {
            if (useGPU) {
                gpuDelegate = GpuDelegate()
                addDelegate(gpuDelegate)
            }
            setNumThreads(4) // Use 4 threads for CPU execution
        }

        val modelBuffer = loadModelFile(context)
        interpreter = Interpreter(modelBuffer, options)
    }

    private fun loadModelFile(context: Context): MappedByteBuffer {
        return FileUtil.loadMappedFile(context, modelPath)
    }

    /**
     * Classifies the terrain in the given bitmap
     * @param bitmap The image to classify
     * @return TerrainClassificationResult with classification results
     */
    fun classifyTerrain(bitmap: Bitmap): TerrainClassificationResult {
        val startTime = SystemClock.elapsedRealtime()

        // Preprocess the image - resize and normalize
        val tensorImage = TensorImage.fromBitmap(bitmap)
        val processedImage = imageTensorProcessor.process(tensorImage)

        // Create output array for model results
        val outputBuffer = Array(1) { FloatArray(2) } // Assuming binary classification [unsafe, safe]

        // Run inference
        interpreter?.run(processedImage.buffer, outputBuffer)

        // Process results
        val inferenceTime = SystemClock.elapsedRealtime() - startTime
        
        // Get confidence scores
        val unsafeScore = outputBuffer[0][0]
        val safeScore = outputBuffer[0][1]
        
        // Determine if terrain is safe for landing
        val isSafe = safeScore > THRESHOLD && safeScore > unsafeScore
        
        // Create result with confidence scores
        val result = TerrainClassificationResult(
            isSafeLandingZone = isSafe,
            confidenceScore = if (isSafe) safeScore else unsafeScore,
            inferenceTimeMs = inferenceTime,
            safeScore = safeScore,
            unsafeScore = unsafeScore
        )

        return result
    }

    /**
     * Analyzes multiple regions of the image for more detailed terrain analysis
     * Useful for identifying specific landing zones within a larger image
     */
    fun analyzeTerrainRegions(bitmap: Bitmap, regionCount: Int = 4): TerrainRegionAnalysisResult {
        val regions = mutableListOf<TerrainRegion>()

        // Get overall classification
        val fullImageResult = classifyTerrain(bitmap)
        
        // Divide image into regions for more detailed analysis
        val width = bitmap.width
        val height = bitmap.height
        val regionWidth = width / 2
        val regionHeight = height / 2
        
        // Create regions (dividing image into quadrants)
        val topLeft = Bitmap.createBitmap(bitmap, 0, 0, regionWidth, regionHeight)
        val topRight = Bitmap.createBitmap(bitmap, regionWidth, 0, width - regionWidth, regionHeight)
        val bottomLeft = Bitmap.createBitmap(bitmap, 0, regionHeight, regionWidth, height - regionHeight)
        val bottomRight = Bitmap.createBitmap(bitmap, regionWidth, regionHeight, width - regionWidth, height - regionHeight)
        
        // Classify each region
        val regionBitmaps = listOf(topLeft, topRight, bottomLeft, bottomRight)
        val regionRects = listOf(
            RectF(0f, 0f, regionWidth.toFloat(), regionHeight.toFloat()),
            RectF(regionWidth.toFloat(), 0f, width.toFloat(), regionHeight.toFloat()),
            RectF(0f, regionHeight.toFloat(), regionWidth.toFloat(), height.toFloat()),
            RectF(regionWidth.toFloat(), regionHeight.toFloat(), width.toFloat(), height.toFloat())
        )
        
        // Process each region
        for (i in regionBitmaps.indices) {
            val result = classifyTerrain(regionBitmaps[i])
            regions.add(
                TerrainRegion(
                    bounds = regionRects[i],
                    isSafe = result.isSafeLandingZone,
                    confidence = result.confidenceScore
                )
            )
            // Recycle the bitmap to free memory
            regionBitmaps[i].recycle()
        }
        
        // Find best landing region (highest safe confidence)
        val bestRegion = regions.filter { it.isSafe }
            .maxByOrNull { it.confidence }
        
        return TerrainRegionAnalysisResult(
            overallSafe = fullImageResult.isSafeLandingZone,
            overallConfidence = fullImageResult.confidenceScore,
            regions = regions,
            bestLandingRegion = bestRegion,
            inferenceTimeMs = fullImageResult.inferenceTimeMs
        )
    }

    override fun close() {
        interpreter?.close()
        gpuDelegate?.close()
        interpreter = null
        gpuDelegate = null
    }

    /**
     * Represents the result of terrain classification
     */
    data class TerrainClassificationResult(
        val isSafeLandingZone: Boolean,
        val confidenceScore: Float,
        val inferenceTimeMs: Long,
        val safeScore: Float,
        val unsafeScore: Float
    )

    /**
     * Represents a specific region of terrain in the image
     */
    data class TerrainRegion(
        val bounds: RectF,
        val isSafe: Boolean,
        val confidence: Float
    )

    /**
     * Represents the complete terrain analysis result with regions
     */
    data class TerrainRegionAnalysisResult(
        val overallSafe: Boolean,
        val overallConfidence: Float,
        val regions: List<TerrainRegion>,
        val bestLandingRegion: TerrainRegion?,
        val inferenceTimeMs: Long
    )
}