// web-pio example
// blink.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
let pio = new Pio();
pio.setOnFound(onFound);
pio.setOnLeave(onLeave);
await pio.init();

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  let onOff = 0;
  let port = devices[0].gpioAccess.ports.get(2);
  await port.export("out");
  while(devices[0].isActive){
    onOff ^= 1;
    await port.write(onOff);
    await pio.wait(500);
  }
}

function onLeave(devices){ // devices = List of devices recently disconnected.
  console.log("device disconnected!"+devices[0].name);
}
