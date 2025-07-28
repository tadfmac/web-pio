/// https://www.switch-science.com/products/2773?srsltid=AfmBOoquPvtLrkOCluD7d_TCyT12E-vZcR5vBdlFiTRWnOE_i6j_sta_
/// https://github.com/SWITCHSCIENCE/samplecodes/blob/master/Conta/2773_BH1745NUC_module/BH1745NUC.zip
/// https://github.com/SWITCHSCIENCE/samplecodes/blob/master/Conta/2773_BH1745NUC_module/BH1745NUC_module/BH1745NUC_module.ino


const BH1745NUC_DEVICE_ADDRESS_38 = 0x38;// 7bit Addrss
const BH1745NUC_DEVICE_ADDRESS_39 = 0x39;// 7bit Addrss

const BH1745NUC_SYSTEM_CONTROL = 0x40;              
const BH1745NUC_MODE_CONTROL1 = 0x41;                
const BH1745NUC_MODE_CONTROL2 = 0x42;              
const BH1745NUC_MODE_CONTROL3 = 0x44;   
const BH1745NUC_RED_DATA_LSB = 0x50;         
const BH1745NUC_MANUFACTURER_ID = 0x92;           

const BH1745NUC_MODE_CONTROL1_MEAS_TIME160MS = 0x00; 

const BH1745NUC_MODE_CONTROL2_ADC_GAIN_X1 = 0; 
const BH1745NUC_MODE_CONTROL2_ADC_GAIN_X2 = 1;
const BH1745NUC_MODE_CONTROL2_ADC_GAIN_X16 = 2;
const BH1745NUC_MODE_CONTROL2_RGBC_EN = (1 << 4);       

const BH1745NUC_MODE_CONTROL1_VAL = BH1745NUC_MODE_CONTROL1_MEAS_TIME160MS;
const BH1745NUC_MODE_CONTROL2_VAL = (BH1745NUC_MODE_CONTROL2_RGBC_EN | BH1745NUC_MODE_CONTROL2_ADC_GAIN_X16);
const BH1745NUC_MODE_CONTROL3_VAL = 0x02; 

class BH1745NUC{
    constructor(i2cPort,slaveAddress){
    this.i2cPort = i2cPort;
    this.i2cSlave = null;
    this.slaveAddress = slaveAddress;
  }

  async init() {
    this.i2cSlave = await this.i2cPort.open(this.slaveAddress);

    await this.i2cSlave.write8(BH1745NUC_MODE_CONTROL1, BH1745NUC_MODE_CONTROL1_VAL);
    await this.i2cSlave.write8(BH1745NUC_MODE_CONTROL2, BH1745NUC_MODE_CONTROL2_VAL);
    await this.i2cSlave.write8(BH1745NUC_MODE_CONTROL3, BH1745NUC_MODE_CONTROL3_VAL);
  }

  async get_rawval(){
/*
    let data = [];
    for(let cnt=0;cnt<8;cnt++){
      data.push(await this.i2cSlave.read8(BH1745NUC_RED_DATA_LSB+cnt));
      await this.wait(20);
    }
*/
    const data = await this.read(BH1745NUC_RED_DATA_LSB, 8);
    console.dir({"r0":data[0], "r1":data[1], "r2":data[2], "r3":data[3],"r4":data[4], "r5":data[5], "r6":data[6], "r7":data[7]});///
    return (data);
  }

  async get_val(){
    let val = await this.get_rawval();
    let data = new Array(4);

    data[0] =  (val[1] << 8) | val[0];
    data[1] =  (val[3] << 8) | val[2];
    data[2] =  (val[5] << 8) | val[4];
    data[3] =  (val[7] << 8) | val[6];
    console.dir({"d0":data[0], "d1":data[1], "d2":data[2], "d3":data[3]});///
    return (data);
  }

  async write(memory_address, data){
    await this.i2cSlave.writeByte(memory_address);
    await this.i2cSlave.writeBytes(data);
  }

  async read(memory_address, size){
    await this.i2cSlave.writeByte(memory_address);
    return await this.i2cSlave.readBytes(size);
  }
  wait(time){
    return new Promise((resolve)=>{
      setTimeout(()=>{ resolve()},time);
    })
  }
}
export default BH1745NUC;