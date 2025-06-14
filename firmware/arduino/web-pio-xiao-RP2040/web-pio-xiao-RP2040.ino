/*

 web-pio-xiao-RP2040 device firmware
  
 ©2025 by D.F.Mac.@TripArts Music
 
 ver. history
 
 - 2025/05/21 : start develop
 - 2025/06/03 : Supports basic functions of https://browserobo.github.io/WebGPIO/
 - 2025/06/03 : Support 8bit PWM
 - 2025/06/04 : Support ADC
 - 2025/06/05 : The PIO common functions have been removed from this file and moved to external files.

*/
extern "C" void flash_get_unique_id(uint8_t *p);

#include <Adafruit_TinyUSB.h>
#include <Adafruit_NeoPixel.h>
#include <MIDI.h>
#include <Wire.h>
#include "makeUUID.h"
#include "midisettings.h"
#include "pio.h"

Adafruit_USBD_MIDI usb_midi;

MIDI_CREATE_CUSTOM_INSTANCE(Adafruit_USBD_MIDI, usb_midi, MIDI, MySettings);

#define NEOPIX_POW 11
#define NEOPIX_PIN 12

// XIAO RGB LEDs
#define RED_LED 17
#define GREEN_LED 16
#define BLUE_LED 25

void xiaoRGBLedOff(){
  pinMode(RED_LED,OUTPUT);
  pinMode(GREEN_LED,OUTPUT);
  pinMode(BLUE_LED,OUTPUT);
  digitalWrite(RED_LED,HIGH);
  digitalWrite(GREEN_LED,HIGH);
  digitalWrite(BLUE_LED,HIGH);  
}

Adafruit_NeoPixel pixels(1, NEOPIX_PIN);

char prdDescStr[30];

void makePrdDescStr(){
  uint8_t uuid[11];
  int cnt;
  
  flash_get_unique_id(uuid);
  prdDescStr[0] = 'p';
  prdDescStr[1] = 'i';
  prdDescStr[2] = 'o';
  prdDescStr[3] = '_';
  prdDescStr[4] = 'x';
  prdDescStr[5] = 'i';
  prdDescStr[6] = 'a';
  prdDescStr[7] = 'o';
  prdDescStr[8] = 'R';
  prdDescStr[9] = 'P';
  prdDescStr[10] = '2';
  prdDescStr[11] = '0';
  prdDescStr[12] = '4';
  prdDescStr[13] = '0';
  prdDescStr[14] = '-';
  prdDescStr[27] = 0;
  convert8bitToAscii(uuid,&(prdDescStr[15]));
  // prdDescStr[16] ++; // For patching when duplicate uuids are obtained
}

uint8_t pinNumbers[] = {26,27,28,29, 0, 1, 2, 4, 3};
uint8_t pinStatus[]  = { 0, 0, 0, 0, 0, 0, 0, 0, 0};
uint8_t pinCounter[] = { 0, 0, 0, 0, 0, 0, 0, 0, 0};
int     pinOnOff[]   = {-1,-1,-1,-1,-1,-1,-1,-1,-1};
uint8_t pinNums = sizeof(pinStatus);

void setup() {
#if defined(ARDUINO_ARCH_MBED) && defined(ARDUINO_ARCH_RP2040)
  TinyUSB_Device_Init(0);
#endif 
  USBDevice.setManufacturerDescriptor("TripArts Music");
  makePrdDescStr();
  USBDevice.setProductDescriptor((const char *)prdDescStr);
  USBDevice.setSerialDescriptor((const char *)&(prdDescStr[12]));
  USBDevice.setID(0x1209,0xDF03);
  
  xiaoRGBLedOff();

  pinMode(NEOPIX_POW, OUTPUT);
  digitalWrite(NEOPIX_POW, HIGH);

  SerialTinyUSB.begin(115200);
  MIDI.begin(MIDI_CHANNEL_OMNI);
  MIDI.turnThruOff();

  while( !TinyUSBDevice.mounted() ) delay(1);
  delay(500);

  Wire.setSDA(SDA);
  Wire.setSCL(SCL);
  Wire.begin();

  // なんか電源ON時にMIDI in bufferにデータ入っててcallback呼ばれるので吐き出す
  int cnt;
  for(cnt=0;cnt<128;cnt++){
    MIDI.read();
    delay(1);
  }
  delay(100);
  // そのあとにhandlerをセットする。
  MIDI.setHandleSystemExclusive(handleSysEx);

  SerialTinyUSB.print("start ");
  SerialTinyUSB.println(prdDescStr);

  initI2CSlaveStatus();
}

void loop() {
  MIDI.read();
  delay(1);
  checkInput();
  checkI2cSlaveStatus();
}
