// Item D feasibility: verify @julusian/midi can see BLE MIDI devices on macOS
// Usage: node work/test-ble-midi.mjs
// Prerequisites:
//   1. BLE MIDI device paired in macOS Audio MIDI Setup (MIDI Studio)
//   2. npm i (in web-pio root)

import midi from "@julusian/midi";

const input = new midi.Input();
const output = new midi.Output();

console.log("MIDI Input ports:");
const inputCount = input.getPortCount();
if (inputCount === 0) {
  console.log("  (none)");
} else {
  for (let i = 0; i < inputCount; i++) {
    console.log(`  [${i}] ${input.getPortName(i)}`);
  }
}

console.log("MIDI Output ports:");
const outputCount = output.getPortCount();
if (outputCount === 0) {
  console.log("  (none)");
} else {
  for (let i = 0; i < outputCount; i++) {
    console.log(`  [${i}] ${output.getPortName(i)}`);
  }
}
