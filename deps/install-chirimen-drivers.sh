#!/bin/bash

# web-pio
# install-chirimen-drivers.sh
# ©2025 by D.F.Mac. @TripArts Music

if [ -d ./chirimen-drivers ]; then
cd ./chirimen-drivers
git pull
cd ..
else
git clone git@github.com:chirimen-oh/chirimen-drivers.git
fi

if [ -d ./drivers ]; then
rm -Rf ./drivers
fi

mkdir ./drivers

# install scripts
# cp ./chirimen-drivers/packages/ads1x15/ads1x15.js ./drivers/ads1x15.js
# cp ./chirimen-drivers/packages/ads1015/ads1015.js ./drivers/ads1015.js
cp ./chirimen-drivers/packages/adt7410/adt7410.js ./drivers/adt7410.js
# cp ./chirimen-drivers/packages/aht10/aht10.js ./drivers/aht10.js
# cp ./chirimen-drivers/packages/ahtx0/ahtx0.js ./drivers/ahtx0.js
# cp ./chirimen-drivers/packages/ak8963/ak8963.js ./drivers/ak8963.js
# cp ./chirimen-drivers/packages/amg8833/amg8833.js ./drivers/amg8833.js
# cp ./chirimen-drivers/packages/apds9960/apds9960.js ./drivers/apds9960.js
# cp ./chirimen-drivers/packages/arduino-stepping-motor/arduino-stepping-motor.js ./drivers/arduino-stepping-motor.js
# cp ./chirimen-drivers/packages/as3935/as3935.js ./drivers/as3935.js
# cp ./chirimen-drivers/packages/bme280/bme280.js ./drivers/bme280.js
# cp ./chirimen-drivers/packages/bme680/bme680.js ./drivers/bme680.js
# cp ./chirimen-drivers/packages/bmp180/bmp180.js ./drivers/bmp180.js
# cp ./chirimen-drivers/packages/bmp280/bmp280.js ./drivers/bmp280.js
# cp ./chirimen-drivers/packages/canzasi/canzasi.js ./drivers/canzasi.js
# cp ./chirimen-drivers/packages/ccs811/ccs811.js ./drivers/ccs811.js
# cp ./chirimen-drivers/packages/gp2y0e03/gp2y0e03.js ./drivers/gp2y0e03.js
# cp ./chirimen-drivers/packages/grove-accelerometer/grove-accelerometer.js ./drivers/grove-accelerometer.js
# cp ./chirimen-drivers/packages/grove-gesture/grove-gesture.js ./drivers/grove-gesture.js
# cp ./chirimen-drivers/packages/grove-light/grove-light.js ./drivers/grove-light.js
# cp ./chirimen-drivers/packages/grove-oled-display/grove-oled-display.js ./drivers/grove-oled-display.js
# cp ./chirimen-drivers/packages/grove-touch/grove-touch.js ./drivers/grove-touch.js
# cp ./chirimen-drivers/packages/ht16k33/ht16k33.js ./drivers/ht16k33.js
# cp ./chirimen-drivers/packages/htu21d/htu21d.js ./drivers/htu21d.js
# cp ./chirimen-drivers/packages/icm20948/icm20948.js ./drivers/icm20948.js
# cp ./chirimen-drivers/packages/ina219/ina219.js ./drivers/ina219.js
# cp ./chirimen-drivers/packages/ltr390/ltr390.js ./drivers/ltr390.js
# cp ./chirimen-drivers/packages/mlx90614/mlx90614.js ./drivers/mlx90614.js
# cp ./chirimen-drivers/packages/mpu6050/mpu6050.js ./drivers/mpu6050.js
# cp ./chirimen-drivers/packages/mpu6500/mpu6500.js ./drivers/mpu6500.js
##### cp ./chirimen-drivers/packages/neopixel-i2c/neopixel-i2c.js ./drivers/neopixel-i2c.js
# cp ./chirimen-drivers/packages/pca9685/pca9685.js ./drivers/pca9685.js
# cp ./chirimen-drivers/packages/pca9685-pwm/pca9685-pwm.js ./drivers/pca9685-pwm.js
# cp ./chirimen-drivers/packages/pcf8591/pcf8591.js ./drivers/pcf8591.js
# cp ./chirimen-drivers/packages/s11059/s11059.js ./drivers/s11059.js
# cp ./chirimen-drivers/packages/scd40/scd40.js ./drivers/scd40.js
# cp ./chirimen-drivers/packages/seesaw/seesaw.js ./drivers/seesaw.js
# cp ./chirimen-drivers/packages/sgp40/sgp40.js ./drivers/sgp40.js
# cp ./chirimen-drivers/packages/sht30/sht30.js ./drivers/sht30.js
# cp ./chirimen-drivers/packages/sht40/sht40.js ./drivers/sht40.js
##### cp ./chirimen-drivers/packages/tca9548a/tca9548a.js ./drivers/tca9548a.js
# cp ./chirimen-drivers/packages/tcs34725/tcs34725.js ./drivers/tcs34725.js
# cp ./chirimen-drivers/packages/tsl2591/tsl2591.js ./drivers/tsl2591.js
# cp ./chirimen-drivers/packages/veml6070/veml6070.js ./drivers/veml6070.js
cp ./chirimen-drivers/packages/vl53l0x/vl53l0x.js ./drivers/vl53l0x.js
# cp ./chirimen-drivers/packages/vl53l1x/vl53l1x.js ./drivers/vl53l1x.js


FILE="./README.md"

sed '$d' "$FILE" > "${FILE}.tmp" && mv "${FILE}.tmp" "$FILE"
date "+%Y/%m/%d %H:%M" >> "$FILE"


