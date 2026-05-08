/*

 web-pio-xiao-esp32c6 device firmware

 ©2026 by D.F.Mac.@TripArts Music

 ver. history

 - 2026/05/08 : start develop

*/

#include <BLEMIDI_Transport.h>
#include <hardware/BLEMIDI_ESP32.h>
#include <BLEDevice.h>
#include <MIDI.h>
#include <Wire.h>
#include "makeUUID.h"
#include "midisettings.h"
#include "pio.h"

// bleMidi::MySettings is defined in BLEMIDI_Transport.h. BLEMIDI_CREATE_INSTANCE expands to:
//   bleMidi::BLEMIDI_Transport<bleMidi::BLEMIDI_ESP32> BLEMIDI("web-pio");
//   midi::MidiInterface<bleMidi::BLEMIDI_Transport<...>, bleMidi::MySettings> MIDI(BLEMIDI);
// "web-pio" is a placeholder — the actual BLE device name is set by BLEDevice::init(bleName)
// in setup(), which runs before MIDI.begin() calls BLEDevice::init() internally.
// BLEDevice::init() is guarded by `initialized` flag, so the second call (from MIDI.begin())
// is a no-op and the device name set here is preserved.
BLEMIDI_CREATE_INSTANCE("web-pio", MIDI)

#define LED_PIN 15  // User LED (active LOW)

char bleName[32];

void makeBleName() {
  uint64_t mac = ESP.getEfuseMac();
  uint8_t macBytes[8] = {0};
  memcpy(macBytes, &mac, 6); // 6-byte eFuse MAC, zero-padded to 8 bytes
  bleName[0]  = 'p'; bleName[1]  = 'i'; bleName[2]  = 'o'; bleName[3]  = '_';
  bleName[4]  = 'x'; bleName[5]  = 'i'; bleName[6]  = 'a'; bleName[7]  = 'o';
  bleName[8]  = 'E'; bleName[9]  = 'S'; bleName[10] = 'P'; bleName[11] = '3';
  bleName[12] = '2'; bleName[13] = 'C'; bleName[14] = '6'; bleName[15] = '-';
  bleName[27] = 0;
  convert8bitToAscii(macBytes, &bleName[16]);
  // Replace '@'(62) and '&'(63) — valid BLE chars but visually confusing in MIDI monitor
  for (int i = 16; i < 27; i++) {
    if (bleName[i] == '@') bleName[i] = '-';
    if (bleName[i] == '&') bleName[i] = '_';
  }
}

// GPIO pins: SDA(D4=22) and SCL(D5=23) are excluded to prevent I2C conflicts.
// Arduino pin numbers from pins_arduino.h (esp32:esp32:XIAO_ESP32C6 3.3.0)
// D0=0, D1=1, D2=2, D3=21, D6=16, D7=17, D8=19, D9=20, D10=18
uint8_t pinNumbers[] = { 0, 1, 2,21,16,17,19,20,18};
uint8_t pinStatus[]  = { 0, 0, 0, 0, 0, 0, 0, 0, 0};
uint8_t pinCounter[] = { 0, 0, 0, 0, 0, 0, 0, 0, 0};
int     pinOnOff[]   = {-1,-1,-1,-1,-1,-1,-1,-1,-1};
uint8_t pinNums = sizeof(pinStatus);

void setup() {
  Serial.begin(115200);
  delay(1000); // Wait for Serial monitor to connect

  makeBleName();

  // [Item A feasibility] Set BLE device name before MIDI.begin() initializes BLE stack.
  // BLEDevice::init() is guarded by 'initialized' flag; the call from MIDI.begin() will be skipped.
  Serial.print("[A-1] bleName         : ");
  Serial.println(bleName);

  BLEDevice::init(bleName);

  Serial.println("[A-2] BLEDevice::init(bleName) called.");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // active LOW: off

  MIDI.begin(MIDI_CHANNEL_OMNI);
  MIDI.turnThruOff();

  // Add device name to BLE scan response so it appears in Bluetooth MIDI monitors.
  // The advertising packet is full (service UUID + flags = 21 bytes, leaving < 29 for a 27-char name),
  // so the name must go in the scan response instead.
  {
    BLEAdvertising *pAdv = BLEDevice::getAdvertising();
    pAdv->stop();
    BLEAdvertisementData scanResp;
    scanResp.setName(bleName);
    pAdv->setScanResponseData(scanResp);
    pAdv->start();
  }

  Serial.println("[A-3] MIDI.begin() done. Scan response set with bleName.");
  Serial.println("[A-4] Check Bluetooth on your Mac/PC — device name should match [A-1].");

  Wire.begin(22, 23); // SDA=D4(22), SCL=D5(23)

  // Flush MIDI in buffer at power-on
  for (int cnt = 0; cnt < 128; cnt++) {
    MIDI.read();
    delay(1);
  }
  delay(100);
  MIDI.setHandleSystemExclusive(handleSysEx);

  initI2CSlaveStatus();
  digitalWrite(LED_PIN, LOW); // active LOW: on
}

void loop() {
  MIDI.read();
  delay(1);
  checkInput();
  checkI2cSlaveStatus();
}
