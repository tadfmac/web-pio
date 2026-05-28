// emulator-host.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// Host module used in bridge mode (iframe side).
// Receives postMessage commands from the parent window
// and delegates them to pipelineEmu / emulator-devices.
// GPIO change events are forwarded to the parent window.
//
// Version:
// - 2025.05.25 start writing

import pipelineEmu from "./pipeline-emu.mjs";
import emuDevices from "./emulator-devices.mjs";

const DEB = false;

class EmuHost {
  constructor() {
    if (DEB) console.log("EmuHost.constructor()");
    this.parentWindow = null;
    this.containerEl = null;
    this.deviceDoms = {};  // device name → DOM element
    this._listener = null;
  }

  async init() {
    if (DEB) console.log("EmuHost.init()");
    this.parentWindow = window.parent !== window ? window.parent : null;

    // find or create the container
    let container = document.getElementById("emu-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "emu-container";
      document.body.appendChild(container);
    }
    this.containerEl = container;

    // set up postMessage listener
    this._listener = this._onMessage.bind(this);
    window.addEventListener("message", this._listener);

    // send READY to parent (to handle the case where the parent is already initialized and waiting)
    if (this.parentWindow) {
      this.parentWindow.postMessage({ type: "pio-bridge", cmd: "READY" }, "*");
    }
  }

  _onMessage(event) {
    const msg = event.data;
    if (!msg || typeof msg !== "object" || msg.type !== "pio-bridge") return;
    if (DEB) console.log("EmuHost._onMessage() cmd=" + msg.cmd);

    switch (msg.cmd) {
      case "PING":
        // When parent sends PING: respond with READY and register parentWindow
        if (!this.parentWindow) {
          this.parentWindow = event.source;
        }
        event.source.postMessage({ type: "pio-bridge", cmd: "READY" }, "*");
        break;
      case "HANDSHAKE_ACK":
        // ACK received — handshake complete (currently just records it)
        if (!this.parentWindow) {
          this.parentWindow = event.source;
        }
        break;
      case "SEND":
        this._handleSend(msg, event.source);
        break;
      case "SEND_FIRE":
        this._handleSendFire(msg);
        break;
      case "REGISTER_DEVICE":
        this._handleRegisterDevice(msg, event.source);
        break;
      case "REMOVE_DEVICE":
        this._handleRemoveDevice(msg);
        break;
      case "REGISTER_EVENT":
        this._handleRegisterEvent(msg);
        break;
      case "REMOVE_EVENT":
        this._handleRemoveEvent(msg);
        break;
      case "CLEAR_EVENTS":
        this._handleClearEvents(msg);
        break;
    }
  }

  async _handleSend(msg, source) {
    if (DEB) console.log("EmuHost._handleSend() device=" + msg.device + " feat=0x" + msg.feat.toString(16));
    const result = await pipelineEmu.send(msg.device, msg.feat, msg.data);
    source.postMessage({
      type: "pio-bridge-response",
      id: msg.id,
      result
    }, "*");
  }

  _handleSendFire(msg) {
    if (DEB) console.log("EmuHost._handleSendFire() device=" + msg.device + " feat=0x" + msg.feat.toString(16));
    pipelineEmu.sendFire(msg.device, msg.feat, msg.data);
  }

  async _handleRegisterDevice(msg, source) {
    if (DEB) console.log("EmuHost._handleRegisterDevice() device=" + msg.device);
    const name = msg.device;

    const dom = document.createElement("div");
    dom.className = "emu-device";
    this.containerEl.appendChild(dom);
    this.deviceDoms[name] = dom;

    const result = await emuDevices.addDevice(name, dom);

    source.postMessage({
      type: "pio-bridge-device-ack",
      device: name,
      success: !!result
    }, "*");
  }

  _handleRemoveDevice(msg) {
    if (DEB) console.log("EmuHost._handleRemoveDevice() device=" + msg.device);
    const name = msg.device;
    if (!(name in emuDevices.devices)) return;
    emuDevices.removeDevice(name);
    const dom = this.deviceDoms[name];
    if (dom && dom.parentNode) {
      dom.parentNode.removeChild(dom);
    }
    delete this.deviceDoms[name];
  }

  _handleRegisterEvent(msg) {
    if (DEB) console.log("EmuHost._handleRegisterEvent() device=" + msg.device + " port=" + msg.port);
    const parent = this.parentWindow;
    const device = msg.device;
    const feat = msg.feat;
    const port = msg.port;
    pipelineEmu.registerEvent(device, feat, port, (value) => {
      if (parent) {
        parent.postMessage({
          type: "pio-bridge-event",
          device,
          feat,
          port,
          value
        }, "*");
      }
    });
  }

  _handleRemoveEvent(msg) {
    if (DEB) console.log("EmuHost._handleRemoveEvent() device=" + msg.device + " port=" + msg.port);
    pipelineEmu.removeEvent(msg.device, msg.feat, msg.port);
  }

  _handleClearEvents(msg) {
    if (DEB) console.log("EmuHost._handleClearEvents() device=" + msg.device);
    pipelineEmu.clearEventQueue(msg.device);
  }
}

export default new EmuHost();
