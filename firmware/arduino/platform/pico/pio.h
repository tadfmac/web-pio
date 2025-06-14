// web-pio
// makeUUID.h
// ©2025 by D.F.Mac. @TripArts Music

#ifndef _PIO_H_
#define _PIO_H_

#include <Arduino.h>
#include <Adafruit_TinyUSB.h>
#include <stdint.h>
#include <MIDI.h>
#include <Wire.h>
#include "midisettings.h"
#include "variant.h"

//#define DEB 1

#define DEVICE_INIT      0x08  // (func)  null
#define GPIO_EXPORT      0x10  // (func)  [4]portNumber [5]direction
#define GPIO_WRITE       0x11  // (func)  [4]portNumber [5]value
#define GPIO_READ        0x12  // (func)  [4]portNumber
#define GPIO_UNEXPORT    0x13  // (func)  [4]portNumber
#define GPIO_ONCHANGE    0x14  // (event) [4]portNumber [5]onOff [6]isPullup 
#define GPIO_UNEXPORTALL 0x15  // (func)  null
#define GPIO_SETPWM      0x16  // (func)  [4]portNumber [5]value
#define GPIO_ANALOGREAD  0x17  // (func)  [4]portNumber
#define I2C_INIT         0x20
#define I2C_WRITE8       0x21
#define I2C_WRITE16      0x22
#define I2C_WRITEBYTE    0x23
#define I2C_WRITEBYTES   0x24
#define I2C_READ8        0x25
#define I2C_READ16       0x26
#define I2C_READBYTE     0x27
#define I2C_READBYTES    0x28
#define I2C_PORTSCAN     0x29
#define I2C_ONADDRCLOSE  0x2A
#define FUNC_LED_INIT    0x80
#define FUNC_LED_ON      0x81
#define FUNC_LED_OFF     0x82
#define FUNC_CLED_INIT   0x83
#define FUNC_CLED_SET    0x84
#define FUNC_CLED_OFF    0x85

extern Adafruit_USBD_MIDI usb_midi;
//extern midi::MidiInterface<Adafruit_USBD_MIDI, MySettings> MIDI;
extern midi::MidiInterface<midi::SerialMIDI<Adafruit_USBD_MIDI>, MySettings> MIDI;

extern uint8_t rawInputData[222];
extern uint8_t rawOutputData[222];
extern uint8_t sysExOutData[256];
extern size_t outputSize;
extern unsigned sendLen;
extern uint8_t i2cDetBuf[128];

extern uint8_t i2cSlaveStatus0[128];
extern uint8_t i2cSlaveStatus1[128];

extern uint8_t nextCheckIdx;
extern uint16_t sessionId; // for onGpioOnChange Event
extern uint8_t pinNumbers[];
extern uint8_t pinStatus[];
extern uint8_t pinCounter[];
extern int     pinOnOff[];
extern uint8_t pinNums;
// pinStatus : 0->node, 1->output, 2->input 3->input_pullup 4->PWM

// Prototypes 

// main functions (call from .ino)
void checkInput();
void processInputCheck(uint8_t pinIndex);
void initI2CSlaveStatus();
void checkI2cSlaveStatus();

// MIDI
void handleSysEx(byte *pData , unsigned _size);
size_t decodeFromMidiSysEx(const uint8_t *sysex, size_t sysexLen, uint8_t *pOut, size_t maxDataLen);
size_t encodeToMidiSysEx(const uint8_t *pInput, size_t inputLen, uint8_t *sysex, size_t maxSysexLen);

// process root
void copyHeader(uint8_t *pMes,uint8_t *pRes);
void processMessage(uint8_t *pMes, size_t _mesSize);
void sendFuncAnswer(uint8_t *pMess,size_t _size);

// GPIO Subs
void sendGpioOnChange(uint8_t pinNumber,uint8_t onOff,uint8_t isPullup);
uint8_t gpioExport(uint8_t portNum,uint8_t direct);
uint8_t gpioWrite(uint8_t portNum, uint8_t value);
uint8_t gpioRead(uint8_t portNum);
uint8_t gpioUnexport(uint8_t portNum);
uint8_t gpioUnexportAll();
uint8_t gpioSetPWM(uint8_t portNum, uint8_t _duty);
uint8_t gpioAnalogRead(uint8_t portNum, uint8_t *pLsb,uint8_t *pMsb);
int getIndexFromPortNum(uint8_t portNum);

// I2C Subs
void sendI2COnAddrClose(uint8_t port, uint8_t addr);
uint8_t i2cDetectDevices(uint8_t portNum, uint8_t *pDetectBuf);
uint8_t i2cDeviceInit(uint8_t portNum, uint8_t address);
uint8_t i2cDeviceRead8(uint8_t portNum, uint8_t address, uint8_t reg, uint8_t *pOut);
uint8_t i2cDeviceRead16(uint8_t portNum, uint8_t address, uint8_t reg, uint16_t *pOut);
uint8_t i2cDeviceReadByte(uint8_t portNum, uint8_t address, uint8_t *pOut);
uint8_t i2cDeviceReadBytes(uint8_t portNum, uint8_t address, uint8_t size, uint8_t *pOut);
uint8_t i2cDeviceWrite8(uint8_t portNum, uint8_t address, uint8_t reg, uint8_t data);
uint8_t i2cDeviceWrite16(uint8_t portNum, uint8_t address, uint8_t reg, uint16_t data);
uint8_t i2cDeviceWriteByte(uint8_t portNum, uint8_t address, uint8_t data);
uint8_t i2cDeviceWriteBytes(uint8_t portNum, uint8_t address, uint8_t length, uint8_t *pdata);

#endif  // _PIO_H_
