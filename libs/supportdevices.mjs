// web-pio
// supportdevices.mjs
// ©2025 by D.F.Mac. @TripArts Music
//
// Version:
// - 2025.05.22 start writing (only MIDI Devices)
//

// const table
const DEF = {
  LED_TYPE_RGB:1,
  LED_TYPE_MONO:2,
  DEVICE_TYPE_WIFI:1,
  DEVICE_TYPE_MIDI:2
};

// Supported Devices
const supportedDevices = {
  pio_xiaoRP2040:{
    type:DEF.DEVICE_TYPE_MIDI,
    gpioPorts:[26,27,28,29,0,1,2,4,3],
    defaultGpioPort:0,
    pinNames:["D0","D1","D2","D3","D6","D7","D8","D9","D10"],
    adcPorts:[26,27,28,29],
    defaultAdcPort:26,
    i2cPorts:[0],
    defaultI2cPort:0,
    leds:{
      default:{type:DEF.LED_TYPE_RGB},  // NEOPIXEL (0)
      0:{type:DEF.LED_TYPE_RGB}, // NEOPIXEL (0)
      1:{type:DEF.LED_TYPE_RGB}  // RGB LED (1)
    },
    info:{
      voltage:3.3,
      reference:"https://wiki.seeedstudio.com/XIAO-RP2040/"
    }
  },
  pio_RaspiPico:{
    type:DEF.DEVICE_TYPE_MIDI,
    gpioPorts:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,18,19,20,21,22,26,27,28],
    defaultGpioPort:0,
    pinNames:["P1","P1","P4","P5","P6","P7","P9","P10","P11","P12","P14","P15","P16","P17","P24","P25","P26","P27","P29","P31","P32","P34"],
    adcPorts:[26,27,28],
    defaultAdcPort:26,
    i2cPorts:[0,1],
    defaultI2cPort:0,
    leds:{
      default:{type:DEF.LED_TYPE_MONO},  // User LED (D25)
      0:{type:DEF.LED_TYPE_MONO} // User LED (D25)
    },
    info:{
      voltage:3.3,
      reference:"https://www.raspberrypi.com/products/raspberry-pi-pico/"
    }
  },
  pio_RaspiPico2:{
    type:DEF.DEVICE_TYPE_MIDI,
    gpioPorts:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,18,19,20,21,22,26,27,28],
    defaultGpioPort:0,
    pinNames:["P1","P1","P4","P5","P6","P7","P9","P10","P11","P12","P14","P15","P16","P17","P24","P25","P26","P27","P29","P31","P32","P34"],
    adcPorts:[26,27,28],
    defaultAdcPort:26,
    i2cPorts:[0,1],
    defaultI2cPort:0,
    leds:{
      default:{type:DEF.LED_TYPE_MONO},  // User LED (D25)
      0:{type:DEF.LED_TYPE_MONO} // User LED (D25)
    },
    info:{
      voltage:3.3,
      reference:"https://www.raspberrypi.com/products/raspberry-pi-pico-2/"
    }
  }
};

class SupportDevices{
  constructor(){
    this.list = supportedDevices;
    this.c = DEF;
  }
  find(deviceName){
    let name = deviceName.split("-")[0];
    if(name in this.list){
      return this.list[name];
    }else{
      return null;
    }
  }
  getConst(){
    return this.c;
  }
}

export default new SupportDevices;
