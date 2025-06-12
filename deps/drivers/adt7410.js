const ADT7410 = function(i2cPort, slaveAddress) {
  this.i2cPort = i2cPort;
  this.i2cSlave = null;
  this.slaveAddress = slaveAddress;
};

ADT7410.prototype = {
  init: async function() {
    this.i2cSlave = await this.i2cPort.open(this.slaveAddress);
  },
  read: async function() {
    if (this.i2cSlave == null) {
      throw new Error("i2cSlave is not open yet.");
    }

    const MSB = await this.i2cSlave.read8(0x00);
    const LSB = await this.i2cSlave.read8(0x01);
    const binaryTemperature = ((MSB << 8) | LSB) >> 3;
    // Under 13bit resolution mode. (sign + 12bit)
    const sign = binaryTemperature & 0x1000;
    if (sign === 0) {
      // Positive value
      return binaryTemperature / 16.0;
    } else {
      // Negative value
      return (binaryTemperature - 8192) / 16.0;
    }
  }
};

export default ADT7410;
