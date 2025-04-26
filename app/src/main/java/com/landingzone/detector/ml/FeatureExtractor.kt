package com.landingzone.detector.ml

import android.graphics.Bitmap
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfFloat
import org.opencv.core.MatOfPoint
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import org.tensorflow.lite.support.image.TensorImage
import java.nio.FloatBuffer

/**
 * Extracts features from images that can be used as additional inputs to the machine learning model
 * This helps improve classification accuracy by providing domain-specific features
 */
class FeatureExtractor {

    /**
     * Extracts texture features from the image using OpenCV
     * @param bitmap Input image
     * @return Float array containing texture features
     */
    fun extractTextureFeatures(bitmap: Bitmap): FloatArray {
        val mat = Mat()
        Utils.bitmapToMat(bitmap, mat)
        
        // Convert to grayscale
        val grayMat = Mat()
        Imgproc.cvtColor(mat, grayMat, Imgproc.COLOR_BGR2GRAY)
        
        // Calculate Haralick texture features
        val glcm = calculateGLCM(grayMat)
        val haralickFeatures = calculateHaralickFeatures(glcm)
        
        // Calculate gradient features
        val gradientFeatures = calculateGradientFeatures(grayMat)
        
        // Combine all features
        val features = FloatArray(haralickFeatures.size + gradientFeatures.size)
        System.arraycopy(haralickFeatures, 0, features, 0, haralickFeatures.size)
        System.arraycopy(gradientFeatures, 0, features, haralickFeatures.size, gradientFeatures.size)
        
        // Cleanup
        mat.release()
        grayMat.release()
        
        return features
    }

    /**
     * Calculates the Gray Level Co-occurrence Matrix for texture analysis
     */
    private fun calculateGLCM(grayMat: Mat): Mat {
        // Quantize to fewer gray levels for more stable features
        val quantizedMat = Mat()
        Core.divide(grayMat, Scalar(16.0), quantizedMat)
        quantizedMat.convertTo(quantizedMat, CvType.CV_8U)
        
        // Define GLCM parameters - 16 gray levels
        val levels = 16
        val glcm = Mat.zeros(levels, levels, CvType.CV_32F)
        
        // Compute GLCM for horizontal adjacency (could extend to multiple orientations)
        val rows = quantizedMat.rows()
        val cols = quantizedMat.cols()
        
        for (i in 0 until rows) {
            for (j in 0 until cols - 1) {
                val refPixel = quantizedMat.get(i, j)[0].toInt()
                val neighborPixel = quantizedMat.get(i, j + 1)[0].toInt()
                
                // Increment GLCM at corresponding position
                val value = glcm.get(refPixel, neighborPixel)[0] + 1.0
                glcm.put(refPixel, neighborPixel, value)
            }
        }
        
        // Normalize GLCM
        val sum = Core.sumElems(glcm).`val`[0]
        Core.divide(glcm, Scalar(sum), glcm)
        
        quantizedMat.release()
        return glcm
    }

    /**
     * Calculate Haralick texture features from GLCM
     */
    private fun calculateHaralickFeatures(glcm: Mat): FloatArray {
        val features = FloatArray(4) // We'll compute 4 key Haralick features
        
        // 1. Energy/ASM (Angular Second Moment)
        var energy = 0.0
        for (i in 0 until glcm.rows()) {
            for (j in 0 until glcm.cols()) {
                val value = glcm.get(i, j)[0]
                energy += value * value
            }
        }
        features[0] = energy.toFloat()
        
        // 2. Contrast
        var contrast = 0.0
        for (i in 0 until glcm.rows()) {
            for (j in 0 until glcm.cols()) {
                contrast += (i - j) * (i - j) * glcm.get(i, j)[0]
            }
        }
        features[1] = contrast.toFloat()
        
        // 3. Correlation
        var meanI = 0.0
        var meanJ = 0.0
        for (i in 0 until glcm.rows()) {
            for (j in 0 until glcm.cols()) {
                meanI += i * glcm.get(i, j)[0]
                meanJ += j * glcm.get(i, j)[0]
            }
        }
        
        var stdI = 0.0
        var stdJ = 0.0
        for (i in 0 until glcm.rows()) {
            for (j in 0 until glcm.cols()) {
                stdI += (i - meanI) * (i - meanI) * glcm.get(i, j)[0]
                stdJ += (j - meanJ) * (j - meanJ) * glcm.get(i, j)[0]
            }
        }
        stdI = Math.sqrt(stdI)
        stdJ = Math.sqrt(stdJ)
        
        var correlation = 0.0
        for (i in 0 until glcm.rows()) {
            for (j in 0 until glcm.cols()) {
                correlation += ((i - meanI) * (j - meanJ) * glcm.get(i, j)[0]) / (stdI * stdJ + 1e-10)
            }
        }
        features[2] = correlation.toFloat()
        
        // 4. Homogeneity (Inverse Difference Moment)
        var homogeneity = 0.0
        for (i in 0 until glcm.rows()) {
            for (j in 0 until glcm.cols()) {
                homogeneity += glcm.get(i, j)[0] / (1 + (i - j) * (i - j))
            }
        }
        features[3] = homogeneity.toFloat()
        
        glcm.release()
        return features
    }

    /**
     * Calculate gradient based features for texture analysis
     */
    private fun calculateGradientFeatures(grayMat: Mat): FloatArray {
        val gradientFeatures = FloatArray(2)
        
        // Compute Sobel gradients
        val gradX = Mat()
        val gradY = Mat()
        Imgproc.Sobel(grayMat, gradX, CvType.CV_32F, 1, 0)
        Imgproc.Sobel(grayMat, gradY, CvType.CV_32F, 0, 1)
        
        // Compute gradient magnitude and direction
        val magnitude = Mat()
        Core.magnitude(gradX, gradY, magnitude)
        
        // Calculate mean and standard deviation of magnitude
        val meanStdDev = Core.meanStdDev(magnitude)
        gradientFeatures[0] = meanStdDev.`val`[0].toFloat() / 255.0f  // Normalize
        gradientFeatures[1] = meanStdDev.`val`[1].toFloat() / 255.0f  // Normalize
        
        // Clean up
        gradX.release()
        gradY.release()
        magnitude.release()
        
        return gradientFeatures
    }

    /**
     * Extract terrain ruggedness features from the image
     */
    fun extractRuggednessFeatures(bitmap: Bitmap): FloatArray {
        val mat = Mat()
        Utils.bitmapToMat(bitmap, mat)
        
        // Convert to grayscale
        val grayMat = Mat()
        Imgproc.cvtColor(mat, grayMat, Imgproc.COLOR_BGR2GRAY)
        
        // Apply Laplacian filter to detect edges/texture
        val laplacianMat = Mat()
        Imgproc.Laplacian(grayMat, laplacianMat, CvType.CV_32F)
        
        // Get standard deviation of Laplacian - measure of focus/texture
        val meanStdDev = Core.meanStdDev(laplacianMat)
        val laplacianStdDev = meanStdDev.`val`[1].toFloat()
        
        // Find contours for shape analysis
        val edgesMat = Mat()
        Imgproc.Canny(grayMat, edgesMat, 50.0, 150.0)
        
        val contours = ArrayList<MatOfPoint>()
        val hierarchy = Mat()
        Imgproc.findContours(
            edgesMat,
            contours,
            hierarchy,
            Imgproc.RETR_LIST,
            Imgproc.CHAIN_APPROX_SIMPLE
        )
        
        // Count number of contours normalized by image size
        val contourDensity = contours.size.toFloat() / (bitmap.width * bitmap.height).toFloat() * 10000
        
        // Calculate average contour size
        var totalContourArea = 0.0
        for (contour in contours) {
            totalContourArea += Imgproc.contourArea(contour)
        }
        val avgContourArea = if (contours.size > 0) 
            (totalContourArea / contours.size).toFloat() / (bitmap.width * bitmap.height).toFloat() * 100
        else 
            0.0f
        
        // Cleanup
        mat.release()
        grayMat.release()
        laplacianMat.release()
        edgesMat.release()
        hierarchy.release()
        for (contour in contours) {
            contour.release()
        }
        
        return floatArrayOf(laplacianStdDev / 10.0f, contourDensity, avgContourArea)
    }

    companion object {
        private class Scalar(val value: Double) {
            val `val` = doubleArrayOf(value, value, value, value)
        }
    }
}