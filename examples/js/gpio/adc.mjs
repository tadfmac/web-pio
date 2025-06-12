// web-pio example
// adc.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
let pio = new Pio();
pio.setOnFound(onFound);
pio.setOnLeave(onLeave);
await pio.init();

let port = null;

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  port = devices[0].gpioAccess.ports.get(26);
  await port.export("adc");
  while(devices[0].isActive){
    let value = await port.analogRead();
    if(value != null){
      console.log("value="+value);
    }
    await pio.wait(500);
  }
}

function onLeave(devices){ // devices = List of devices recently disconnected.
  console.log("device disconnected!"+devices[0].name);
  port = null;
}
