// web-pio
// devconfig.mjs
// ©2025 by D.F.Mac. @TripArts Music
//
// Version:
// - 2025.05.22 start writing (only MIDI Devices)
//

import sd from "./supportdevices.mjs";

class devConfig {
  constructor() {
    this.config = null;
    this.name = null;
  }
  init(deviceName) {
    this.config = sd.find(deviceName);
    this.name = deviceName;
    if (this.config) {
      return this;
    } else {
      return null;
    }
  }
  checkGPIOPort(gpioPortNum) {
    if (this.config) {
      for (let cnt = 0; cnt < this.config.gpioPorts.length; cnt++) {
        if (gpioPortNum == this.config.gpioPorts[cnt]) {
          return gpioPortNum;
        }
      }
    }
    return null;
  }
  checkAdcPort(adcPortNum) {
    if (this.config) {
      for (let cnt = 0; cnt < this.config.adcPorts.length; cnt++) {
        if (adcPortNum == this.config.adcPorts[cnt]) {
          return adcPortNum;
        }
      }
    }
    return null;
  }
  checkI2CPort(i2cPortNum) {
    if (this.config) {
      for (let cnt = 0; cnt < this.config.i2cPorts.length; cnt++) {
        if (i2cPortNum == this.config.i2cPorts[cnt]) {
          return i2cPortNum;
        }
      }
    }
    return null;
  }
  getDefaultGpioPort() {
    if (this.config.defaultGpioPort != undefined) {
      return this.config.defaultGpioPort;
    } else {
      return null;
    }
  }
  getDefaultAdcPort() {
    if (this.config.defaultAdcPort != undefined) {
      return this.config.defaultAdcPort;
    } else {
      return null;
    }
  }
  getDefaultI2CPort() {
    if (this.config.defaultI2cPort != undefined) {
      return this.config.defaultI2cPort;
    } else {
      return null;
    }
  }
  getDefaultBuiltinLED() {
    if (this.config) {
      if ("default" in this.config.leds) {
        return this.config.leds["default"];
      }
    }
    return null;
  }
  getBuiltinLED(name) {
    if (name != undefined) {
      if (this.config) {
        if (name in this.config.leds) {
          return this.config.leds[name];
        }
      }
    } else {
      return this.getDefaultBuiltinLED();
    }
    return null;
  }
}

export default devConfig;
