// emulator-devices.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// Management class for emulator devices.
// Functions as a replacement for MIDIDevice / pomidi.mjs,
// handling screen display via emuViewer and GPIO state management.
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
// EmulatorDevice — single device abstraction equivalent to MIDIDevice
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

    // DevConf searches for a matching device by prefix (split by "-")
    const conf = new DevConf();
    this.conf = conf.init(name);
    if (!this.conf) {
      console.error("EmulatorDevice.init() unsupported device name=" + name);
      return null;
    }
    // replace pipeline with emulator-specific one
    this.conf.pipeline = pipelineEmu;

    // emuViewer's deviceName uses the prefix, which is the key in SUPPORTED_DEVICES
    const prefix = name.split("-")[0];
    this.viewer = new emuViewer(dom, prefix);
    await this.viewer.init();

    // register viewer with pipeline (GPIO change callback is also configured internally)
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
// EmulatorDevices — singleton. Device list management equivalent to pomidi.mjs
// ---------------------------------------------------------------------------

class EmulatorDevices {
  constructor() {
    if (DEB) console.log("EmulatorDevices.constructor()");
    this.devices = {};        // name → EmulatorDevice
    this.onChangeFunc = null; // callback to Pio._onChangeEmuDevice
  }

  // Called from the Pio side. Receives notification when a device is added or removed
  setOnChange(func) {
    if (DEB) console.log("EmulatorDevices.setOnChange()");
    this.onChangeFunc = func;
  }

  // Add a device
  // name   : device name. Error if prefix is not registered in supportedDevices
  //          e.g. "pio_xiaoRP2040-emu1", "pio_RaspiPico-1"
  // dom    : DOM element in which emuViewer is rendered
  async addDevice(name, dom) {
    if (DEB) console.log("EmulatorDevices.addDevice() name=" + name);

    // validate the prefix
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

  // Remove a device
  removeDevice(name) {
    if (DEB) console.log("EmulatorDevices.removeDevice() name=" + name);

    if (!(name in this.devices)) {
      console.error("EmulatorDevices.removeDevice() device not found. name=" + name);
      return;
    }

    const device = this.devices[name];
    // clean up viewer and pipeline first
    if (device.viewer) {
      device.viewer.destroy();
    }
    pipelineEmu.unregisterViewer(name);
    // If linked with Pio, suspend() is called inside _onChangeEmuDevice (symmetric with MIDI path)
    // If not linked, suspend() is called directly here
    delete this.devices[name];

    if (this.onChangeFunc) {
      this.onChangeFunc();
    } else {
      device.suspend();
    }
  }

  // Returns the list of currently managed EmulatorDevices
  getDeviceList() {
    return Object.values(this.devices);
  }

  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new EmulatorDevices();
