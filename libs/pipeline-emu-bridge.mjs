// pipeline-emu-bridge.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// bridge client 向け pipeline。
// pipeline-midi.mjs / pipeline-emu.mjs と同一インターフェースを持ち、
// bridge iframe への postMessage でコマンドを転送する。
//
// Version:
// - 2025.05.25 start writing

const DEB = false;

class PipelineBridge {
  constructor() {
    if (DEB) console.log("PipelineBridge.constructor()");
    this.targetWindow = null;
    this.pendingMap = {};   // id → {device, resolve, timer}
    this.eventQueues = {};  // device → key → func
    this._listener = null;
    this._seq = 0;
  }

  init(targetWindow) {
    if (DEB) console.log("PipelineBridge.init()");
    // 既存の pending をすべてキャンセル（iframe リロード対応）
    for (const id in this.pendingMap) {
      clearTimeout(this.pendingMap[id].timer);
      this.pendingMap[id].resolve(null);
    }
    this.pendingMap = {};

    this.targetWindow = targetWindow;
    if (this._listener) {
      window.removeEventListener("message", this._listener);
    }
    this._listener = this._handleMessage.bind(this);
    window.addEventListener("message", this._listener);
  }

  _nextId() {
    this._seq = (this._seq + 1) & 0xffff;
    return "" + this._seq;
  }

  _handleMessage(event) {
    if (!event.data || typeof event.data !== "object") return;
    const msg = event.data;

    if (msg.type === "pio-bridge-response") {
      const pending = this.pendingMap[msg.id];
      if (pending) {
        clearTimeout(pending.timer);
        delete this.pendingMap[msg.id];
        pending.resolve(msg.result);
      }
    } else if (msg.type === "pio-bridge-event") {
      const key = "" + ((msg.feat << 8) | msg.port);
      const q = this.eventQueues[msg.device];
      if (q && key in q) {
        if (DEB) console.log("PipelineBridge event device=" + msg.device + " port=" + msg.port + " value=" + msg.value);
        q[key](msg.value);
      }
    }
  }

  send(device, feat, data) {
    if (DEB) console.log("PipelineBridge.send() device=" + device + " feat=0x" + feat.toString(16));
    if (!this.targetWindow) {
      console.error("PipelineBridge.send() targetWindow is null");
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const id = this._nextId();
      const timer = setTimeout(() => {
        delete this.pendingMap[id];
        console.error("PipelineBridge.send() timeout device=" + device + " feat=0x" + feat.toString(16));
        resolve(null);
      }, 5000);
      this.pendingMap[id] = { device, resolve, timer };
      this.targetWindow.postMessage({
        type: "pio-bridge",
        cmd: "SEND",
        id,
        device,
        feat,
        data
      }, "*");
    });
  }

  sendFire(device, feat, data) {
    if (DEB) console.log("PipelineBridge.sendFire() device=" + device + " feat=0x" + feat.toString(16));
    if (!this.targetWindow) return;
    this.targetWindow.postMessage({
      type: "pio-bridge",
      cmd: "SEND_FIRE",
      device,
      feat,
      data
    }, "*");
  }

  registerEvent(device, feat, port, func) {
    if (DEB) console.log("PipelineBridge.registerEvent() device=" + device + " feat=" + feat + " port=" + port);
    const key = "" + ((feat << 8) | port);
    if (!(device in this.eventQueues)) {
      this.eventQueues[device] = {};
    }
    this.eventQueues[device][key] = func;
    if (this.targetWindow) {
      this.targetWindow.postMessage({
        type: "pio-bridge",
        cmd: "REGISTER_EVENT",
        device,
        feat,
        port
      }, "*");
    }
  }

  removeEvent(device, feat, port) {
    if (DEB) console.log("PipelineBridge.removeEvent() device=" + device + " feat=" + feat + " port=" + port);
    const key = "" + ((feat << 8) | port);
    if (device in this.eventQueues) {
      delete this.eventQueues[device][key];
    }
    if (this.targetWindow) {
      this.targetWindow.postMessage({
        type: "pio-bridge",
        cmd: "REMOVE_EVENT",
        device,
        feat,
        port
      }, "*");
    }
  }

  clearEventQueue(device) {
    if (DEB) console.log("PipelineBridge.clearEventQueue() device=" + device);
    this.eventQueues[device] = {};
    if (this.targetWindow) {
      this.targetWindow.postMessage({
        type: "pio-bridge",
        cmd: "CLEAR_EVENTS",
        device
      }, "*");
    }
  }

  // I2C スタブ（将来対応）
  registerAddrClose(device, feat, port, address, func) {}
  removeAddrClose(device, feat, port, address) {}
  clearAddrCloseQueue(device) {}

  clear(device) {
    if (DEB) console.log("PipelineBridge.clear() device=" + device);
    for (const id in this.pendingMap) {
      if (this.pendingMap[id].device === device) {
        clearTimeout(this.pendingMap[id].timer);
        this.pendingMap[id].resolve(null);
        delete this.pendingMap[id];
      }
    }
    this.clearEventQueue(device);
  }
}

const pipelineBridge = new PipelineBridge();
export default pipelineBridge;
