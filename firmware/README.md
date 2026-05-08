# web-pio

![web-pio logo](../imgs/web-pio-logo.png)

## Supported Boards

| Board | Platform | MIDI Transport | ROM format |
|-------|----------|---------------|------------|
| Raspberry Pi Pico | RP2040 | USB MIDI | `.uf2` |
| Raspberry Pi Pico 2 | RP2350 | USB MIDI | `.uf2` |
| Seeed Studio XIAO RP2040 | RP2040 | USB MIDI | `.uf2` |
| Seeed Studio XIAO RP2350 | RP2350 | USB MIDI | `.uf2` |
| Seeed Studio XIAO ESP32C6 | ESP32-C6 | BLE MIDI | `.bin` |

## How to build firmware using Arduino CLI

### 1. Install Arduino CLI

https://docs.arduino.cc/arduino-cli/installation/

### 2. Install Board Cores

#### RP2040 / RP2350 (Arduino-Pico)

```
arduino-cli config add board_manager.additional_urls https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
arduino-cli core update-index
arduino-cli core install rp2040:rp2040
```

#### ESP32C6 (Arduino ESP32)

```
arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
```

### 3. Install Libraries

#### For RP2040 / RP2350

```
arduino-cli lib install "Adafruit TinyUSB Library"
arduino-cli lib install "Adafruit NeoPixel"
arduino-cli lib install "MIDI Library"
```

#### For ESP32C6

```
arduino-cli lib install "Arduino BLE-MIDI"
arduino-cli lib install "MIDI Library"
```

### 4. Run Build Script

```
cd web-pio/firmware
./build.sh
```

Built ROM files are placed in `roms/`. Debug builds (with `-DDEB` flag) are placed in `debug/`.

## How to Flash Firmware

### RP2040 / RP2350 boards — UF2 drag-and-drop

1. Hold the **BOOTSEL** button and connect the board via USB.
2. The board mounts as a USB mass storage device.
3. Copy the `.uf2` file from `roms/` onto the mounted drive.
4. The board reboots automatically and is ready to use as a USB MIDI device.

| Board | ROM file |
|-------|---------|
| Raspberry Pi Pico | `roms/web-pio-raspi-pico.ino.uf2` |
| Raspberry Pi Pico 2 | `roms/web-pio-raspi-pico2.ino.uf2` |
| XIAO RP2040 | `roms/web-pio-xiao-RP2040.ino.uf2` |
| XIAO RP2350 | `roms/web-pio-xiao-RP2350.ino.uf2` |

### XIAO ESP32C6 — Web Flash Tool

Open `firmware/flash/flash.html` in **Chrome or Edge** (Web Serial API required).

Connect the XIAO ESP32C6 via USB and click the install button on the page.

Alternatively, flash with `esptool.py`:

```
esptool.py --chip esp32c6 --port /dev/ttyUSB0 write_flash 0 roms/web-pio-xiao-esp32c6.ino.merged.bin
```

After flashing, pair the device as a Bluetooth MIDI device (see below).

## BLE MIDI Pairing (XIAO ESP32C6)

The XIAO ESP32C6 firmware advertises itself as a BLE MIDI device with a name in the format:

```
pio_xiaoESP32C6-XXXXXXXXXX
```

The suffix is derived from the board's eFuse MAC address and is unique per device.

### Pairing on macOS

1. Open **Audio MIDI Setup** → **MIDI Studio**.
2. Click the **Bluetooth** button in the toolbar.
3. Find the `pio_xiaoESP32C6-...` device and click **Connect**.

### Pairing on Windows

Use a BLE MIDI driver such as **Korg BLE MIDI** or **MIDIberry** to expose the BLE MIDI device to applications.

## Directory Structure

```
firmware/
├── arduino/
│   ├── common/              # Shared code across all platforms
│   │   ├── makeUUID.cpp
│   │   └── makeUUID.h
│   ├── platform/
│   │   ├── pico/            # RP2040/RP2350 platform layer
│   │   │   ├── midisettings.h
│   │   │   ├── pio.cpp
│   │   │   └── pio.h
│   │   └── esp32/           # ESP32 platform layer
│   │       ├── midisettings.h
│   │       ├── pio.cpp
│   │       └── pio.h
│   ├── web-pio-raspi-pico/  # Raspberry Pi Pico sketch
│   ├── web-pio-raspi-pico2/ # Raspberry Pi Pico 2 sketch
│   ├── web-pio-xiao-RP2040/ # XIAO RP2040 sketch
│   ├── web-pio-xiao-RP2350/ # XIAO RP2350 sketch
│   └── web-pio-xiao-esp32c6/ # XIAO ESP32C6 sketch
├── flash/
│   ├── flash.html           # Web Flash Tool for ESP32C6
│   └── manifest.json
├── roms/                    # Pre-built ROM files for distribution
├── debug/                   # Debug builds (with -DDEB flag)
├── build.sh                 # Build script for all boards
└── README.md
```
