/*
 * Parachute Controller
 * 
 * This Arduino/ESP32 sketch receives commands from the Android app
 * via Bluetooth and controls servos to manage parachute strings.
 */

#include <Servo.h>

// Define servo pins
#define SERVO1_PIN 9
#define SERVO2_PIN 10

// Define LED pin for status indication
#define STATUS_LED_PIN LED_BUILTIN

// Define servo positions
#define SERVO_RELEASE_POS 0   // Position to release parachute string (angle in degrees)
#define SERVO_FOLD_POS 90     // Position to fold/pull parachute string (angle in degrees)

// Create servo objects
Servo servo1;
Servo servo2;

// Command characters
#define LAND_CMD 'L'    // Land command (even/flat terrain)
#define REDIRECT_CMD 'R'    // Redirect command (rough terrain)

// Status tracking
unsigned long lastCommandTime = 0;
const unsigned long CONNECTION_TIMEOUT = 10000; // 10 seconds

void setup() {
  // Initialize serial communication with Bluetooth module
  Serial.begin(9600);
  
  // Initialize LED pin
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  // Attach servos to pins
  servo1.attach(SERVO1_PIN);
  servo2.attach(SERVO2_PIN);
  
  // Initialize servos to released position
  servo1.write(SERVO_RELEASE_POS);
  servo2.write(SERVO_RELEASE_POS);
  
  // Send initialization message
  Serial.println("Parachute Controller Ready");
  
  // Flash LED to indicate power-on
  flashLED(2, 500);
}

void loop() {
  // Check if data is available from the Bluetooth module
  if (Serial.available() > 0) {
    // Read the incoming command
    char command = Serial.read();
    
    // Update the last command time
    lastCommandTime = millis();
    
    // Skip newlines and carriage returns
    if (command == '\n' || command == '\r') {
      return;
    }
    
    // Process the command
    switch (command) {
      case LAND_CMD:
        // Even/flat terrain detected - release parachute strings for landing
        releaseParachute();
        Serial.println("Command received: LAND");
        // Flash LED to indicate landing mode
        flashLED(3, 200); // 3 flashes, 200ms apart
        break;
        
      case REDIRECT_CMD:
        // Rough terrain detected - fold parachute strings to redirect
        foldParachute();
        Serial.println("Command received: REDIRECT");
        // Flash LED to indicate redirect mode
        flashLED(5, 100); // 5 rapid flashes, 100ms apart
        break;
        
      default:
        // Unknown command - ignore if it's not one of our expected commands
        if (command >= 32 && command <= 126) { // Only print printable ASCII
          Serial.print("Unknown command: ");
          Serial.println(command);
        }
        break;
    }
    
    // Flush any remaining characters in the buffer
    while (Serial.available() > 0) {
      Serial.read();
    }
  }
  
  // Check for connection timeout - if no commands received for a while
  // flash the LED slowly to indicate waiting for connection
  if (millis() - lastCommandTime > CONNECTION_TIMEOUT) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(50);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(1950); // Total period of 2 seconds with 50ms on-time
  } else {
    // Small delay to prevent hogging the CPU when actively connected
    delay(10);
  }
}

// Function to flash the LED to indicate status
void flashLED(int numFlashes, int flashDuration) {
  for (int i = 0; i < numFlashes; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(flashDuration);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(flashDuration);
  }
}

void releaseParachute() {
  // Move servos to release position
  servo1.write(SERVO_RELEASE_POS);
  servo2.write(SERVO_RELEASE_POS);
}

void foldParachute() {
  // Move servos to fold position to pull strings
  servo1.write(SERVO_FOLD_POS);
  servo2.write(SERVO_FOLD_POS);
}
