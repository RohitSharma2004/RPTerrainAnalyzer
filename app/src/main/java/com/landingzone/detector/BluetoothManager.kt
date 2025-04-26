package com.landingzone.detector

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Intent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

class BluetoothManager(
    private val onConnected: () -> Unit,
    private val onDisconnected: () -> Unit,
    private val onError: (String) -> Unit
) {
    companion object {
        private const val REQUEST_ENABLE_BT = 1
        private val SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }
    
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var bluetoothSocket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null
    
    fun initialize(): Boolean {
        // Get the BluetoothAdapter
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
        
        // Check if device supports Bluetooth
        if (bluetoothAdapter == null) {
            onError("Device does not support Bluetooth")
            return false
        }
        
        // Check if Bluetooth is enabled
        if (bluetoothAdapter?.isEnabled == false) {
            return false
        }
        
        return true
    }
    
    fun isConnected(): Boolean {
        return bluetoothSocket?.isConnected == true
    }
    
    fun getPairedDevices(): Set<BluetoothDevice> {
        return bluetoothAdapter?.bondedDevices ?: emptySet()
    }
    
    fun startDiscovery() {
        bluetoothAdapter?.startDiscovery()
    }
    
    suspend fun connectToDevice(device: BluetoothDevice): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                // Cancel discovery to save resources
                bluetoothAdapter?.cancelDiscovery()
                
                // Close existing connection if any
                close()
                
                // Create a BluetoothSocket for connection
                bluetoothSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                
                // Connect to the device
                bluetoothSocket?.connect()
                
                // Get the BluetoothSocket's output stream
                outputStream = bluetoothSocket?.outputStream
                
                // Notify success
                withContext(Dispatchers.Main) {
                    onConnected()
                }
                
                true
            } catch (e: IOException) {
                // Close the socket
                try {
                    bluetoothSocket?.close()
                } catch (closeException: IOException) {
                    closeException.printStackTrace()
                }
                
                withContext(Dispatchers.Main) {
                    onError("Failed to connect: ${e.message}")
                }
                
                false
            }
        }
    }
    
    suspend fun sendCommand(command: Char): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                if (!isConnected()) {
                    withContext(Dispatchers.Main) {
                        onError("Not connected to any device")
                    }
                    return@withContext false
                }
                
                // Send command character followed by newline for better reliability
                outputStream?.write(command.toInt())
                outputStream?.write('\n'.toInt())
                outputStream?.flush()
                
                // Log the command being sent
                withContext(Dispatchers.Main) {
                    when (command) {
                        'L' -> onError("Sending LAND command to parachute controller")
                        'R' -> onError("Sending REDIRECT command to parachute controller")
                        else -> onError("Sending unknown command: $command")
                    }
                }
                
                true
            } catch (e: IOException) {
                withContext(Dispatchers.Main) {
                    onError("Error sending command: ${e.message}")
                    onDisconnected()
                }
                
                try {
                    bluetoothSocket?.close()
                } catch (closeException: IOException) {
                    closeException.printStackTrace()
                }
                
                bluetoothSocket = null
                outputStream = null
                
                false
            }
        }
    }
    
    // Helper method to reconnect to the last connected device
    suspend fun reconnect(): Boolean {
        val socket = bluetoothSocket ?: return false
        val device = socket.remoteDevice ?: return false
        
        return connectToDevice(device)
    }
    
    fun handleActivityResult(requestCode: Int, resultCode: Int) {
        if (requestCode == REQUEST_ENABLE_BT) {
            if (resultCode == android.app.Activity.RESULT_OK) {
                // Bluetooth was enabled
            } else {
                // Bluetooth was not enabled
                onError("Bluetooth was not enabled")
            }
        }
    }
    
    fun close() {
        try {
            outputStream?.close()
            bluetoothSocket?.close()
        } catch (e: IOException) {
            e.printStackTrace()
        }
        
        outputStream = null
        bluetoothSocket = null
    }
}
