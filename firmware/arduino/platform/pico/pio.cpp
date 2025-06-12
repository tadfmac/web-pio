// web-pio
// pio.cpp
// ©2025 by D.F.Mac. @TripArts Music

#include "pio.h"

uint8_t rawInputData[222];
uint8_t rawOutputData[222];
uint8_t sysExOutData[256];
size_t outputSize;
unsigned sendLen = 0;
uint8_t i2cDetBuf[128];
uint8_t nextCheckIdx = 0;
uint16_t sessionId = 0; // for onGpioOnChange Event

uint8_t i2cSlaveStatus0[128];
#ifdef WIRE1_ENABLE
uint8_t i2cSlaveStatus1[128];
#endif
uint8_t i2cLock = 0; // 0:unlock 1:lock
uint8_t i2cAddrDiv = 0; // 0-15
#define I2CADDRDIV_LIMIT 16 // i2cAddrDiv: 0-15
#define I2CADDRCNT_INTERVAL 8 

#define MES_H_SIZE 8
#define MES_B_IDX 7

/////////////////////////////////////////////////////////
// main functions (call from .ino)
/////////////////////////////////////////////////////////

void checkInput(){
  if((pinStatus[nextCheckIdx] == 2)||(pinStatus[nextCheckIdx] == 3)){
    pinCounter[nextCheckIdx] ++;
    if(pinCounter[nextCheckIdx] >= INPUT_CHECK_INTERVAL){
      pinCounter[nextCheckIdx] = 0;
      processInputCheck(nextCheckIdx);
    }
  }
  nextCheckIdx ++;
  if(nextCheckIdx >= pinNums){
    nextCheckIdx = 0;
  }
}

void initI2CSlaveStatus(){
  for(int cnt=0;cnt<128;cnt++){
    i2cSlaveStatus0[cnt] = 0;
  }
#ifdef WIRE1_ENABLE
  for(int cnt=0;cnt<128;cnt++){
    i2cSlaveStatus1[cnt] = 0;
  }
#endif
}

void checkI2cSlaveStatus(){
  TwoWire* pWire;
  uint8_t result;
  uint8_t cnt = i2cAddrDiv * I2CADDRCNT_INTERVAL;
  uint8_t limit = cnt+I2CADDRCNT_INTERVAL;

  if(i2cLock == 1){
    return;
  }
  for(;cnt<limit;cnt++){
    if((cnt<3)||(cnt>=0x77)){
      continue; // out of i2c Address ranges
    }
    if(i2cSlaveStatus0[cnt] == 1){
      Wire.beginTransmission(cnt);
      result = Wire.endTransmission();
      if(result != 0){
        sendI2COnAddrClose(0,cnt);
        i2cSlaveStatus0[cnt] = 0;
      }
    }
#ifdef WIRE1_ENABLE
    if(i2cSlaveStatus1[cnt] == 1){
      Wire1.beginTransmission(cnt);
      result = Wire1.endTransmission();
      if(result != 0){
        sendI2COnAddrClose(1,cnt);
        i2cSlaveStatus1[cnt] = 0;
      }
    }
#endif
  }
  i2cAddrDiv++;
  if(i2cAddrDiv >= I2CADDRDIV_LIMIT){
    i2cAddrDiv = 0;
  }
}

void processInputCheck(uint8_t pinIndex){
  uint8_t pinNumber = pinNumbers[pinIndex];
  int now = digitalRead(pinNumber);
  if((now != pinOnOff[pinIndex])&&(pinOnOff[pinIndex] != -1)){
    uint8_t isPullup = (pinStatus[pinIndex] == 3)? 1:0;
    sendGpioOnChange(pinNumber,(uint8_t)now,isPullup);
  }
  pinOnOff[pinIndex] = now;
}

/////////////////////////////////////////////////////////
// MIDI
/////////////////////////////////////////////////////////

void handleSysEx(byte *pData , unsigned _size){
#ifdef DEB
  SerialTinyUSB.print("SysEx size:");
  SerialTinyUSB.println(_size);
  SerialTinyUSB.print("SysExData   :");
  for (uint16_t i = 0; i < _size; i++) {
    SerialTinyUSB.print(pData[i], HEX); SerialTinyUSB.print(" ");
  }
  SerialTinyUSB.println();
#endif

  size_t resLen = decodeFromMidiSysEx(pData,_size,rawInputData,sizeof(rawInputData));

#ifdef DEB
  SerialTinyUSB.print("RawInputData: ");
  for (size_t i = 0; i < resLen; i++) {
    SerialTinyUSB.print(rawInputData[i], HEX); SerialTinyUSB.print(" ");
  }
  SerialTinyUSB.println();
#endif

  processMessage(rawInputData,resLen);
}

size_t decodeFromMidiSysEx(const uint8_t *sysex, size_t sysexLen, uint8_t *pOut, size_t maxDataLen) {
  if (sysexLen < 2 || sysex[0] != 0xF0 || sysex[sysexLen - 1] != 0xF7) {
    return 0;
  }

  size_t outIndex = 0;
  uint16_t buffer = 0;
  uint8_t bitCount = 0;

  for (size_t i = 1; i < sysexLen - 1; i++) {
    uint8_t byte = sysex[i];
    if (byte > 0x7F) return 0;

    buffer |= (byte << bitCount);
    bitCount += 7;

    while (bitCount >= 8) {
      if (outIndex >= maxDataLen) return 0;
      pOut[outIndex++] = buffer & 0xFF;
      buffer >>= 8;
      bitCount -= 8;
    }
  }

  return outIndex;
}

size_t encodeToMidiSysEx(const uint8_t *pInput, size_t inputLen, uint8_t *sysex, size_t maxSysexLen) {
  const uint8_t sysexStart = 0xF0;
  const uint8_t sysexEnd   = 0xF7;

  size_t outIndex = 0;
  sysex[outIndex++] = sysexStart;

  uint16_t buffer = 0;
  uint8_t bitCount = 0;

  for (size_t i = 0; i < inputLen; i++) {
    buffer |= (pInput[i] << bitCount);
    bitCount += 8;

    while (bitCount >= 7) {
      if (outIndex >= maxSysexLen - 1) return 0;
      sysex[outIndex++] = buffer & 0x7F;
      buffer >>= 7;
      bitCount -= 7;
    }
  }

  if (bitCount > 0) {
    if (outIndex >= maxSysexLen - 1) return 0;
    sysex[outIndex++] = buffer & 0x7F;
  }

  if (outIndex >= maxSysexLen) return 0;
  sysex[outIndex++] = sysexEnd;

  return outIndex;
}

/////////////////////////////////////////////////////////
// process root
/////////////////////////////////////////////////////////

void copyHeader(uint8_t *pMes,uint8_t *pRes){
  for(int cnt=0;cnt<MES_H_SIZE;cnt++){
    pRes[cnt] = pMes[cnt];
  }
}

void processMessage(uint8_t *pMes, size_t _mesSize){
  uint8_t res = 0; // 0: error 1: success
  size_t _size = 0;
  uint8_t lsb;
  uint8_t msb;
  uint16_t wordData;

  if(pMes[0] == 1){ // funcCall
    copyHeader(pMes,rawOutputData);
    switch(pMes[1]){
    case DEVICE_INIT:
      rawOutputData[MES_B_IDX+1] = 1;
      _size = MES_H_SIZE+1;
      break;      
    case GPIO_EXPORT:
#ifdef DEB
      SerialTinyUSB.println("GPIO_EXPORT received");
#endif
      res = gpioExport(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case GPIO_WRITE:
#ifdef DEB
      SerialTinyUSB.println("GPIO_WRITE received");
#endif
      res = gpioWrite(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case GPIO_READ:
#ifdef DEB
      SerialTinyUSB.println("GPIO_READ received");
#endif
      res = gpioRead(pMes[MES_B_IDX+1]);
      if(res == 0xFF){
        rawOutputData[MES_B_IDX+1] = 0;
      }else{
        rawOutputData[MES_B_IDX+1] = 1;
      }
      rawOutputData[MES_B_IDX+2] = res;
      _size = MES_H_SIZE+2;
      break;
    case GPIO_UNEXPORT:
#ifdef DEB
      SerialTinyUSB.println("GPIO_UNEXPORT received");
#endif
      res = gpioUnexport(pMes[MES_B_IDX+1]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+2;
      break;
    case GPIO_UNEXPORTALL:
#ifdef DEB
      SerialTinyUSB.println("GPIO_UNEXPORTALL received");
#endif
      res = gpioUnexportAll();
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case GPIO_SETPWM:
#ifdef DEB
      SerialTinyUSB.println("GPIO_SETPWM received");
#endif
      res = gpioSetPWM(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case GPIO_ANALOGREAD:
#ifdef DEB
      SerialTinyUSB.println("GPIO_ANALOGREAD received");
#endif
      res = gpioAnalogRead(pMes[MES_B_IDX+1],&lsb,&msb);
      rawOutputData[MES_B_IDX+1] = res;
      rawOutputData[MES_B_IDX+2] = lsb;
      rawOutputData[MES_B_IDX+3] = msb;
      _size = MES_H_SIZE+3;
      break;
    case I2C_INIT:
#ifdef DEB
      SerialTinyUSB.println("I2C_INIT received");
#endif
      res = i2cDeviceInit(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case I2C_WRITE8:
#ifdef DEB
      SerialTinyUSB.println("I2C_WRITE8 received");
#endif
      res = i2cDeviceWrite8(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3],pMes[MES_B_IDX+4]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case I2C_WRITE16:
#ifdef DEB
      SerialTinyUSB.println("I2C_WRITE16 received");
#endif
      wordData = pMes[MES_B_IDX+4] | (pMes[MES_B_IDX+5]<<8);
      res = i2cDeviceWrite16(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3],wordData);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case I2C_WRITEBYTE:
#ifdef DEB
      SerialTinyUSB.println("I2C_WRITEBYTE received");
#endif
      res = i2cDeviceWriteByte(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case I2C_WRITEBYTES:
#ifdef DEB
      SerialTinyUSB.println("I2C_WRITEBYTES received");
#endif
      res = i2cDeviceWriteBytes(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3],&pMes[MES_B_IDX+4]);
      rawOutputData[MES_B_IDX+1] = res;
      _size = MES_H_SIZE+1;
      break;
    case I2C_READ8:
#ifdef DEB
      SerialTinyUSB.println("I2C_READ8 received");
#endif
      uint8_t readData;
      res = i2cDeviceRead8(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3], &readData);
      rawOutputData[MES_B_IDX+1] = res;
      if(res == 1){
        rawOutputData[MES_B_IDX+2] = readData;
        _size = MES_H_SIZE+2;
      }else{
        _size = MES_H_SIZE+1;
      }
      break;
    case I2C_READ16:
#ifdef DEB
      SerialTinyUSB.println("I2C_READ16 received");
#endif
      res = i2cDeviceRead16(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3], &wordData);
      rawOutputData[MES_B_IDX+1] = res;
      if(res == 1){
        rawOutputData[MES_B_IDX+2] = (uint8_t)(wordData & 0x00FF);
        rawOutputData[MES_B_IDX+3] = (uint8_t)(wordData >> 8);
        _size = MES_H_SIZE+3;
      }else{
        _size = MES_H_SIZE+1;
      }
      break;
    case I2C_READBYTE:
#ifdef DEB
      SerialTinyUSB.println("I2C_READBYTE received");
#endif
      res = i2cDeviceReadByte(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],&rawOutputData[MES_B_IDX+3]);
      rawOutputData[MES_B_IDX+1] = res;
      if(res == 1){
        _size = MES_H_SIZE+2;
      }else{
        _size = MES_H_SIZE+1;
      }
      break;
    case I2C_READBYTES:
#ifdef DEB
      SerialTinyUSB.println("I2C_READBYTES received");
#endif
      res = i2cDeviceReadBytes(pMes[MES_B_IDX+1],pMes[MES_B_IDX+2],pMes[MES_B_IDX+3],&rawOutputData[MES_B_IDX+2]);
      rawOutputData[MES_B_IDX+1] = res;
      if(res == 1){
        _size = (MES_H_SIZE+1)+pMes[MES_B_IDX+2];
      }else{
        _size = MES_H_SIZE+1;
      }
      break;
    case I2C_PORTSCAN:
#ifdef DEB
      SerialTinyUSB.println("I2C_PORTSCAN received");
#endif
      if(pMes[MES_B_IDX+1] == 1){
#ifdef WIRE1_ENABLE
        rawOutputData[MES_B_IDX+1] = 1; // ok;
#else
        rawOutputData[MES_B_IDX+1] = 0; // error;
#endif        
      }else if(pMes[MES_B_IDX+1] == 0){
        rawOutputData[MES_B_IDX+1] = 1; // ok;
      }else{
        rawOutputData[MES_B_IDX+1] = 0; // error;
      }
      if(rawOutputData[MES_B_IDX+1] == 1){
        res = i2cDetectDevices(pMes[4],i2cDetBuf);
        rawOutputData[MES_B_IDX+2] = res;
        for(int cnt=0;cnt<res;cnt++){
          rawOutputData[(MES_B_IDX+3)+cnt] = i2cDetBuf[cnt];
        }
        _size = (MES_H_SIZE+2)+res;
      }else{
        rawOutputData[MES_B_IDX+2] = 0;
        _size = MES_H_SIZE+2;
      }
      break;
    case FUNC_LED_INIT:
      break;
    case FUNC_LED_ON:
      break;
    case FUNC_LED_OFF:
      break;
    case FUNC_CLED_INIT:
      break;
    case FUNC_CLED_SET:
      break;
    case FUNC_CLED_OFF:
      break;
    default:
      break;
    }
    if(_size >= (MES_H_SIZE+1)){
      sendFuncAnswer(rawOutputData,_size);
    }
  }
}

void sendFuncAnswer(uint8_t *pMess,size_t _size){
  sendLen = encodeToMidiSysEx(pMess,_size,sysExOutData,sizeof(sysExOutData));

#ifdef DEB
  SerialTinyUSB.print("sysExOutData: ");
  for (uint16_t i = 0; i < sendLen; i++) {
    SerialTinyUSB.print(sysExOutData[i], HEX); SerialTinyUSB.print(" ");
  }
  SerialTinyUSB.println();
#endif

  MIDI.sendSysEx((unsigned)sendLen,(const byte *)sysExOutData,true);
}

/////////////////////////////////////////////////////////
// GPIO functions
/////////////////////////////////////////////////////////

void sendGpioOnChange(uint8_t pinNumber,uint8_t onOff,uint8_t isPullup){
  sessionId ++;
  rawOutputData[0] = 2;
  rawOutputData[1] = GPIO_ONCHANGE;
  rawOutputData[2] = (uint8_t)(sessionId & 0x00FF); // LSB
  rawOutputData[3] = (uint8_t)(sessionId >> 8);     // MSB
  rawOutputData[4] = 0;
  rawOutputData[5] = 0;
  rawOutputData[6] = 0;
  rawOutputData[7] = 0;
  rawOutputData[8] = pinNumber;
  rawOutputData[9] = onOff;
  rawOutputData[10] = isPullup;
  
  uint16_t sendLen = encodeToMidiSysEx(rawOutputData,11,sysExOutData,sizeof(sysExOutData));

#ifdef DEB
  SerialTinyUSB.print("sendGpioOnChange: ");
  for (uint16_t i = 0; i < sendLen; i++) {
    SerialTinyUSB.print(sysExOutData[i], HEX); SerialTinyUSB.print(" ");
  }
  SerialTinyUSB.println();
#endif

  MIDI.sendSysEx((unsigned)sendLen,(const byte *)sysExOutData,true);
}

uint8_t gpioExport(uint8_t portNum,uint8_t direct){
  int _mode = -1;
  switch(direct){
    case 1: _mode = OUTPUT; break;
    case 2: _mode = INPUT_PULLDOWN; break;
    case 3: _mode = INPUT_PULLUP; break;
    case 4: _mode = OUTPUT; break;
    case 5: _mode = INPUT_PULLDOWN; break;
    default: break;
  }
  if(_mode != -1){
    pinMode((int)portNum,_mode);
    int idx = getIndexFromPortNum(portNum);
    if(idx == -1){
      return 0;
    }
    pinStatus[idx] = direct;

#ifdef DEB
    SerialTinyUSB.println("pinStatus dump"); 
    for (uint8_t i = 0; i < pinNums; i++) {
      SerialTinyUSB.print(pinStatus[i], HEX); SerialTinyUSB.print(" ");
    }
    SerialTinyUSB.println();   
#endif
    
    return 1; // success
  }else{
    return 0; // error
  }
}

uint8_t gpioWrite(uint8_t portNum, uint8_t value){
  int idx = getIndexFromPortNum(portNum);
  if(idx == -1){
    return 0;
  }
  if(pinStatus[idx] == 1){
    if(value == 1){
      digitalWrite(portNum,HIGH);
    }else{
      digitalWrite(portNum,LOW);
    }
    return 1;
  }else{
    return 0;
  }
}

uint8_t gpioRead(uint8_t portNum){
  int idx = getIndexFromPortNum(portNum);
  if(idx == -1){
    return 0xFF;
  }
  uint8_t value = 0xFF;
  if((pinStatus[idx] == 2)||(pinStatus[idx] == 3)){
    value = (uint8_t)digitalRead(portNum);
  }
  return value;
}

uint8_t gpioUnexport(uint8_t portNum){
  int idx = getIndexFromPortNum(portNum);
  if(idx == -1){
    return 0;
  }
  pinMode(portNum,INPUT_PULLDOWN);
  pinStatus[idx] = 0;
  return 1;
}

uint8_t gpioUnexportAll(){
  int cnt;
  for(cnt=0;cnt<pinNums;cnt++){
    if(pinStatus[cnt] != 0){
      uint8_t pinNumber = pinNumbers[cnt];
      pinMode(pinNumber,INPUT_PULLDOWN);
      pinStatus[cnt] = 0;
    }
  }
  return 1;
}

uint8_t gpioSetPWM(uint8_t portNum, uint8_t _duty){
  int idx = getIndexFromPortNum(portNum);
  if(idx == -1){
    return 0;
  }
  if(pinStatus[idx] == 4){
    analogWrite(portNum,_duty);
    return 1;
  }else{
    return 0;
  }
}

uint8_t gpioAnalogRead(uint8_t portNum, uint8_t *pLsb,uint8_t *pMsb){
  int idx = getIndexFromPortNum(portNum);
  int data;
  if(idx == -1){
    return 0;
  }
  if(pinStatus[idx] == 5){
    data = analogRead(portNum);
    *pLsb = (uint8_t)(data & 0x00FF);
    *pMsb = (uint8_t)((data >> 8) & 0x03); // 10bit
    return 1;
  }else{
    return 0;
  }
}

int getIndexFromPortNum(uint8_t portNum){
  int cnt;
  for(cnt=0;cnt<pinNums;cnt++){
    if(pinNumbers[cnt] == portNum){
      return cnt;
    }
  }
  return -1;
}

/////////////////////////////////////////////////////////
// i2c functions
/////////////////////////////////////////////////////////

void sendI2COnAddrClose(uint8_t port, uint8_t addr){
  sessionId ++;
  rawOutputData[0] = 3;
  rawOutputData[1] = I2C_ONADDRCLOSE;
  rawOutputData[2] = (uint8_t)(sessionId & 0x00FF); // LSB
  rawOutputData[3] = (uint8_t)(sessionId >> 8);     // MSB
  rawOutputData[4] = 0;
  rawOutputData[5] = 0;
  rawOutputData[6] = 0;
  rawOutputData[7] = 0;
  rawOutputData[8] = port;
  rawOutputData[9] = addr;
  
  uint16_t sendLen = encodeToMidiSysEx(rawOutputData,10,sysExOutData,sizeof(sysExOutData));

#ifdef DEB
  SerialTinyUSB.print("sendI2COnAddrClose: ");
  for (uint16_t i = 0; i < sendLen; i++) {
    SerialTinyUSB.print(sysExOutData[i], HEX); SerialTinyUSB.print(" ");
  }
  SerialTinyUSB.println();
#endif

  MIDI.sendSysEx((unsigned)sendLen,(const byte *)sysExOutData,true);
}

uint8_t i2cDetectDevices(uint8_t portNum, uint8_t *pDetectBuf){
  int cnt;
  uint8_t result;
  uint8_t detectCnt = 0;
  TwoWire* pWire;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif

  for(cnt=0x03;cnt<0x77;cnt++){
    i2cLock = 1;
    pWire->beginTransmission(cnt);
    result = pWire->endTransmission();
    i2cLock = 0;
    if(result == 0){
      pDetectBuf[detectCnt] = cnt;
      detectCnt++;
    }
  }
  return detectCnt;
}

uint8_t i2cDeviceInit(uint8_t portNum, uint8_t address){
  int cnt;
  uint8_t result;
  TwoWire* pWire;
  uint8_t *pStatus;

#ifdef WIRE1_ENABLE
  if(portNum > 1){
    return 0;
  }
  if(portNum == 1){
    pWire = &Wire1;
    pStatus = i2cSlaveStatus1;
  }else{
    pWire = &Wire;
    pStatus = i2cSlaveStatus0;
  }
#else
  if(portNum > 0){
    return 0;
  }
  pWire = &Wire;
  pStatus = i2cSlaveStatus0;
#endif
  if((address<3)||(address>=0x77)){
    return 0; // out of i2c Address ranges
  }
  i2cLock = 1;
  pWire->beginTransmission(address);
  result = pWire->endTransmission();
  i2cLock = 0;
  if(result == 0){
    *(pStatus+address) = 1;
    return 1;
  }else{
    *(pStatus+address) = 0;
    return 0;
  }
}

uint8_t i2cDeviceRead8(uint8_t portNum, uint8_t address, uint8_t reg, uint8_t *pOut){
  TwoWire* pWire;
  uint8_t dmy;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif

  i2cLock = 1;
  pWire->beginTransmission(address);
  pWire->write(reg);
  pWire->endTransmission(false);
  pWire->requestFrom(address, (uint8_t)1);
  uint8_t readSize = pWire->available();
  if(readSize == 1){
    *pOut = Wire.read();
    i2cLock = 0;
    return 1;
  }else{
    for(int cnt=0;cnt<readSize;cnt++){
      dmy = pWire->read();
    }
    i2cLock = 0;
    return 0;
  }
}

uint8_t i2cDeviceRead16(uint8_t portNum, uint8_t address, uint8_t reg, uint16_t *pOut){
  TwoWire* pWire;
  uint8_t dmy;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif
  i2cLock = 1;
  pWire->beginTransmission(address);
  pWire->write(reg);
  pWire->endTransmission(false);
  pWire->requestFrom(address, (uint8_t)2);
  uint8_t readSize = pWire->available();
  if(readSize == 2){
    uint8_t lsb = pWire->read();
    uint8_t msb = pWire->read();
    *pOut = (uint16_t)(lsb | (msb << 8));
    i2cLock = 0;
    return 1;
  }else{
    for(int cnt=0;cnt<readSize;cnt++){
      dmy = pWire->read();
    }
    i2cLock = 0;
    return 0;
  }
}

uint8_t i2cDeviceReadByte(uint8_t portNum, uint8_t address, uint8_t *pOut){
  TwoWire* pWire;
  uint8_t dmy;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif

  i2cLock = 1;
  pWire->requestFrom(address, (uint8_t)1);
  uint8_t readSize = pWire->available();
  if(readSize == 1){
    *pOut = pWire->read();
    i2cLock = 0;
    return 1;
  } else {
    for(int cnt=0;cnt<readSize;cnt++){
      dmy = pWire->read();
    }
    i2cLock = 0;
    return 0;
  }
}

uint8_t i2cDeviceReadBytes(uint8_t portNum, uint8_t address, uint8_t size, uint8_t *pOut){
  TwoWire* pWire;
  uint8_t dmy;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif

  i2cLock = 1;
  pWire->requestFrom(address, (uint8_t)size);
  int readSize = pWire->available();
  if(size == readSize){
    for(int cnt=0;cnt<readSize;cnt++){
      *(pOut + cnt) = pWire->read();
    }
    return 1;
  }else{
    for(int cnt=0;cnt<readSize;cnt++){
      dmy = pWire->read();
    }
    return 0;
  }
  i2cLock = 0;
}

uint8_t i2cDeviceWrite8(uint8_t portNum, uint8_t address, uint8_t reg, uint8_t data){
  TwoWire* pWire;
  uint8_t result;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif
  i2cLock = 1;
  pWire->beginTransmission(address);
  pWire->write(reg);
  pWire->write(data);
  result = pWire->endTransmission();
  i2cLock = 0;
  if(result == 0){
    return 1;
  }else{
    return 0;
  }
}

uint8_t i2cDeviceWrite16(uint8_t portNum, uint8_t address, uint8_t reg, uint16_t data){
  TwoWire* pWire;
  uint8_t result;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif
  i2cLock = 1;
  pWire->beginTransmission(address);
  pWire->write(reg);
  uint8_t lsb = (uint8_t)(data & 0x00ff);
  uint8_t msb = (uint8_t)(data >> 8);
  pWire->write(lsb);
  pWire->write(msb);
  result = pWire->endTransmission();
  i2cLock = 0;
  if(result == 0){
    return 1;
  }else{
    return 0;
  }
}

uint8_t i2cDeviceWriteByte(uint8_t portNum, uint8_t address, uint8_t data){
  TwoWire* pWire;
  uint8_t result;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif
  i2cLock = 1;
  pWire->beginTransmission(address);
  pWire->write(data);
  result = pWire->endTransmission();
  i2cLock = 0;
  if(result == 0){
    return 1;
  }else{
    return 0;
  }
}

uint8_t i2cDeviceWriteBytes(uint8_t portNum, uint8_t address, uint8_t length, uint8_t *pdata){
  TwoWire* pWire;
  uint8_t result;

#ifdef WIRE1_ENABLE
  if(portNum == 1){
    pWire = &Wire1;
  }else{
    pWire = &Wire;
  }
#else
  pWire = &Wire;
#endif
  i2cLock = 1;
  pWire->beginTransmission(address);
  for(int cnt=0;cnt<length;cnt ++){
    pWire->write(*(pdata+cnt));
  }
  result = pWire->endTransmission();
  i2cLock = 0;
  if(result == 0){
    return 1;
  }else{
    return 0;
  }
}
