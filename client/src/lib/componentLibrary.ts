// ─── Centralized Arduino Component Library ──────────────────────────────────
// 100+ components for Arduino and breadboard circuits

export type ComponentType =
  // Boards
  | 'arduino-uno'
  | 'arduino-nano'
  | 'arduino-mega'
  | 'arduino-leonardo'
  | 'arduino-pro-mini'
  | 'arduino-due'
  // Basic
  | 'breadboard-full'
  | 'breadboard-half'
  | 'breadboard-mini'
  | 'led-red'
  | 'led-green'
  | 'led-blue'
  | 'led-yellow'
  | 'led-white'
  | 'led-rgb'
  | 'resistor-220'
  | 'resistor-470'
  | 'resistor-1k'
  | 'resistor-10k'
  | 'resistor-100k'
  | 'capacitor-electrolytic'
  | 'capacitor-ceramic'
  | 'potentiometer'
  | 'button'
  | 'toggle-switch'
  | 'buzzer-active'
  | 'buzzer-passive'
  | 'dc-motor'
  | 'servo-sg90'
  | 'servo-mg996r'
  | 'stepper-motor'
  | 'relay-module'
  | 'diode-1n4007'
  | 'diode-zener'
  | 'transistor-npn'
  | 'transistor-pnp'
  // Sensors
  | 'dht11'
  | 'dht22'
  | 'ldr'
  | 'pir-sensor'
  | 'ultrasonic-hcsr04'
  | 'ir-sensor'
  | 'soil-moisture'
  | 'sound-sensor'
  | 'tilt-sensor'
  | 'hall-effect'
  | 'flame-sensor'
  | 'gas-mq2'
  | 'gas-mq135'
  | 'rain-sensor'
  | 'vibration-sensor'
  | 'touch-sensor'
  | 'color-tcs3200'
  | 'fingerprint-sensor'
  // Displays
  | 'lcd-16x2-i2c'
  | 'lcd-16x2-parallel'
  | 'lcd-20x4'
  | 'oled-ssd1306'
  | 'seven-seg-single'
  | 'seven-seg-4digit'
  | 'tm1637'
  | 'max7219'
  | 'neopixel'
  | 'dot-matrix-8x8'
  // Communication
  | 'hc05-bluetooth'
  | 'hc06-bluetooth'
  | 'nrf24l01'
  | 'esp8266-wifi'
  | 'lora-sx1278'
  | 'rfid-rc522'
  | 'i2c-module'
  // Power & Control
  | 'l298n'
  | 'l293d'
  | 'lm7805'
  | 'power-supply'
  | 'battery-9v'
  | 'battery-aa'
  | 'usb-power';

export interface PinDef {
  name: string;
  x: number;
  y: number;
}

export interface ComponentDef {
  type: ComponentType;
  label: string;
  category: string;
  width: number;
  height: number;
  color: string;
  pins: PinDef[];
  description: string;
  properties?: Record<string, string>;
}

// ─── Component definitions ──────────────────────────────────────────────────

export const COMPONENT_LIBRARY: ComponentDef[] = [
  // ── Boards ────────────────────────────────────────────────────────────────
  {
    type: 'arduino-uno',
    label: 'Arduino Uno',
    category: 'Boards',
    width: 130,
    height: 175,
    color: '#1a6b3c',
    description: 'Arduino Uno R3 microcontroller board',
    pins: [
      { name: 'D0/RX', x: 0, y: 35 },
      { name: 'D1/TX', x: 0, y: 50 },
      { name: 'D2', x: 0, y: 65 },
      { name: 'D3~', x: 0, y: 80 },
      { name: 'D4', x: 0, y: 95 },
      { name: 'D5~', x: 0, y: 110 },
      { name: 'D6~', x: 0, y: 125 },
      { name: 'D7', x: 0, y: 140 },
      { name: 'D8', x: 130, y: 35 },
      { name: 'D9~', x: 130, y: 50 },
      { name: 'D10~', x: 130, y: 65 },
      { name: 'D11~', x: 130, y: 80 },
      { name: 'D12', x: 130, y: 95 },
      { name: 'D13', x: 130, y: 110 },
      { name: 'A0', x: 130, y: 125 },
      { name: 'A1', x: 130, y: 140 },
      { name: 'A2', x: 130, y: 155 },
      { name: 'A3', x: 130, y: 165 },
      { name: '5V', x: 30, y: 0 },
      { name: '3.3V', x: 55, y: 0 },
      { name: 'GND', x: 75, y: 0 },
      { name: 'GND2', x: 95, y: 0 },
      { name: 'VIN', x: 10, y: 0 },
    ],
  },
  {
    type: 'arduino-nano',
    label: 'Arduino Nano',
    category: 'Boards',
    width: 100,
    height: 140,
    color: '#1a5c8a',
    description: 'Arduino Nano compact development board',
    pins: [
      { name: 'D2', x: 0, y: 30 },
      { name: 'D3~', x: 0, y: 45 },
      { name: 'D4', x: 0, y: 60 },
      { name: 'D5~', x: 0, y: 75 },
      { name: 'D6~', x: 0, y: 90 },
      { name: 'D7', x: 0, y: 105 },
      { name: 'D8', x: 100, y: 30 },
      { name: 'D9~', x: 100, y: 45 },
      { name: 'D10~', x: 100, y: 60 },
      { name: 'D11~', x: 100, y: 75 },
      { name: 'D12', x: 100, y: 90 },
      { name: 'D13', x: 100, y: 105 },
      { name: 'A0', x: 100, y: 120 },
      { name: 'A1', x: 100, y: 132 },
      { name: '5V', x: 25, y: 0 },
      { name: '3.3V', x: 50, y: 0 },
      { name: 'GND', x: 75, y: 0 },
    ],
  },
  {
    type: 'arduino-mega',
    label: 'Arduino Mega 2560',
    category: 'Boards',
    width: 160,
    height: 220,
    color: '#1a6b3c',
    description: 'Arduino Mega 2560 with 54 digital pins',
    pins: [
      { name: 'D2', x: 0, y: 30 }, { name: 'D3~', x: 0, y: 45 },
      { name: 'D4', x: 0, y: 60 }, { name: 'D5~', x: 0, y: 75 },
      { name: 'D6~', x: 0, y: 90 }, { name: 'D7', x: 0, y: 105 },
      { name: 'D8', x: 0, y: 120 }, { name: 'D9~', x: 0, y: 135 },
      { name: 'D10~', x: 0, y: 150 }, { name: 'D11~', x: 0, y: 165 },
      { name: 'D18/TX1', x: 160, y: 30 }, { name: 'D19/RX1', x: 160, y: 45 },
      { name: 'D20/SDA', x: 160, y: 60 }, { name: 'D21/SCL', x: 160, y: 75 },
      { name: 'D22', x: 160, y: 90 }, { name: 'D23', x: 160, y: 105 },
      { name: 'A0', x: 160, y: 120 }, { name: 'A1', x: 160, y: 135 },
      { name: 'A2', x: 160, y: 150 }, { name: 'A3', x: 160, y: 165 },
      { name: '5V', x: 40, y: 0 }, { name: '3.3V', x: 70, y: 0 },
      { name: 'GND', x: 100, y: 0 }, { name: 'VIN', x: 10, y: 0 },
    ],
  },
  {
    type: 'arduino-leonardo',
    label: 'Arduino Leonardo',
    category: 'Boards',
    width: 130,
    height: 175,
    color: '#0d4a8c',
    description: 'Arduino Leonardo with native USB support',
    pins: [
      { name: 'D2', x: 0, y: 35 }, { name: 'D3~', x: 0, y: 50 },
      { name: 'D4', x: 0, y: 65 }, { name: 'D5~', x: 0, y: 80 },
      { name: 'D6~', x: 0, y: 95 }, { name: 'D7', x: 0, y: 110 },
      { name: 'D8', x: 130, y: 35 }, { name: 'D9~', x: 130, y: 50 },
      { name: 'D10~', x: 130, y: 65 }, { name: 'D11~', x: 130, y: 80 },
      { name: 'D12', x: 130, y: 95 }, { name: 'D13', x: 130, y: 110 },
      { name: 'SDA', x: 130, y: 125 }, { name: 'SCL', x: 130, y: 140 },
      { name: 'A0', x: 130, y: 155 }, { name: 'A1', x: 130, y: 165 },
      { name: '5V', x: 30, y: 0 }, { name: 'GND', x: 75, y: 0 },
    ],
  },
  {
    type: 'arduino-pro-mini',
    label: 'Arduino Pro Mini',
    category: 'Boards',
    width: 80,
    height: 130,
    color: '#4a1a6b',
    description: 'Arduino Pro Mini compact 3.3V/5V board',
    pins: [
      { name: 'D2', x: 0, y: 25 }, { name: 'D3', x: 0, y: 40 },
      { name: 'D4', x: 0, y: 55 }, { name: 'D5', x: 0, y: 70 },
      { name: 'D6', x: 0, y: 85 }, { name: 'D7', x: 0, y: 100 },
      { name: 'D8', x: 80, y: 25 }, { name: 'D9', x: 80, y: 40 },
      { name: 'D10', x: 80, y: 55 }, { name: 'D11', x: 80, y: 70 },
      { name: 'D12', x: 80, y: 85 }, { name: 'D13', x: 80, y: 100 },
      { name: 'A0', x: 20, y: 130 }, { name: 'A1', x: 40, y: 130 },
      { name: 'VCC', x: 15, y: 0 }, { name: 'GND', x: 40, y: 0 }, { name: 'RAW', x: 65, y: 0 },
    ],
  },
  {
    type: 'arduino-due',
    label: 'Arduino Due',
    category: 'Boards',
    width: 160,
    height: 220,
    color: '#5c3a1a',
    description: 'Arduino Due 32-bit ARM microcontroller',
    pins: [
      { name: 'D2', x: 0, y: 30 }, { name: 'D3~', x: 0, y: 45 },
      { name: 'D4', x: 0, y: 60 }, { name: 'D5~', x: 0, y: 75 },
      { name: 'SDA1', x: 0, y: 90 }, { name: 'SCL1', x: 0, y: 105 },
      { name: 'D13', x: 160, y: 30 }, { name: 'D12', x: 160, y: 45 },
      { name: 'D11~', x: 160, y: 60 }, { name: 'D10~', x: 160, y: 75 },
      { name: 'A0', x: 160, y: 90 }, { name: 'A1', x: 160, y: 105 },
      { name: 'CANRX', x: 160, y: 120 }, { name: 'CANTX', x: 160, y: 135 },
      { name: '3.3V', x: 40, y: 0 }, { name: '5V', x: 70, y: 0 },
      { name: 'GND', x: 100, y: 0 }, { name: 'VIN', x: 10, y: 0 },
    ],
  },

  // ── Breadboards ───────────────────────────────────────────────────────────
  {
    type: 'breadboard-full',
    label: 'Breadboard (Full)',
    category: 'Basic',
    width: 240,
    height: 100,
    color: '#f5f5f0',
    description: '830-tie full-size solderless breadboard',
    pins: [
      { name: '+5V-top', x: 0, y: 12 },
      { name: 'GND-top', x: 0, y: 24 },
      { name: '+5V-bot', x: 0, y: 76 },
      { name: 'GND-bot', x: 0, y: 88 },
    ],
  },
  {
    type: 'breadboard-half',
    label: 'Breadboard (Half)',
    category: 'Basic',
    width: 200,
    height: 80,
    color: '#f5f5f0',
    description: '400-tie half-size solderless breadboard',
    pins: [
      { name: '+5V-top', x: 0, y: 10 },
      { name: 'GND-top', x: 0, y: 20 },
      { name: '+5V-bot', x: 0, y: 60 },
      { name: 'GND-bot', x: 0, y: 70 },
    ],
  },
  {
    type: 'breadboard-mini',
    label: 'Breadboard (Mini)',
    category: 'Basic',
    width: 120,
    height: 60,
    color: '#f5f5f0',
    description: '170-tie mini solderless breadboard',
    pins: [
      { name: '+5V', x: 0, y: 10 },
      { name: 'GND', x: 0, y: 50 },
    ],
  },

  // ── LEDs ──────────────────────────────────────────────────────────────────
  {
    type: 'led-red',
    label: 'LED (Red)',
    category: 'Basic',
    width: 30,
    height: 50,
    color: '#ef4444',
    description: 'Red LED, 2.0V forward voltage',
    properties: { 'Forward Voltage': '2.0V', 'Max Current': '20mA' },
    pins: [{ name: '+', x: 15, y: 0 }, { name: '-', x: 15, y: 50 }],
  },
  {
    type: 'led-green',
    label: 'LED (Green)',
    category: 'Basic',
    width: 30,
    height: 50,
    color: '#22c55e',
    description: 'Green LED, 2.2V forward voltage',
    properties: { 'Forward Voltage': '2.2V', 'Max Current': '20mA' },
    pins: [{ name: '+', x: 15, y: 0 }, { name: '-', x: 15, y: 50 }],
  },
  {
    type: 'led-blue',
    label: 'LED (Blue)',
    category: 'Basic',
    width: 30,
    height: 50,
    color: '#3b82f6',
    description: 'Blue LED, 3.2V forward voltage',
    properties: { 'Forward Voltage': '3.2V', 'Max Current': '20mA' },
    pins: [{ name: '+', x: 15, y: 0 }, { name: '-', x: 15, y: 50 }],
  },
  {
    type: 'led-yellow',
    label: 'LED (Yellow)',
    category: 'Basic',
    width: 30,
    height: 50,
    color: '#eab308',
    description: 'Yellow LED, 2.1V forward voltage',
    properties: { 'Forward Voltage': '2.1V', 'Max Current': '20mA' },
    pins: [{ name: '+', x: 15, y: 0 }, { name: '-', x: 15, y: 50 }],
  },
  {
    type: 'led-white',
    label: 'LED (White)',
    category: 'Basic',
    width: 30,
    height: 50,
    color: '#e5e7eb',
    description: 'White LED, 3.2V forward voltage',
    properties: { 'Forward Voltage': '3.2V', 'Max Current': '20mA' },
    pins: [{ name: '+', x: 15, y: 0 }, { name: '-', x: 15, y: 50 }],
  },
  {
    type: 'led-rgb',
    label: 'RGB LED',
    category: 'Basic',
    width: 40,
    height: 60,
    color: '#a855f7',
    description: 'RGB LED with common cathode',
    pins: [
      { name: 'R', x: 5, y: 60 },
      { name: 'GND', x: 20, y: 60 },
      { name: 'G', x: 30, y: 60 },
      { name: 'B', x: 40, y: 60 },
    ],
  },

  // ── Resistors ─────────────────────────────────────────────────────────────
  {
    type: 'resistor-220',
    label: 'Resistor 220\u03a9',
    category: 'Basic',
    width: 60,
    height: 20,
    color: '#d97706',
    description: '220 ohm resistor (Red-Red-Brown)',
    properties: { Resistance: '220\u03a9', Tolerance: '\u00b15%', Power: '0.25W' },
    pins: [{ name: 'a', x: 0, y: 10 }, { name: 'b', x: 60, y: 10 }],
  },
  {
    type: 'resistor-470',
    label: 'Resistor 470\u03a9',
    category: 'Basic',
    width: 60,
    height: 20,
    color: '#d97706',
    description: '470 ohm resistor (Yellow-Violet-Brown)',
    properties: { Resistance: '470\u03a9', Tolerance: '\u00b15%', Power: '0.25W' },
    pins: [{ name: 'a', x: 0, y: 10 }, { name: 'b', x: 60, y: 10 }],
  },
  {
    type: 'resistor-1k',
    label: 'Resistor 1k\u03a9',
    category: 'Basic',
    width: 60,
    height: 20,
    color: '#d97706',
    description: '1k ohm resistor (Brown-Black-Red)',
    properties: { Resistance: '1000\u03a9', Tolerance: '\u00b15%', Power: '0.25W' },
    pins: [{ name: 'a', x: 0, y: 10 }, { name: 'b', x: 60, y: 10 }],
  },
  {
    type: 'resistor-10k',
    label: 'Resistor 10k\u03a9',
    category: 'Basic',
    width: 60,
    height: 20,
    color: '#d97706',
    description: '10k ohm resistor (Brown-Black-Orange)',
    properties: { Resistance: '10000\u03a9', Tolerance: '\u00b15%', Power: '0.25W' },
    pins: [{ name: 'a', x: 0, y: 10 }, { name: 'b', x: 60, y: 10 }],
  },
  {
    type: 'resistor-100k',
    label: 'Resistor 100k\u03a9',
    category: 'Basic',
    width: 60,
    height: 20,
    color: '#d97706',
    description: '100k ohm resistor (Brown-Black-Yellow)',
    properties: { Resistance: '100000\u03a9', Tolerance: '\u00b15%', Power: '0.25W' },
    pins: [{ name: 'a', x: 0, y: 10 }, { name: 'b', x: 60, y: 10 }],
  },

  // ── Capacitors ────────────────────────────────────────────────────────────
  {
    type: 'capacitor-electrolytic',
    label: 'Capacitor (Electrolytic)',
    category: 'Basic',
    width: 30,
    height: 40,
    color: '#6b7280',
    description: 'Electrolytic capacitor, polarized',
    properties: { Capacitance: '100\u00b5F', 'Max Voltage': '25V' },
    pins: [{ name: '+', x: 10, y: 40 }, { name: '-', x: 20, y: 40 }],
  },
  {
    type: 'capacitor-ceramic',
    label: 'Capacitor (Ceramic)',
    category: 'Basic',
    width: 25,
    height: 30,
    color: '#d4a017',
    description: 'Ceramic capacitor, non-polarized',
    properties: { Capacitance: '100nF', 'Max Voltage': '50V' },
    pins: [{ name: 'a', x: 5, y: 30 }, { name: 'b', x: 20, y: 30 }],
  },

  // ── Controls ──────────────────────────────────────────────────────────────
  {
    type: 'potentiometer',
    label: 'Potentiometer',
    category: 'Basic',
    width: 50,
    height: 60,
    color: '#374151',
    description: '10k ohm potentiometer',
    properties: { Resistance: '10k\u03a9', Type: 'Rotary' },
    pins: [
      { name: 'VCC', x: 10, y: 60 },
      { name: 'OUT', x: 25, y: 60 },
      { name: 'GND', x: 40, y: 60 },
    ],
  },
  {
    type: 'button',
    label: 'Push Button',
    category: 'Basic',
    width: 40,
    height: 40,
    color: '#374151',
    description: 'Tactile push button switch',
    pins: [
      { name: 'a1', x: 0, y: 15 },
      { name: 'a2', x: 0, y: 25 },
      { name: 'b1', x: 40, y: 15 },
      { name: 'b2', x: 40, y: 25 },
    ],
  },
  {
    type: 'toggle-switch',
    label: 'Toggle Switch',
    category: 'Basic',
    width: 40,
    height: 25,
    color: '#374151',
    description: 'SPDT toggle switch',
    pins: [
      { name: 'COM', x: 0, y: 12 },
      { name: 'NO', x: 20, y: 0 },
      { name: 'NC', x: 40, y: 12 },
    ],
  },

  // ── Audio ─────────────────────────────────────────────────────────────────
  {
    type: 'buzzer-active',
    label: 'Buzzer (Active)',
    category: 'Basic',
    width: 35,
    height: 35,
    color: '#1f2937',
    description: 'Active buzzer, beeps when powered',
    pins: [{ name: '+', x: 10, y: 35 }, { name: '-', x: 25, y: 35 }],
  },
  {
    type: 'buzzer-passive',
    label: 'Buzzer (Passive)',
    category: 'Basic',
    width: 35,
    height: 35,
    color: '#1f2937',
    description: 'Passive buzzer, requires PWM signal',
    pins: [{ name: '+', x: 10, y: 35 }, { name: '-', x: 25, y: 35 }],
  },

  // ── Motors ────────────────────────────────────────────────────────────────
  {
    type: 'dc-motor',
    label: 'DC Motor',
    category: 'Basic',
    width: 50,
    height: 50,
    color: '#6b7280',
    description: 'Generic DC motor',
    pins: [{ name: '+', x: 10, y: 50 }, { name: '-', x: 40, y: 50 }],
  },
  {
    type: 'servo-sg90',
    label: 'Servo (SG90)',
    category: 'Basic',
    width: 60,
    height: 45,
    color: '#1d4ed8',
    description: 'SG90 micro servo motor',
    properties: { Torque: '1.8kg/cm', Speed: '0.1s/60\u00b0' },
    pins: [
      { name: 'GND', x: 5, y: 45 },
      { name: 'VCC', x: 25, y: 45 },
      { name: 'SIG', x: 45, y: 45 },
    ],
  },
  {
    type: 'servo-mg996r',
    label: 'Servo (MG996R)',
    category: 'Basic',
    width: 70,
    height: 55,
    color: '#1d4ed8',
    description: 'MG996R high-torque servo motor',
    properties: { Torque: '9.4kg/cm', Speed: '0.17s/60\u00b0' },
    pins: [
      { name: 'GND', x: 10, y: 55 },
      { name: 'VCC', x: 35, y: 55 },
      { name: 'SIG', x: 60, y: 55 },
    ],
  },
  {
    type: 'stepper-motor',
    label: 'Stepper Motor',
    category: 'Basic',
    width: 65,
    height: 65,
    color: '#374151',
    description: 'Bipolar stepper motor (e.g. 28BYJ-48)',
    pins: [
      { name: 'A+', x: 10, y: 65 }, { name: 'A-', x: 25, y: 65 },
      { name: 'B+', x: 40, y: 65 }, { name: 'B-', x: 55, y: 65 },
    ],
  },

  // ── Electrical components ─────────────────────────────────────────────────
  {
    type: 'relay-module',
    label: 'Relay Module',
    category: 'Basic',
    width: 70,
    height: 55,
    color: '#0d4a28',
    description: '5V relay module for switching high-voltage loads',
    pins: [
      { name: 'VCC', x: 0, y: 15 },
      { name: 'GND', x: 0, y: 30 },
      { name: 'IN', x: 0, y: 45 },
      { name: 'COM', x: 70, y: 15 },
      { name: 'NO', x: 70, y: 30 },
      { name: 'NC', x: 70, y: 45 },
    ],
  },
  {
    type: 'diode-1n4007',
    label: 'Diode (1N4007)',
    category: 'Basic',
    width: 50,
    height: 20,
    color: '#374151',
    description: '1N4007 rectifier diode, 1A 1000V',
    pins: [{ name: 'A', x: 0, y: 10 }, { name: 'K', x: 50, y: 10 }],
  },
  {
    type: 'diode-zener',
    label: 'Zener Diode',
    category: 'Basic',
    width: 50,
    height: 20,
    color: '#374151',
    description: 'Zener diode for voltage regulation',
    pins: [{ name: 'A', x: 0, y: 10 }, { name: 'K', x: 50, y: 10 }],
  },
  {
    type: 'transistor-npn',
    label: 'Transistor NPN',
    category: 'Basic',
    width: 35,
    height: 50,
    color: '#374151',
    description: '2N2222/BC547 NPN transistor',
    pins: [
      { name: 'B', x: 0, y: 25 },
      { name: 'C', x: 35, y: 10 },
      { name: 'E', x: 35, y: 40 },
    ],
  },
  {
    type: 'transistor-pnp',
    label: 'Transistor PNP',
    category: 'Basic',
    width: 35,
    height: 50,
    color: '#374151',
    description: 'BC557/TIP125 PNP transistor',
    pins: [
      { name: 'B', x: 0, y: 25 },
      { name: 'C', x: 35, y: 10 },
      { name: 'E', x: 35, y: 40 },
    ],
  },

  // ── Sensors ───────────────────────────────────────────────────────────────
  {
    type: 'dht11',
    label: 'DHT11 Sensor',
    category: 'Sensors',
    width: 45,
    height: 55,
    color: '#1d4ed8',
    description: 'Temperature & humidity sensor',
    properties: { 'Temp Range': '0-50\u00b0C', 'Humidity Range': '20-80%' },
    pins: [
      { name: 'VCC', x: 5, y: 55 },
      { name: 'DATA', x: 22, y: 55 },
      { name: 'GND', x: 38, y: 55 },
    ],
  },
  {
    type: 'dht22',
    label: 'DHT22 Sensor',
    category: 'Sensors',
    width: 45,
    height: 55,
    color: '#1d4ed8',
    description: 'High-accuracy temperature & humidity sensor',
    properties: { 'Temp Range': '-40-80\u00b0C', 'Humidity Range': '0-100%' },
    pins: [
      { name: 'VCC', x: 5, y: 55 },
      { name: 'DATA', x: 22, y: 55 },
      { name: 'GND', x: 38, y: 55 },
    ],
  },
  {
    type: 'ldr',
    label: 'LDR (Light Sensor)',
    category: 'Sensors',
    width: 30,
    height: 30,
    color: '#d97706',
    description: 'Light Dependent Resistor',
    pins: [{ name: 'a', x: 0, y: 15 }, { name: 'b', x: 30, y: 15 }],
  },
  {
    type: 'pir-sensor',
    label: 'PIR Motion Sensor',
    category: 'Sensors',
    width: 45,
    height: 45,
    color: '#ffffff',
    description: 'Passive infrared motion sensor',
    pins: [
      { name: 'VCC', x: 5, y: 45 },
      { name: 'OUT', x: 22, y: 45 },
      { name: 'GND', x: 38, y: 45 },
    ],
  },
  {
    type: 'ultrasonic-hcsr04',
    label: 'Ultrasonic HC-SR04',
    category: 'Sensors',
    width: 60,
    height: 40,
    color: '#6b7280',
    description: 'HC-SR04 ultrasonic distance sensor, 2-400cm',
    pins: [
      { name: 'VCC', x: 5, y: 40 },
      { name: 'TRIG', x: 22, y: 40 },
      { name: 'ECHO', x: 38, y: 40 },
      { name: 'GND', x: 55, y: 40 },
    ],
  },
  {
    type: 'ir-sensor',
    label: 'IR Sensor',
    category: 'Sensors',
    width: 40,
    height: 35,
    color: '#1f2937',
    description: 'Infrared proximity / obstacle sensor',
    pins: [
      { name: 'VCC', x: 5, y: 35 },
      { name: 'OUT', x: 20, y: 35 },
      { name: 'GND', x: 35, y: 35 },
    ],
  },
  {
    type: 'soil-moisture',
    label: 'Soil Moisture Sensor',
    category: 'Sensors',
    width: 50,
    height: 60,
    color: '#92400e',
    description: 'Capacitive soil moisture sensor',
    pins: [
      { name: 'VCC', x: 5, y: 60 },
      { name: 'AOUT', x: 20, y: 60 },
      { name: 'DOUT', x: 35, y: 60 },
      { name: 'GND', x: 45, y: 60 },
    ],
  },
  {
    type: 'sound-sensor',
    label: 'Sound Sensor',
    category: 'Sensors',
    width: 45,
    height: 40,
    color: '#1f2937',
    description: 'Microphone / sound level sensor module',
    pins: [
      { name: 'VCC', x: 5, y: 40 },
      { name: 'AOUT', x: 20, y: 40 },
      { name: 'DOUT', x: 35, y: 40 },
      { name: 'GND', x: 42, y: 40 },
    ],
  },
  {
    type: 'tilt-sensor',
    label: 'Tilt Sensor',
    category: 'Sensors',
    width: 30,
    height: 40,
    color: '#374151',
    description: 'Mercury / ball tilt sensor',
    pins: [{ name: 'a', x: 10, y: 40 }, { name: 'b', x: 20, y: 40 }],
  },
  {
    type: 'hall-effect',
    label: 'Hall Effect Sensor',
    category: 'Sensors',
    width: 40,
    height: 35,
    color: '#1f2937',
    description: 'Magnetic field / hall effect sensor (A3144)',
    pins: [
      { name: 'VCC', x: 5, y: 35 },
      { name: 'GND', x: 20, y: 35 },
      { name: 'OUT', x: 35, y: 35 },
    ],
  },
  {
    type: 'flame-sensor',
    label: 'Flame Sensor',
    category: 'Sensors',
    width: 45,
    height: 40,
    color: '#ef4444',
    description: 'Infrared flame detection sensor',
    pins: [
      { name: 'VCC', x: 5, y: 40 },
      { name: 'AOUT', x: 20, y: 40 },
      { name: 'DOUT', x: 35, y: 40 },
      { name: 'GND', x: 42, y: 40 },
    ],
  },
  {
    type: 'gas-mq2',
    label: 'Gas Sensor MQ-2',
    category: 'Sensors',
    width: 50,
    height: 45,
    color: '#1f2937',
    description: 'MQ-2 smoke, LPG, CO gas sensor',
    pins: [
      { name: 'VCC', x: 5, y: 45 },
      { name: 'AOUT', x: 22, y: 45 },
      { name: 'DOUT', x: 38, y: 45 },
      { name: 'GND', x: 45, y: 45 },
    ],
  },
  {
    type: 'gas-mq135',
    label: 'Gas Sensor MQ-135',
    category: 'Sensors',
    width: 50,
    height: 45,
    color: '#1f2937',
    description: 'MQ-135 air quality / ammonia gas sensor',
    pins: [
      { name: 'VCC', x: 5, y: 45 },
      { name: 'AOUT', x: 22, y: 45 },
      { name: 'DOUT', x: 38, y: 45 },
      { name: 'GND', x: 45, y: 45 },
    ],
  },
  {
    type: 'rain-sensor',
    label: 'Rain Sensor',
    category: 'Sensors',
    width: 50,
    height: 40,
    color: '#3b82f6',
    description: 'Rain / water level detection sensor',
    pins: [
      { name: 'VCC', x: 5, y: 40 },
      { name: 'AOUT', x: 22, y: 40 },
      { name: 'DOUT', x: 38, y: 40 },
      { name: 'GND', x: 45, y: 40 },
    ],
  },
  {
    type: 'vibration-sensor',
    label: 'Vibration Sensor',
    category: 'Sensors',
    width: 40,
    height: 35,
    color: '#374151',
    description: 'SW-420 vibration / tilt sensor module',
    pins: [
      { name: 'VCC', x: 5, y: 35 },
      { name: 'OUT', x: 20, y: 35 },
      { name: 'GND', x: 35, y: 35 },
    ],
  },
  {
    type: 'touch-sensor',
    label: 'Touch Sensor',
    category: 'Sensors',
    width: 40,
    height: 35,
    color: '#374151',
    description: 'TTP223 capacitive touch sensor',
    pins: [
      { name: 'VCC', x: 5, y: 35 },
      { name: 'OUT', x: 20, y: 35 },
      { name: 'GND', x: 35, y: 35 },
    ],
  },
  {
    type: 'color-tcs3200',
    label: 'Colour Sensor TCS3200',
    category: 'Sensors',
    width: 50,
    height: 45,
    color: '#1f2937',
    description: 'TCS3200 programmable colour sensor',
    pins: [
      { name: 'VCC', x: 0, y: 20 },
      { name: 'GND', x: 0, y: 35 },
      { name: 'S0', x: 50, y: 10 },
      { name: 'S1', x: 50, y: 20 },
      { name: 'S2', x: 50, y: 30 },
      { name: 'S3', x: 50, y: 40 },
      { name: 'OUT', x: 25, y: 0 },
    ],
  },
  {
    type: 'fingerprint-sensor',
    label: 'Fingerprint Sensor',
    category: 'Sensors',
    width: 55,
    height: 70,
    color: '#1f2937',
    description: 'Optical fingerprint sensor (R305/AS608)',
    pins: [
      { name: 'VCC', x: 5, y: 70 },
      { name: 'TX', x: 20, y: 70 },
      { name: 'RX', x: 35, y: 70 },
      { name: 'GND', x: 50, y: 70 },
    ],
  },

  // ── Displays ──────────────────────────────────────────────────────────────
  {
    type: 'lcd-16x2-i2c',
    label: 'LCD 16x2 (I2C)',
    category: 'Displays',
    width: 110,
    height: 55,
    color: '#065f46',
    description: 'I2C 16x2 LCD display (PCF8574 backpack)',
    pins: [
      { name: 'VCC', x: 20, y: 55 },
      { name: 'GND', x: 40, y: 55 },
      { name: 'SDA', x: 60, y: 55 },
      { name: 'SCL', x: 80, y: 55 },
    ],
  },
  {
    type: 'lcd-16x2-parallel',
    label: 'LCD 16x2 (Parallel)',
    category: 'Displays',
    width: 120,
    height: 55,
    color: '#065f46',
    description: '16x2 LCD display with parallel interface',
    pins: [
      { name: 'VSS', x: 8, y: 55 }, { name: 'VDD', x: 18, y: 55 },
      { name: 'V0', x: 28, y: 55 }, { name: 'RS', x: 38, y: 55 },
      { name: 'RW', x: 48, y: 55 }, { name: 'EN', x: 58, y: 55 },
      { name: 'D4', x: 68, y: 55 }, { name: 'D5', x: 78, y: 55 },
      { name: 'D6', x: 88, y: 55 }, { name: 'D7', x: 98, y: 55 },
      { name: 'A', x: 108, y: 55 }, { name: 'K', x: 118, y: 55 },
    ],
  },
  {
    type: 'lcd-20x4',
    label: 'LCD 20x4 (I2C)',
    category: 'Displays',
    width: 150,
    height: 65,
    color: '#065f46',
    description: 'I2C 20x4 LCD display',
    pins: [
      { name: 'VCC', x: 30, y: 65 },
      { name: 'GND', x: 60, y: 65 },
      { name: 'SDA', x: 90, y: 65 },
      { name: 'SCL', x: 120, y: 65 },
    ],
  },
  {
    type: 'oled-ssd1306',
    label: 'OLED SSD1306',
    category: 'Displays',
    width: 80,
    height: 65,
    color: '#0a0a1a',
    description: 'SSD1306 128x64 I2C OLED display',
    pins: [
      { name: 'VCC', x: 10, y: 65 },
      { name: 'GND', x: 30, y: 65 },
      { name: 'SDA', x: 50, y: 65 },
      { name: 'SCL', x: 70, y: 65 },
    ],
  },
  {
    type: 'seven-seg-single',
    label: '7-Segment (Single)',
    category: 'Displays',
    width: 40,
    height: 65,
    color: '#1f2937',
    description: 'Single digit 7-segment LED display',
    pins: [
      { name: 'a', x: 5, y: 65 }, { name: 'b', x: 12, y: 65 },
      { name: 'c', x: 19, y: 65 }, { name: 'd', x: 26, y: 65 },
      { name: 'e', x: 33, y: 65 }, { name: 'f', x: 5, y: 0 },
      { name: 'g', x: 12, y: 0 }, { name: 'dp', x: 19, y: 0 },
      { name: 'COM', x: 33, y: 0 },
    ],
  },
  {
    type: 'seven-seg-4digit',
    label: '4-Digit 7-Segment',
    category: 'Displays',
    width: 100,
    height: 45,
    color: '#1f2937',
    description: '4-digit 7-segment common cathode display',
    pins: [
      { name: 'a', x: 5, y: 45 }, { name: 'b', x: 17, y: 45 },
      { name: 'c', x: 29, y: 45 }, { name: 'd', x: 41, y: 45 },
      { name: 'e', x: 53, y: 45 }, { name: 'f', x: 65, y: 45 },
      { name: 'g', x: 77, y: 45 }, { name: 'dp', x: 89, y: 45 },
      { name: 'D1', x: 5, y: 0 }, { name: 'D2', x: 35, y: 0 },
      { name: 'D3', x: 65, y: 0 }, { name: 'D4', x: 95, y: 0 },
    ],
  },
  {
    type: 'tm1637',
    label: 'TM1637 Display',
    category: 'Displays',
    width: 80,
    height: 40,
    color: '#1f2937',
    description: 'TM1637 4-digit 7-segment with colon',
    pins: [
      { name: 'VCC', x: 10, y: 40 },
      { name: 'GND', x: 28, y: 40 },
      { name: 'DIO', x: 46, y: 40 },
      { name: 'CLK', x: 64, y: 40 },
    ],
  },
  {
    type: 'max7219',
    label: 'MAX7219 LED Matrix',
    category: 'Displays',
    width: 90,
    height: 50,
    color: '#1f2937',
    description: 'MAX7219 8x8 LED matrix driver',
    pins: [
      { name: 'VCC', x: 5, y: 50 },
      { name: 'GND', x: 22, y: 50 },
      { name: 'DIN', x: 39, y: 50 },
      { name: 'CS', x: 56, y: 50 },
      { name: 'CLK', x: 73, y: 50 },
    ],
  },
  {
    type: 'neopixel',
    label: 'NeoPixel / WS2812B',
    category: 'Displays',
    width: 100,
    height: 30,
    color: '#7c3aed',
    description: 'WS2812B addressable RGB LED strip',
    pins: [
      { name: 'VCC', x: 10, y: 30 },
      { name: 'DIN', x: 50, y: 30 },
      { name: 'GND', x: 90, y: 30 },
    ],
  },
  {
    type: 'dot-matrix-8x8',
    label: '8x8 LED Dot Matrix',
    category: 'Displays',
    width: 75,
    height: 75,
    color: '#1f2937',
    description: '8x8 LED dot matrix display',
    pins: [
      { name: 'R1', x: 0, y: 10 }, { name: 'R2', x: 0, y: 22 },
      { name: 'R3', x: 0, y: 34 }, { name: 'R4', x: 0, y: 46 },
      { name: 'C1', x: 75, y: 10 }, { name: 'C2', x: 75, y: 22 },
      { name: 'C3', x: 75, y: 34 }, { name: 'C4', x: 75, y: 46 },
    ],
  },

  // ── Communication & Wireless ───────────────────────────────────────────────
  {
    type: 'hc05-bluetooth',
    label: 'HC-05 Bluetooth',
    category: 'Communication',
    width: 55,
    height: 45,
    color: '#1d4ed8',
    description: 'HC-05 Bluetooth module (master/slave)',
    pins: [
      { name: 'VCC', x: 5, y: 45 },
      { name: 'GND', x: 18, y: 45 },
      { name: 'TXD', x: 31, y: 45 },
      { name: 'RXD', x: 44, y: 45 },
    ],
  },
  {
    type: 'hc06-bluetooth',
    label: 'HC-06 Bluetooth',
    category: 'Communication',
    width: 55,
    height: 45,
    color: '#1d4ed8',
    description: 'HC-06 Bluetooth module (slave only)',
    pins: [
      { name: 'VCC', x: 5, y: 45 },
      { name: 'GND', x: 18, y: 45 },
      { name: 'TXD', x: 31, y: 45 },
      { name: 'RXD', x: 44, y: 45 },
    ],
  },
  {
    type: 'nrf24l01',
    label: 'NRF24L01 Wireless',
    category: 'Communication',
    width: 55,
    height: 55,
    color: '#065f46',
    description: 'NRF24L01 2.4GHz wireless transceiver',
    pins: [
      { name: 'VCC', x: 5, y: 0 }, { name: 'GND', x: 25, y: 0 },
      { name: 'CE', x: 0, y: 15 }, { name: 'CSN', x: 55, y: 15 },
      { name: 'SCK', x: 0, y: 30 }, { name: 'MOSI', x: 55, y: 30 },
      { name: 'MISO', x: 0, y: 45 }, { name: 'IRQ', x: 55, y: 45 },
    ],
  },
  {
    type: 'esp8266-wifi',
    label: 'ESP8266 WiFi',
    category: 'Communication',
    width: 65,
    height: 55,
    color: '#0d4a8c',
    description: 'ESP8266 WiFi module (ESP-01)',
    pins: [
      { name: 'VCC', x: 0, y: 10 }, { name: 'GND', x: 0, y: 25 },
      { name: 'TX', x: 0, y: 40 }, { name: 'RX', x: 65, y: 10 },
      { name: 'CH_PD', x: 65, y: 25 }, { name: 'RST', x: 65, y: 40 },
    ],
  },
  {
    type: 'lora-sx1278',
    label: 'LoRa SX1278',
    category: 'Communication',
    width: 65,
    height: 55,
    color: '#0f172a',
    description: 'SX1278 LoRa 433MHz long-range transceiver',
    pins: [
      { name: 'VCC', x: 5, y: 0 }, { name: 'GND', x: 30, y: 0 },
      { name: 'SCK', x: 0, y: 20 }, { name: 'MOSI', x: 65, y: 20 },
      { name: 'MISO', x: 0, y: 35 }, { name: 'NSS', x: 65, y: 35 },
      { name: 'DIO0', x: 0, y: 50 }, { name: 'RST', x: 65, y: 50 },
    ],
  },
  {
    type: 'rfid-rc522',
    label: 'RFID RC522',
    category: 'Communication',
    width: 65,
    height: 60,
    color: '#1f2937',
    description: 'MFRC522 13.56MHz RFID reader/writer',
    pins: [
      { name: 'VCC', x: 5, y: 0 }, { name: 'GND', x: 30, y: 0 },
      { name: 'RST', x: 0, y: 20 }, { name: 'IRQ', x: 65, y: 20 },
      { name: 'MISO', x: 0, y: 35 }, { name: 'MOSI', x: 65, y: 35 },
      { name: 'SCK', x: 0, y: 50 }, { name: 'SDA', x: 65, y: 50 },
    ],
  },
  {
    type: 'i2c-module',
    label: 'I2C Module',
    category: 'Communication',
    width: 40,
    height: 30,
    color: '#374151',
    description: 'Generic I2C breakout / level shifter',
    pins: [
      { name: 'VCC', x: 5, y: 30 },
      { name: 'GND', x: 15, y: 30 },
      { name: 'SDA', x: 25, y: 30 },
      { name: 'SCL', x: 35, y: 30 },
    ],
  },

  // ── Power & Control ────────────────────────────────────────────────────────
  {
    type: 'l298n',
    label: 'L298N Motor Driver',
    category: 'Power & Control',
    width: 80,
    height: 70,
    color: '#374151',
    description: 'L298N dual H-bridge DC/stepper motor driver',
    pins: [
      { name: 'IN1', x: 0, y: 15 }, { name: 'IN2', x: 0, y: 30 },
      { name: 'IN3', x: 0, y: 45 }, { name: 'IN4', x: 0, y: 60 },
      { name: 'ENA', x: 80, y: 15 }, { name: 'ENB', x: 80, y: 30 },
      { name: 'VCC', x: 80, y: 45 }, { name: 'GND', x: 80, y: 55 },
      { name: 'OUT1', x: 20, y: 0 }, { name: 'OUT2', x: 40, y: 0 },
      { name: 'OUT3', x: 60, y: 0 }, { name: 'OUT4', x: 80, y: 0 },
    ],
  },
  {
    type: 'l293d',
    label: 'L293D Motor Driver',
    category: 'Power & Control',
    width: 60,
    height: 55,
    color: '#374151',
    description: 'L293D quad half-H motor driver IC',
    pins: [
      { name: '1A', x: 0, y: 10 }, { name: '1Y', x: 0, y: 25 },
      { name: '2Y', x: 0, y: 40 }, { name: '2A', x: 0, y: 55 },
      { name: '3A', x: 60, y: 10 }, { name: '3Y', x: 60, y: 25 },
      { name: '4Y', x: 60, y: 40 }, { name: '4A', x: 60, y: 55 },
      { name: 'VCC1', x: 15, y: 0 }, { name: 'VCC2', x: 45, y: 0 },
      { name: '1EN', x: 5, y: 0 }, { name: '3EN', x: 55, y: 0 },
    ],
  },
  {
    type: 'lm7805',
    label: 'LM7805 Voltage Reg',
    category: 'Power & Control',
    width: 35,
    height: 40,
    color: '#374151',
    description: 'LM7805 5V voltage regulator',
    properties: { 'Output Voltage': '5V', 'Max Current': '1.5A' },
    pins: [
      { name: 'IN', x: 5, y: 40 },
      { name: 'GND', x: 17, y: 40 },
      { name: 'OUT', x: 29, y: 40 },
    ],
  },
  {
    type: 'power-supply',
    label: 'Power Supply Module',
    category: 'Power & Control',
    width: 75,
    height: 55,
    color: '#374151',
    description: 'MB102 breadboard power supply module',
    pins: [
      { name: '+5V', x: 10, y: 55 }, { name: 'GND', x: 30, y: 55 },
      { name: '+3.3V', x: 50, y: 55 }, { name: 'GND2', x: 70, y: 55 },
      { name: 'VIN', x: 10, y: 0 }, { name: 'GNDV', x: 40, y: 0 },
    ],
  },
  {
    type: 'battery-9v',
    label: 'Battery 9V',
    category: 'Power & Control',
    width: 45,
    height: 35,
    color: '#1f2937',
    description: '9V PP3 battery',
    pins: [{ name: '+', x: 10, y: 0 }, { name: '-', x: 35, y: 0 }],
  },
  {
    type: 'battery-aa',
    label: 'Battery AA',
    category: 'Power & Control',
    width: 40,
    height: 25,
    color: '#374151',
    description: 'AA 1.5V alkaline battery',
    pins: [{ name: '+', x: 5, y: 12 }, { name: '-', x: 35, y: 12 }],
  },
  {
    type: 'usb-power',
    label: 'USB Power Module',
    category: 'Power & Control',
    width: 50,
    height: 35,
    color: '#1f2937',
    description: 'USB 5V power supply module',
    pins: [{ name: '+5V', x: 15, y: 35 }, { name: 'GND', x: 35, y: 35 }],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getComponentDef(type: ComponentType): ComponentDef | undefined {
  return COMPONENT_LIBRARY.find((c) => c.type === type);
}

export function getComponentsByCategory(): Record<string, ComponentDef[]> {
  return COMPONENT_LIBRARY.reduce<Record<string, ComponentDef[]>>((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});
}

export const CATEGORY_ORDER = ['Boards', 'Basic', 'Sensors', 'Displays', 'Communication', 'Power & Control'];
