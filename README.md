# Automated Solar Tracking System

A comprehensive Arduino-based solar tracking system that automatically follows the sun to maximize solar panel efficiency. This project includes both single-axis and dual-axis tracking implementations with complete documentation and code.

## 🌟 Project Overview

Solar tracking systems can increase solar panel efficiency by 30-60% compared to fixed installations by continuously orienting panels toward the sun. This project demonstrates both single-axis and dual-axis tracking using affordable components suitable for college-level engineering projects.

## 📊 Efficiency Comparison

| System Type | Efficiency Gain | Complexity | Recommended Use |
|-------------|----------------|-------------|------------------|
| Fixed Panel | Baseline (100%) | Low | Budget applications |
| Single-Axis | +30-40% | Medium | Most college projects |
| Dual-Axis | +40-60% | High | Advanced projects |

## 🛠️ Complete Component List

### Basic Single-Axis System
| Component | Quantity | Specifications | Estimated Cost |
|-----------|----------|----------------|----------------|
| Arduino UNO/Nano | 1 | ATmega328P | $15-25 |
| Servo Motor | 1 | SG90 (9g) or MG995 | $5-15 |
| LDR Sensors | 2 | GL5539 or similar | $2 |
| Resistors | 2 | 10kΩ, 1/4W | $1 |
| Solar Panel | 1 | 5-10W for prototype | $15-30 |
| Breadboard | 1 | Half-size | $5 |
| Jumper Wires | 1 pack | Male-to-Male | $3 |
| Frame Material | - | Wood/Aluminum/3D Print | $10-20 |
| **Total** | | | **$56-101** |

### Advanced Dual-Axis System
| Component | Quantity | Specifications | Estimated Cost |
|-----------|----------|----------------|----------------|
| Arduino UNO/Nano | 1 | ATmega328P | $15-25 |
| Servo Motors | 2 | MG995 recommended | $20-30 |
| LDR Sensors | 4 | GL5539 or similar | $3 |
| Resistors | 4 | 10kΩ, 1/4W | $2 |
| Solar Panel | 1 | 10-20W for demo | $25-50 |
| LCD Display | 1 | 16x2 I2C (optional) | $5 |
| DHT11 Sensor | 1 | Temperature/Humidity | $3 |
| Rain Sensor | 1 | Weather protection | $3 |
| PCB/Breadboard | 1 | Custom or large breadboard | $5-15 |
| Frame Material | - | Aluminum/Steel frame | $20-40 |
| **Total** | | | **$101-198** |

## 🔧 Hardware Setup

### 1. Circuit Assembly

#### Single-Axis Wiring
```
Arduino UNO          LDR Network           Servo Motor
     5V  ────────────── LDR1 ──┬── A0      VCC (Red) ── 5V
     GND ─────────────┬─ 10kΩ ─┘           GND (Brown) ─ GND  
     A0  ─────────────┘                    SIG (Orange) ─ Pin 9
     5V  ────────────── LDR2 ──┬── A1
     GND ─────────────┬─ 10kΩ ─┘
     A1  ─────────────┘
```

#### Dual-Axis Wiring  
```
Arduino UNO          4 LDR Network         2 Servo Motors
     5V  ────────────── LDR1(TL) ──┬── A0    H-Servo: Pin 9
     GND ─────────────┬─ 10kΩ ─────┘        V-Servo: Pin 10
     A0  ─────────────┘                     Both: 5V, GND
     5V  ────────────── LDR2(TR) ──┬── A1
     GND ─────────────┬─ 10kΩ ─────┘
     A1  ─────────────┘
     [Similar for LDR3(BL)→A2 and LDR4(BR)→A3]
```

### 2. Mechanical Assembly

#### Frame Construction Options
1. **Wood Frame** (Beginner)
   - Use plywood or MDF
   - Simple joints with screws
   - Low cost, easy to modify

2. **Aluminum Frame** (Intermediate)
   - T-slot aluminum extrusion
   - Professional appearance
   - More durable and precise

3. **3D Printed Parts** (Advanced)
   - Custom-designed joints
   - Precise servo mounts
   - Download STL files from project repositories

#### LDR Positioning
- Mount LDRs at panel corners
- Use small barriers between sensors to prevent cross-interference
- Angle sensors slightly upward (15-30°) for better sun detection
- Secure wiring to prevent movement during operation

## 💻 Software Installation

### 1. Arduino IDE Setup
```bash
# Download Arduino IDE from arduino.cc
# Install required libraries:
# - Servo (built-in)
# - LiquidCrystal (for LCD version)
```

### 2. Code Upload Process
1. Connect Arduino via USB
2. Select correct board: Tools → Board → Arduino UNO
3. Select correct port: Tools → Port → COM# (Windows) or /dev/tty* (Mac/Linux)
4. Open appropriate code file:
   - `arduino-single-axis.md` for single-axis system
   - `arduino-dual-axis.md` for dual-axis system
5. Upload code: Sketch → Upload (Ctrl+U)

### 3. Serial Monitor Testing
- Open Tools → Serial Monitor
- Set baud rate to 9600
- Observe sensor readings and servo positions
- Use for debugging and calibration

## 🎛️ System Configuration

### Calibration Parameters
```cpp
// In your Arduino code, adjust these values:
int tolerance = 20;        // Light difference threshold (10-50)
int servoSpeed = 2;        // Degrees per step (1-5)
int updateDelay = 500;     // Milliseconds between checks (100-2000)
int servoMin = 0;         // Minimum angle (adjust for your frame)
int servoMax = 180;       // Maximum angle (adjust for your frame)
```

### Performance Tuning
1. **High Precision**: Lower tolerance (10-15), slower speed (1-2)
2. **Fast Response**: Higher tolerance (30-50), faster speed (3-5)
3. **Power Saving**: Longer delays (1000-5000ms)
4. **Smooth Operation**: Medium settings with gradual adjustments

## 📱 Web Dashboard Integration

The project includes a web-based monitoring dashboard that displays:
- Real-time sensor readings
- Panel position and tracking status
- Power output metrics
- Historical performance data
- Manual control capabilities

Access the dashboard using the web application created in the previous step.

## 🧪 Testing Procedures

### 1. Component Testing
```cpp
// Test individual components with simple sketches:
// - Servo sweep test
// - LDR reading test  
// - Serial communication test
```

### 2. System Testing
1. **Indoor Testing**: Use bright lamp or flashlight
2. **Shadow Testing**: Cover individual LDRs to verify movement direction
3. **Full Range Testing**: Ensure servos reach mechanical limits safely
4. **Stability Testing**: Run for extended periods to check for oscillation

### 3. Performance Measurement
- Compare energy output: tracked vs fixed panel
- Measure tracking accuracy throughout the day
- Monitor system power consumption
- Document efficiency improvements

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

#### No Servo Movement
- **Check Power**: Ensure 5V supply can handle servo current (>500mA)
- **Verify Connections**: Test continuity of all wires
- **Upload Test Code**: Use simple servo sweep program first

#### Erratic Movement/Oscillation
- **Increase Tolerance**: Reduce sensitivity to minor light changes
- **Add Hysteresis**: Implement different thresholds for movement start/stop
- **Shield LDRs**: Prevent interference between sensors

#### Poor Tracking Accuracy
- **LDR Positioning**: Ensure sensors face the same direction as panel
- **Calibrate Range**: Adjust servo min/max angles for your setup
- **Environmental Factors**: Account for reflections and shadows

#### Serial Monitor Issues
- **Baud Rate**: Ensure both code and monitor use same rate (9600)
- **Port Selection**: Try different COM ports or restart IDE
- **Driver Issues**: Install CH340/CP2102 drivers for Arduino clones

### Advanced Diagnostics
```cpp
// Add debug functions to your code:
void printSensorValues() {
  Serial.print("LDR Values: ");
  // Print all sensor readings
}

void servoTest() {
  // Sweep servos through full range
}
```

## 🚀 Future Enhancements

### Intermediate Additions
- **Weather Monitoring**: Add rain/wind sensors for panel protection
- **Data Logging**: Store performance data on SD card
- **Wireless Connectivity**: ESP32/WiFi for remote monitoring
- **Battery Management**: Charge controller and energy storage

### Advanced Features  
- **GPS Integration**: Astronomical tracking algorithms
- **AI Optimization**: Machine learning for predictive tracking
- **Multiple Panel Control**: Scale up to array management
- **Grid Integration**: Power conditioning and utility connection

## 🤝 Contributing

This is an educational project. Students are encouraged to:
- Modify and improve the code
- Add new features and sensors  
- Share performance results
- Create variations for different applications

## 📄 License

This project is released under MIT License for educational use. Feel free to use, modify, and share with proper attribution.

---