// pipeline-midi.mjs (web-pio Driver)
//
// ©2025 by D.F.Mac. @TripArts Music
//
// based on https://github.com/tadfmac/chirimen-raspi3/blob/master/gc/polyfill/polyfill.js
//
// Version:
// - 2025.05.29 start writing (only MIDI Devices)
//

const ROUTER_HEADER_LEN = 8;
const DEB = false;

class PipelineMIDI {
  constructor() {
    if (DEB) console.log("PipelineMIDI.constructor()");
    this.midi = null;
    this.queue = {}; // function call -> callback queue
    this.onevent = {}; // for resister GPIO event queue.
    this.onaddrclose = {}; // for i2c address close event queue.
    this.session = 0; // 0->0xFFFF
    this.id = null;
  }
  init(midi) {
    if (DEB) console.log("PipelineMIDI.init()");
    this.midi = midi;
    this.midi.setHandler(this._onmessage.bind(this), []);
    this.id = this.genId();
  }
  genId() {
    const timePart = ((performance.now() * 1000) | 0) & 0xfffff;
    const randPart = Math.floor(Math.random() * 0x1000);
    return (timePart << 12) | randPart;
  }
  parseMessageHeader(message) {
    let mode = message[0];
    let feat = message[1];
    let session = (message[2] & 0x00ff) | (message[3] << 8);
    let id = message[4] | (message[5] << 8) | (message[6] << 16) | (message[7] << 24);
    return { mode, feat, session, id };
  }
  send(device, feat, data) {
    if (DEB) console.log("PipelineMIDI.send() device=" + device + " feat=" + feat);
    return new Promise((resolve, reject) => {
      let len = data.length + ROUTER_HEADER_LEN;
      let buf = [];

      buf[0] = 1; // 1: API Request
      buf[1] = feat;
      buf[2] = this.session & 0x00ff; // session LSB
      buf[3] = this.session >> 8; // session MSB
      buf[4] = this.id & 0x00ff;
      buf[5] = (this.id >> 8) & 0x00ff;
      buf[6] = (this.id >> 16) & 0x00ff;
      buf[7] = (this.id >> 24) & 0x00ff;

      for (let cnt = 0; cnt < data.length; cnt++) {
        buf[ROUTER_HEADER_LEN + cnt] = data[cnt];
      }

      if (!(device in this.queue)) {
        this.queue[device] = {};
      }
      let nowSession = this.session;

      this.queue[device]["" + nowSession] = {};
      this.queue[device]["" + nowSession].func = (data) => {
        delete this.queue[device]["" + this.session];
        resolve(data);
        return;
      };
      this.queue[device]["" + nowSession].timer = setTimeout(() => {
        delete this.queue[device]["" + nowSession];
        console.error("Response timed out");
        resolve(null);
        return;
      }, 5000);
      this.queue[device]["" + nowSession].forceReject = (data) => {
        if (DEB) console.log("this.session=" + nowSession);
        delete this.queue[device]["" + nowSession];
        if (DEB) console.log("clear() called!");
        resolve(null);
        return;
      };
      this.midi.sendSysEx(buf, device);
      this._sessionUpdate();
    });
  }
  _onmessage(message, device) {
    if (DEB) console.log("PipelineMIDI._onmessage() device=" + device);
    if (DEB) console.dir(message);
    if (message.data[0] == 0xf0) {
      //console.log("receive SysEx");
      let rawmes = this.midi.decodeFromMidiSysEx(message.data);
      let { mode, feat, session, id } = this.parseMessageHeader(rawmes);
      if (DEB) console.log("mode="+mode+" feat="+feat+" session="+session+" id="+id);
      //console.dir(message.data);
      if (DEB) console.dir(rawmes);
      //      let session = ""+((rawmes[2] & 0x00ff) | (rawmes[3] << 8));
      if (mode == 1) {
        if (id != this.id) {
          if (DEB) console.log("PipelineMIDI._onmessage() invalid id! this.id="+this.id+" resId="+id);
          return;
        }
        let resultData = rawmes.slice(ROUTER_HEADER_LEN);
        if (device in this.queue) {
          if (session in this.queue[device]) {
            clearTimeout(this.queue[device][session].timer);
            this.queue[device][session].func(resultData);
            delete this.queue[device][session];
          }
        }
      } else if (mode == 2) {
        // [0] Change Callback (2)
        // [1] function id (0x14)
        // [2] session id LSB (0)
        // [3] session id MSB (0)
        // [4][5][6][7] id
        // [8] Port Number
        // [9] Value (0:LOW 1:HIGH)
        let key = ("" + (feat << 8)) | rawmes[8];
        if (device in this.onevent) {
          let queue = this.onevent[device];
          if (key in queue) {
            queue[key].func(rawmes[9]);
          }
        }
      } else if (mode == 3) {
        //console.log("mode=3");
        // [0] Address Close (3)
        // [1] function id (0x2A)
        // [2] session id LSB (0)
        // [3] session id MSB (0)
        // [4][5][6][7] id
        // [8] port Number
        // [9] address
        let key = ("" + (feat << 16)) | (rawmes[8] << 8) | rawmes[9];
        if (device in this.onaddrclose) {
          let queue = this.onaddrclose[device];
          if (key in queue) {
            queue[key].func();
            delete queue[key];
          }
        }
      }
    }
  }
  registerEvent(device, feat, port, func) {
    if (DEB) console.log("PipelineMIDI.registerEvent() device=" + device + " feat=" + feat + " port=" + port);
    let key = "" + ((feat << 8) | port);
    if (!(device in this.onevent)) {
      this.onevent[device] = {};
    }
    let queue = this.onevent[device];
    if (!(key in queue)) {
      queue[key] = {};
      queue[key].func = func;
    } else {
      if (DEB) console.log("PipelineMIDI.registerEvent() func is overwrote!");
      queue[key].func = func;
    }
  }
  removeEvent(device, feat, port) {
    if (DEB) console.log("PipelineMIDI.removeEvent() device=" + device + " feat=" + feat + " port=" + port);
    let key = "" + ((feat << 8) | port);
    if (!(device in this.onevent)) {
      return;
    }
    let queue = this.onevent[device];
    if (key in queue) {
      delete queue[key];
    }
  }
  registerAddrClose(device, feat, port, address, func) {
    if (DEB) console.log("PipelineMIDI.registerAddrClose() device=" + device + " feat=" + feat + " port=" + port + " addess=" + address);
    let key = "" + ((feat << 16) | (port << 8) | address);
    if (!(device in this.onaddrclose)) {
      this.onaddrclose[device] = {};
    }
    let queue = this.onaddrclose[device];
    if (!(key in queue)) {
      queue[key] = {};
      queue[key].func = func;
    } else {
      if (DEB) console.log("PipelineMIDI.registerAddrClose() func is overwrote!");
      queue[key].func = func;
    }
  }
  removeAddrClose(device, feat, port, address) {
    if (DEB) console.log("PipelineMIDI.removeAddrClose() device=" + device + " feat=" + feat + " port=" + port + " address=" + address);
    let key = "" + ((feat << 16) | (port << 8) | address);
    if (!(device in this.onaddrclose)) {
      return;
    }
    let queue = this.onaddrclose[device];
    if (key in queue) {
      delete queue[key];
    }
  }
  _sessionUpdate() {
    this.session++;
    if (this.session > 0xffff) {
      this.session = 0;
    }
  }
  clearEventQueue(device) {
    if (DEB) console.log("PipelineMIDI.clearEventQueue() device=" + device);
    this.onevent[device] = {};
  }
  clearAddrCloseQueue(device) {
    if (DEB) console.log("PipelineMIDI.clearAddrCloseQueue() device=" + device);
    this.onaddrclose[device] = {};
  }
  clear(device) {
    if (DEB) console.log("PipelineMIDI.clear() device=" + device);
    if (device in this.queue) {
      for (let key in this.queue[device]) {
        if (DEB) console.log("key=" + key);
        clearTimeout(this.queue[device][key].timer);
        this.queue[device][key].forceReject();
      }
    }
  }
}

const pipelineMIDI = new PipelineMIDI();
export default pipelineMIDI;
