// web-pio
// makeUUID.h
// ©2025 by D.F.Mac. @TripArts Music

#ifndef _makeUUID_H_
#define _makeUUID_H_

#include <stdint.h>

#define INPUT_SIZE 8
#define OUTPUT_SIZE 11

typedef struct {
    uint32_t low;
    uint32_t high;
} uint64_custom;

void load64bitFromBytes(uint64_custom *value, uint8_t *pInput);
void convert8bitToAscii(uint8_t *pInput, char *pOut);

#endif  // _makeUUID_H_
