// emulator-devices.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// エミュレータデバイスの管理クラス。
// MIDIDevice / pomidi.mjs の代替として機能し、
// emuViewer による画面表示と GPIO 状態管理を担う。
//
// Version:
// - 2025.05.25 start writing

import { emuViewer } from "./emulator-viewer.mjs";
import devList from "./supportdevices.mjs";
import DevConf from "./devconfig.mjs";
import pipelineEmu from "./pipeline-emu.mjs";
import GPIOAccess from "./gpio.mjs";
import I2CAccess from "./i2c.mjs";

const c = devList.getConst();

const DEB = false;

// ---------------------------------------------------------------------------
// EmulatorDevice — MIDIDevice 相当の単一デバイス抽象
// ---------------------------------------------------------------------------

class EmulatorDevice {
  constructor() {
    if (DEB) console.log("EmulatorDevice.constructor()");
    this.type = c.DEVICE_TYPE_EMU;
    this.isActive = false;
    this.isWaitInit = false;
    this.conf = null;
    this.gpioAccess = null;
    this.i2cAccess = null;
    this.name = null;
    this.viewer = null;
  }

  async init(name, dom) {
    if (DEB) console.log("EmulatorDevice.init() name=" + name);
    this.name = name;

    // DevConf は prefix (split by "-") で対応デバイスを検索する
    const conf = new DevConf();
    this.conf = conf.init(name);
    if (!this.conf) {
      console.error("EmulatorDevice.init() unsupported device name=" + name);
      return null;
    }
    // pipeline を emulator 用に差し替え
    this.conf.pipeline = pipelineEmu;

    // emuViewer の deviceName は SUPPORTED_DEVICES のキーである prefix を使用
    const prefix = name.split("-")[0];
    this.viewer = new emuViewer(dom, prefix);
    await this.viewer.init();

    // pipeline に viewer を登録（GPIO変化コールバックも内部で設定される）
    pipelineEmu.registerViewer(name, this.viewer);

    this.gpioAccess = new GPIOAccess();
    this.gpioAccess.init(this.conf);

    this.i2cAccess = new I2CAccess();
    this.i2cAccess.init(this.conf);

    return this;
  }

  activate() {
    if (DEB) console.log("EmulatorDevice.activate() " + this.name);
    if (this.isActive) return this;
    this.isActive = true;
    if (this.gpioAccess) this.gpioAccess._resume();
    if (this.i2cAccess) this.i2cAccess._resume();
    return this;
  }

  suspend() {
    if (DEB) console.log("EmulatorDevice.suspend() " + this.name);
    this.isActive = false;
    pipelineEmu.clear(this.name);
    if (this.gpioAccess) this.gpioAccess._suspend();
    if (this.i2cAccess) this.i2cAccess._suspend();
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// EmulatorDevices — singleton。pomidi.mjs 相当のデバイスリスト管理
// ---------------------------------------------------------------------------

class EmulatorDevices {
  constructor() {
    if (DEB) console.log("EmulatorDevices.constructor()");
    this.devices = {};        // name → EmulatorDevice
    this.onChangeFunc = null; // Pio._onChangeEmuDevice へのコールバック
  }

  // Pio 側から呼び出す。デバイス追加・削除時に通知を受ける
  setOnChange(func) {
    if (DEB) console.log("EmulatorDevices.setOnChange()");
    this.onChangeFunc = func;
  }

  // デバイスを追加する
  // name   : デバイス名。prefix が supportedDevices に登録されていない場合はエラー
  //          例: "pio_xiaoRP2040-emu1", "pio_RaspiPico-1"
  // dom    : emuViewer を描画する DOM 要素
  async addDevice(name, dom) {
    if (DEB) console.log("EmulatorDevices.addDevice() name=" + name);

    // prefix を validate
    const prefix = name.split("-")[0];
    if (devList.find(prefix) === null) {
      console.error("EmulatorDevices.addDevice() unsupported device prefix=" + prefix + " (name=" + name + ")");
      return null;
    }

    if (name in this.devices) {
      console.error("EmulatorDevices.addDevice() device already exists. name=" + name);
      return null;
    }

    const device = new EmulatorDevice();
    const result = await device.init(name, dom);
    if (!result) {
      return null;
    }

    this.devices[name] = device;

    if (this.onChangeFunc) {
      this.onChangeFunc();
    }

    return device;
  }

  // デバイスを削除する
  removeDevice(name) {
    if (DEB) console.log("EmulatorDevices.removeDevice() name=" + name);

    if (!(name in this.devices)) {
      console.error("EmulatorDevices.removeDevice() device not found. name=" + name);
      return;
    }

    const device = this.devices[name];
    // viewer と pipeline の後始末を先に行う
    if (device.viewer) {
      device.viewer.destroy();
    }
    pipelineEmu.unregisterViewer(name);
    // Pio と連携している場合は _onChangeEmuDevice 内で suspend() を呼ぶ（MIDI パスと対称）
    // 連携していない場合はここで直接 suspend() する
    delete this.devices[name];

    if (this.onChangeFunc) {
      this.onChangeFunc();
    } else {
      device.suspend();
    }
  }

  // 現在管理中の EmulatorDevice 一覧を返す
  getDeviceList() {
    return Object.values(this.devices);
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new EmulatorDevices();
