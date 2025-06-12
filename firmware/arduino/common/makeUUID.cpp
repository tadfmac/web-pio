// web-pio
// makeUUID.h
// ©2025 by D.F.Mac. @TripArts Music

#include "makeUUID.h"

char b6code2Ascii(char code){
  char ret;
  if(code < 10){
    ret = code + 0x30;
  }else if((code >= 10)&&(code < 36)){
    ret = (code - 10) + 0x41;
  }else if((code >= 36)&&(code < 62)){
    ret = (code - 36) + 0x61;
  }else{
    if(code == 62){
      ret = '@';
    }else if(code == 63){
      ret = '&';
    }else{
      ret = '.'; // error
    }
  }
  return ret;
}

void load64bitFromBytes(uint64_custom *value, uint8_t *pInput) {
  value->high = (pInput[0] << 24) | (pInput[1] << 16) | (pInput[2] << 8) | pInput[3];
  value->low  = (pInput[4] << 24) | (pInput[5] << 16) | (pInput[6] << 8) | pInput[7];
}

void convert8bitToAscii(uint8_t *pInput, char *pOut) {
  int cnt;
  uint64_custom buffer;
  uint8_t output[OUTPUT_SIZE];
  load64bitFromBytes(&buffer, pInput);

  output[0] = (uint8_t)((buffer.high & 0xFC000000) >> 26);
  output[1] = (uint8_t)((buffer.high & 0x03F00000) >> 20);
  output[2] = (uint8_t)((buffer.high & 0x000FC000) >> 14);
  output[3] = (uint8_t)((buffer.high & 0x00003F00) >> 8);
  output[4] = (uint8_t)((buffer.high & 0x000000FC) >> 2);
  output[5] = (uint8_t)(((buffer.high & 0x00000003) << 4)|((buffer.low & 0xF0000000) >> 28));
  output[6] = (uint8_t)((buffer.low & 0x0FC00000) >> 22);
  output[7] = (uint8_t)((buffer.low & 0x003F0000) >> 16);
  output[8] = (uint8_t)((buffer.low & 0x0000FC00) >> 10);
  output[9] = (uint8_t)((buffer.low & 0x000003F0) >> 4);
  output[10]= (uint8_t)(buffer.low & 0x0000000F);

  for(cnt=0;cnt<OUTPUT_SIZE;cnt++){
    pOut[cnt] = b6code2Ascii(output[cnt]);
  }

}
