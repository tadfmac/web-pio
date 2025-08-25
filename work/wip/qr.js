// based from : https://github.com/m5stack/M5Unit-QRCode

const constances = {
  UNIT_QRCODE_ADDR:0x21,
  UNIT_QRCODE_TRIGGER_REG:0x0000,
  UNIT_QRCODE_READY_REG:0x0010,
  UNIT_QRCODE_LENGTH_REG:0x0020,
  UNIT_QRCODE_TRIGGER_MODE_REG:0x0030,
  UNIT_QRCODE_TRIGGER_KEY_REG:0x0040,
  UNIT_QRCODE_DATA_REG:0x1000,
  JUMP_TO_BOOTLOADER_REG:0x00FD,
  FIRMWARE_VERSION_REG:0x00FE,
  I2C_ADDRESS_REG:0x00FF,
  AUTO_SCAN_MODE:0,
  MANUAL_SCAN_MODE:1
};

class M5StackQrScanner{
  constructor(i2cPort,addr){
    this.i2cPort = i2cPort;
    this.slaveAddress = addr;
    this.c = constances;
  	this.i2cSlave = null;
  }
  async init(){
    this.i2cSlave = await this.i2cPort.open(this.slaveAddress);
  }
  async _write(reg16,data){
  	let sendData = [];
    sendData[0] = reg16 & 0x00ff;
    sendData[1] = (reg16 >> 8) & 0x00ff;
    for(let cnt=0;cnt<data.length;cnt++){
      sendData[cnt+2]=data[cnt];
    }
  	await this.i2cSlave.writeBytes(sendData);
  }
  async _read(reg16,length){
  	let sendData = [];
    sendData[0] = reg16 & 0x00ff;
    sendData[1] = (reg16 >> 8) & 0x00ff;
    await this.i2cSlave.writeBytes(sendData);
    return await this.i2cSlave.readBytes(length);
  }
  async setDecodeTrigger(en){
    await this._write(this.c.UNIT_QRCODE_TRIGGER_REG,[en]);
  }
  async setTriggerMode(mode){
    await this._write(this.c.UNIT_QRCODE_TRIGGER_MODE_REG,[mode]);
  }
  async getTriggerMode(){
    return await this._read(this.c.UNIT_QRCODE_TRIGGER_MODE_REG,1);
  }
  async getDecodeReadyStatus(){
    return await this._read(this.c.UNIT_QRCODE_READY_REG,1);
  }
  async getTriggerKeyStatus(){
    return await this._read(this.c.UNIT_QRCODE_TRIGGER_KEY_REG,1);
  }
  async getDecodeLength(){
    const lengthArr = await this._read(this.c.UNIT_QRCODE_LENGTH_REG,2);
    return (lengthArr[0] & 0x00ff) | (lengthArr[1] << 8);
  }
  async getDecodeData(length){
    const strArr = await this._read(this.c.UNIT_QRCODE_DATA_REG,length);
    return new TextDecoder().decode(strArr);
  }
  async jumpBootloader(){
    await this._write(this.c.JUMP_TO_BOOTLOADER_REG,[1]);
  }
  // setI2CAddress は web i2c の仕様と合わないので
  // getI2CAddress 含めて対応しない。
  async getFirmwareVersion(){
  	return await this._read(this.c.UNIT_QRCODE_DATA_REG,length,1);
  }
}

export default M5StackQrScanner;
