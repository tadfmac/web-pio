// web-pio example
// ssd1306.mjs
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
  await oledDisplay.init("SSD1306",128,32);
  oledDisplay.clearDisplayQ();
  oledDisplay.drawStringQ(0, 0, "SSD1306 128x32");
  await oledDisplay.playSequence();
}
