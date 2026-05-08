// Phase 1.3: SysEx 疎通確認
// DEVICE_INIT + GPIO_EXPORT + GPIO_WRITE + GPIO_UNEXPORT の round-trip テスト
// Usage: node work/test-sysex.mjs
// Prerequisites: ESP32C6 が Audio MIDI Setup でペアリング済みであること

import Pio from "../libs/pio.mjs";
import plmidi from "../libs/pipeline-midi.mjs";
import F from "../libs/protocol-const.mjs";

const TARGET = "pio_xiaoESP32C6";
const GPIO_PIN = 0; // D0 = Arduino pin 0

let pio = new Pio();
let tested = false;

function ok(label) {
  console.log(`[PASS] ${label}`);
}

function fail(label, result) {
  console.error(`[FAIL] ${label}: result=${JSON.stringify(result)}`);
  process.exit(1);
}

pio.setOnFound(async (devices) => {
  for (const dev of devices) {
    if (!dev.name.startsWith(TARGET)) continue;
    if (tested) return;
    tested = true;

    console.log(`Device: ${dev.name}`);

    // DEVICE_INIT
    let r = await plmidi.send(dev.name, F.DEVICE_ACTIVATE, []);
    if (r && r[0] === 1) ok("DEVICE_INIT"); else fail("DEVICE_INIT", r);

    // GPIO_EXPORT D0 as output
    r = await plmidi.send(dev.name, F.GPIO_EXPORT, [GPIO_PIN, F.DIR_OUT]);
    if (r && r[0] === 1) ok("GPIO_EXPORT D0=out"); else fail("GPIO_EXPORT", r);

    // GPIO_WRITE HIGH
    r = await plmidi.send(dev.name, F.GPIO_WRITE, [GPIO_PIN, 1]);
    if (r && r[0] === 1) ok("GPIO_WRITE D0=HIGH"); else fail("GPIO_WRITE HIGH", r);

    // GPIO_WRITE LOW
    r = await plmidi.send(dev.name, F.GPIO_WRITE, [GPIO_PIN, 0]);
    if (r && r[0] === 1) ok("GPIO_WRITE D0=LOW"); else fail("GPIO_WRITE LOW", r);

    // GPIO_UNEXPORT
    r = await plmidi.send(dev.name, F.GPIO_UNEXPORT, [GPIO_PIN]);
    if (r && r[0] === 1) ok("GPIO_UNEXPORT D0"); else fail("GPIO_UNEXPORT", r);

    console.log("All tests passed.");
    process.exit(0);
  }
});

pio.setOnLeave((devices) => {
  console.log(`Device disconnected: ${devices[0].name}`);
});

await pio.init();

setTimeout(() => {
  console.error("Timeout: ESP32C6 not found within 15 seconds.");
  console.error("Check: Audio MIDI Setup でデバイスがペアリングされているか確認してください。");
  process.exit(1);
}, 15000);
