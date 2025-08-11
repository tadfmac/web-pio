# web-pio

echo "start building web-pio firmwares"

arduino-cli compile --fqbn rp2040:rp2040:rpipico:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-raspi-pico
arduino-cli compile --fqbn rp2040:rp2040:rpipico2:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-raspi-pico2
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2040:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-xiao-RP2040
arduino-cli compile --fqbn rp2040:rp2040:seeed_xiao_rp2350:usbstack=tinyusb --output-dir ./roms ./arduino/web-pio-xiao-RP2350

rm -f ./roms/*.elf ./roms/*.bin ./roms/*.map

echo "building completed!"
