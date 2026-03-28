// web-pio example
// ssd1315.mjs
// ©2025-2026 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
import OledDisplay from "../../../deps/tmp/grove-oled-display.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices) {
  // devices =　List of devices recently connected.
  console.log("device found : " + devices[0].name);
  const defaultPort = devices[0].conf.getDefaultI2CPort();
  const port = devices[0].i2cAccess.ports.get(defaultPort);
  const oledDisplay = new OledDisplay(port, 0x3c);
  await oledDisplay.init("SSD1315",72,40,28);
  oledDisplay.clearDisplayQ();
  oledDisplay.drawStringQ(0, 0, "72x40 ABC");
  oledDisplay.drawStringQ(1, 0, "72x40 DEF");
  oledDisplay.drawStringQ(2, 0, "72x40 GHI");
  oledDisplay.drawStringQ(3, 0, "72x40 JKL");
  oledDisplay.drawStringQ(4, 0, "72x40 MNO");
  await oledDisplay.playSequence();
}
