// web-pio example
// detect.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices) {
  // devices =　List of devices recently connected.
  console.log("device found : " + devices[0].name);
  const defaultPort = devices[0].conf.getDefaultI2CPort();
  const port = devices[0].i2cAccess.ports.get(defaultPort);
  const list = await port.detect();
  let view = "";
  for (let cnt = 0; cnt < list.length; cnt++) {
    if (cnt != 0) {
      view += ",";
    }
    let hex = list[cnt].toString(16).toUpperCase().padStart(2, "0");
    view += "0x" + hex;
  }
  console.log("detected addresses are = [" + view + "] on i2c port[" + defaultPort + "] ");
}
