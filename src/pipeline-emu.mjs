// pipeline-emu.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// Pipeline for emulator devices.
// Has the same interface as pipeline-midi.mjs,
// and manipulates emuViewer's in-memory state instead of MIDI communication.
//
// Version:
// - 2025.05.25 start writing

import F from "./protocol-const.mjs";

const DEB = false;

const DIR_MAP = {
  [F.DIR_OUT]: "out",
  [F.DIR_IN]: "in",
  [F.DIR_INPULLUP]: "in-pullup",
  [F.DIR_PWM]: "pwm",
  [F.DIR_ADC]: "adc"
};

class PipelineEmu {
  constructor() {
    if (DEB) console.log("PipelineEmu.constructor()");
    this.viewers = {};      // device → emuViewer
    this.eventQueues = {};  // device → { key → func }  (GPIO onchange)
    this.addrCloseQueues = {}; // device → {} (I2C stub)
  }

  registerViewer(device, viewer) {
    if (DEB) console.log("PipelineEmu.registerViewer() device=" + device);
    this.viewers[device] = viewer;
    this.eventQueues[device] = {};
    viewer.setOnGPIOChange((_deviceName, pinNum, direction, value) => {
      // _deviceName is the prefix name inside emuViewer (e.g. "pio_xiaoRP2040")
      // device is the full name held in the closure (e.g. "pio_xiaoRP2040-emu1")
      const key = "" + ((F.GPIO_ONCHANGE << 8) | pinNum);
      const q = this.eventQueues[device];
      if (q && key in q) {
        if (DEB) console.log("PipelineEmu onGPIOChange device=" + device + " pin=" + pinNum + " value=" + value);
        q[key](value === "HIGH" ? 1 : 0);
      }
    });
  }

  unregisterViewer(device) {
    if (DEB) console.log("PipelineEmu.unregisterViewer() device=" + device);
    delete this.viewers[device];
    delete this.eventQueues[device];
    delete this.addrCloseQueues[device];
  }

  async send(device, feat, data) {
    if (DEB) console.log("PipelineEmu.send() device=" + device + " feat=0x" + feat.toString(16));
    const viewer = this.viewers[device];
    if (!viewer) {
      console.error("PipelineEmu.send() viewer not found for device=" + device);
      return null;
    }

    switch (feat) {
      case F.GPIO_EXPORT: {
        const port = data[0];
        const dirCode = data[1];
        const dirName = DIR_MAP[dirCode] || "none";
        await viewer.set(port, dirName, null);
        return [1];
      }
      case F.GPIO_READ: {
        const port = data[0];
        const state = await viewer.get(port);
        if (!state) return null;
        return [1, state.value === "HIGH" ? 1 : 0];
      }
      case F.GPIO_UNEXPORT: {
        const port = data[0];
        await viewer.set(port, "none", null);
        return [1];
      }
      case F.GPIO_UNEXPORTALL: {
        const pins = viewer.getPins();
        const all = [...pins.left, ...pins.right];
        for (const p of all) {
          await viewer.set(p.gpio, "none", null);
        }
        return [1];
      }
      case F.GPIO_ANALOGREAD: {
        const port = data[0];
        const state = await viewer.get(port);
        if (!state) return null;
        const val = parseInt(state.value) || 0;
        return [1, val & 0xff, (val >> 8) & 0xff];
      }
      default:
        // I2C features are for future support. Currently return null to treat as an error.
        if (DEB) console.log("PipelineEmu.send() unsupported feat=0x" + feat.toString(16));
        return null;
    }
  }

  sendFire(device, feat, data) {
    if (DEB) console.log("PipelineEmu.sendFire() device=" + device + " feat=0x" + feat.toString(16));
    const viewer = this.viewers[device];
    if (!viewer) {
      console.error("PipelineEmu.sendFire() viewer not found for device=" + device);
      return;
    }

    switch (feat) {
      case F.GPIO_WRITE: {
        const port = data[0];
        const val = data[1];
        viewer.set(port, "out", val ? "HIGH" : "LOW");
        break;
      }
      case F.GPIO_SETPWM: {
        const port = data[0];
        const duty = data[1];
        viewer.set(port, "pwm", duty);
        break;
      }
      default:
        // I2C write stub: do nothing
        if (DEB) console.log("PipelineEmu.sendFire() unsupported feat=0x" + feat.toString(16));
        break;
    }
  }

  registerEvent(device, feat, port, func) {
    if (DEB) console.log("PipelineEmu.registerEvent() device=" + device + " feat=" + feat + " port=" + port);
    const key = "" + ((feat << 8) | port);
    if (!(device in this.eventQueues)) {
      this.eventQueues[device] = {};
    }
    this.eventQueues[device][key] = func;
  }

  removeEvent(device, feat, port) {
    if (DEB) console.log("PipelineEmu.removeEvent() device=" + device + " feat=" + feat + " port=" + port);
    const key = "" + ((feat << 8) | port);
    if (device in this.eventQueues) {
      delete this.eventQueues[device][key];
    }
  }

  clearEventQueue(device) {
    if (DEB) console.log("PipelineEmu.clearEventQueue() device=" + device);
    this.eventQueues[device] = {};
  }

  // I2C stub (future support)
  registerAddrClose(device, feat, port, address, func) {}
  removeAddrClose(device, feat, port, address) {}
  clearAddrCloseQueue(device) {}

  clear(device) {
    if (DEB) console.log("PipelineEmu.clear() device=" + device);
    this.eventQueues[device] = {};
    delete this.addrCloseQueues[device];
  }
}

const pipelineEmu = new PipelineEmu();
export default pipelineEmu;
