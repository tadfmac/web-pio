// web-pio example
// input-button.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
let pio = new Pio();
pio.setOnFound(onFound);
pio.setOnLeave(onLeave);
await pio.init();

let inPort = null;
let outPort = null;

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  let onOff = 0;
  inPort = devices[0].gpioAccess.ports.get(1);
  inPort.onchange = onChange;
  await inPort.export("in");
  outPort = devices[0].gpioAccess.ports.get(2);
  await outPort.export("out");
}

async function onChange(ev){
  console.log("onChange onOff="+ev.value);
  if(outPort){
    await outPort.write(ev.value);
  }
}

function onLeave(devices){ // devices = List of devices recently disconnected.
  console.log("device disconnected!"+devices[0].name);
  inPort = null;
  outPort = null;
}
