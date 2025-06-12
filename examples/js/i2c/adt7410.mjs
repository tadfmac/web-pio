// web-pio example
// adt7410.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
import ADT7410 from "../../../deps/drivers/adt7410.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

const portNum = 0;

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  let port = devices[0].i2cAccess.ports.get(portNum);
  const adt7410 = new ADT7410(port,0x48);
  await adt7410.init();
  while(devices[0].isActive){
    let temperature = await adt7410.read();
    console.log("temperature="+temperature);
    pio.wait(500);
  }
}
