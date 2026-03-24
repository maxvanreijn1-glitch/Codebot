// ─── Raspberry Pi Component Library ─────────────────────────────────────────

export type PiComponentType =
  | 'rpi5-4gb'
  | 'rpi5-8gb'
  | 'rpi4-1gb'
  | 'rpi4-2gb'
  | 'rpi4-4gb'
  | 'rpi4-8gb'
  | 'rpi3b-plus'
  | 'rpi-zero2w'
  | 'rpi-zerow'
  | 'rpi-pico'
  | 'rpi-pico-w'
  | 'gpio-breakout'
  | 'pi-camera-v1'
  | 'pi-camera-v2'
  | 'pi-camera-hq'
  | 'pi-touchscreen'
  | 'gpio-hat'
  | 'sense-hat'
  | 'rtc-ds3231'
  | 'mcp3008';

export interface PinDef {
  name: string;
  x: number;
  y: number;
  type?: 'power' | 'ground' | 'gpio' | 'i2c' | 'spi' | 'uart' | 'other';
}

export interface PiComponentDef {
  type: PiComponentType;
  label: string;
  category: string;
  width: number;
  height: number;
  color: string;
  pins: PinDef[];
  description: string;
  gpioCount?: number;
  properties?: Record<string, string>;
}

// Standard 40-pin GPIO header for Pi 3B+, 4, 5
const GPIO_40PIN = (xOffset: number, yOffset: number): PinDef[] => [
  // Pin 1: 3.3V, Pin 2: 5V
  { name: '3.3V', x: xOffset, y: yOffset + 0, type: 'power' },
  { name: '5V', x: xOffset + 10, y: yOffset + 0, type: 'power' },
  // Pin 3: GPIO2 (SDA), Pin 4: 5V
  { name: 'GPIO2/SDA', x: xOffset, y: yOffset + 15, type: 'i2c' },
  { name: '5V', x: xOffset + 10, y: yOffset + 15, type: 'power' },
  // Pin 5: GPIO3 (SCL), Pin 6: GND
  { name: 'GPIO3/SCL', x: xOffset, y: yOffset + 30, type: 'i2c' },
  { name: 'GND', x: xOffset + 10, y: yOffset + 30, type: 'ground' },
  // Pin 7: GPIO4, Pin 8: GPIO14 (TX)
  { name: 'GPIO4', x: xOffset, y: yOffset + 45, type: 'gpio' },
  { name: 'GPIO14/TX', x: xOffset + 10, y: yOffset + 45, type: 'uart' },
  // Pin 9: GND, Pin 10: GPIO15 (RX)
  { name: 'GND', x: xOffset, y: yOffset + 60, type: 'ground' },
  { name: 'GPIO15/RX', x: xOffset + 10, y: yOffset + 60, type: 'uart' },
  // Pin 11: GPIO17, Pin 12: GPIO18
  { name: 'GPIO17', x: xOffset, y: yOffset + 75, type: 'gpio' },
  { name: 'GPIO18', x: xOffset + 10, y: yOffset + 75, type: 'gpio' },
  // Pin 13: GPIO27, Pin 14: GND
  { name: 'GPIO27', x: xOffset, y: yOffset + 90, type: 'gpio' },
  { name: 'GND', x: xOffset + 10, y: yOffset + 90, type: 'ground' },
  // Pin 15: GPIO22, Pin 16: GPIO23
  { name: 'GPIO22', x: xOffset, y: yOffset + 105, type: 'gpio' },
  { name: 'GPIO23', x: xOffset + 10, y: yOffset + 105, type: 'gpio' },
  // Pin 17: 3.3V, Pin 18: GPIO24
  { name: '3.3V', x: xOffset, y: yOffset + 120, type: 'power' },
  { name: 'GPIO24', x: xOffset + 10, y: yOffset + 120, type: 'gpio' },
  // Pin 19: GPIO10/MOSI, Pin 20: GND
  { name: 'GPIO10/MOSI', x: xOffset, y: yOffset + 135, type: 'spi' },
  { name: 'GND', x: xOffset + 10, y: yOffset + 135, type: 'ground' },
  // Pin 21: GPIO9/MISO, Pin 22: GPIO25
  { name: 'GPIO9/MISO', x: xOffset, y: yOffset + 150, type: 'spi' },
  { name: 'GPIO25', x: xOffset + 10, y: yOffset + 150, type: 'gpio' },
  // Pin 23: GPIO11/SCLK, Pin 24: GPIO8/CE0
  { name: 'GPIO11/SCLK', x: xOffset, y: yOffset + 165, type: 'spi' },
  { name: 'GPIO8/CE0', x: xOffset + 10, y: yOffset + 165, type: 'spi' },
  // Pin 25: GND, Pin 26: GPIO7/CE1
  { name: 'GND', x: xOffset, y: yOffset + 180, type: 'ground' },
  { name: 'GPIO7/CE1', x: xOffset + 10, y: yOffset + 180, type: 'spi' },
  // Pin 27: GPIO0/ID_SD, Pin 28: GPIO1/ID_SC
  { name: 'GPIO0/ID_SD', x: xOffset, y: yOffset + 195, type: 'i2c' },
  { name: 'GPIO1/ID_SC', x: xOffset + 10, y: yOffset + 195, type: 'i2c' },
  // Pin 29: GPIO5, Pin 30: GND
  { name: 'GPIO5', x: xOffset, y: yOffset + 210, type: 'gpio' },
  { name: 'GND', x: xOffset + 10, y: yOffset + 210, type: 'ground' },
  // Pin 31: GPIO6, Pin 32: GPIO12
  { name: 'GPIO6', x: xOffset, y: yOffset + 225, type: 'gpio' },
  { name: 'GPIO12', x: xOffset + 10, y: yOffset + 225, type: 'gpio' },
  // Pin 33: GPIO13, Pin 34: GND
  { name: 'GPIO13', x: xOffset, y: yOffset + 240, type: 'gpio' },
  { name: 'GND', x: xOffset + 10, y: yOffset + 240, type: 'ground' },
  // Pin 35: GPIO19, Pin 36: GPIO16
  { name: 'GPIO19', x: xOffset, y: yOffset + 255, type: 'gpio' },
  { name: 'GPIO16', x: xOffset + 10, y: yOffset + 255, type: 'gpio' },
  // Pin 37: GPIO26, Pin 38: GPIO20
  { name: 'GPIO26', x: xOffset, y: yOffset + 270, type: 'gpio' },
  { name: 'GPIO20', x: xOffset + 10, y: yOffset + 270, type: 'gpio' },
  // Pin 39: GND, Pin 40: GPIO21
  { name: 'GND', x: xOffset, y: yOffset + 285, type: 'ground' },
  { name: 'GPIO21', x: xOffset + 10, y: yOffset + 285, type: 'gpio' },
];

export const PI_COMPONENT_LIBRARY: PiComponentDef[] = [
  // ── Raspberry Pi Boards ───────────────────────────────────────────────────
  {
    type: 'rpi5-4gb',
    label: 'Raspberry Pi 5 (4GB)',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#c0392b',
    description: 'Raspberry Pi 5 4GB - ARM Cortex-A76 quad-core 2.4GHz',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A76 quad-core 2.4GHz',
      RAM: '4GB LPDDR4X',
      GPIO: '40-pin header (28 GPIO)',
      USB: '2x USB 3.0, 2x USB 2.0',
      Power: '5V/5A via USB-C',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi5-8gb',
    label: 'Raspberry Pi 5 (8GB)',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#c0392b',
    description: 'Raspberry Pi 5 8GB - ARM Cortex-A76 quad-core 2.4GHz',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A76 quad-core 2.4GHz',
      RAM: '8GB LPDDR4X',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi4-1gb',
    label: 'Raspberry Pi 4 (1GB)',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#c0392b',
    description: 'Raspberry Pi 4 Model B 1GB',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A72 quad-core 1.8GHz',
      RAM: '1GB LPDDR4',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi4-2gb',
    label: 'Raspberry Pi 4 (2GB)',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#c0392b',
    description: 'Raspberry Pi 4 Model B 2GB',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A72 quad-core 1.8GHz',
      RAM: '2GB LPDDR4',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi4-4gb',
    label: 'Raspberry Pi 4 (4GB)',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#c0392b',
    description: 'Raspberry Pi 4 Model B 4GB',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A72 quad-core 1.8GHz',
      RAM: '4GB LPDDR4',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi4-8gb',
    label: 'Raspberry Pi 4 (8GB)',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#c0392b',
    description: 'Raspberry Pi 4 Model B 8GB',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A72 quad-core 1.8GHz',
      RAM: '8GB LPDDR4',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi3b-plus',
    label: 'Raspberry Pi 3 Model B+',
    category: 'Pi Boards',
    width: 180,
    height: 320,
    color: '#2980b9',
    description: 'Raspberry Pi 3 Model B+ with WiFi/BT',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A53 quad-core 1.4GHz',
      RAM: '1GB LPDDR2',
      WiFi: '2.4/5GHz 802.11ac',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi-zero2w',
    label: 'Raspberry Pi Zero 2 W',
    category: 'Pi Boards',
    width: 130,
    height: 260,
    color: '#27ae60',
    description: 'Raspberry Pi Zero 2 W - compact with WiFi/BT',
    gpioCount: 28,
    properties: {
      CPU: 'ARM Cortex-A53 quad-core 1GHz',
      RAM: '512MB LPDDR2',
      WiFi: '2.4GHz 802.11b/g/n',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi-zerow',
    label: 'Raspberry Pi Zero W',
    category: 'Pi Boards',
    width: 130,
    height: 260,
    color: '#27ae60',
    description: 'Raspberry Pi Zero W - compact with WiFi/BT',
    gpioCount: 28,
    properties: {
      CPU: 'ARM11 single-core 1GHz',
      RAM: '512MB LPDDR2',
      WiFi: '2.4GHz 802.11b/g/n',
      GPIO: '40-pin header (28 GPIO)',
    },
    pins: GPIO_40PIN(0, 20),
  },
  {
    type: 'rpi-pico',
    label: 'Raspberry Pi Pico',
    category: 'Pi Boards',
    width: 100,
    height: 210,
    color: '#16a085',
    description: 'Raspberry Pi Pico - RP2040 microcontroller',
    gpioCount: 26,
    properties: {
      CPU: 'RP2040 dual ARM Cortex-M0+ 133MHz',
      Flash: '2MB',
      SRAM: '264KB',
      GPIO: '26 multi-function GPIO',
      ADC: '3x 12-bit ADC',
    },
    pins: [
      // Left side pins (top to bottom)
      { name: 'GP0/TX', x: 0, y: 20, type: 'uart' },
      { name: 'GP1/RX', x: 0, y: 35, type: 'uart' },
      { name: 'GND', x: 0, y: 50, type: 'ground' },
      { name: 'GP2', x: 0, y: 65, type: 'gpio' },
      { name: 'GP3', x: 0, y: 80, type: 'gpio' },
      { name: 'GP4/SDA', x: 0, y: 95, type: 'i2c' },
      { name: 'GP5/SCL', x: 0, y: 110, type: 'i2c' },
      { name: 'GND', x: 0, y: 125, type: 'ground' },
      { name: 'GP6', x: 0, y: 140, type: 'gpio' },
      { name: 'GP7', x: 0, y: 155, type: 'gpio' },
      { name: 'GP8', x: 0, y: 170, type: 'gpio' },
      { name: 'GP9', x: 0, y: 185, type: 'gpio' },
      { name: 'GND', x: 0, y: 200, type: 'ground' },
      // Right side pins (top to bottom)
      { name: 'VBUS', x: 100, y: 20, type: 'power' },
      { name: 'VSYS', x: 100, y: 35, type: 'power' },
      { name: 'GND', x: 100, y: 50, type: 'ground' },
      { name: '3V3_EN', x: 100, y: 65, type: 'power' },
      { name: '3V3', x: 100, y: 80, type: 'power' },
      { name: 'ADC_VREF', x: 100, y: 95, type: 'power' },
      { name: 'GP26/ADC0', x: 100, y: 110, type: 'gpio' },
      { name: 'GP27/ADC1', x: 100, y: 125, type: 'gpio' },
      { name: 'AGND', x: 100, y: 140, type: 'ground' },
      { name: 'GP28/ADC2', x: 100, y: 155, type: 'gpio' },
      { name: 'GP22', x: 100, y: 170, type: 'gpio' },
      { name: 'GP21/SCL', x: 100, y: 185, type: 'i2c' },
      { name: 'GP20/SDA', x: 100, y: 200, type: 'i2c' },
    ],
  },
  {
    type: 'rpi-pico-w',
    label: 'Raspberry Pi Pico W',
    category: 'Pi Boards',
    width: 100,
    height: 210,
    color: '#16a085',
    description: 'Raspberry Pi Pico W - RP2040 with WiFi/BT',
    gpioCount: 26,
    properties: {
      CPU: 'RP2040 dual ARM Cortex-M0+ 133MHz',
      Flash: '2MB',
      SRAM: '264KB',
      WiFi: '2.4GHz 802.11n',
      GPIO: '26 multi-function GPIO',
    },
    pins: [
      { name: 'GP0/TX', x: 0, y: 20, type: 'uart' },
      { name: 'GP1/RX', x: 0, y: 35, type: 'uart' },
      { name: 'GND', x: 0, y: 50, type: 'ground' },
      { name: 'GP2', x: 0, y: 65, type: 'gpio' },
      { name: 'GP3', x: 0, y: 80, type: 'gpio' },
      { name: 'GP4/SDA', x: 0, y: 95, type: 'i2c' },
      { name: 'GP5/SCL', x: 0, y: 110, type: 'i2c' },
      { name: 'GND', x: 0, y: 125, type: 'ground' },
      { name: 'GP6', x: 0, y: 140, type: 'gpio' },
      { name: 'GP7', x: 0, y: 155, type: 'gpio' },
      { name: 'GP8', x: 0, y: 170, type: 'gpio' },
      { name: 'GP9', x: 0, y: 185, type: 'gpio' },
      { name: 'GND', x: 0, y: 200, type: 'ground' },
      { name: 'VBUS', x: 100, y: 20, type: 'power' },
      { name: 'VSYS', x: 100, y: 35, type: 'power' },
      { name: 'GND', x: 100, y: 50, type: 'ground' },
      { name: '3V3_EN', x: 100, y: 65, type: 'power' },
      { name: '3V3', x: 100, y: 80, type: 'power' },
      { name: 'ADC_VREF', x: 100, y: 95, type: 'power' },
      { name: 'GP26/ADC0', x: 100, y: 110, type: 'gpio' },
      { name: 'GP27/ADC1', x: 100, y: 125, type: 'gpio' },
      { name: 'AGND', x: 100, y: 140, type: 'ground' },
      { name: 'GP28/ADC2', x: 100, y: 155, type: 'gpio' },
      { name: 'GP22', x: 100, y: 170, type: 'gpio' },
      { name: 'GP21/SCL', x: 100, y: 185, type: 'i2c' },
      { name: 'GP20/SDA', x: 100, y: 200, type: 'i2c' },
    ],
  },

  // ── Pi Accessories ────────────────────────────────────────────────────────
  {
    type: 'gpio-breakout',
    label: 'GPIO Breakout + Ribbon',
    category: 'Pi Accessories',
    width: 120,
    height: 90,
    color: '#374151',
    description: 'GPIO breakout board with 40-pin ribbon cable',
    pins: [
      { name: '3.3V', x: 0, y: 10, type: 'power' },
      { name: '5V', x: 20, y: 10, type: 'power' },
      { name: 'GND', x: 40, y: 10, type: 'ground' },
      { name: 'GPIO', x: 60, y: 10, type: 'gpio' },
      { name: 'SDA', x: 80, y: 10, type: 'i2c' },
      { name: 'SCL', x: 100, y: 10, type: 'i2c' },
      { name: 'TX', x: 0, y: 80, type: 'uart' },
      { name: 'RX', x: 20, y: 80, type: 'uart' },
      { name: 'MOSI', x: 40, y: 80, type: 'spi' },
      { name: 'MISO', x: 60, y: 80, type: 'spi' },
      { name: 'SCLK', x: 80, y: 80, type: 'spi' },
      { name: 'CE0', x: 100, y: 80, type: 'spi' },
    ],
  },
  {
    type: 'pi-camera-v1',
    label: 'Pi Camera Module v1',
    category: 'Pi Accessories',
    width: 60,
    height: 45,
    color: '#1f2937',
    description: 'Raspberry Pi Camera Module v1 (5MP)',
    properties: { Resolution: '5MP', Interface: 'CSI', FOV: '54 x 41 degrees' },
    pins: [{ name: 'CSI', x: 30, y: 45 }],
  },
  {
    type: 'pi-camera-v2',
    label: 'Pi Camera Module v2',
    category: 'Pi Accessories',
    width: 60,
    height: 45,
    color: '#1f2937',
    description: 'Raspberry Pi Camera Module v2 (8MP)',
    properties: { Resolution: '8MP', Interface: 'CSI', Sensor: 'Sony IMX219' },
    pins: [{ name: 'CSI', x: 30, y: 45 }],
  },
  {
    type: 'pi-camera-hq',
    label: 'Pi HQ Camera',
    category: 'Pi Accessories',
    width: 65,
    height: 65,
    color: '#1f2937',
    description: 'Raspberry Pi HQ Camera (12.3MP)',
    properties: { Resolution: '12.3MP', Interface: 'CSI', Sensor: 'Sony IMX477' },
    pins: [{ name: 'CSI', x: 32, y: 65 }],
  },
  {
    type: 'pi-touchscreen',
    label: 'Pi 7" Touchscreen',
    category: 'Pi Accessories',
    width: 160,
    height: 100,
    color: '#0a0a1a',
    description: 'Official Raspberry Pi 7" touchscreen display',
    properties: { Size: '7"', Resolution: '800x480', Interface: 'DSI', Touch: 'Capacitive' },
    pins: [
      { name: 'DSI', x: 80, y: 100, type: 'other' },
      { name: '5V', x: 20, y: 0, type: 'power' },
      { name: 'GND', x: 40, y: 0, type: 'ground' },
    ],
  },
  {
    type: 'gpio-hat',
    label: 'GPIO HAT',
    category: 'Pi Accessories',
    width: 120,
    height: 90,
    color: '#374151',
    description: 'Generic GPIO expansion HAT for Raspberry Pi',
    pins: [
      { name: '3.3V', x: 0, y: 10, type: 'power' },
      { name: '5V', x: 20, y: 10, type: 'power' },
      { name: 'GND', x: 40, y: 10, type: 'ground' },
      { name: 'GPIO17', x: 60, y: 10, type: 'gpio' },
      { name: 'GPIO18', x: 80, y: 10, type: 'gpio' },
      { name: 'GPIO27', x: 100, y: 10, type: 'gpio' },
      { name: 'GPIO22', x: 0, y: 80, type: 'gpio' },
      { name: 'GPIO23', x: 20, y: 80, type: 'gpio' },
      { name: 'GPIO24', x: 40, y: 80, type: 'gpio' },
      { name: 'GPIO25', x: 60, y: 80, type: 'gpio' },
    ],
  },
  {
    type: 'sense-hat',
    label: 'Sense HAT',
    category: 'Pi Accessories',
    width: 120,
    height: 90,
    color: '#27ae60',
    description: 'Raspberry Pi Sense HAT with sensors and LED matrix',
    properties: {
      Sensors: 'Gyroscope, Accelerometer, Magnetometer, Pressure, Humidity, Temperature',
      Display: '8x8 RGB LED matrix',
      Joystick: '5-button mini joystick',
    },
    pins: [
      { name: '3.3V', x: 0, y: 10, type: 'power' },
      { name: 'SDA', x: 30, y: 10, type: 'i2c' },
      { name: 'SCL', x: 60, y: 10, type: 'i2c' },
      { name: 'GND', x: 90, y: 10, type: 'ground' },
    ],
  },
  {
    type: 'rtc-ds3231',
    label: 'RTC DS3231',
    category: 'Pi Accessories',
    width: 60,
    height: 45,
    color: '#374151',
    description: 'DS3231 precision real-time clock module',
    properties: { Accuracy: '\u00b12ppm', Interface: 'I2C', 'Backup Battery': 'CR2032' },
    pins: [
      { name: 'VCC', x: 5, y: 45 },
      { name: 'GND', x: 18, y: 45 },
      { name: 'SDA', x: 31, y: 45, type: 'i2c' },
      { name: 'SCL', x: 44, y: 45, type: 'i2c' },
      { name: 'SQW', x: 57, y: 45 },
    ],
  },
  {
    type: 'mcp3008',
    label: 'MCP3008 ADC',
    category: 'Pi Accessories',
    width: 65,
    height: 60,
    color: '#374151',
    description: 'MCP3008 8-channel 10-bit ADC (SPI)',
    properties: { Channels: '8', Resolution: '10-bit', Interface: 'SPI', 'Max Speed': '3.6MHz' },
    pins: [
      { name: 'CH0', x: 0, y: 10 }, { name: 'CH1', x: 0, y: 20 },
      { name: 'CH2', x: 0, y: 30 }, { name: 'CH3', x: 0, y: 40 },
      { name: 'CH4', x: 0, y: 50 }, { name: 'CH5', x: 0, y: 60 },
      { name: 'CH6', x: 65, y: 10 }, { name: 'CH7', x: 65, y: 20 },
      { name: 'DGND', x: 65, y: 30, type: 'ground' },
      { name: 'CS', x: 65, y: 40, type: 'spi' },
      { name: 'DIN/MOSI', x: 65, y: 50, type: 'spi' },
      { name: 'DOUT/MISO', x: 65, y: 60, type: 'spi' },
      { name: 'CLK', x: 32, y: 0, type: 'spi' },
      { name: 'AGND', x: 10, y: 0, type: 'ground' },
      { name: 'VREF', x: 32, y: 60 },
      { name: 'VDD', x: 55, y: 0, type: 'power' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getPiComponentDef(type: PiComponentType): PiComponentDef | undefined {
  return PI_COMPONENT_LIBRARY.find((c) => c.type === type);
}

export function getPiComponentsByCategory(): Record<string, PiComponentDef[]> {
  return PI_COMPONENT_LIBRARY.reduce<Record<string, PiComponentDef[]>>((acc, comp) => {
    if (!acc[comp.category]) acc[comp.category] = [];
    acc[comp.category].push(comp);
    return acc;
  }, {});
}

export const PI_CATEGORY_ORDER = ['Pi Boards', 'Pi Accessories'];
