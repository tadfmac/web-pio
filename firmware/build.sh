# web-pio

echo "start building web-pio firmwares"

# RP2040 builds
arduino-cli compile --fqbn rp2040:rp2040:rpipico:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-raspi-pico
arduino-cli compile --fqbn rp2040:rp2040:rpipico2:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-raspi-pico2
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2040:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-xiao-RP2040
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2350:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-xiao-RP2350

arduino-cli compile --fqbn rp2040:rp2040:rpipico:usbstack=tinyusb --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-raspi-pico
arduino-cli compile --fqbn rp2040:rp2040:rpipico2:usbstack=tinyusb --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-raspi-pico2
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2040:usbstack=tinyusb --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-xiao-RP2040
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2350:usbstack=tinyusb --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-xiao-RP2350

# Remove RP2040 intermediate files; keep .uf2 for RP2040 distribution
rm -f ./roms/*.elf ./roms/*.bin ./roms/*.map
rm -f ./debug/*.elf ./debug/*.bin ./debug/*.map

# ESP32C6 builds (run after RP2040 cleanup so .bin is not deleted)
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C6 --output-dir ./roms ./arduino/web-pio-xiao-esp32c6
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C6 --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-xiao-esp32c6

# Remove ESP32 intermediate files; keep .bin for ESP32 distribution
rm -f ./roms/*.elf ./roms/*.map
rm -f ./debug/*.elf ./debug/*.map

echo "building completed!"
