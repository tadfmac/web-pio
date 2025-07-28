/*

qmp6988 test

- DataSeat: https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/datasheet/unit/enviii/QMP6988%20Datasheet.pdf
- reference : 
 https://github.com/m5stack/M5Unit-ENV/blob/master/src/QMP6988.h
 https://github.com/m5stack/M5Unit-ENV/blob/master/src/QMP6988.cpp

*/

const I2CADDR_QMP6988 = 0x70;

import Pio from "../../libs/pio.mjs";
import QMP6988 from "./qmp6988.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices) {

  console.log("device found : " + devices[0].name);
  const defaultPort = devices[0].conf.getDefaultI2CPort();
  const port = devices[0].i2cAccess.ports.get(defaultPort);
  const qmp6988 = new QMP6988(port, I2CADDR_QMP6988);

  await qmp6988.init();

  while (devices[0].isActive) {
    let data = await qmp6988.read();
    console.dir(data);
    await pio.wait(500);
  }

}



