/*
  qmp6988 Driver for CHIRIMEN

  based from :
  - https://github.com/m5stack/M5Unit-ENV/blob/master/src/QMP6988.h
  - https://github.com/m5stack/M5Unit-ENV/blob/master/src/QMP6988.cpp

  reference : 
  - dataseat : https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/datasheet/unit/enviii/QMP6988%20Datasheet.pdf
  - https://gitlab.com/ghislainmary/embedded-qmp6988

*/

const QMP6988_CALIBRATION_DATA_START = 0xa0;
const QMP6988_CALIBRATION_DATA_LENGTH = 25;
const QMP6988_RESET_REG = 0xe0;
const QMP6988_CTRLMEAS_REG = 0xf4;
const QMP6988_PRESSURE_MSB_REG = 0xf7;
const QMP6988_TEMPERATURE_MSB_REG = 0xfa;
const QMP6988_CONFIG_REG = 0xf1;
const RESET_START_DATA = 0xe6;
const RESET_END_DATA = 0x00;
const SUBTRACTOR = 8388608;

const SEA_LEVEL_PRESSURE = 101325; // default： 101325 // 103111

// Power Mode
const cPM = {
  QMP6988_SLEEP_MODE: 0x00,
  QMP6988_FORCED_MODE: 0x01,
  QMP6988_NORMAL_MODE: 0x03,
};

// Filter
const cF = {
  QMP6988_FILTERCOEFF_OFF: 0x00,
  QMP6988_FILTERCOEFF_2: 0x01,
  QMP6988_FILTERCOEFF_4: 0x02,
  QMP6988_FILTERCOEFF_8: 0x03,
  QMP6988_FILTERCOEFF_16: 0x04,
  QMP6988_FILTERCOEFF_32: 0x05,
};

// Oversampling
const cOS = {
  QMP6988_OVERSAMPLING_SKIPPED: 0x00,
  QMP6988_OVERSAMPLING_1X: 0x01,
  QMP6988_OVERSAMPLING_2X: 0x02,
  QMP6988_OVERSAMPLING_4X: 0x03,
  QMP6988_OVERSAMPLING_8X: 0x04,
  QMP6988_OVERSAMPLING_16X: 0x05,
  QMP6988_OVERSAMPLING_32X: 0x06,
  QMP6988_OVERSAMPLING_64X: 0x07,
};

class QMP6988 {
  constructor(i2cPort, addr) {
    this.i2cPort = i2cPort;
    this.slaveAddress = addr;
    this.i2cSlave = null;
    this.calibrationData = null;
    this.ik = null;
    this.powerMode = null;
    this.temperature = null;
    this.pressure = null;
    this.cPM = cPM;
    this.cF = cF;
    this.cOS = cOS;
  }
  async init() {
    try {
      this.i2cSlave = await this.i2cPort.open(this.slaveAddress);
      await this._getCalibrationData();
      await this.setPowerMode(this.cPM.QMP6988_NORMAL_MODE);
      await this.setFilter(this.cF.QMP6988_FILTERCOEFF_4);
      await this.setOversamplingP(this.cOS.QMP6988_OVERSAMPLING_8X);
      await this.setOversamplingT(this.cOS.QMP6988_OVERSAMPLING_1X);
    } catch (e) {
      console.error("QMP6988.init() error : " + e);
      return null;
    }
    return this;
  }
  /*
  async _getCalibrationData() {
    let rd = [];
    for (let cnt = 0; cnt < QMP6988_CALIBRATION_DATA_LENGTH; cnt++) {
      rd.push(await this.i2cSlave.read8(QMP6988_CALIBRATION_DATA_START + cnt));
    }
//    await this.i2cSlave.writeByte(QMP6988_CALIBRATION_DATA_START);
//    const rd = await this.i2cSlave.readBytes(QMP6988_CALIBRATION_DATA_LENGTH);

    this.calibrationData = {};
    this.calibrationData.COE_a0 = this._signExtend((rd[18] << 12) | (rd[19] << 4) | (rd[24] & 0x0f),20);
    this.calibrationData.COE_a1 = (rd[20] << 8) | rd[21];
    this.calibrationData.COE_a2 = (rd[22] << 8) | rd[23];
    this.calibrationData.COE_b00 = this._signExtend((rd[0] << 12) | (rd[1] << 4) | ((rd[24] & 0xf0) >> 4),20);
    this.calibrationData.COE_bt1 = (rd[2] << 8) | rd[3];
    this.calibrationData.COE_bt2 = (rd[4] << 8) | rd[5];
    this.calibrationData.COE_bp1 = (rd[6] << 8) | rd[7];
    this.calibrationData.COE_b11 = (rd[8] << 8) | rd[9];
    this.calibrationData.COE_bp2 = (rd[10] << 8) | rd[11];
    this.calibrationData.COE_b12 = (rd[12] << 8) | rd[13];
    this.calibrationData.COE_b21 = (rd[14] << 8) | rd[15];
    this.calibrationData.COE_bp3 = (rd[16] << 8) | rd[17];

    this.ik = {};
    this.ik.a0 = this.calibrationData.COE_a0;
    this.ik.b00 = this.calibrationData.COE_b00;

    // from https://github.com/m5stack/M5Unit-ENV/blob/master/src/QMP6988.cpp 
    this.ik.a1 = 3608 * this.calibrationData.COE_a1 - 1731677965;
    this.ik.a2 = 16889 * this.calibrationData.COE_a2 - 87619360;
    this.ik.bt1 = 2982 * this.calibrationData.COE_bt1 + 107370906;
    this.ik.bt2 = 329854 * this.calibrationData.COE_bt2 + 108083093;
    this.ik.bp1 = 19923 * this.calibrationData.COE_bp1 + 1133836764;
    this.ik.b11 = 2406 * this.calibrationData.COE_b11 + 118215883;
    this.ik.bp2 = 3079 * this.calibrationData.COE_bp2 - 181579595;
    this.ik.b12 = 6846 * this.calibrationData.COE_b12 + 85590281;
    this.ik.b21 = 13836 * this.calibrationData.COE_b21 + 79333336;
    this.ik.bp3 = 2915 * this.calibrationData.COE_bp3 + 157155561;
console.log("a0="+this.ik.a0+" b00="+this.ik.b00);
console.log("a1="+this.ik.a1+" a2="+this.ik.a2+" bt1="+this.ik.bt1+" bt2="+this.ik.bt2+" bp1="+this.ik.bp1);
console.log("b11="+this.ik.b11+" bp2="+this.ik.bp2+" b12="+this.ik.b12+" b21="+this.ik.b21+" bp3="+this.ik.bp3);

  }*/
  async _getCalibrationData() {
  const rd = [];
  for (let cnt = 0; cnt < QMP6988_CALIBRATION_DATA_LENGTH; cnt++) {
    rd.push(await this.i2cSlave.read8(QMP6988_CALIBRATION_DATA_START + cnt));
  }

  // キャリブレーションデータを BigInt で読み取り・符号拡張
  const signExtend = (val, bits) => {
    const shift = BigInt(32 - bits);
    return (BigInt(val) << shift) >> shift;
  };

  const u16 = (msb, lsb) => (BigInt(msb) << 8n) | BigInt(lsb);

  this.calibrationData = {};
  this.calibrationData.COE_a0 = signExtend((rd[18] << 12) | (rd[19] << 4) | (rd[24] & 0x0f), 20);
  this.calibrationData.COE_a1 = u16(rd[20], rd[21]);
  this.calibrationData.COE_a2 = u16(rd[22], rd[23]);
  this.calibrationData.COE_b00 = signExtend((rd[0] << 12) | (rd[1] << 4) | ((rd[24] & 0xf0) >> 4), 20);
  this.calibrationData.COE_bt1 = u16(rd[2], rd[3]);
  this.calibrationData.COE_bt2 = u16(rd[4], rd[5]);
  this.calibrationData.COE_bp1 = u16(rd[6], rd[7]);
  this.calibrationData.COE_b11 = u16(rd[8], rd[9]);
  this.calibrationData.COE_bp2 = u16(rd[10], rd[11]);
  this.calibrationData.COE_b12 = u16(rd[12], rd[13]);
  this.calibrationData.COE_b21 = u16(rd[14], rd[15]);
  this.calibrationData.COE_bp3 = u16(rd[16], rd[17]);

  this.ik = {};
  this.ik.a0 = this.calibrationData.COE_a0;
  this.ik.b00 = this.calibrationData.COE_b00;

  // 定数も BigInt 化して補正係数を整数精度で計算
  this.ik.a1 = 3608n * this.calibrationData.COE_a1 - 1731677965n;
  this.ik.a2 = 16889n * this.calibrationData.COE_a2 - 87619360n;
  this.ik.bt1 = 2982n * this.calibrationData.COE_bt1 + 107370906n;
  this.ik.bt2 = 329854n * this.calibrationData.COE_bt2 + 108083093n;
  this.ik.bp1 = 19923n * this.calibrationData.COE_bp1 + 1133836764n;
  this.ik.b11 = 2406n * this.calibrationData.COE_b11 + 118215883n;
  this.ik.bp2 = 3079n * this.calibrationData.COE_bp2 - 181579595n;
  this.ik.b12 = 6846n * this.calibrationData.COE_b12 + 85590281n;
  this.ik.b21 = 13836n * this.calibrationData.COE_b21 + 79333336n;
  this.ik.bp3 = 2915n * this.calibrationData.COE_bp3 + 157155561n;

  // ログ（文字列化して出力）
  console.log(`a0=${this.ik.a0.toString()} b00=${this.ik.b00.toString()}`);
  console.log(`a1=${this.ik.a1.toString()} a2=${this.ik.a2.toString()} bt1=${this.ik.bt1.toString()} bt2=${this.ik.bt2.toString()} bp1=${this.ik.bp1.toString()}`);
  console.log(`b11=${this.ik.b11.toString()} bp2=${this.ik.bp2.toString()} b12=${this.ik.b12.toString()} b21=${this.ik.b21.toString()} bp3=${this.ik.bp3.toString()}`);
}
  _signExtend(value, bits) {
    const shift = 32 - bits;
    return (value << shift) >> shift;
  }
/*
  _convTx02e(data) {
    const wk1 = this.ik.a1 * data;
    let wk2 = this.ik.a2 * data;
    wk2 = wk2 / Math.pow(2, 14);
    wk2 = wk2 * data;
    wk2 = wk2 / Math.pow(2, 10);
    let sum = (wk1 + wk2) / 32767.0;
    sum = sum / Math.pow(2, 19);
    const ret = (this.ik.a0 + sum) / Math.pow(2, 4);
    return ret | 0;
  }
  _getPressure02e(dp, tx) {
    const wk1_bt1 = this.ik.bt1 * tx;
    let wk2 = (this.ik.bp1 * dp) / Math.pow(2, 5);
    let wk1 = wk1_bt1 + wk2;
    wk2 = (this.ik.bt2 * tx) / Math.pow(2, 1);
    wk2 = (wk2 * tx) / Math.pow(2, 8);
    let wk3 = wk2;
    wk2 = (this.ik.b11 * tx) / Math.pow(2, 4);
    wk2 = (wk2 * dp) / Math.pow(2, 1);
    wk3 += wk2;
    wk2 = (this.ik.bp2 * dp) / Math.pow(2, 13);
    wk2 = (wk2 * dp) / Math.pow(2, 1);
    wk3 += wk2;
    wk1 += wk3 / Math.pow(2, 14);
    wk2 = this.ik.b12 * tx;
    wk2 = (wk2 * tx) / Math.pow(2, 22);
    wk2 = (wk2 * dp) / Math.pow(2, 1);
    wk3 = wk2;
    wk2 = (this.ik.b21 * tx) / Math.pow(2, 6);
    wk2 = (wk2 * dp) / Math.pow(2, 23);
    wk2 = (wk2 * dp) / Math.pow(2, 1);
    wk3 += wk2;
    wk2 = (this.ik.bp3 * dp) / Math.pow(2, 12);
    wk2 = (wk2 * dp) / Math.pow(2, 23);
    wk2 = wk2 * dp;
    wk3 += wk2;
    wk1 += wk3 / Math.pow(2, 15);
    wk1 /= 32767.0;
    wk1 /= Math.pow(2, 11);
    wk1 += this.ik.b00;
    return wk1;
  }
*/
_convTx02e(rawTemp) {
  const data = BigInt(rawTemp); // raw temperature is integer

  const wk1 = this.ik.a1 * data;
  const wk2 = wk1 >> 31n;
  const wk3 = this.ik.a2 * data;
  const wk4 = (wk3 >> 31n) * data;
  const wk5 = wk4 >> 32n;
  const wk6 = wk2 + wk5;
  const t_fine = wk6 + BigInt(this.ik.a0);
console.log('@@@ type of t_fine:', typeof t_fine);
  return { t_fine, temp: Number((t_fine * 100n) >> 31n) / 100 };
}

// 圧力補正
_getPressure02e(rawPress, t_fine) {
  const data = BigInt(rawPress); // raw pressure is integer

console.log('type of ik.b11:', typeof this.ik.b11);
console.log('type of t_fine:', typeof t_fine);
  const wk1 = (this.ik.b11 * t_fine) >> 31n;
  const wk2 = (this.ik.bt1 * t_fine) >> 31n;
  const wk3 = this.ik.bp1 * data;
  const wk4 = (this.ik.b12 * t_fine) >> 31n;
  const wk5 = (wk4 * data) >> 32n;
  const wk6 = (this.ik.b21 * t_fine) >> 31n;
  const wk7 = (wk6 * data) >> 32n;
  const wk8 = (wk7 * data) >> 32n;
  const wk9 = (this.ik.bp2 * data) >> 31n;
  const wk10 = (this.ik.bp3 * data) >> 31n;
  const wk11 = (wk10 * data) >> 32n;
  const wk12 = (wk11 * data) >> 32n;

  const P_comp = this.ik.b00 + wk2 + wk1 + wk3 + wk5 + wk8 + wk9 + wk12;

  return Number(P_comp) / 25600;
}
  async _reset() {
    await this.i2cSlave.writeBytes([QMP6988_RESET_REG, RESET_START_DATA]);
    await this.wait(20);
    await this.i2cSlave.writeBytes([QMP6988_RESET_REG, RESET_END_DATA]);
  }
  async setPowerMode(mode) {
    this.powerMode = mode;
    if (mode == this.cPM.QMP6988_SLEEP_MODE || mode == this.cPM.QMP6988_FORCED_MODE || mode == this.cPM.QMP6988_NORMAL_MODE) {
      let data = await this.i2cSlave.read8(QMP6988_CTRLMEAS_REG);
console.log("setPowerMode() read="+data);

      data = data & 0xfc;
      data |= mode;
      await this.i2cSlave.write8(QMP6988_CTRLMEAS_REG, data);
      await this.wait(20);
      return mode;
    } else {
      console.error("QMP6988.setPowerMode() invalid power mode!");
      return null;
    }
  }
  async setFilter(filter) {
    await this.i2cSlave.write8(QMP6988_CONFIG_REG, filter & 0x03);
    await this.wait(20);
  }
  async setOversamplingP(pressure) {
    let data = await this.i2cSlave.read8(QMP6988_CTRLMEAS_REG);
    data &= 0xe3;
    data |= pressure << 2;
    await this.i2cSlave.write8(QMP6988_CTRLMEAS_REG, data);
    await this.wait(20);
  }
  async setOversamplingT(temp) {
    let data = await this.i2cSlave.read8(QMP6988_CTRLMEAS_REG);
    data &= 0x1f;
    data |= temp << 5;
    await this.i2cSlave.write8(QMP6988_CTRLMEAS_REG, data);
    await this.wait(20);
  }
  calcAltitude(pressure, temp) {
    return ((Math.pow(SEA_LEVEL_PRESSURE / pressure, 1 / 5.257) - 1) * (temp + 273.15)) / 0.0065;
  }
  async calcPressure() {
    let pressArr = [];
    for(let cnt=0;cnt<6;cnt++){
      pressArr.push(await this.i2cSlave.read8(QMP6988_PRESSURE_MSB_REG+cnt));
    }
//    await this.i2cSlave.writeByte(QMP6988_PRESSURE_MSB_REG);
//    const pressArr = await this.i2cSlave.readBytes(6);
    const P_read = (pressArr[0] << 16) | (pressArr[1] << 8) | pressArr[2];
    const P_raw = P_read - SUBTRACTOR;
console.log("rawPressure="+P_raw);
    const T_read = (pressArr[3] << 16) | (pressArr[4] << 8) | pressArr[5];
    const T_raw = T_read - SUBTRACTOR;
    const {t_fine} = this._convTx02e(T_raw);
    const P_int = this._getPressure02e(P_raw, t_fine);
    this.temperature = Number(t_fine) / 256.0;
    this.pressure = P_int / 16.0;
    return this.pressure;
  }
  async calcTemperature() {
    let pressArr = [];
    for(let cnt=0;cnt<3;cnt++){
      pressArr.push(await this.i2cSlave.read8(QMP6988_PRESSURE_MSB_REG+cnt));
    }
//    await this.i2cSlave.writeByte(QMP6988_PRESSURE_MSB_REG);
//    const pressArr = await this.i2cSlave.readBytes(6);
    const P_read = (pressArr[0] << 16) | (pressArr[1] << 8) | pressArr[2];
    const P_raw = P_read - SUBTRACTOR;
//    await this.i2cSlave.writeByte(QMP6988_TEMPERATURE_MSB_REG);
//    const tempArr = await this.i2cSlave.readBytes(3);
    let tempArr = [];
    for(let cnt=0;cnt<3;cnt++){
      tempArr.push(await this.i2cSlave.read8(QMP6988_TEMPERATURE_MSB_REG+cnt));
    }
    const T_read = (tempArr[0] << 16) | (tempArr[1] << 8) | tempArr[2];
    const T_raw = T_read - SUBTRACTOR;
console.log("rawTemperature="+T_raw);
    const {t_fine} = this._convTx02e(T_raw);
    const P_int = this._getPressure02e(P_raw, t_fine);
    this.temperature = Number(t_fine) / 256.0;
    this.pressure = P_int / 16.0;
    return this.temperature;
  }
  async read() {
    const _pressure = await this.calcPressure();
    const _temperature = await this.calcTemperature();
    const _altitude = await this.calcAltitude(_pressure, _temperature);
    return { pressure: _pressure / 100.0, temperature: _temperature, altitude: _altitude };
  }
  async wait(time) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }
}

export default QMP6988;
