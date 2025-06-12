// gpio.mjs (web-pio Driver)
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

class GPIOAccess extends EventTarget{
  constructor(){
    if(DEB) console.log("GPIOAccess.constructor()");
    super();
    this.ports = new Map();
    this.onchange = null;
    this.config = null;
    this.isActive = false;
  }
  init(conf){
    if(DEB) console.log("GPIOAccess.init()");
    if(DEB) console.dir(conf);
    this.config = conf;
    this.isActive = true;
    let ports = conf.config.gpioPorts;
    for(let cnt=0;cnt<ports.length;cnt++){
      let port = new GPIOPort(ports[cnt],conf,this._onChangeEvent.bind(this));
      port.pinname = conf.config.pinNames[cnt];
      this.ports.set(ports[cnt],port);
    }
  }
  _suspend(){
    if(DEB) console.log("GPIOAccess._suspend()");
    this.isActive = false;
    this.ports.forEach((port)=>{
      port._suspend();
    });
    plmidi.clearEventQueue(this.config.name);
  }
  _resume(){
    if(DEB) console.log("GPIOAccess._resume()");
    this.isActive = true;
    this.ports.forEach((port)=>{
      port._resume();
    });
  }
  unexportAll(){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOAccess.unexportAll()");
      if(!this.isActive){
        console.error("GPIOAccess.unexportAll() error! device is suspended.");
        resolve(null);
        return;
      }
      let device = this.config.name;
      let result = await plmidi.send(device,GPIO_UNEXPORTALL,[]);
      if(result == null){
        console.error("GPIOAccess.unexportAll() error! plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          this.ports.forEach((port)=>{
            port.exported = false;
            port.direction = null;
          });
          plmidi.clearEventQueue(device);
          resolve(this);
          return;
        }else{
          console.error("GPIOAccess.unexportAll() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  _onChangeEvent(ev){
    if(DEB) console.log("GPIOAccess._onChangeEvent() portNumber="+ev.port.portNumber+"+onOff="+ev.value);
    if(this.onchange != null){
      this.onchange(ev);
    }
    this.dispatchEvent(ev);
  }
}

class GPIOPort extends EventTarget{
  constructor(portNumber, conf, onchangeAccess){
    super();
    if(DEB) console.log("GPIOPort.constructor() port="+portNumber);
    if(DEB) console.dir(conf);
    this.conf = conf;
    this.portNumber = portNumber;
    this.pinname = null;
    this.direction = null;
    this.exported = false;
    this.value = null;
    this.onchange = null;
    this.isActive = true;
    this.onchangeAccess = onchangeAccess;
  }
  _suspend(){
    if(DEB) console.log("GPIOPort._suspend()");
    this.isActive = false;
    this.exported = false;
    this.direction = null;
  }
  _resume(){
    if(DEB) console.log("GPIOPort._resume()");
    this.isActive = true;
  }
  export(_direction){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOPort.export() direction="+_direction);
      if(!this.isActive){
        console.error("GPIOPort.export() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let direction = _direction.toLowerCase();
      let dir = -1;
      let dirName = null;
      switch(direction){
        case "out"          : dir = F.DIR_OUT; dirName = "out"; break;
        case "output"       : dir = F.DIR_OUT; dirName = "out"; break;
        case "in"           : dir = F.DIR_IN; dirName = "in"; break; // = in-pulldown
        case "input"        : dir = F.DIR_IN; dirName = "in"; break; // = in-pulldown
        case "in-pullup"    : dir = F.DIR_INPULLUP; dirName = "in-pullup"; break;
        case "input-pullup" : dir = F.DIR_INPULLUP; dirName = "in-pullup"; break;
        case "pwm"          : dir = F.DIR_PWM; dirName = "pwm"; break; 
        case "adc"          : dir = F.DIR_ADC; dirName = "adc"; break; 
        case "analog"       : dir = F.DIR_ADC; dirName = "adc"; break; 
        default: break;
      }
      if((dir == F.DIR_OUT)||(dir == F.DIR_PWM)||(dir == F.DIR_ADC)){
        if(dir == F.DIR_ADC){
          if(this.conf.checkAdcPort(this.portNumber) == null){
            console.error("GPIOPort.export() invalid ADC port!");
            resolve(null);
            return;
          }
        }
        plmidi.removeEvent(this.conf.name,F.GPIO_ONCHANGE,this.portNumber);
      }else if((dir == F.DIR_IN)||(dir == F.DIR_INPULLUP)){
        plmidi.registerEvent(this.conf.name,F.GPIO_ONCHANGE,this.portNumber,this._onChangeEvent.bind(this));
      }else{
        console.error("GPIOPort.export() direction not valid ="+direction);
        resolve(null);
        return;
      }
      if(DEB) console.log("GPIOPort.export() port="+this.portNumber+" direction="+direction+" device="+this.conf.name);
      let data = [this.portNumber,dir];
      let result = await plmidi.send(this.conf.name,F.GPIO_EXPORT,data);
      if(result == null){
        console.error("GPIOPort.export() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          this.exported = true;
          this.direction = dirName;
          resolve(this); // [0]:status [1]:result
          return;
        }else{
          console.error("GPIOPort.export() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  read(){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOPort.read()");
      if(!this.isActive){
        console.error("GPIOPort.read() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if((!this.exported)||(this.direction == "out")||(this.direction == "pwm")||(this.direction == "adc")){
        console.error("GPIOPort.read() error! : export mode failed!");
        resolve(null);
        return;
      }
      if(DEB) console.log("GPIOPort.read() port="+this.portNumber+" device="+this.conf.name);
      let data = [this.portNumber];
      let result = await plmidi.send(this.conf.name,F.GPIO_READ,data);
      if(result == null){
        console.error("GPIOPort.read() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          if(DEB) console.log("result="+result[1]);
          resolve(result[1]); // [0]:status [1]:result
        }else{
          console.error("GPIOPort.read() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  write(value){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOPort.write() value="+value);
      if(!this.isActive){
        console.error("GPIOPort.write() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if((!this.exported)||(this.direction == "in")||(this.direction == "in-pullup")){
        console.error("GPIOPort.write() error! : export mode failed!");
        resolve(null);
        return;
      }
      if(DEB) console.log("GPIOPort.write() port="+this.portNumber+" value="+value+" device="+this.conf.name);
      let data = [this.portNumber,value];
      let result = await plmidi.send(this.conf.name,F.GPIO_WRITE,data);
      if(result == null){
        console.error("GPIOPort.write()! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          resolve(this);
          return;
        }else{
          console.error("GPIOPort.write() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  analogRead(){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOPort.analogRead()");
      if(!this.isActive){
        console.error("GPIOPort.analogRead() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if((!this.exported)||(this.direction != "adc")){
        console.error("GPIOPort.analogRead() error! : export mode failed!");
        resolve(null);
        return;
      }
      if(DEB) console.log("GPIOPort.analogRead() port="+this.portNumber+" device="+this.conf.name);
      let data = [this.portNumber];
      let result = await plmidi.send(this.conf.name,F.GPIO_ANALOGREAD,data);
      if(result == null){
        console.error("GPIOPort.analogRead() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          let data = ((result[1] & 0xFF)|(result[2]<<8)); // result[1]:LSB , result[2]:MSB
          resolve(data);
          return;
        }else{
          console.error("GPIOPort.analogRead() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  unexport(){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOPort.unexport()");
      if(!this.isActive){
        console.error("GPIOPort.unexport() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if(DEB) console.log("GPIOPort.unexport() port="+this.portNumber+" device="+this.conf.name);
      let data = [this.portNumber];
      let result = await plmidi.send(this.conf.name,F.GPIO_UNEXPORT,data);
      if(result == null){
        console.error("GPIOPort.unexport() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          plmidi.removeEvent(this.conf.name,F.GPIO_ONCHANGE,this.portNumber);
          resolve(this);
          return;
        }else{
          console.error("GPIOPort.unexport() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  setPWM(_duty){
    return new Promise(async (resolve,reject)=>{
      if(DEB) console.log("GPIOPort.setPWM() duty="+_duty);
      if(!this.isActive){
        console.error("GPIOPort.setPWM() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if((!this.exported)||(this.direction != "pwm")){
        console.error("GPIOPort.setPWM() error! : export mode failed!");
        resolve(null);
        return;
      }
      let duty;
      if(_duty < 0){
        duty = 0;
      }else if(_duty > 255){
        duty = 255;
      }else{
        duty = _duty;
      }
      if(DEB) console.log("GPIOPort.setPWM() port="+this.portNumber+" duty="+duty+" device="+this.conf.name);
      let data = [this.portNumber,duty];
      let result = await plmidi.send(this.conf.name,F.GPIO_SETPWM,data);
      if(result == null){
        console.error("GPIOPort.setPWM() error! : plmidi.send() error");
        resolve(null);
        return;
      }else{
        if(result[0] == 1){
          resolve(this);
          return;
        }else{
          console.error("GPIOPort.setPWM() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  _onChangeEvent(onOff){
    if(DEB) console.log("GPIOPort._onChangeEvent() portNumber="+this.portNumber+"+onOff="+onOff);
    const ev = new GPIOChangeEvent("change",this, onOff);
    if(this.onchangeAccess != null){
      this.onchangeAccess(ev);
    }
    if(this.onchange != null){
      this.onchange(ev);
    }
    this.dispatchEvent(ev);
  }
}

class GPIOChangeEvent extends Event{
  constructor(type,port,value){
    super(type);
    this.port = port;
    this.value = value;
  }
}

export default GPIOAccess;