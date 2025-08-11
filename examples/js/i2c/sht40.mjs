// web-pio example
// sht40.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
import SHT40 from "../../../deps/drivers/sht40.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices) {
  // devices =　List of devices recently connected.
  console.log("device found : " + devices[0].name);
  const defaultPort = devices[0].conf.getDefaultI2CPort();
  const port = devices[0].i2cAccess.ports.get(defaultPort);
  const sht40 = new SHT40(port, 0x44);
  await sht40.init();
  while (devices[0].isActive) {
    let {temperature, humidity} = await sht40.readData();
    console.log("temperature=" + temperature + " humidity=" + humidity);
    pio.wait(500);
  }
}
