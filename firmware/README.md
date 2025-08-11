# web-pio

![web-pio logo](imgs/web-pio-logo.png)

## How to building firmware using Arduino CLI

### 1. Install Arduino CLI

https://docs.arduino.cc/arduino-cli/installation/

### 2. Install Arduino-Pico core

```
arduino-cli config add board_manager.additional_urls https://github.com/earlephilhower/arduino-pico/releases/download/global/package_rp2040_index.json
arduino-cli core update-index
arduino-cli core install rp2040:rp2040
```

### 3. Install Libraries

```
arduino-cli lib install "Adafruit TinyUSB Library"
arduino-cli lib install "Adafruit NeoPixel"
```

### 4. Run Building Sctipts

```
cd web-pio/firmware
./build.sh
```


