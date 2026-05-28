// i2c.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// based on https://github.com/tadfmac/chirimen-raspi3/blob/master/gc/polyfill/polyfill.js
//
// Version:
// - 2025.06.05 moved from pio.mjs
//

import devList from "./supportdevices.mjs";
import F from "./protocol-const.mjs";

const c = devList.getConst();

const DEB = false;

class I2CAccess {
  constructor() {
    if (DEB) console.log("I2CAccess.constructor()");
    this.config = null;
    this.ports = new Map();
    this.isActive = false;
  }
  init(conf) {
    if (DEB) console.log("I2CAccess.init()");
    if (DEB) console.dir(conf);
    this.config = conf;
    this.isActive = true;
    let ports = conf.config.i2cPorts;
    for (let cnt = 0; cnt < ports.length; cnt++) {
      let port = new I2CPort(ports[cnt], conf);
      this.ports.set(ports[cnt], port);
    }
  }
  _suspend() {
    if (DEB) console.log("I2CAccess._suspend()");
    this.isActive = false;
    this.ports.forEach((port) => {
      port._suspend();
    });
    this.config.pipeline.clearAddrCloseQueue(this.config.name);
  }
  _resume() {
    if (DEB) console.log("I2CAccess._resume()");
    this.isActive = true;
    this.ports.forEach((port) => {
      port._resume();
    });
  }
}

class I2CPort extends EventTarget {
  constructor(portNumber, conf) {
    super();
    if (DEB) console.log("I2CPort.constructor() port=" + portNumber);
    if (DEB) console.dir(conf);
    this.portNumber = portNumber;
    this.conf = conf;
    this.isActive = true;
    this.i2cDevices = {};
    this.onclose = null;
  }
  _suspend() {
    if (DEB) console.log("I2CPort._suspend() port=" + this.portNumber);
    this.isActive = false;
    // I2CAccess._suspend() handles clearing all addrClose callbacks on suspend, so skip it here
    // Currently there is no spec to close individual ports (buses). (Once opened, stays open until device power-off)
    //    for(let dev in this.i2cDevices){
    //      dev._suspend();
    //    }
    this.i2cDevices = {};
  }
  _resume() {
    if (DEB) console.log("I2CPort._resume() port=" + this.portNumber);
    this.isActive = true;
  }
  async open(_address) {
    let address = "" + _address;
    this.i2cDevices[address] = new I2CSlaveDevice(this.portNumber, address, this.conf, this._slaveClosed.bind(this));
    return await this.i2cDevices[address].init();
  }
  detect() {
    return new Promise(async (resolve, reject) => {
      if (DEB) console.log("I2CPort.detect()");
      if (!this.isActive) {
        console.error("I2CPort.detect() error! : Device is suspended!");
        resolve(null);
        return;
      }
      if (DEB) console.log("I2CPort.detect() port=" + this.portNumber + " device=" + this.conf.name);
      let data = [this.portNumber];
      let result = await this.conf.pipeline.send(this.conf.name, F.I2C_PORTSCAN, data);
      if (result == null) {
        console.error("I2CPort.detect() error! : pipeline.send() error");
        resolve(null);
        return;
      } else {
        if (result[0] == 1) {
          if (DEB) console.log("result=" + result[1]);
          let addrlist = [];
          for (let cnt = 0; cnt < result[1]; cnt++) {
            addrlist.push(result[2 + cnt]);
          }
          resolve(addrlist);
        } else {
          console.error("I2CPort.detect() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  _slaveClosed(ev) {
    console.log("I2CPort._slaveClosed() portNumer=" + ev.portNumber + " address=" + ev.address);
    // experimental. Is it even necessary to handle slave device close?
    // Unless onready on the device side can also be detected, there would be no timing
    // for open after close — that is a known issue.
    // For now, only close is implemented.
    //
    // separate context to prevent deleting the calling instance
    if (this.onclose != null) {
      this.onclose(ev);
    }
    this.dispatchEvent(ev);
    const address = ev.address;
    setTimeout((address) => {
      console.log("I2CPort._slaveClosed() delete i2cSlaveDevice instance. addr=" + address);
      delete this.i2cDevices[address];
    }, 3);
  }
}

class I2CSlaveDevice extends EventTarget {
  constructor(portNumber, address, conf, closeCallback) {
    super();
    this.portNumber = portNumber;
    this.address = address;
    this.conf = conf;
    this.closeCallback = closeCallback; // callback on the I2CPort side. Deletes this instance with a delay
    this.isActive = false;
    this.onclose = null; // user callback on close
    this._reiniting = false;
  }
  init() {
    return new Promise(async (resolve) => {
      if (DEB) console.log("I2CSlaveDevice.init() port=" + this.portNumber + " address=" + this.address + " device=" + this.conf.name);
      let data = [this.portNumber, this.address];
      let result = await this.conf.pipeline.send(this.conf.name, F.I2C_INIT, data);
      if (result == null) {
        console.error("I2CSlaveDevice.init() error! : pipeline.send() error");
        resolve(null);
        return;
      } else {
        if (result[0] == 1) {
          this.isActive = true;
          let port = this.portNumber == 1 ? 0x80 & this.address : this.address; // assumes i2c port is 0 or 1
          this.conf.pipeline.registerAddrClose(this.conf.name, F.I2C_ONADDRCLOSE, this.portNumber, this.address, this._onClose.bind(this));
          resolve(this);
        } else {
          console.error("I2CSlaveDevice.init() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  _onClose() {
    if (DEB) console.log("I2CSlaveDevice._onClose() port=" + this.portNumber + " address=" + this.address + " device=" + this.conf.name);
    this.isActive = false;
    const ev = new I2CCloseEvent("close", this.portNumber, this.address);
    //    Since this is only called once, it should be fine to remove the registration from the queue on the caller side.
    //    plmidi.removeAddrClose(this.conf.name,I2C_ONADDRCLOSE,this.portNumber,this.address);
    if (this.onclose != null) {
      this.onclose(ev);
    }
    this.dispatchEvent(ev);
    this.closeCallback(ev);
    // automatically re-initialize when firmware closes the I2C address (e.g. on USB reconnect)
    this._autoReinit();
  }
  async _autoReinit() {
    if (this._reiniting) return;
    this._reiniting = true;
    if (DEB) console.log("I2CSlaveDevice._autoReinit() start port=" + this.portNumber + " address=" + this.address);
    for (let i = 0; i < 5; i++) {
      if (this.isActive) break;
      if (DEB) console.log("I2CSlaveDevice._autoReinit() attempt=" + i);
      let result = await this.init();
      if (result != null) break;
      if (DEB) console.log("I2CSlaveDevice._autoReinit() failed attempt=" + i + " retry after 500ms");
      await new Promise((r) => setTimeout(r, 500));
    }
    if (DEB) console.log("I2CSlaveDevice._autoReinit() done isActive=" + this.isActive);
    this._reiniting = false;
  }
  read8(register) {
    return new Promise(async (resolve) => {
      if (DEB) console.log("I2CSlaveDevice.read8() port=" + this.portNumber + " address=" + this.address + " register=" + register + " device=" + this.conf.name);
      if (!this.isActive) {
        console.error("I2CSlaveDevice.read8() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber, this.address, register];
      let result = await this.conf.pipeline.send(this.conf.name, F.I2C_READ8, data);
      if (result == null) {
        console.error("I2CSlaveDevice.read8() error! : pipeline.send() error");
        resolve(null);
        return;
      } else {
        if (result[0] > 0) {
          if (DEB) console.log("I2CSlaveDevice.read8() res[0]=" + result[0] + " res[1]=" + result[1]);
          resolve(result[1]);
          return;
        } else {
          console.error("I2CSlaveDevice.read16() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  read16(register) {
    return new Promise(async (resolve) => {
      if (DEB) console.log("I2CSlaveDevice.read16() port=" + this.portNumber + " address=" + this.address + " register=" + register + " device=" + this.conf.name);
      if (!this.isActive) {
        console.error("I2CSlaveDevice.read16() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber, this.address, register];
      let result = await this.conf.pipeline.send(this.conf.name, F.I2C_READ16, data);
      if (result == null) {
        console.error("I2CSlaveDevice.read16() error! : pipeline.send() error");
        resolve(null);
        return;
      } else {
        if (result[0] > 0) {
          if (DEB) console.log("I2CSlaveDevice.read16() res[0]=" + result[0] + " res[1]=" + result[1] + "res[2]=" + result[2]);
          let wordData = result[1] | (result[2] << 8);
          resolve(wordData);
          return;
        } else {
          console.error("I2CSlaveDevice.read16() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  async write8(register, _data) {
    if (DEB) console.log("I2CSlaveDevice.write8() port=" + this.portNumber + " address=" + this.address + " register=" + register + " data=" + _data + " device=" + this.conf.name);
    if (!this.isActive) {
      console.error("I2CSlaveDevice.write8() error! : Device is suspended!");
      return null;
    }
    this.conf.pipeline.sendFire(this.conf.name, F.I2C_WRITE8, [this.portNumber, this.address, register, _data]);
    return true;
  }
  async write16(register, _data) {
    if (DEB) console.log("I2CSlaveDevice.write16() port=" + this.portNumber + " address=" + this.address + " register=" + register + " data=" + _data + " device=" + this.conf.name);
    if (!this.isActive) {
      console.error("I2CSlaveDevice.write16() error! : Device is suspended!");
      return null;
    }
    let lsb = _data & 0x00ff;
    let msb = _data >> 8;
    this.conf.pipeline.sendFire(this.conf.name, F.I2C_WRITE16, [this.portNumber, this.address, register, lsb, msb]);
    return true;
  }
  readByte() {
    return new Promise(async (resolve) => {
      if (DEB) console.log("I2CSlaveDevice.readByte() port=" + this.portNumber + " address=" + this.address + " device=" + this.conf.name);
      if (!this.isActive) {
        console.error("I2CSlaveDevice.readByte() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber, this.address];
      let result = await this.conf.pipeline.send(this.conf.name, F.I2C_READBYTE, data);
      if (result == null) {
        console.error("I2CSlaveDevice.readByte() error! : pipeline.send() error");
        resolve(null);
        return;
      } else {
        if (result[0] > 0) {
          if (DEB) console.log("I2CSlaveDevice.readByte() res[0]=" + result[0] + " res[1]=" + result[1]);
          resolve(result[1]);
          return;
        } else {
          console.error("I2CSlaveDevice.readByte() error received."); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  readBytes(length) {
    return new Promise(async (resolve) => {
      if (DEB) console.log("I2CSlaveDevice.readBytes() port=" + this.portNumber + " address=" + this.address + " length=" + length + " device=" + this.conf.name);
      if (!this.isActive) {
        console.error("I2CSlaveDevice.readBytes() error! : Device is suspended!");
        resolve(null);
        return;
      }
      let data = [this.portNumber, this.address, length];
      let result = await this.conf.pipeline.send(this.conf.name, F.I2C_READBYTES, data);
      if (result == null) {
        console.error("I2CSlaveDevice.readBytes() error! : pipeline.send() error");
        resolve(null);
        return;
      } else {
        if (result[0] == 1 && result[1] == length) {
          if (DEB) console.log("I2CSlaveDevice.readBytes() res[0]=" + result[0] + " length=" + result[1]);
          result.shift();
          result.shift();
          resolve(result);
          return;
        } else {
          console.error("I2CSlaveDevice.readBytes() error received. res=" + result[0]); // [0]:status [1]:result
          resolve(null);
          return;
        }
      }
    });
  }
  async writeByte(_data) {
    if (DEB) console.log("I2CSlaveDevice.writeByte() port=" + this.portNumber + " address=" + this.address + " data=" + _data + " device=" + this.conf.name);
    if (!this.isActive) {
      console.error("I2CSlaveDevice.writeByte() error! : Device is suspended!");
      return null;
    }
    this.conf.pipeline.sendFire(this.conf.name, F.I2C_WRITEBYTE, [this.portNumber, this.address, _data]);
    return true;
  }
  async writeBytes(_data) {
    if (DEB) console.log("I2CSlaveDevice.writeBytes() port=" + this.portNumber + " address=" + this.address + " data=" + _data + " device=" + this.conf.name);
    if (!this.isActive) {
      console.error("I2CSlaveDevice.writeBytes() error! : Device is suspended!");
      return null;
    }
    let data = [this.portNumber, this.address, _data.length];
    for (let cnt = 0; cnt < _data.length; cnt++) {
      data.push(_data[cnt]);
    }
    this.conf.pipeline.sendFire(this.conf.name, F.I2C_WRITEBYTES, data);
    return _data.length;
  }
}

class I2CCloseEvent extends Event {
  constructor(type, portNumber, address) {
    super(type);
    this.portNumber = portNumber;
    this.address = address;
  }
}

export default I2CAccess;
