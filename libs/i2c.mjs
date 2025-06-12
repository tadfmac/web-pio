// i2c.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// based on https://github.com/tadfmac/chirimen-raspi3/blob/master/gc/polyfill/polyfill.js
//
// Version:
// - 2025.06.05 moved from pio.mjs
//

import plmidi from "./pipeline-midi.mjs";
import devList from "./supportdevices.mjs";
import F from "./protocol-const.mjs";

const c = devList.getConst();

const DEB = false;

class I2CAccess{
  constructor(){
    if(DEB) console.log("I2CAccess.constructor()");
    this.config = null;
    this.ports = new Map();
    this.isActive = false;
  }
  init(conf){
    if(DEB) console.log("I2CAccess.init()");
    if(DEB) console.dir(conf);
    this.config = conf;
    this.isActive = true;
    let ports = conf.config.i2cPorts;
    for(let cnt=0;cnt<ports.length;cnt++){
      let port = new I2CPort(ports[cnt],conf);
      this.ports.set(ports[cnt],port);
    }
  }
  _suspend(){
    if(DEB) console.log("I2CAccess._suspend()");
    this.isActive = false;
    this.ports.forEach((port)=>{
      port._suspend();
    });
    plmidi.clearAddrCloseQueue(this.config.name);
  }
  _resume(){
    if(DEB) console.log("I2CAccess._resume()");
    this.isActive = true;
    this.ports.forEach((port)=>{
      port._resume();
    });
  }
}

class I2CPort extends EventTarget{
  constructor(portNumber,conf){
    super();
    if(DEB) console.log("I2CPort.constructor() port="+portNumber);
    if(DEB) console.dir(conf);
    this.portNumber = portNumber;
    this.conf = conf;
    this.isActive = true;
    this.i2cDevices = {};
    this.onclose = null;
  }
  _suspend(){
    if(DEB) console.log("I2CPort._suspend() port="+this.portNumber);
    this.isActive = false;
// I2CAccess._suspend() で suspend時の addrClose callbackの全消去を行うのでここではやらない
// 現状個別にport(bus)単位でcloseできる仕様ではないため。(openしたらdeviceの電源OFFまでopen)
//    for(let dev in this.i2cDevices){
//      dev._suspend();
//    }
    this.i2cDevices = {};
  }
  _resume(){
    if(DEB) console.log("I2CPort._resume() port="+this.portNumber);
    this.isActive = true;
  }
  async open(_address){
    let address = ""+_address;
    this.i2cDevices[address] = new I2CSlaveDevice(this.portNumber,address,this.conf,this._slaveClosed.bind(this));
    return await this.i2cDevices[address].init();
  }
  detect(){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("I2CPort.detect()");
      if(!this.isActive){
        console.error("I2CPort.detect() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if(DEB) console.log("I2CPort.detect() port="+this.portNumber+" device="+this.conf.name);
      let data = [this.portNumber];
      let result = await plmidi.send(this.conf.name,F.I2C_PORTSCAN,data);
      if(result == null){
        console.error("I2CPort.detect() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          if(DEB) console.log("result="+result[1]);
          let addrlist = [];
          for(let cnt=0;cnt<result[1];cnt++){
            addrlist.push(result[2+cnt]);
          }
          resolve(addrlist);
        }else{
          console.error("I2CPort.detect() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  _slaveClosed(ev){
    console.log("I2CPort._slaveClosed() portNumer="+ev.portNumber+" address="+ev.address);
    // experimental。そもそも slavedeviceのcloseを考慮する必要があるのか?
    // closeだけでなくdevice側のonready も検出できないと close後の openのタイミングが
    // ないのでは? という問題はある。
    // 一旦、現在はcloseだけ実装。
    // 
    // 呼びだし元インスタンスを消すのを防ぐためコンテキストを分ける
    if(this.onclose != null){
      this.onclose(ev);
    }
    this.dispatchEvent(ev);
    const address = ev.address;
    setTimeout((address)=>{
      console.log("I2CPort._slaveClosed() delete i2cSlaveDevice instance. addr="+address);
      this.i2cDevices[address];
    },3);
  }
}

class I2CSlaveDevice extends EventTarget{
  constructor(portNumber,address,conf,closeCallback){
    super();
    this.portNumber = portNumber;
    this.address = address;
    this.conf = conf;
    this.closeCallback = closeCallback; // I2CPort側のcallback。このインスタンスを時間差で消す
    this.isActive = false;
    this.onclose = null; // user callback on close
  }
  init(){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.init() port="+this.portNumber+" address="+this.address+" device="+this.conf.name);
      let data = [this.portNumber,this.address];
      let result = await plmidi.send(this.conf.name,F.I2C_INIT,data);
      if(result == null){
        console.error("I2CSlaveDevice.init() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          this.isActive = true;
          let port = (this.portNumber == 1)? 0x80&this.address : this.address; // i2c port が 0 or 1 の前提
          plmidi.registerAddrClose(this.conf.name,F.I2C_ONADDRCLOSE,this.portNumber,this.address,this._onClose.bind(this));
          resolve(this);
        }else{
          console.error("I2CSlaveDevice.init() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  _onClose(){
    if(DEB) console.log("I2CSlaveDevice._onClose() port="+this.portNumber+" address="+this.address+" device="+this.conf.name);
    this.isActive = false;
    const ev = new I2CCloseEvent("close",this.portNumber,this.address);
//    1度しか呼ばれないので、呼ぶ側で queue から登録消してしまえばよかろう。
//    plmidi.removeAddrClose(this.conf.name,I2C_ONADDRCLOSE,this.portNumber,this.address);
    if(this.onclose != null){
      this.onclose(ev);
    }
    this.dispatchEvent(ev);
    this.closeCallback(ev);
  }
  read8(register){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.read8() port="+this.portNumber+" address="+this.address+" register="+register+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.read8() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address,register];
      let result = await plmidi.send(this.conf.name,F.I2C_READ8,data);
      if(result == null){
        console.error("I2CSlaveDevice.read8() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] > 0){
          resolve(result[1]);
          return;
        }else{
          console.error("I2CSlaveDevice.read16() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  read16(register){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.read16() port="+this.portNumber+" address="+this.address+" register="+register+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.read16() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address,register];
      let result = await plmidi.send(this.conf.name,F.I2C_READ16,data);
      if(result == null){
        console.error("I2CSlaveDevice.read16() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] > 0){
          let wordData = (result[1] | (result[2] << 8));
          resolve(wordData);
          return;
        }else{
          console.error("I2CSlaveDevice.read16() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  write8(register,_data){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.write8() port="+this.portNumber+" address="+this.address+" register="+register+" data="+_data+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.write8() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address,register,_data];
      let result = await plmidi.send(this.conf.name,F.I2C_WRITE8,data);
      if(result == null){
        console.error("I2CSlaveDevice.write8() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          resolve(result[1]); // result[1] = 1 
          return;
        }else{
          console.error("I2CSlaveDevice.write8() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  write16(register,_data){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.write16() port="+this.portNumber+" address="+this.address+" register="+register+" data="+_data+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.write16() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let lsb = (_data & 0x00ff);
      let msb = (_data >> 8);
      let data = [this.portNumber,this.address,register,lsb,msb];
      let result = await plmidi.send(this.conf.name,F.I2C_WRITE16,data);
      if(result == null){
        console.error("I2CSlaveDevice.write16() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          resolve(result[1]); // result[1] = 2
          return;
        }else{
          console.error("I2CSlaveDevice.write16() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  readByte(){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.readByte() port="+this.portNumber+" address="+this.address+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.readByte() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address];
      let result = await plmidi.send(this.conf.name,F.I2C_READBYTE,data);
      if(result == null){
        console.error("I2CSlaveDevice.readByte() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] > 0){
          resolve(result[1]);
          return;
        }else{
          console.error("I2CSlaveDevice.readByte() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  readBytes(length){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.readBytes() port="+this.portNumber+" address="+this.address+" length="+length+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.readBytes() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address,length];
      let result = await plmidi.send(this.conf.name,F.I2C_READBYTES,data);
      if(result == null){
        console.error("I2CSlaveDevice.readBytes() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if((result[0] > 0)&&(result[0] == length)){
          result.shift();
          resolve(result);
          return;
        }else{
          console.error("I2CSlaveDevice.readBytes() error received. size="+result[0]); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  writeByte(_data){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.writeByte() port="+this.portNumber+" address="+this.address+" data="+_data+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.writeByte() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address,_data];
      let result = await plmidi.send(this.conf.name,F.I2C_WRITEBYTE,data);
      if(result == null){
        console.error("I2CSlaveDevice.writeByte() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] > 0){
          resolve(result[1]); // result[1] == 1
          return;
        }else{
          console.error("I2CSlaveDevice.readByte() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  writeBytes(_data){
    return new Promise(async (resolve)=>{
      if(DEB) console.log("I2CSlaveDevice.writeBytes() port="+this.portNumber+" address="+this.address+" data="+_data+" device="+this.conf.name);
      if(!this.isActive){
        console.error("I2CSlaveDevice.writeBytes() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber,this.address,_data.length];
      for(let cnt=0;cnt<_data.length;cnt++){
        data.push(_data[cnt]);
      }
      let result = await plmidi.send(this.conf.name,F.I2C_WRITEBYTES,data);
      if(result == null){
        console.error("I2CSlaveDevice.writeBytes() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if((result[0] > 0)&&(result[0]==_data.length)){
          resolve(result[1]); // result[1] == writed bytes
          return;
        }else{
          console.error("I2CSlaveDevice.writeBytes() error received. res="+result[0]); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
}

class I2CCloseEvent extends Event{
  constructor(type,portNumber,address){
    super(type);
    this.portNumber = portNumber;
    this.address = address;
  }
}

export default I2CAccess;