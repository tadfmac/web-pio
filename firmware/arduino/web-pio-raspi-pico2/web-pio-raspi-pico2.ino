/*

 web-pio-raspi-pico 2 device firmware
  
 ©2025 by D.F.Mac.@TripArts Music
 
 ver. history
 
 - 2025/06/14 : first release

*/
extern "C" void flash_get_unique_id(uint8_t *p);

#define DEB true

#include <Adafruit_TinyUSB.h>
#include <MIDI.h>
#include <Wire.h>
#include "makeUUID.h"
#include "midisettings.h"
#include "pio.h"

Adafruit_USBD_MIDI usb_midi;

MIDI_CREATE_CUSTOM_INSTANCE(Adafruit_USBD_MIDI, usb_midi, MIDI, MySettings);

#define LED_PIN 25

char prdDescStr[30];

void makePrdDescStr(){
  uint8_t uuid[11];
  int cnt;
  
  flash_get_unique_id(uuid);
  prdDescStr[0] = 'p';
  prdDescStr[1] = 'i';
  prdDescStr[2] = 'o';
  prdDescStr[3] = '_';
  prdDescStr[4] = 'R';
  prdDescStr[5] = 'a';
  prdDescStr[6] = 's';
  prdDescStr[7] = 'p';
  prdDescStr[8] = 'i';
  prdDescStr[9] = 'P';
  prdDescStr[10] = 'i';
  prdDescStr[11] = 'c';
  prdDescStr[12] = 'o';
  prdDescStr[13] = '2';
  prdDescStr[14] = '-';
  prdDescStr[27] = 0;
  convert8bitToAscii(uuid,&(prdDescStr[15]));
  // prdDescStr[14] ++; // For patching when duplicate uuids are obtained
}

uint8_t pinNumbers[] = { 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10,11,12,13,18,19,20,21,22,26,27,28};
uint8_t pinStatus[]  = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
uint8_t pinCounter[] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0};
int     pinOnOff[]   = {-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1};
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
  
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  SerialTinyUSB.begin(115200);
  MIDI.begin(MIDI_CHANNEL_OMNI);
  MIDI.turnThruOff();

//  while( !TinyUSBDevice.mounted() ) delay(1);
  delay(500);

  Wire.setSDA(16);
  Wire.setSCL(17);
  Wire.begin();

  Wire1.setSDA(14);
  Wire1.setSCL(15);
  Wire1.begin();  

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
  digitalWrite(LED_PIN, LOW);

}

void loop() {
  MIDI.read();
  delay(1);
  checkInput();
  checkI2cSlaveStatus();
}
