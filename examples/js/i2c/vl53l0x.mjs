// web-pio example
// vl53l0x.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
import VL53l0X from "../../../deps/drivers/vl53l0x.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  const defaultPort = devices[0].conf.getDefaultI2CPort();
  const port = devices[0].i2cAccess.ports.get(defaultPort);
  const vl53l0x = new VL53l0X(port,0x29);
  await vl53l0x.init();
  while(devices[0].isActive){
    let distance = await vl53l0x.getRange();
    console.log("distance="+distance);
    pio.wait(500);
  }
}
