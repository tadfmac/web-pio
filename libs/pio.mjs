// pio.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// based on https://github.com/tadfmac/chirimen-raspi3/blob/master/gc/polyfill/polyfill.js
//
// Version:
// - 2025.05.22 start writing (only MIDI Devices)
// - 2025.06.10 start writing for I2C functions

import Midi from "./pomidi.mjs";
import devList from "./supportdevices.mjs";
import DevConf from "./devconfig.mjs";
import plmidi from "./pipeline-midi.mjs";
import F from "./protocol-const.mjs";
import GPIOAccess from "./gpio.mjs";
import I2CAccess from "./i2c.mjs";

const c = devList.getConst();

const DEB = true;

class MIDIDevice {
  constructor() {
    if (DEB) console.log("MIDIDevice.constructor()");
    this.type = c.DEVICE_TYPE_MIDI;
    this.isActive = false;
    this.isWaitInit = false;
    this.conf = null;
    this.gpioAccess = null;
    this.i2cAccess = null;
    this.funcAccess = null;
    this.name = null;
  }
  init(name) {
    if (DEB) console.log("MIDIDevice.init() name=" + name);
    this.name = name;
    const conf = new DevConf();
    this.conf = conf.init(name);
    this.gpioAccess = new GPIOAccess();
    this.gpioAccess.init(this.conf);
    this.i2cAccess = new I2CAccess();
    this.i2cAccess.init(this.conf);
    return this;
  }
  activate() {
    return new Promise(async (resolve, reject) => {
      if (DEB) console.log("MIDIDevice.activate() "+this.name);
      if (this.isActive) {
        if (DEB) console.log("already activated. abort.");
        resolve(this);
        return;
      }

      this.isActive = true;
      if (this.gpioAccess) {
        this.gpioAccess._resume();
      }
      if (this.i2cAccess) {
        this.i2cAccess._resume();
      }
      resolve(this);
/*
      this.isWaitInit = true;
      let retryCnt = 0;
      while (this.isWaitInit) {
        let result = await plmidi.send(this.name, F.DEVICE_ACTIVATE, []);
        if (result == null) {
          if (DEB) console.log("MIDIDevice.activate() wait responce. "+this.name);
        } else {
          if (result[0] == 1) {
            this.isWaitInit = false;
            this.isActive = true;
            if (this.gpioAccess) {
              this.gpioAccess._resume();
            }
            if (this.i2cAccess) {
              this.i2cAccess._resume();
            }
            resolve(this);
            return;
          } else {
            this.isWaitInit = false;
            console.error("MIDIDevice.activate() error! handle NG "+this.name);
            resolve(null);
            return;
          }
        }
        await this.wait(500);
        retryCnt++;
        if (retryCnt >= 5) {
          this.isWaitInit = false;
          console.error("MIDIDevice.activate() error! no responce. "+this.name);
          resolve(null);
          return;
        }
      }
*/
    });
  }
  async resume() {
    if (DEB) console.log("MIDIDevice.resume()");
    return await this.activate();
  }
  suspend() {
    if (DEB) console.log("MIDIDevice.suspend()");
    this.isActive = false;
    plmidi.clear(this.name);
    if (this.gpioAccess) {
      this.gpioAccess._suspend();
    }
    if (this.i2cAccess) {
      this.i2cAccess._suspend();
    }
  }
  wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

class Pio {
  constructor() {
    if (DEB) console.log("Pio.constructor()");
    this.onChangeFunc = null;
    this.onFoundFunc = null;
    this.onLeaveFunc = null;
    this.midi = new Midi();
    this.server = null; // ToDo: for WifiDevice
    this.devices = {};
    this.onChangeEvent = null;
    this.targetPrefixes = {};
    this.devConf = new DevConf();
  }
  async init(options) {
    // options = {server:url}
    if (DEB) console.log("Pio.init()");
    if (DEB) console.dir(options);
    try {
      this.midi = await this.midi.init({ sysex: true });
    } catch (e) {
      console.log("Pio.init() error = " + e);
      return null;
    }
    if (options != undefined && options) {
      if (options.server != undefined) {
        this.server = options.server;
      }
    }
    this.midi.setOnChange(this._onChangeMIDI.bind(this));
    plmidi.init(this.midi);
    return this;
  }
  setOnChange(func) {
    if (DEB) console.log("Pio.setOnChange()");
    this.onChangeFunc = func;
  }
  setOnFound(func) {
    if (DEB) console.log("Pio.setOnFound()");
    this.onFoundFunc = func;
  }
  setOnLeave(func) {
    if (DEB) console.log("Pio.setOnLeave()");
    this.onLeaveFunc = func;
  }
  addTargetPrefix(prefix) {
    if (DEB) console.log("Pio.addTargetPrefix() prefix=" + prefix);
    this.targetPrefixes[prefix] = prefix;
  }
  removeTargetPrefix(prefix) {
    if (DEB) console.log("Pio.removeTargetPrefix() prefix=" + prefix);
    delete this.targetPrefixes[prefix];
  }
  getDevices() {
    if (DEB) console.log("Pio.getDevices()");
    return this._getActiveDeviceList();
  }
  getDevice(name) {
    if (DEB) console.log("Pio.getDevice() name=" + name);
    if (name in this.devices) {
      let device = this.devices[name];
      if (device.isActive) {
        return this.devices[name];
      }
    } else if (name == undefined) {
      let list = this._getActiveDeviceList();
      if (list.length > 0) {
        return list[0];
      }
    }
    return null;
  }
  _expireOnChangeEvent() {
    if (DEB) console.log("Pio._expireOnChangeEvent()");
    if (this.onChangeFunc != null) {
      let list = this._getActiveDeviceList();
      this.onChangeFunc(list);
    }
  }
  _expireOnLeaveEvent(leaveDevices) {
    if (DEB) console.log("Pio._expireOnLeaveEvent()");
    if (this.onLeaveFunc != null) {
      let devices = [];
      if (Object.keys(this.targetPrefixes).length > 0) {
        for (let cnt = 0; cnt < leaveDevices.length; cnt++) {
          for (let prefix in this.targetPrefixes) {
            let name = leaveDevices[cnt].split("-")[0];
            if (name == prefix) {
              devices.push(this.devices[leaveDevices[cnt]]);
              break;
            }
          }
        }
      } else {
        for (let cnt = 0; cnt < leaveDevices.length; cnt++) {
          devices.push(this.devices[leaveDevices[cnt]]);
        }
      }
      this.onLeaveFunc(devices);
    }
  }
  /*
  _expireOnFoundEvent(foundDevices) {
    if (DEB) console.log("Pio._expireOnFoundEvent()");
    let res = [];
    for (let cnt = 0; cnt < foundDevices.length; cnt++) {
      try {
        let r = this.devices[foundDevices[cnt]].activate();
        res.push(r);
      } catch (e) {
        console.log("device [" + foundDevices[cnt] + "] activate error");
      }
    }
    Promise.allSettled(res).then((results) => {
      if (this.onFoundFunc != null) {
        let devices = [];
        if (Object.keys(this.targetPrefixes).length > 0) {
          for (let cnt = 0; cnt < foundDevices.length; cnt++) {
            for (let prefix in this.targetPrefixes) {
              let name = foundDevices[cnt].split("-")[0];
              if (name == prefix) {
                devices.push(this.devices[foundDevices[cnt]]);
                break;
              }
            }
          }
        } else {
          for (let cnt = 0; cnt < foundDevices.length; cnt++) {
            devices.push(this.devices[foundDevices[cnt]]);
          }
        }
        this.onFoundFunc(devices);
      }
      if (DEB) console.dir(results);
    });
  }
  */
  async _expireOnFoundEvent(foundDevices) {
    if (DEB) console.log("Pio._expireOnFoundEvent()");
    if (DEB) console.dir(foundDevices);
    for (let cnt = 0; cnt < foundDevices.length; cnt++) {
      try {
        await this.devices[foundDevices[cnt]].activate();
      } catch (e) {
        console.log("device [" + foundDevices[cnt] + "] activate error");
      }
    }

    if (this.onFoundFunc != null) {
      let devices = [];
      if (Object.keys(this.targetPrefixes).length > 0) {
        for (let cnt = 0; cnt < foundDevices.length; cnt++) {
          for (let prefix in this.targetPrefixes) {
            let name = foundDevices[cnt].split("-")[0];
            if (name == prefix) {
              devices.push(this.devices[foundDevices[cnt]]);
              break;
            }
          }
        }
      } else {
        for (let cnt = 0; cnt < foundDevices.length; cnt++) {
          devices.push(this.devices[foundDevices[cnt]]);
        }
      }
      this.onFoundFunc(devices);
    }
  }
  _getActiveDeviceList() {
    if (DEB) console.log("Pio._getActiveDeviceList()");
    let list = [];
    for (let device in this.devices) {
      if (this.devices[device].isActive) {
        list.push(this.devices[device]);
      }
    }
    return list;
  }
  async _onChangeMIDI(devices) {
    if (DEB) console.log("Pio._onChangeMIDI()");
    let isEvtExpire = false;
    let leaveDevices = [];
    let foundDevices = [];
    for (let cnt = 0; cnt < devices.length; cnt++) {
      if (DEB) console.log("device.name="+devices[cnt].name);
      let name = devices[cnt].name;
      let sp = devList.find(name);
      if (sp != null) {
        if (sp.type == c.DEVICE_TYPE_MIDI) {
          if (!(name in this.devices)) {
            if (DEB) console.log("new device found!");
            let device = new MIDIDevice();
            device = device.init(name);
            this.devices[name] = device;
            this.devices[name].isWaitInit = true;
            this.midi.addDevice(name);
            foundDevices.push(name);
          } else {
            if (DEB) console.log("existing device found!");
            if (!this.devices[name].isActive) {
              if (DEB) console.log("existing device to resume!");
              this.devices[name].isWaitInit = true;
              this.midi.addDevice(name);
              foundDevices.push(name);
            }
          }
        }
      }
    }
    for (let device in this.devices) {
      if (DEB) console.log("device="+device);
      let isActive = false;
      for (let cnt = 0; cnt < devices.length; cnt++) {
        if (device == devices[cnt].name) {
          if (DEB) console.log("activate");
          isActive = true;
          break;
        }
      }
      if (!isActive) {
        if (DEB) console.log("suspend");
        if (this.devices[device].isActive) {
          if (DEB) console.log("leave");
          this.devices[device].suspend();
          this.midi.removeDevice(device);
          leaveDevices.push(this.devices[device].name);
        }
      }
    }
    this._expireOnChangeEvent();
    if (leaveDevices.length > 0) {
      this._expireOnLeaveEvent(leaveDevices);
    }
    if (foundDevices.length > 0) {
      await this._expireOnFoundEvent(foundDevices);
    }
    if(DEB) console.dir(this.devices)
  }
  _onChangeIP() {
    // そのうち書く
  }
  async wait(time) {
    await this.midi.wait(time);
  }
}

export default Pio;
