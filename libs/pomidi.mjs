// https://github.com/tadfmac/poormidi
// CCby4.0 D.F.Mac.TripArts Music.
// 
// pomidi.js (Very Poor) Web MIDI API Wrapper
// For Google Chrome Only :D
// 
// 2015.02.23 Change for P&P on Chrome Canary !!!! (W.I.P. and experimental now)
// 2015.06.07 P&P feature has now supported.
// 2015.08.08 add sendCtlChange()
// 2015.08.08 On sendNoteOn(), sendNoteOff() and sendCtlChange(), 
//            arguments are now able to set midi-channel,
//            and also these can be omitted.
//            See also comments in this code, for details.
// 2017.09.30 name change to `pomidi` is nowrenew to promise style.
// 2022.11.09 add device selection feature.
// 2023.09.22 ES6 export
// 2024.11.20 setHandler() Changed to not execute handle Event until setHandler is called.
// 2025.05.20 add sysEx feature
// 2025.05.26 Started developing to support node.js (in progress)
//            candidate https://github.com/Julusian/node-midi
// 
// dependency for node.js
// npm i "@julusian/midi";


const DEB = true;

const ONCHANGE_DELAY = 200;
const ONCHANGE_INTERVAL_NODE = 500;

class PortWatcher {
  constructor(midi) {
    this.midi = midi;
    this.pollInterval = ONCHANGE_INTERVAL_NODE;
    this.previousOutputs = [];
    this.onchange = null;
    this.timer = null;
    this.outPorts = {};
    this.inPorts = {};
  }
  start() {
//    this.previousOutputs = this.getPortNames();
    this.timer = setInterval(() => {
      this.check();
    }, this.pollInterval);
  }
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  setOnChange(func) {
    this.onchange = func;
  }
  getPortNames() {
    const out = new this.midi.Output();
    const input = new this.midi.Input();
    const num = out.getPortCount();
    const names = [];
    this.inPorts = {};
    this.outPorts = {};
    for(let cnt=0;cnt<num;cnt++) {
      let outName = out.getPortName(cnt);
      names.push(outName);
      this.inPorts[outName] = cnt;
      let inName = input.getPortName(cnt);
      this.outPorts[outName] = cnt;
    }
    return names;
  }
  check() {
    const currentOutputs = this.getPortNames();
    const addedOutputs = currentOutputs.filter(name => !this.previousOutputs.includes(name));
    const removedOutputs = this.previousOutputs.filter(name => !currentOutputs.includes(name));
    if(addedOutputs.length||removedOutputs.length){
      const param = {
        added:addedOutputs,
        removed:removedOutputs,
        all:currentOutputs,
        timestamp: Date.now()
      };
      if(this.onchange != null){
        this.onchange(param);
      }
      this.previousOutputs = currentOutputs;
    }
  }
  getIdFromName(type,name){
    let res = null;
    if(type = "input"){
      res = this.inPorts[name];
    }else{
      res = this.outPorts[name];
    }
    return res;
  }
}

class handler{
  constructor(){
    this.device = null;
    this.func = null;
    if(DEB) console.log("new handler()");
  }
  setDevice(device){
    if(DEB) console.log("handler.setDevice("+device+")");
    this.device = device;
  }
  handler(e){
//console.log("@@@@@ incomming");
    if(DEB) console.log("handler.hander() dev:"+this.device+" e:"+e);
    if(this.handler != null){
      this.func(e,this.device);
    }
  }
  setHandler(func){
    if(DEB) console.log("handler.setHandler()");
    this.func = func.bind(this);
  }
}

class pomidi{
  constructor() {
    this.midi = null;
    this.inputs = {};
    this.outputs = {};
    this.timer = null;
    this.onChangeEvent = null;
    this.onMidiEvent = null;
    this.devices = {};
    this.isSysExEnable = false;
    this.isNode = (typeof process !== "undefined");
    this.watcher = null; // for node.js
  }
  init(options){
    if(DEB) console.log("pomidi.init()");
    return new Promise(async (resolve)=>{
      try{
        this.isSysExEnable = options.sysex;
        if(this.isNode){
          this.midi = await import("@julusian/midi");
          this.watcher = new PortWatcher(this.midi);
          this.watcher.setOnChange((param)=>{this.refresh(param)});
          this.watcher.start();
          if(DEB) console.log("MIDI init OK (node)");
          resolve(this); 
        }else{
          navigator.requestMIDIAccess(options).then((access)=>{
            this.midi = access;
            this.midi.onstatechange = ()=>{this.onStateChange()};
            this.onStateChange();
            if(DEB) console.log("MIDI init OK");
            resolve(this); 
          },(err)=>{
            if(DEB) console.log("MIDI is not supported! : err="+err);
            resolve(null);
          });
        }
      }catch(e){
        if(DEB) console.log("MIDI is not supported! : err="+e);
        resolve(null);
      }
    });    
  }
  _setHandleEvent(){
    if(DEB) console.log("poormidi._setHandleEvent()");
    if(this.onMidiEvent == null){
      return;
    }
    for(let name in this.inputs){
      for(let device in this.devices){
        if(device == name){
          let hdr = new handler();
          hdr.setDevice(name);
          hdr.setHandler(this.onMidiEvent);
          this.inputs[name].onmidimessage = hdr.handler.bind(hdr);
 //         console.log("setHandler");
        }else{
          this.inputs[name].onmidimessage = null;
        }
      }
    }
//    console.log("<---- _setHandleEvent()");
//    console.dir(this.inputs);
//    console.log("this.devices ");
//    console.dir(this.devices);
  }
  setHandler(func, devices){
    if(DEB) console.log("poormidi.setHandler() devices="+devices);
    if(this.midi == null){
      console.log("poormidi.setHandler() NG! MIDI is not supported!");
      return;
    }
    this.onMidiEvent = func;
    if(devices != undefined){
      if(DEB) console.log("setHandler() devices="+devices);
      if(Array.isArray(devices)){
        for(let cnt=0;cnt<devices.length;cnt++){
          this.devices[devices[cnt]] = devices[cnt];
        }
      }else{
        this.devices[devices] = devices;
      }
    }else{
      if(DEB) console.log("setHandler() devices=undefined");
      this.devices = {};
    }
    this._setHandleEvent();
  }
  addDevice(device){
    if(DEB) console.log("poormidi.addDevice() device="+device);
    if(device != undefined){
      if(device in this.devices){
        if(DEB) console.log("poormidi.addDevice() device already exists.");
      }else{
        this.devices[device] = device;       
      }
    }
    this._setHandleEvent();
  }
  removeDevice(device){
    if(DEB) console.log("poormidi.removeDevice() device="+device);
    if(device != undefined){
      if(device in this.devices){
        delete this.devices[device];
      }else{
        if(DEB) console.log("poormidi.removeDevice() device is not exists.");
      }
    }
    this._setHandleEvent();
  }
  setOnChange(func){
    if(DEB) console.log("poormidi.setOnChange()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.setOnChange() NG! MIDI is not supported!");
      return;
    }
    this.onChangeEvent = func;
  }
  sendNoteOn(){
    if(DEB) console.log("poormidi.sendNoteOn()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.sendNoteOn() NG! MIDI is not supported!");
      return;
    }
    let note = 0;
    let velocity = 100;
    let channel = 0;
    let devices = null;
    let sendCnt = 0;
    if(arguments.length == 1){
      // midi.sendNoteOn(note);
      note = arguments[0];
    }else if(arguments.length == 2){
      // midi.sendNoteOn(note,velocity);
      note = arguments[0];
      velocity = arguments[1];
    }else if(arguments.length == 3){
      // midi.sendNoteOn(channel,note,velocity);
      channel = arguments[0] & 0x0f;
      note = arguments[1];
      velocity = arguments[2];
    }else if(arguments.length == 4){
      // midi.sendNoteOn(channel,note,velocity,devices);
      channel = arguments[0] & 0x0f;
      note = arguments[1];
      velocity = arguments[2];
      devices = arguments[3]; // array
    }else{
      if(DEB) console.log("poormidi.sendNoteOn:parameter error!!");
      return 0;
    }  
    for(let name in this.outputs){
      let send = false;
      if(devices == undefined){
        send = true;
      }else{
        for(let cnt=0;cnt<devices.length;cnt++){
          if(devices[cnt] == name){
            send = true;
            break;             
          }
        }
      }
      if(send){
        sendCnt ++;
        if(DEB) console.log("poormidi.sendNoteOn() output to :"+name);
        this.outputs[name].send([0x90|channel,note&0x7f,velocity&0x7f]);
      }
    }
    return sendCnt;
  }
  sendNoteOff(){
    if(DEB) console.log("poormidi.sendNoteOff()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.sendNoteOff() NG! MIDI is not supported!");
      return;
    }
    let note = 0;
    let channel = 0;
    let devices = null;
    let sendCnt = 0;
    if(arguments.length == 1){
      // midi.sendNoteOff(note);
      note = arguments[0];
    }else if(arguments.length == 2){
      // midi.sendNoteOff(channel,note);
      channel = arguments[0] & 0x0f;
      note = arguments[1];
    }else if(arguments.length == 3){
      // midi.sendNoteOff(channel,note,devices);
      channel = arguments[0] & 0x0f;
      note = arguments[1];
      devices = arguments[2]; // array
    }else{
      if(DEB) console.log("poormidi.sendNoteOff:parameter error!!");
      return 0;
    }  
    for(let name in this.outputs){
      let send = false;
      if(devices == undefined){
        send = true;
      }else{
        for(let cnt=0;cnt<devices.length;cnt++){
          if(devices[cnt] == name){
            send = true;
            break;             
          }
        }
      }
      if(send){
        sendCnt ++;
        if(DEB) console.log("poormidi.sendNoteOff() output to :"+name);
        this.outputs[name].send([0x80|channel,note,0]);
      }
    }
    return sendCnt;
  }
  sendCtlChange(){
    if(DEB) console.log("poormidi.sendCtlChange()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.sendCtlChange() NG! MIDI is not supported!");
      return;
    }
    let channel = 0;
    let number = 0;
    let value = 0;
    let devices = null;
    let sendCnt = 0;
    if(arguments.length == 2){
      // midi.sendCtlChange(number,value);
      number = arguments[0];
      value = arguments[1];
    }else if(arguments.length == 3){
      // midi.sendCtlChange(channel,number,value);
      channel = arguments[0] & 0x0f;
      number = arguments[1];
      value = arguments[2];
    }else if(arguments.length == 4){
      // midi.sendNoteOn(channel,number,value,devices);
      channel = arguments[0] & 0x0f;
      number = arguments[1];
      value = arguments[2];
      devices = arguments[3]; // array
    }else{
      if(DEB) console.log("poormidi.sendCtlChange:parameter error!!");
      return;
    }
    for(let name in this.outputs){
      let send = false;
      if(devices == undefined){
        send = true;
      }else{
        for(let cnt=0;cnt<devices.length;cnt++){
          if(devices[cnt] == name){
            send = true;
            break;             
          }
        }
      }
      if(send){
        sendCnt ++;
        if(DEB) console.log("poormidi.sendCtlChange() output to :"+name);
        this.outputs[name].send([0xB0|channel,number&0x7f,value&0x7f]);
      }
    }
    return sendCnt;
  }
  sendNoteOnAt(){
    if(DEB) console.log("poormidi.sendNoteOnAt()");
    if(this.isNode){
      console.log("poormidi.sendNoteOnAt() is not supported on node.js!");
      return;
    }
    if(this.midi == null){
      console.log("poormidi.sendNoteOnAt() NG! MIDI is not supported!");
      return;
    }
    let note = 0;
    let velocity = 100;
    let channel = 0;
    let devices = null;
    let sendCnt = 0;
    let at = null;
    if(arguments.length == 2){
      // midi.sendNoteOn(note);
      at = arguments[0];
      note = arguments[1];
    }else if(arguments.length == 3){
      // midi.sendNoteOn(note,velocity);
      at = arguments[0];
      note = arguments[1];
      velocity = arguments[2];
    }else if(arguments.length == 4){
      // midi.sendNoteOn(channel,note,velocity);
      at = arguments[0];
      channel = arguments[1] & 0x0f;
      note = arguments[2];
      velocity = arguments[3];
    }else if(arguments.length == 5){
      // midi.sendNoteOn(channel,note,velocity,devices);
      at = arguments[0];
      channel = arguments[1] & 0x0f;
      note = arguments[2];
      velocity = arguments[3];
      devices = arguments[4]; // array
    }else{
      if(DEB) console.log("poormidi.sendNoteOnAt:parameter error!!");
      return 0;
    }  
    for(let name in this.outputs){
      let send = false;
      if(devices == undefined){
        send = true;
      }else{
        for(let cnt=0;cnt<devices.length;cnt++){
          if(devices[cnt] == name){
            send = true;
            break;             
          }
        }
      }
      if(send){
        sendCnt ++;
        if(DEB) console.log("poormidi.sendNoteOnAt() output to :"+name);
        this.outputs[name].send([0x90|channel,note&0x7f,velocity&0x7f],at);
      }
    }
    return sendCnt;
  }
  sendSysEx(data,device){
    if(DEB) console.log("poormidi.sendSysEx()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.sendSysEx() NG! MIDI is not supported!");
      return 0;
    }
    if(!this.isSysExEnable){
      if(DEB) console.log("poormidi.sendSysEx() NG! SysEx is not allowed!");
      return 0;
    }
    let send = false;
    if(DEB) console.log("device="+device);
    let cnt;
    if(device in this.outputs){
      send = true;
    }
    if(send){
      let sendData = this.convertToMidiSysEx(data);
      this.outputs[device].send(sendData);
      if(DEB) console.log("sysEx send");
      return sendData.length;
    }else{
      if(DEB) console.log("device not found!");
      return 0;
    }
  }
  convertToMidiSysEx(input){
    const packed = [];
    let temp = 0;
    let bitCount = 0;
    for(let cnt=0; cnt<input.length; cnt++){
      const byte = input[cnt];
      temp |= (byte & 0x7F) << bitCount;
      packed.push(temp & 0x7F);
      temp = (byte >> (7 - bitCount)) & 0x7F;
      bitCount++;
      if (bitCount === 7) {
        packed.push(temp & 0x7F);
        temp = 0;
        bitCount = 0;
      }
    }
    if (bitCount > 0) {
      packed.push(temp & 0x7F);
    }
    if (packed.length > 254) {
      if(DEB) console.log("Converted SysEx data exceeds 254 bytes");
      return [];
    }
    packed.unshift(0xF0);
    packed.push(0xF7);
    return Array.from(packed);
  }
  decodeFromMidiSysEx(sysex) {
    if(sysex.length < 2 || sysex[0] !== 0xF0 || sysex[sysex.length - 1] !== 0xF7) {
      if(DEB) console.log("Invalid SysEx format: must start with 0xF0 and end with 0xF7");
      return [];
    }
    const decoded = [];
    let buffer = 0;
    let bitCount = 0;
    for (let cnt=1;cnt<sysex.length-1;cnt++) {
      const byte = sysex[cnt];
      if (byte > 0x7F) {
        if(DEB) console.log("Invalid SysEx data: byte exceeds 7-bit value - index="+cnt);
        return [];
      }
      buffer |= byte << bitCount;
      bitCount += 7;
      while (bitCount >= 8) {
        decoded.push(buffer & 0xFF);
        buffer >>= 8;
        bitCount -= 8;
      }
    }
    return decoded;
  }
  onStateChange(){
    if(DEB) console.log("poormidi.onStateChange()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.onStateChange() NG! MIDI is not supported!");
      return;
    }
    if(this.timer != null){
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(()=>{
      let changed = this.refreshPorts();
      this.timer = null;
      if(!changed){
        return;
      }
      if(this.onChangeEvent != null){
        if(DEB) console.log(">>>>>>>>>>> onChange expired")
        let list = [];
        for(let _name in this.outputs){
          list.push({name:_name});
        }
        this.onChangeEvent(list);
      }
    },ONCHANGE_DELAY);
  }
  refreshPorts(){
    if(DEB) console.log("poormidi.refreshPorts()");
    if(this.midi == null){
      if(DEB) console.log("poormidi.refreshPorts() NG! MIDI is not supported!");
      return false;
    }
    let inputs = {};
    let outputs = {};

    // inputs
    let it = this.midi.inputs.values();
    for(let o = it.next(); !o.done; o = it.next()){
      inputs[o.value.name] = o.value;
//      console.log("input port: name:"+o.value.name+", id:"+o.value.id+", oem:"+o.value.manufacturer+",type:"+o.value.type);
    }
    if(DEB) console.log("poormidi.refreshPorts() inputs: "+Object.keys(inputs).length);

    // outputs
    let ot = this.midi.outputs.values();
    for(let o = ot.next(); !o.done; o = ot.next()){
      outputs[o.value.name] = o.value;
//      console.log("output port: name:"+o.value.name+", id:"+o.value.id+", oem:"+o.value.manufacturer+",type:"+o.value.type);
    }
    if(DEB) console.log("poormidi.refreshPorts() outputs: "+Object.keys(outputs).length);

    let prevNames = {};
    let newNames = {};
    for(let name in this.inputs){
      prevNames[name] = this.inputs[name].name;
    }
    for(let name in inputs){
      newNames[name] = inputs[name].name;
    }
    let diff = false;
//    console.dir(prevNames);
//    console.dir(newNames);
    if(Object.keys(prevNames).length != Object.keys(newNames).length){
      diff = true;
    }
    for(let name in prevNames){
      if(!(name in newNames)){
        diff = true;
      }
    }
    for(let name in newNames){
      if(!(name in prevNames)){
        diff = true;
      }
    }
    if(diff){
      if(DEB) console.log("change!");
      this.inputs = inputs;
      this.outputs = outputs;
      this._setHandleEvent();
      return true;
    }else{
      if(DEB) console.log("same!");
      return false;
    }

  }
  refresh(param){ // forNode
    if(!this.isNode){
      return;
    }
    if(DEB) console.log("poormidi.refresh()");
    // removed
    if(this.timer != null){
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(()=>{
      this.timer = null;

      for(let cnt=0;cnt<param.removed.length;cnt++){
        if(param.removed[cnt] in this.outputs){
          delete this.outputs[param.removed[cnt]];
        }
        if(param.removed[cnt] in this.inputs){
          if(this.inputs[param.removed[cnt]].input){
            this.inputs[param.removed[cnt]].input.removeAllListeners("message");
          }
          delete this.inputs[param.removed[cnt]];
        }
      }
      for(let cnt=0;cnt<param.added.length;cnt++){
        let name = param.added[cnt];
        if(!(name in this.outputs)){
          let out = new this.midi.Output();
          let id = this.watcher.getIdFromName("output",param.added[cnt]);
          this.outputs[param.added[cnt]] = {
            output:out,
            name:param.added[cnt],
            send:(param)=>{
              this.sendNode(out,id,param);
            }
          };
        }
        if(!(name in this.inputs)){
          let input = new this.midi.Input();
          let id = this.watcher.getIdFromName("input",param.added[cnt]);
          if(this.isSysExEnable){
            input.ignoreTypes(false,true,true);
          }
          try{
            input.openPort(id);
          }catch(e){
            console.log("input.openPort() eror"+e);
          }
          this.inputs[name] = {
            input:input,
            name:param.added[cnt],
            onmidimessage:null
          };

          function onMessageNode(time,mes){
            try{
//            console.log("pomidi.onmessageNode() : name="+name+" id="+id);
//            console.dir(this.inputs);
              if(this.inputs[name].onmidimessage != null){
                let message = {data:mes};
                this.inputs[name].onmidimessage(message);
              }
            }catch(e){
              console.log("onMessageNode() error = "+e);
            }
          }

          this.inputs[name].input.removeAllListeners("message");
          this.inputs[name].input.on("message",onMessageNode.bind(this));
        }
      }
      if((param.removed.length > 0)||(param.added.length > 0)){
        let list = [];
        for(let cnt=0;cnt<param.all.length;cnt++){
          list.push({name:param.all[cnt]});
        }
        if(this.onChangeEvent != null){
          if(DEB) console.log(">>>>>>>>>>> onChange expired (node)")
          this.onChangeEvent(list);
        }
      }
      this._setHandleEvent();
    },ONCHANGE_DELAY);
  }
  sendNode(out,id,param){ // forNode
    if(!this.isNode){
      return;
    }
    try{
      out.openPort(id);
      out.sendMessage(param);
      out.closePort(id);
    }catch(e){
      console.log("pomidi.sendNode() error="+e);
    }
  }
  wait(ms){
    return new Promise((resolve)=>{setTimeout(resolve,ms);});
  }
}

export default pomidi;
