#include <Servo.h>
#include <LiquidCrystal.h>
#include <DHT.h>

#define TRACKING_MODE 2
#define ENABLE_LCD true
#define ENABLE_TEMP false
#define DEBUG_MODE true

#define LDR_TOP_LEFT A0
#define LDR_TOP_RIGHT A1
#define LDR_BOTTOM_LEFT A2
#define LDR_BOTTOM_RIGHT A3

#define SERVO_HORIZONTAL 9
#define SERVO_VERTICAL 10
#define EMERGENCY_STOP_PIN 8
#define STATUS_LED_PIN 13

#define LCD_RS 12
#define LCD_ENABLE 11
#define LCD_D4 5
#define LCD_D5 4
#define LCD_D6 3
#define LCD_D7 2

#define DHT_PIN 7

#define TOLERANCE 25
#define SERVO_STEP 2
#define UPDATE_INTERVAL 500
#define MOVEMENT_DELAY 100

#define HORIZONTAL_MIN 0
#define HORIZONTAL_MAX 180
#define VERTICAL_MIN 0
#define VERTICAL_MAX 180

#define MAX_CONTINUOUS_MOVES 50
#define NIGHT_MODE_THRESHOLD 50

Servo horizontalServo;
Servo verticalServo;

int horizontalPos = 90;
int verticalPos = 90;

bool systemActive = true;
bool manualMode = false;
bool emergencyStop = false;
bool isTracking = false;
unsigned long lastUpdate = 0;
unsigned long lastMovement = 0;
int continuousMovements = 0;

int ldrReadings[4] = {0, 0, 0, 0};
int avgTop, avgBottom, avgLeft, avgRight;

#if ENABLE_LCD
LiquidCrystal lcd(LCD_RS, LCD_ENABLE, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
#endif

#if ENABLE_TEMP
DHT dht(DHT_PIN, DHT11);
float temperature = 0;
float humidity = 0;
#endif

void setup() {
  Serial.begin(9600);
  Serial.println(F("Solar Tracker v2.2 Initialized"));
  
  pinMode(EMERGENCY_STOP_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, HIGH);
  
  horizontalServo.attach(SERVO_HORIZONTAL);
  if (TRACKING_MODE == 2) {
    verticalServo.attach(SERVO_VERTICAL);
  }
  
  horizontalServo.write(horizontalPos);
  if (TRACKING_MODE == 2) {
    verticalServo.write(verticalPos);
  }
  
  #if ENABLE_LCD
  lcd.begin(16, 2);
  lcd.print(F("Solar Tracker"));
  lcd.setCursor(0, 1);
  lcd.print(F("Web Integrated"));
  delay(2000);
  lcd.clear();
  #endif
  
  #if ENABLE_TEMP
  dht.begin();
  #endif
  
  delay(1000);
  lastUpdate = millis();
}

void loop() {
  if (digitalRead(EMERGENCY_STOP_PIN) == LOW) {
    if (!emergencyStop) {
      emergencyStop = true;
      handleEmergencyStop();
    }
    return;
  } else {
    emergencyStop = false;
  }
  
  if (Serial.available()) {
    handleSerialCommands();
  }
  
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    readSensors();
    
    #if ENABLE_TEMP
    readTemperature();
    #endif
    
    checkDayNightMode();
    
    if (systemActive && !manualMode && !emergencyStop) {
      performTracking();
    }
    
    #if ENABLE_LCD
    updateLCD();
    #endif
    
    sendJSONData();
    
    lastUpdate = millis();
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
  }
}

void sendJSONData() {
  String json = "{";
  json += "\"hPos\":" + String(horizontalPos) + ",";
  json += "\"vPos\":" + String(verticalPos) + ",";
  json += "\"ldr_tl\":" + String(ldrReadings[0]) + ",";
  json += "\"ldr_tr\":" + String(ldrReadings[1]) + ",";
  json += "\"ldr_bl\":" + String(ldrReadings[2]) + ",";
  json += "\"ldr_br\":" + String(ldrReadings[3]) + ",";
  
  #if ENABLE_TEMP
  json += "\"temp\":" + String(temperature) + ",";
  #else
  json += "\"temp\":0,";
  #endif
  
  json += "\"active\":" + String(systemActive ? "true" : "false") + ",";
  json += "\"manual\":" + String(manualMode ? "true" : "false") + ",";
  json += "\"tracking\":" + String(isTracking ? "true" : "false");
  json += "}";
  
  Serial.println(json);
}

void readSensors() {
    ldrReadings[0] = analogRead(LDR_TOP_LEFT);
    ldrReadings[1] = analogRead(LDR_TOP_RIGHT);
    ldrReadings[2] = analogRead(LDR_BOTTOM_LEFT);
    ldrReadings[3] = analogRead(LDR_BOTTOM_RIGHT);
    
    avgTop = (ldrReadings[0] + ldrReadings[1]) / 2;
    avgBottom = (ldrReadings[2] + ldrReadings[3]) / 2;
    avgLeft = (ldrReadings[0] + ldrReadings[2]) / 2;
    avgRight = (ldrReadings[1] + ldrReadings[3]) / 2;
}

#if ENABLE_TEMP
void readTemperature() {
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  if (isnan(temperature) || isnan(humidity)) {
    temperature = 0;
    humidity = 0;
  }
}
#endif

void checkDayNightMode() {
  int totalLight = ldrReadings[0] + ldrReadings[1] + ldrReadings[2] + ldrReadings[3];
  int avgLight = totalLight / 4;
  
  if (avgLight < NIGHT_MODE_THRESHOLD) {
    if (systemActive) {
      systemActive = false;
      moveToRestPosition();
    }
  } else {
    if (!systemActive) {
      systemActive = true;
    }
  }
}

void performTracking() {
  bool moved = false;
  isTracking = false;
  
  int horizontalDiff = avgRight - avgLeft;
  if (abs(horizontalDiff) > TOLERANCE) {
    if (avgRight > avgLeft && horizontalPos > HORIZONTAL_MIN) {
      horizontalPos -= SERVO_STEP;
      moved = true;
    } else if (avgLeft > avgRight && horizontalPos < HORIZONTAL_MAX) {
      horizontalPos += SERVO_STEP;
      moved = true;
    }
    if (moved) horizontalServo.write(horizontalPos);
  }
  
  if (TRACKING_MODE == 2) {
    int verticalDiff = avgTop - avgBottom;
    if (abs(verticalDiff) > TOLERANCE) {
      if (avgTop > avgBottom && verticalPos < VERTICAL_MAX) {
        verticalPos += SERVO_STEP;
        moved = true;
      } else if (avgBottom > avgTop && verticalPos > VERTICAL_MIN) {
        verticalPos -= SERVO_STEP;
        moved = true;
      }
      if (moved) verticalServo.write(verticalPos);
    }
  }
  
  isTracking = moved;

  if (moved) {
    lastMovement = millis();
    continuousMovements++;
    if (continuousMovements >= MAX_CONTINUOUS_MOVES) {
      delay(5000);
      continuousMovements = 0;
    }
    delay(MOVEMENT_DELAY);
  } else {
    if (millis() - lastMovement > 10000) {
      continuousMovements = 0;
    }
  }
}

void moveToRestPosition() {
  horizontalPos = 90;
  verticalPos = 45;
  horizontalServo.write(horizontalPos);
  if (TRACKING_MODE == 2) verticalServo.write(verticalPos);
  delay(1000);
}

#if ENABLE_LCD
void updateLCD() {
  static unsigned long lastLCDUpdate = 0;
  if (millis() - lastLCDUpdate < 2000) return;
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(F("H:"));
  lcd.print(horizontalPos);
  if (TRACKING_MODE == 2) {
    lcd.print(F(" V:"));
    lcd.print(verticalPos);
  }
  
  lcd.setCursor(12, 0);
  if (!systemActive) lcd.print(F("SLEEP"));
  else if (manualMode) lcd.print(F("MAN"));
  else if (isTracking) lcd.print(F("TRACK"));
  else lcd.print(F("AUTO"));
  
  lcd.setCursor(0, 1);
  lcd.print(F("T:"));
  lcd.print(avgTop);
  lcd.print(F(" B:"));
  lcd.print(avgBottom);
  
  lastLCDUpdate = millis();
}
#endif

void handleSerialCommands() {
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toUpperCase();
  
  if (command.startsWith(F("H"))) {
    if (manualMode) {
      int angle = command.substring(1).toInt();
      if (angle >= HORIZONTAL_MIN && angle <= HORIZONTAL_MAX) {
        horizontalPos = angle;
        horizontalServo.write(horizontalPos);
      }
    }
  }
  else if (command.startsWith(F("V")) && TRACKING_MODE == 2) {
    if (manualMode) {
      int angle = command.substring(1).toInt();
      if (angle >= VERTICAL_MIN && angle <= VERTICAL_MAX) {
        verticalPos = angle;
        verticalServo.write(verticalPos);
      }
    }
  }
  else if (command == F("AUTO")) {
    manualMode = false;
  }
  else if (command == F("MANUAL")) {
    manualMode = true;
  }
  else if (command == F("STOP")) {
    systemActive = false;
  }
  else if (command == F("START")) {
    systemActive = true;
    manualMode = false;
  }
  else if (command == F("CENTER")) {
    horizontalPos = 90;
    verticalPos = 90;
    horizontalServo.write(horizontalPos);
    if (TRACKING_MODE == 2) verticalServo.write(verticalPos);
  }
}

void handleEmergencyStop() {
  horizontalServo.detach();
  if (TRACKING_MODE == 2) {
    verticalServo.detach();
  }
  systemActive = false;
  
  Serial.println(F("{\"error\":\"EMERGENCY STOP ACTIVATED\"}"));
  
  while(digitalRead(EMERGENCY_STOP_PIN) == LOW) {
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    delay(100);
  }

  horizontalServo.attach(SERVO_HORIZONTAL);
  if (TRACKING_MODE == 2) {
    verticalServo.attach(SERVO_VERTICAL);
  }
  emergencyStop = false;
  systemActive = true;
  Serial.println(F("{\"status\":\"Emergency stop released\"}"));
}