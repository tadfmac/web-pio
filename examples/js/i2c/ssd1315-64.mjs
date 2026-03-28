// web-pio example
// ssd1315-64.mjs
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
  await oledDisplay.init("SSD1315",128,64);
  oledDisplay.clearDisplayQ();
  oledDisplay.drawStringQ(0, 0, "SSD1315 128x32 A");
  oledDisplay.drawStringQ(1, 0, "SSD1315 128x32 B");
  oledDisplay.drawStringQ(2, 0, "SSD1315 128x32 C");
  oledDisplay.drawStringQ(3, 0, "SSD1315 128x32 D");
  oledDisplay.drawStringQ(4, 0, "SSD1315 128x32 E");
  oledDisplay.drawStringQ(5, 0, "SSD1315 128x32 F");
  oledDisplay.drawStringQ(6, 0, "SSD1315 128x32 G");
  oledDisplay.drawStringQ(7, 0, "SSD1315 128x32 H");
  await oledDisplay.playSequence();
}
