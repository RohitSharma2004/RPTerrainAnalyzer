package com.landingzone.detector

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.Switch
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.ImageProxy
import androidx.core.content.ContextCompat
import com.landingzone.detector.util.ImageUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.opencv.android.OpenCVLoader
import org.opencv.core.Mat
import kotlin.coroutines.CoroutineContext

class MainActivity : AppCompatActivity(), CoroutineScope {

    // UI Elements
    private lateinit var previewImageView: ImageView
    private lateinit var captureButton: Button
    private lateinit var processButton: Button
    private lateinit var statusTextView: TextView
    private lateinit var processingIndicator: ProgressBar
    private lateinit var terrainIndicator: View
    private lateinit var terrainStatusText: TextView
    private lateinit var bluetoothIndicator: View
    private lateinit var bluetoothStatusText: TextView
    private lateinit var cameraIndicator: View
    private lateinit var cameraStatusText: TextView
    private lateinit var mlToggleSwitch: Switch
    
    // Managers
    private lateinit var cameraManager: CameraManager
    private lateinit var imageProcessor: ImageProcessor
    private lateinit var bluetoothManager: BluetoothManager
    private lateinit var permissionManager: PermissionManager
    
    // State
    private var currentBitmap: Bitmap? = null
    private var isProcessing = false
    
    private val job = Job()
    override val coroutineContext: CoroutineContext
        get() = job + Dispatchers.Main

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        // Initialize OpenCV
        if (!OpenCVLoader.initDebug()) {
            updateStatus("Error: OpenCV initialization failed")
            return
        }
        
        initializeViews()
        initializeManagers()
        setupListeners()
        requestPermissions()
    }
    
    private fun initializeViews() {
        // Main interface elements
        previewImageView = findViewById(R.id.preview_image_view)
        captureButton = findViewById(R.id.capture_button)
        processButton = findViewById(R.id.process_button)
        statusTextView = findViewById(R.id.status_text_view)
        mlToggleSwitch = findViewById(R.id.ml_toggle_switch)
        
        // Status indicators
        processingIndicator = findViewById(R.id.processing_indicator)
        terrainIndicator = findViewById(R.id.terrain_indicator)
        terrainStatusText = findViewById(R.id.terrain_status_text)
        bluetoothIndicator = findViewById(R.id.bluetooth_indicator)
        bluetoothStatusText = findViewById(R.id.bluetooth_status_text)
        cameraIndicator = findViewById(R.id.camera_indicator)
        cameraStatusText = findViewById(R.id.camera_status_text)
        
        // Initially disable buttons until permissions are granted
        captureButton.isEnabled = false
        processButton.isEnabled = false
        
        // Set initial status indicators
        updateBluetoothStatus(false)
        updateCameraStatus(false)
        terrainStatusText.text = getString(R.string.terrain_awaiting)
        
        // ML is enabled by default
        mlToggleSwitch.isChecked = true
    }
    
    private fun updateBluetoothStatus(connected: Boolean) {
        if (connected) {
            bluetoothIndicator.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.colorSuccess))
            bluetoothStatusText.text = getString(R.string.bluetooth_connected)
        } else {
            bluetoothIndicator.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.colorWarning))
            bluetoothStatusText.text = getString(R.string.bluetooth_disconnected)
        }
    }
    
    private fun updateCameraStatus(ready: Boolean) {
        if (ready) {
            cameraIndicator.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.colorSuccess))
            cameraStatusText.text = getString(R.string.camera_ready)
        } else {
            cameraIndicator.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.colorWarning))
            cameraStatusText.text = getString(R.string.camera_initializing)
        }
    }
    
    private fun updateTerrainStatus(isFlat: Boolean) {
        terrainIndicator.visibility = View.VISIBLE
        if (isFlat) {
            terrainIndicator.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.colorSuccess))
            terrainStatusText.text = getString(R.string.terrain_flat)
            terrainStatusText.setTextColor(ContextCompat.getColor(this, R.color.colorSuccess))
        } else {
            terrainIndicator.backgroundTintList = ColorStateList.valueOf(ContextCompat.getColor(this, R.color.colorDanger))
            terrainStatusText.text = getString(R.string.terrain_rough)
            terrainStatusText.setTextColor(ContextCompat.getColor(this, R.color.colorDanger))
        }
    }
    
    private fun initializeManagers() {
        permissionManager = PermissionManager(this)
        
        // Initialize the ML-enabled image processor
        imageProcessor = ImageProcessor(this)
        
        bluetoothManager = BluetoothManager(
            onConnected = { 
                updateStatus(getString(R.string.bluetooth_connected))
                runOnUiThread { updateBluetoothStatus(true) }
            },
            onDisconnected = { 
                updateStatus(getString(R.string.bluetooth_disconnected))
                runOnUiThread { updateBluetoothStatus(false) }
            },
            onError = { error -> 
                updateStatus("Bluetooth error: $error")
                runOnUiThread { updateBluetoothStatus(false) }
            }
        )
        
        cameraManager = CameraManager(
            this,
            previewImageView,
            onImageCaptured = { imageProxy ->
                handleCapturedImage(imageProxy)
            }
        )
    }
    
    private fun setupListeners() {
        captureButton.setOnClickListener {
            updateStatus("Capturing image...")
            cameraManager.captureImage()
        }
        
        processButton.setOnClickListener {
            currentBitmap?.let {
                if (!isProcessing) {
                    isProcessing = true
                    processButton.isEnabled = false
                    updateStatus("Processing image...")
                    
                    launch {
                        processImage(it)
                    }
                }
            } ?: updateStatus("No image to process")
        }
        
        // Toggle Machine Learning processing mode
        mlToggleSwitch.setOnCheckedChangeListener { _, isChecked ->
            imageProcessor.toggleMachineLearning(isChecked)
            val modeMessage = if (isChecked) "ML mode enabled" else "CV mode enabled"
            updateStatus(modeMessage)
        }
    }
    
    private fun requestPermissions() {
        permissionManager.requestPermissions(
            onAllGranted = {
                updateStatus("Permissions granted")
                captureButton.isEnabled = true
                setupCamera()
                setupBluetooth()
            },
            onPermissionDenied = { permission ->
                updateStatus("Permission denied: $permission")
            }
        )
    }
    
    private fun setupCamera() {
        cameraManager.startCamera()
        updateStatus("Camera initialized")
        updateCameraStatus(true)
    }
    
    private fun setupBluetooth() {
        launch {
            val initialized = withContext(Dispatchers.IO) {
                bluetoothManager.initialize()
            }
            
            if (initialized) {
                updateStatus("Bluetooth initialized")
                promptBluetoothConnection()
            } else {
                updateStatus("Bluetooth initialization failed")
                updateBluetoothStatus(false)
            }
        }
    }
    
    private fun promptBluetoothConnection() {
        val devices = bluetoothManager.getPairedDevices()
        if (devices.isEmpty()) {
            updateStatus("No paired Bluetooth devices found")
            // Start discovery
            launch {
                withContext(Dispatchers.IO) {
                    bluetoothManager.startDiscovery()
                }
            }
        } else {
            // Connect to the first HC-05/HC-06 device
            val targetDevice = devices.find { device ->
                device.name?.contains("HC-05", ignoreCase = true) == true ||
                device.name?.contains("HC-06", ignoreCase = true) == true
            }
            
            if (targetDevice != null) {
                connectToDevice(targetDevice)
            } else {
                updateStatus("No HC-05/HC-06 device found in paired devices")
                launch {
                    withContext(Dispatchers.IO) {
                        bluetoothManager.startDiscovery()
                    }
                }
            }
        }
    }
    
    private fun connectToDevice(device: BluetoothDevice) {
        updateStatus("Connecting to ${device.name}...")
        launch {
            withContext(Dispatchers.IO) {
                bluetoothManager.connectToDevice(device)
            }
        }
    }
    
    private fun handleCapturedImage(imageProxy: ImageProxy) {
        updateStatus("Image captured")
        
        // Convert ImageProxy to Bitmap
        currentBitmap = ImageUtils.imageProxyToBitmap(imageProxy)
        
        // Display the captured image
        currentBitmap?.let {
            previewImageView.setImageBitmap(it)
            processButton.isEnabled = true
        }
        
        imageProxy.close()
    }
    
    private suspend fun processImage(bitmap: Bitmap) {
        updateStatus(getString(R.string.status_processing))
        
        // Show processing indicator
        withContext(Dispatchers.Main) {
            processingIndicator.visibility = View.VISIBLE
            terrainStatusText.text = getString(R.string.terrain_analyzing)
        }
        
        val result = withContext(Dispatchers.Default) {
            imageProcessor.processImage(bitmap, previewImageView)
        }
        
        val isLandingSafe = result.isFlatTerrain
        val debugImage = result.debugImage
        val isMlEnabled = result.mlEnabled
        val confidenceScore = result.confidenceScore
        val processingTime = result.processingTimeMs
        
        // Display processed image with contours
        withContext(Dispatchers.Main) {
            // Hide processing indicator
            processingIndicator.visibility = View.GONE
            
            // Update UI
            previewImageView.setImageBitmap(debugImage)
            updateTerrainStatus(isLandingSafe)
            
            // Update status message with ML info if enabled
            val terrainStatus = if (isLandingSafe) 
                getString(R.string.terrain_flat) 
            else 
                getString(R.string.terrain_rough)
                
            // Add ML confidence and processing time if ML was used
            val statusMsg = buildString {
                append(terrainStatus)
                if (isMlEnabled) {
                    val confidencePercent = (confidenceScore * 100).toInt()
                    append(" (${confidencePercent}% confidence)")
                    append(" - ML enabled")
                }
                append(" [${processingTime}ms]")
            }
            
            updateStatus(statusMsg)
            
            // Send command to parachute controller
            if (bluetoothManager.isConnected()) {
                val command = if (isLandingSafe) 'L' else 'R'
                sendBluetoothCommand(command)
            } else {
                updateStatus("Bluetooth not connected. Cannot send command.")
            }
            
            isProcessing = false
            processButton.isEnabled = true
        }
    }
    
    private fun sendBluetoothCommand(command: Char) {
        launch {
            val success = withContext(Dispatchers.IO) {
                bluetoothManager.sendCommand(command)
            }
            
            if (success) {
                val commandStatus = if (command == 'L') 
                    getString(R.string.status_command_land) 
                else 
                    getString(R.string.status_command_redirect)
                updateStatus(commandStatus)
            } else {
                updateStatus("Failed to send command")
            }
        }
    }
    
    private fun updateStatus(message: String) {
        runOnUiThread {
            statusTextView.text = message
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        bluetoothManager.handleActivityResult(requestCode, resultCode)
    }
    
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        permissionManager.handlePermissionResult(requestCode, permissions, grantResults)
    }
    
    override fun onDestroy() {
        super.onDestroy()
        job.cancel()
        bluetoothManager.close()
        cameraManager.shutdown()
    }
}
