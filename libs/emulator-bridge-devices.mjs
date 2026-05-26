// emulator-bridge-devices.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// bridge client 側のデバイス管理。
// emulator-devices.mjs と同一インターフェースを持ち、
// addDevice/removeDevice が bridge iframe に postMessage でデバイス登録を通知する。
//
// Version:
// - 2025.05.25 start writing

import pipelineBridge from "./pipeline-emu-bridge.mjs";
import devList from "./supportdevices.mjs";
import DevConf from "./devconfig.mjs";
import GPIOAccess from "./gpio.mjs";
import I2CAccess from "./i2c.mjs";

const c = devList.getConst();
const DEB = false;

// ---------------------------------------------------------------------------
// BridgeClientDevice — MIDIDevice / EmulatorDevice 相当の単一デバイス抽象
// ---------------------------------------------------------------------------

class BridgeClientDevice {
  constructor() {
    if (DEB) console.log("BridgeClientDevice.constructor()");
    this.type = c.DEVICE_TYPE_EMU;
    this.isActive = false;
    this.conf = null;
    this.gpioAccess = null;
    this.i2cAccess = null;
    this.name = null;
  }

  init(name) {
    if (DEB) console.log("BridgeClientDevice.init() name=" + name);
    this.name = name;
    const conf = new DevConf();
    this.conf = conf.init(name);
    if (!this.conf) {
      console.error("BridgeClientDevice.init() unsupported device name=" + name);
      return null;
    }
    // pipeline を bridge 用に設定
    this.conf.pipeline = pipelineBridge;
    this.gpioAccess = new GPIOAccess();
    this.gpioAccess.init(this.conf);
    this.i2cAccess = new I2CAccess();
    this.i2cAccess.init(this.conf);
    return this;
  }

  activate() {
    if (DEB) console.log("BridgeClientDevice.activate() " + this.name);
    if (this.isActive) return this;
    this.isActive = true;
    if (this.gpioAccess) this.gpioAccess._resume();
    if (this.i2cAccess) this.i2cAccess._resume();
    return this;
  }

  suspend() {
    if (DEB) console.log("BridgeClientDevice.suspend() " + this.name);
    this.isActive = false;
    pipelineBridge.clear(this.name);
    if (this.gpioAccess) this.gpioAccess._suspend();
    if (this.i2cAccess) this.i2cAccess._suspend();
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// BridgeClientDevices — singleton
// ---------------------------------------------------------------------------

class BridgeClientDevices {
  constructor() {
    if (DEB) console.log("BridgeClientDevices.constructor()");
    this.devices = {};
    this.onChangeFunc = null;
    this._targetWindow = null;
  }

  init(targetWindow) {
    if (DEB) console.log("BridgeClientDevices.init()");
    this._targetWindow = targetWindow;
    pipelineBridge.init(targetWindow);
  }

  setOnChange(func) {
    if (DEB) console.log("BridgeClientDevices.setOnChange()");
    this.onChangeFunc = func;
  }

  // デバイスを追加する。bridge 側に REGISTER_DEVICE を送り ACK を待つ。
  async addDevice(name) {
    if (DEB) console.log("BridgeClientDevices.addDevice() name=" + name);
    const prefix = name.split("-")[0];
    if (devList.find(prefix) === null) {
      console.error("BridgeClientDevices.addDevice() unsupported prefix=" + prefix + " (name=" + name + ")");
      return null;
    }
    if (name in this.devices) {
      console.error("BridgeClientDevices.addDevice() device already exists. name=" + name);
      return null;
    }

    // REGISTER_DEVICE を bridge に送り、デバイス固有の ACK を待つ
    const ackPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener("message", handler);
        console.error("BridgeClientDevices.addDevice() timeout. name=" + name);
        resolve(false);
      }, 5000);
      const handler = (event) => {
        const msg = event.data;
        if (msg && msg.type === "pio-bridge-device-ack" && msg.device === name) {
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          resolve(msg.success);
        }
      };
      window.addEventListener("message", handler);
    });

    this._targetWindow.postMessage({
      type: "pio-bridge",
      cmd: "REGISTER_DEVICE",
      device: name
    }, "*");

    const ok = await ackPromise;
    if (!ok) {
      console.error("BridgeClientDevices.addDevice() REGISTER_DEVICE failed. name=" + name);
      return null;
    }

    const device = new BridgeClientDevice();
    const result = device.init(name);
    if (!result) return null;

    this.devices[name] = device;

    if (this.onChangeFunc) {
      this.onChangeFunc();
    }

    return device;
  }

  // デバイスを削除する。bridge 側に REMOVE_DEVICE を送る。
  removeDevice(name) {
    if (DEB) console.log("BridgeClientDevices.removeDevice() name=" + name);
    if (!(name in this.devices)) {
      console.error("BridgeClientDevices.removeDevice() device not found. name=" + name);
      return;
    }

    this._targetWindow.postMessage({
      type: "pio-bridge",
      cmd: "REMOVE_DEVICE",
      device: name
    }, "*");

    const device = this.devices[name];
    delete this.devices[name];

    if (this.onChangeFunc) {
      this.onChangeFunc();
    } else {
      device.suspend();
    }
  }

  getDeviceList() {
    return Object.values(this.devices);
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new BridgeClientDevices();
