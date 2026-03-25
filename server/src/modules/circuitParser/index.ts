/**
 * Circuit Parser Module
 *
 * Parses Arduino/C++ code and infers the required circuit graph:
 *  - Nodes  = electronic components (LED, resistor, Arduino board, …)
 *  - Edges  = wires / connections between component pins
 *
 * The output is a structured CircuitGraph that can be fed to the renderer,
 * validator, or code-generator modules.
 */

export interface CircuitNode {
  id: string;
  type: string;
  label: string;
  /** Suggested canvas position (auto-layout) */
  x: number;
  y: number;
}

export interface CircuitEdge {
  id: string;
  from: string; // "nodeId:pinName"
  to: string;   // "nodeId:pinName"
  /** Wire colour: 'red' = VCC, 'black' = GND, anything else = signal */
  color: string;
}

export interface CircuitGraph {
  components: CircuitNode[];
  connections: CircuitEdge[];
}

// ── helpers ──────────────────────────────────────────────────────────────────

let _edgeSeq = 0;

function edgeId(): string {
  return `e${++_edgeSeq}`;
}

function nodeId(prefix: string, pin?: number | string): string {
  return pin !== undefined ? `${prefix}_${pin}` : prefix;
}

/**
 * Extract all integer arguments from a function call pattern in `code`.
 * e.g. extractArgs(code, 'digitalWrite') → [{pin:13,value:'HIGH'}, …]
 */
function extractPinCalls(
  code: string,
  fn: string,
): { pin: number; arg2: string }[] {
  const re = new RegExp(`${fn}\\s*\\(\\s*(\\d+)\\s*,\\s*([^)]+)\\s*\\)`, 'g');
  const results: { pin: number; arg2: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    results.push({ pin: parseInt(m[1], 10), arg2: m[2].trim() });
  }
  return results;
}

function extractPinModes(code: string): { pin: number; mode: string }[] {
  const re = /pinMode\s*\(\s*(\d+)\s*,\s*([^)]+)\s*\)/g;
  const results: { pin: number; mode: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    results.push({ pin: parseInt(m[1], 10), mode: m[2].trim() });
  }
  return results;
}

function extractAnalogWrites(code: string): { pin: number; value: string }[] {
  return extractPinCalls(code, 'analogWrite').map((r) => ({
    pin: r.pin,
    arg2: r.arg2,
  })).map((r) => ({ pin: r.pin, value: r.arg2 }));
}

/**
 * Very lightweight component type inference from the code text.
 * Checks for common library includes and function calls.
 */
function inferSpecialComponents(code: string): string[] {
  const detected: string[] = [];
  if (/#include\s*[<"]LiquidCrystal/i.test(code)) detected.push('lcd_16x2');
  if (/#include\s*[<"]Wire\.h/i.test(code) && /oled|ssd1306/i.test(code))
    detected.push('oled_ssd1306');
  if (/#include\s*[<"]DHT/i.test(code)) detected.push('dht11');
  if (/#include\s*[<"]Servo/i.test(code)) detected.push('servo');
  if (/#include\s*[<"]Stepper/i.test(code)) detected.push('stepper');
  if (/analogRead\s*\(/i.test(code)) detected.push('potentiometer');
  if (/tone\s*\(/i.test(code)) detected.push('buzzer');
  return detected;
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Parse Arduino/C++ `code` and return a CircuitGraph describing the inferred
 * circuit including auto-added resistors, power rails, and GND connections.
 */
export function parseArduinoCode(code: string): CircuitGraph {
  _edgeSeq = 0;

  const components: CircuitNode[] = [];
  const connections: CircuitEdge[] = [];

  // Always include the Arduino Uno board
  const arduinoId = 'arduino_uno';
  components.push({ id: arduinoId, type: 'arduino-uno', label: 'Arduino Uno', x: 300, y: 200 });

  // Power rails (virtual nodes for clean graph representation)
  const vccId = 'vcc_rail';
  const gndId = 'gnd_rail';
  components.push({ id: vccId, type: 'power_vcc', label: '5V', x: 80, y: 100 });
  components.push({ id: gndId, type: 'power_gnd', label: 'GND', x: 80, y: 300 });

  // Connect Arduino 5V and GND pins to power rails
  connections.push({ id: edgeId(), from: `${arduinoId}:5V`, to: `${vccId}:+`, color: 'red' });
  connections.push({ id: edgeId(), from: `${arduinoId}:GND`, to: `${gndId}:-`, color: 'black' });

  const pinModes = extractPinModes(code);
  const digitalWrites = extractPinCalls(code, 'digitalWrite');
  const analogWrites = extractAnalogWrites(code);
  const specialComps = inferSpecialComponents(code);

  // Collect unique output pins (digital + analog PWM)
  const outputPins = new Set<number>();
  const inputPins = new Set<number>();

  pinModes.forEach(({ pin, mode }) => {
    if (/OUTPUT/i.test(mode)) outputPins.add(pin);
    else inputPins.add(pin);
  });

  // Also treat any written pin as output if no pinMode found
  digitalWrites.forEach(({ pin }) => outputPins.add(pin));
  analogWrites.forEach(({ pin }) => outputPins.add(pin));

  let colX = 500;

  // ── LED + resistor for each output pin ──────────────────────────────────
  outputPins.forEach((pin) => {
    const resistorId = nodeId('resistor', pin);
    const ledId = nodeId('led', pin);

    components.push({
      id: resistorId,
      type: 'resistor-220',
      label: `220Ω (pin ${pin})`,
      x: colX,
      y: 180,
    });
    components.push({
      id: ledId,
      type: 'led-red',
      label: `LED (pin ${pin})`,
      x: colX,
      y: 280,
    });

    // Arduino pin → resistor input
    connections.push({
      id: edgeId(),
      from: `${arduinoId}:D${pin}`,
      to: `${resistorId}:in`,
      color: 'yellow',
    });
    // Resistor output → LED anode
    connections.push({
      id: edgeId(),
      from: `${resistorId}:out`,
      to: `${ledId}:anode`,
      color: 'yellow',
    });
    // LED cathode → GND
    connections.push({
      id: edgeId(),
      from: `${ledId}:cathode`,
      to: `${gndId}:-`,
      color: 'black',
    });

    colX += 120;
  });

  // ── Input pins (button / sensor placeholders) ────────────────────────────
  inputPins.forEach((pin) => {
    // Only add if not already covered as an output
    if (outputPins.has(pin)) return;

    const buttonId = nodeId('button', pin);
    components.push({
      id: buttonId,
      type: 'button',
      label: `Button (pin ${pin})`,
      x: colX,
      y: 200,
    });

    connections.push({
      id: edgeId(),
      from: `${arduinoId}:D${pin}`,
      to: `${buttonId}:sig`,
      color: 'green',
    });
    connections.push({
      id: edgeId(),
      from: `${buttonId}:+`,
      to: `${vccId}:+`,
      color: 'red',
    });
    connections.push({
      id: edgeId(),
      from: `${buttonId}:-`,
      to: `${gndId}:-`,
      color: 'black',
    });

    colX += 120;
  });

  // ── Special / include-detected components ────────────────────────────────
  const specialYBase = 420;
  specialComps.forEach((sc, idx) => {
    const scId = `special_${sc}_${idx}`;
    const meta: Record<string, { type: string; label: string }> = {
      lcd_16x2: { type: 'lcd-16x2-i2c', label: 'LCD 16×2 (I²C)' },
      oled_ssd1306: { type: 'oled-ssd1306', label: 'OLED 0.96"' },
      dht11: { type: 'dht11', label: 'DHT11 Sensor' },
      servo: { type: 'servo-sg90', label: 'Servo SG90' },
      stepper: { type: 'stepper-motor', label: 'Stepper Motor' },
      potentiometer: { type: 'potentiometer', label: 'Potentiometer' },
      buzzer: { type: 'buzzer-active', label: 'Buzzer' },
    };
    const m = meta[sc] ?? { type: sc, label: sc };
    components.push({
      id: scId,
      type: m.type,
      label: m.label,
      x: 300 + idx * 140,
      y: specialYBase,
    });

    // Connect power/GND
    connections.push({
      id: edgeId(),
      from: `${scId}:VCC`,
      to: `${vccId}:+`,
      color: 'red',
    });
    connections.push({
      id: edgeId(),
      from: `${scId}:GND`,
      to: `${gndId}:-`,
      color: 'black',
    });
  });

  return { components, connections };
}
