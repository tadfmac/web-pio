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

const DEB = false;

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
    this.conf.pipeline = plmidi;
    this.gpioAccess = new GPIOAccess();
    this.gpioAccess.init(this.conf);
    this.i2cAccess = new I2CAccess();
    this.i2cAccess.init(this.conf);
    return this;
  }
  activate() {
    return new Promise(async (resolve, reject) => {
      if (DEB) console.log("MIDIDevice.activate() " + this.name);
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
    this.emuDevices = null;
    // onFoundFunc に渡した devices 配列の参照。後から接続されたデバイスはここに追加して
    // onFoundFunc を再呼び出しせずに済むようにする。デバイスが一つでも leave したらリセット。
    this._currentDevices = null;
  }
  async init(options) {
    // options = {server:url, mode:"emulator"|"bridge"}
    // mode 未指定: MIDI + bridge 自動検出（ブラウザのみ）
    // Node.js 環境では mode に関わらず MIDI のみ有効
    if (DEB) console.log("Pio.init()");
    if (DEB) console.dir(options);

    const mode = options && options.mode;
    const isNode = typeof window === "undefined";

    // bridge モード（ブラウザのみ）: MIDI 初期化なし、postMessage ホストとして動作
    if (mode === "bridge") {
      if (isNode) {
        console.warn("Pio.init() bridge mode is not supported in Node.js. Use MIDI only.");
        // bridge モードは Node.js 非対応のため null を返す
        return null;
      }
      try {
        const { default: emuHost } = await import("./emulator-host.mjs");
        await emuHost.init();
        if (DEB) console.log("Pio.init() bridge host mode enabled");
      } catch (e) {
        console.error("Pio.init() bridge host init error = " + e);
        return null;
      }
      return this;
    }

    // MIDI 初期化（emulator / 無指定 / Node.js モード共通）
    if (mode === "emulator" && isNode) {
      console.warn("Pio.init() emulator mode is not supported in Node.js. Falling back to MIDI only.");
    }
    try {
      this.midi = await this.midi.init({ sysex: true });
    } catch (e) {
      console.log("Pio.init() error = " + e);
      return null;
    }
    // pomidi.init() が内部でエラーを catch して null を返す場合への対応
    if (!this.midi) {
      if (DEB) console.log("Pio.init() MIDI unavailable (null returned)");
      this.midi = null;
    }
    if (options && options.server != undefined) {
      this.server = options.server;
    }

    // emulator モード（ブラウザのみ）
    if (mode === "emulator" && !isNode) {
      try {
        const { default: emuDev } = await import("./emulator-devices.mjs");
        this.emuDevices = emuDev;
        this.emuDevices.setOnChange(this._onChangeEmuDevice.bind(this));
        if (DEB) console.log("Pio.init() emulator mode enabled");
      } catch (e) {
        console.error("Pio.init() emulator init error = " + e);
        return null;
      }
    }

    if (this.midi) {
      this.midi.setOnChange(this._onChangeMIDI.bind(this));
      plmidi.init(this.midi);
    }

    // 無指定モード（ブラウザのみ）: bridge iframe の自動検出
    if (!mode && !isNode) {
      try {
        const bridgeWin = await this._detectBridge();
        if (bridgeWin) {
          const { default: bridgeDev } = await import("./emulator-bridge-devices.mjs");
          bridgeDev.init(bridgeWin);
          this.emuDevices = bridgeDev;
          this.emuDevices.setOnChange(this._onChangeEmuDevice.bind(this));
          if (DEB) console.log("Pio.init() bridge client mode enabled");
        }
      } catch (e) {
        if (DEB) console.log("Pio.init() bridge detection skipped: " + e);
      }
    }

    return this;
  }

  async _detectBridge() {
    if (DEB) console.log("Pio._detectBridge()");
    if (typeof window === "undefined") return null;
    if (window.frames.length === 0) return null;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", handler);
        resolve(null);
      }, 500);

      const handler = (event) => {
        const msg = event.data;
        if (msg && msg.type === "pio-bridge" && msg.cmd === "READY") {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          event.source.postMessage({ type: "pio-bridge", cmd: "HANDSHAKE_ACK" }, "*");
          resolve(event.source);
        }
      };
      window.addEventListener("message", handler);

      // 既存フレームに PING を送る（iframe が先に初期化済みの場合に対応）
      for (let i = 0; i < window.frames.length; i++) {
        try {
          window.frames[i].postMessage({ type: "pio-bridge", cmd: "PING" }, "*");
        } catch (e) {}
      }
    });
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
    // デバイスが離脱したら _currentDevices をリセット。次の接続で onFoundFunc が再呼び出しされる
    this._currentDevices = null;
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
      // 今回 found されたデバイスをフィルタして newDevices に積む
      let newDevices = [];
      if (Object.keys(this.targetPrefixes).length > 0) {
        for (let cnt = 0; cnt < foundDevices.length; cnt++) {
          for (let prefix in this.targetPrefixes) {
            let name = foundDevices[cnt].split("-")[0];
            if (name == prefix) {
              newDevices.push(this.devices[foundDevices[cnt]]);
              break;
            }
          }
        }
      } else {
        for (let cnt = 0; cnt < foundDevices.length; cnt++) {
          newDevices.push(this.devices[foundDevices[cnt]]);
        }
      }
      if (newDevices.length === 0) return;

      if (this._currentDevices === null) {
        // 初回: 配列を作って onFoundFunc を呼ぶ
        this._currentDevices = newDevices;
        this.onFoundFunc(this._currentDevices);
      } else {
        // 既に onFoundFunc 呼び済み: 同じ配列にデバイスを追加するだけ
        // ループ内の devices[0] は変わらず最初のデバイスを指し続ける
        for (const dev of newDevices) {
          if (!this._currentDevices.includes(dev)) {
            this._currentDevices.push(dev);
          }
        }
      }
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
      if (DEB) console.log("device.name=" + devices[cnt].name);
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
      if (DEB) console.log("device=" + device);
      // エミュレータデバイスは MIDI デバイスリストに存在しないため leave 検出対象外
      if (this.devices[device].type === c.DEVICE_TYPE_EMU) continue;
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
    if (DEB) console.dir(this.devices);
  }
  async _onChangeEmuDevice() {
    if (DEB) console.log("Pio._onChangeEmuDevice()");
    if (!this.emuDevices) return;

    const emuList = this.emuDevices.getDeviceList();
    const leaveDevices = [];
    const foundDevices = [];

    // emuList に存在するデバイスを found として処理
    for (const emuDev of emuList) {
      if (!(emuDev.name in this.devices)) {
        // 新規デバイス
        this.devices[emuDev.name] = emuDev;
        foundDevices.push(emuDev.name);
      } else {
        // 既存エントリを最新の EmulatorDevice インスタンスで更新
        this.devices[emuDev.name] = emuDev;
        if (!emuDev.isActive) {
          foundDevices.push(emuDev.name);
        }
      }
    }

    // Pio.devices に残る EMU デバイスで emuList にないものを leave として処理
    // MIDIパスと対称に、ここで suspend() を呼んでから leaveDevices に積む
    for (const name in this.devices) {
      if (this.devices[name].type === c.DEVICE_TYPE_EMU) {
        const stillExists = emuList.some((d) => d.name === name);
        if (!stillExists && this.devices[name].isActive) {
          this.devices[name].suspend();
          leaveDevices.push(name);
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
    if (DEB) console.dir(this.devices);
  }
  _onChangeIP() {
    // そのうち書く
  }
  async wait(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
}

export default Pio;
