/**
 * Circuit Generator Module
 *
 * Reads a CircuitGraph (as produced by the parser or built interactively)
 * and generates a complete, ready-to-compile Arduino sketch.
 */

import { CircuitGraph, CircuitNode, CircuitEdge } from '../circuitParser';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract the numeric Arduino pin number from a "D13"-style pin reference. */
function extractDigitalPin(pinRef: string): number | null {
  const m = pinRef.match(/^D(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Extract analog pin number from "A0"-style reference. */
function extractAnalogPin(pinRef: string): number | null {
  const m = pinRef.match(/^A(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Given an edge endpoint like "nodeId:pinName", return the nodeId and pinName.
 */
function splitEndpoint(endpoint: string): { nodeId: string; pin: string } {
  const idx = endpoint.indexOf(':');
  if (idx === -1) return { nodeId: endpoint, pin: '' };
  return { nodeId: endpoint.slice(0, idx), pin: endpoint.slice(idx + 1) };
}

// ── main export ───────────────────────────────────────────────────────────────

export interface GeneratedCode {
  sketch: string;
  summary: string;
}

/**
 * Generate an Arduino sketch from the supplied CircuitGraph.
 *
 * The generator:
 *  1. Finds all LED nodes and their connected Arduino pins.
 *  2. Finds all button/input nodes and their pins.
 *  3. Detects special components (LCD, servo, DHT…) from component types.
 *  4. Emits `#include` directives, `setup()`, and a `loop()` body.
 */
export function generateArduinoCode(graph: CircuitGraph): GeneratedCode {
  const { components, connections } = graph;

  const byId = new Map<string, CircuitNode>();
  components.forEach((c) => byId.set(c.id, c));

  // ── gather LED → pin mappings ─────────────────────────────────────────────
  const ledPins: number[] = [];
  const inputPins: number[] = [];
  const pwmPins: number[] = [];

  connections.forEach((edge: CircuitEdge) => {
    const { nodeId: fromNodeId, pin: fromPin } = splitEndpoint(edge.from);
    const { nodeId: toNodeId } = splitEndpoint(edge.to);

    const fromNode = byId.get(fromNodeId);
    const toNode = byId.get(toNodeId);

    if (!fromNode || !toNode) return;

    // Arduino pin → resistor → LED
    if (fromNode.type === 'arduino-uno' || fromNode.type.startsWith('arduino')) {
      const pin = extractDigitalPin(fromPin);
      if (pin === null) return;

      // Follow the chain: Arduino:D13 → resistor:in → resistor:out → led:anode
      if (toNode.type.startsWith('resistor') || toNode.type.startsWith('led-')) {
        ledPins.push(pin);
      } else if (toNode.type === 'button') {
        inputPins.push(pin);
      } else if (toNode.type.startsWith('servo') || toNode.type.startsWith('stepper')) {
        pwmPins.push(pin);
      }
    }
  });

  // De-duplicate
  const uniqueLedPins = [...new Set(ledPins)];
  const uniqueInputPins = [...new Set(inputPins)];
  const uniquePwmPins = [...new Set(pwmPins)];

  // ── detect special components ─────────────────────────────────────────────
  const hasLcd = components.some((c) => c.type.includes('lcd'));
  const hasOled = components.some((c) => c.type.includes('oled'));
  const hasDht = components.some((c) => c.type.startsWith('dht'));
  const hasServo = components.some((c) => c.type.startsWith('servo'));
  const hasBuzzer = components.some((c) => c.type.includes('buzzer'));
  const hasPot = components.some((c) => c.type === 'potentiometer');

  // ── build sketch ──────────────────────────────────────────────────────────
  const lines: string[] = [];

  // --- includes ---
  if (hasLcd) lines.push('#include <LiquidCrystal_I2C.h>');
  if (hasOled) {
    lines.push('#include <Wire.h>');
    lines.push('#include <Adafruit_SSD1306.h>');
  }
  if (hasDht) {
    lines.push('#include <DHT.h>');
    const dhtPin = 2;
    lines.push(`#define DHTPIN ${dhtPin}`);
    lines.push('#define DHTTYPE DHT11');
    lines.push('DHT dht(DHTPIN, DHTTYPE);');
  }
  if (hasServo) lines.push('#include <Servo.h>');
  if (lines.length) lines.push('');

  // --- global declarations ---
  if (hasLcd) lines.push('LiquidCrystal_I2C lcd(0x27, 16, 2);', '');
  if (hasOled) {
    lines.push('#define SCREEN_WIDTH 128');
    lines.push('#define SCREEN_HEIGHT 64');
    lines.push('Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);', '');
  }
  if (hasServo) {
    uniquePwmPins.forEach((pin) => {
      lines.push(`Servo servo${pin};`);
    });
    if (uniquePwmPins.length) lines.push('');
  }

  if (uniqueLedPins.length) {
    uniqueLedPins.forEach((pin) => lines.push(`const int LED_PIN_${pin} = ${pin};`));
    lines.push('');
  }
  if (uniqueInputPins.length) {
    uniqueInputPins.forEach((pin) => lines.push(`const int BTN_PIN_${pin} = ${pin};`));
    lines.push('');
  }

  // --- setup() ---
  lines.push('void setup() {');
  lines.push('  Serial.begin(9600);');
  if (hasDht) lines.push('  dht.begin();');
  if (hasLcd) {
    lines.push('  lcd.init();');
    lines.push('  lcd.backlight();');
    lines.push('  lcd.print("Hello, World!");');
  }
  if (hasOled) {
    lines.push('  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {');
    lines.push('    Serial.println(F("SSD1306 allocation failed"));');
    lines.push('    for (;;);');
    lines.push('  }');
    lines.push('  display.clearDisplay();');
  }
  if (hasServo) {
    uniquePwmPins.forEach((pin) => {
      lines.push(`  servo${pin}.attach(${pin});`);
    });
  }
  uniqueLedPins.forEach((pin) => {
    lines.push(`  pinMode(LED_PIN_${pin}, OUTPUT);`);
  });
  uniqueInputPins.forEach((pin) => {
    lines.push(`  pinMode(BTN_PIN_${pin}, INPUT_PULLUP);`);
  });
  if (hasBuzzer) {
    lines.push('  pinMode(8, OUTPUT); // Buzzer');
  }
  lines.push('}', '');

  // --- loop() ---
  lines.push('void loop() {');

  if (hasDht) {
    lines.push('  float temperature = dht.readTemperature();');
    lines.push('  float humidity = dht.readHumidity();');
    lines.push('  if (!isnan(temperature) && !isnan(humidity)) {');
    lines.push('    Serial.print("Temp: "); Serial.print(temperature); Serial.println(" C");');
    lines.push('    Serial.print("Humidity: "); Serial.print(humidity); Serial.println(" %");');
    if (hasLcd) {
      lines.push('    lcd.clear();');
      lines.push('    lcd.setCursor(0, 0);');
      lines.push('    lcd.print("Temp: "); lcd.print(temperature); lcd.print(" C");');
      lines.push('    lcd.setCursor(0, 1);');
      lines.push('    lcd.print("Hum: "); lcd.print(humidity); lcd.print(" %");');
    }
    lines.push('  }');
    lines.push('  delay(2000);');
  } else if (hasPot) {
    lines.push('  int potValue = analogRead(A0);');
    lines.push('  Serial.println(potValue);');
    if (uniqueLedPins.length) {
      lines.push(`  analogWrite(LED_PIN_${uniqueLedPins[0]}, potValue / 4);`);
    }
    lines.push('  delay(100);');
  } else if (hasBuzzer) {
    lines.push('  tone(8, 440, 500);');
    lines.push('  delay(1000);');
    lines.push('  noTone(8);');
    lines.push('  delay(500);');
  } else if (hasServo) {
    lines.push('  // Sweep servo');
    uniquePwmPins.forEach((pin) => {
      lines.push(`  for (int pos = 0; pos <= 180; pos += 1) { servo${pin}.write(pos); delay(15); }`);
      lines.push(`  for (int pos = 180; pos >= 0; pos -= 1) { servo${pin}.write(pos); delay(15); }`);
    });
  } else if (uniqueInputPins.length && uniqueLedPins.length) {
    // Button-controlled LED
    lines.push(`  int btnState = digitalRead(BTN_PIN_${uniqueInputPins[0]});`);
    lines.push('  if (btnState == LOW) {');
    uniqueLedPins.forEach((pin) => lines.push(`    digitalWrite(LED_PIN_${pin}, HIGH);`));
    lines.push('  } else {');
    uniqueLedPins.forEach((pin) => lines.push(`    digitalWrite(LED_PIN_${pin}, LOW);`));
    lines.push('  }');
  } else if (uniqueLedPins.length) {
    // Default: blink all LEDs
    uniqueLedPins.forEach((pin) => lines.push(`  digitalWrite(LED_PIN_${pin}, HIGH);`));
    lines.push('  delay(500);');
    uniqueLedPins.forEach((pin) => lines.push(`  digitalWrite(LED_PIN_${pin}, LOW);`));
    lines.push('  delay(500);');
  } else {
    lines.push('  // Add your loop logic here');
    lines.push('  delay(1000);');
  }

  lines.push('}');

  const sketch = lines.join('\n');

  // ── human-readable summary ────────────────────────────────────────────────
  const parts: string[] = [];
  if (uniqueLedPins.length)
    parts.push(`${uniqueLedPins.length} LED(s) on pin(s) ${uniqueLedPins.join(', ')}`);
  if (uniqueInputPins.length)
    parts.push(`${uniqueInputPins.length} button(s) on pin(s) ${uniqueInputPins.join(', ')}`);
  if (hasLcd) parts.push('LCD 16×2 display (I²C)');
  if (hasOled) parts.push('OLED display (SSD1306)');
  if (hasDht) parts.push('DHT temperature/humidity sensor');
  if (hasServo) parts.push('servo motor');
  if (hasBuzzer) parts.push('buzzer');
  if (hasPot) parts.push('potentiometer (analog input A0)');

  const summary =
    parts.length > 0
      ? `Generated sketch for: ${parts.join(', ')}.`
      : 'Generated empty Arduino sketch template.';

  return { sketch, summary };
}
