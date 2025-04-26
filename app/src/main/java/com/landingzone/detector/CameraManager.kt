package com.landingzone.detector

import android.content.Context
import android.widget.ImageView
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import java.util.concurrent.Executor

class CameraManager(
    private val context: Context,
    private val previewView: ImageView,
    private val onImageCaptured: (ImageProxy) -> Unit
) {

    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null
    private val executor = ContextCompat.getMainExecutor(context)
    
    fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(context)
        
        cameraProviderFuture.addListener({
            val cameraProvider = cameraProviderFuture.get()
            bindCameraUseCases(cameraProvider)
        }, executor)
    }
    
    private fun bindCameraUseCases(cameraProvider: ProcessCameraProvider) {
        // Set up the preview use case
        val preview = Preview.Builder()
            .build()
        
        // Set up the image capture use case
        imageCapture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
            .build()
        
        // Select the back camera
        val cameraSelector = CameraSelector.Builder()
            .requireLensFacing(CameraSelector.LENS_FACING_BACK)
            .build()
        
        try {
            // Unbind any bound use cases before rebinding
            cameraProvider.unbindAll()
            
            // Bind the use cases to the camera
            camera = cameraProvider.bindToLifecycle(
                context as LifecycleOwner,
                cameraSelector,
                preview,
                imageCapture
            )
            
            // For this version, since we're directly using captured images in ImageCapture,
            // we don't need a continuous preview feed and will display captures manually
            // A full implementation would use a PreviewView or SurfaceView for live preview
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    fun captureImage() {
        val imageCapture = imageCapture ?: return
        
        imageCapture.takePicture(
            executor,
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    onImageCaptured(image)
                }
                
                override fun onError(exception: ImageCaptureException) {
                    exception.printStackTrace()
                }
            }
        )
    }
    
    fun shutdown() {
        // Release camera resources
        camera = null
        imageCapture = null
    }
}
