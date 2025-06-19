// web-pio example
// adt7410.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
import ADT7410 from "../../../deps/drivers/adt7410.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  const defaultPort = devices[0].conf.getDefaultI2CPort();
  const port = devices[0].i2cAccess.ports.get(defaultPort);
  const adt7410 = new ADT7410(port,0x48);
  await adt7410.init();
  while(devices[0].isActive){
    const used = process.memoryUsage();
    const heap = Math.round(used.rss / 1024 / 1024 * 100) / 100
    const temperature = await adt7410.read();
    console.log("temperature="+temperature+" usage="+heap+"MB");
    await pio.wait(50);
  }
}
