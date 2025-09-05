// Driver for the QR Code Scanner Unit
// based from https://github.com/m5stack/M5Unit-QRCode/blob/main/src/M5UnitQRCodeI2C.cpp
// Programmed by Ryoma Aoki

const QRCODE_READY_REG = 0x0010;
const QRCODE_LENGTH_REG = 0x0020;
const QRCODE_TRIGGER_MODE_REG = 0x0030;
const QRCODE_DATA_REG = 0x1000;
const QRCODE_STATUS_DETECTED = 1;
const QRCODE_STATUS_LOADING = 2;

class QRScanner {
  constructor(i2cPort, slaveAddress) {
    this.i2cPort = i2cPort;
    this.i2cSlave = null;
    this.slaveAddress = slaveAddress;
  }

  async init() {
    this.i2cSlave = await this.i2cPort.open(this.slaveAddress);
  }

  async #write(reg16, data) {
    let sendData = [];
    sendData[0] = reg16 & 0x00ff;
    sendData[1] = (reg16 >> 8) & 0x00ff;
    const sendArray = sendData.concat(data);
    return await this.i2cSlave.writeBytes(sendArray);
  }

  async #read(reg16, length) {
    let sendData = [];
    sendData[0] = reg16 & 0x00ff;
    sendData[1] = (reg16 >> 8) & 0x00ff;
    await this.i2cSlave.writeBytes(sendData);
//    await this.i2cSlave.write8(sendData[0],sendData[1]);
    return await this.i2cSlave.readBytes(length);
  }

  async setTriggerMode(mode) {
    await this.#write(QRCODE_TRIGGER_MODE_REG, [mode]);
  }
  async getTriggerMode() {
    const modeArr = await this.#read(QRCODE_TRIGGER_MODE_REG, 1);
    return modeArr[0];
  }

  async getDecodeReadyStatus() {
    const statusArr = await this.#read(QRCODE_READY_REG, 1);
    return statusArr[0];
  }

  async getDecodeLength() {
    const data = await this.#read(QRCODE_LENGTH_REG, 2);
    return (data[1] << 8) | data[0];
  }

  async getDecodeData(length) {
    const data = await this.#read(QRCODE_DATA_REG, length);
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(Uint8Array.from(data));
  }

  wait(ms) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }
  async scanData(timeoutMs = 86400000) {
    const startTime = Date.now();
    for (;;) {
      if (Date.now() - startTime >= timeoutMs) {
        throw new Error("QRScanner scanData timed out");
      }
      let status = await this.getDecodeReadyStatus();
      if (status == QRCODE_STATUS_DETECTED || status == QRCODE_STATUS_LOADING) {
        const length = await this.getDecodeLength();
        if (length > 0) {
          const data = await this.getDecodeData(length);
          return data;
        }
      }
      await this.wait(10);
    }
  }
}

export default QRScanner;
