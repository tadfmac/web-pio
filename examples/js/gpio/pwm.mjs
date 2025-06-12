// web-pio example
// pwm.mjs
// ©2025 by D.F.Mac. @TripArts Music

import Pio from "../../../libs/pio.mjs";
let pio = new Pio();
pio.setOnFound(onFound);
pio.setOnLeave(onLeave);
await pio.init();

async function onFound(devices){ // devices =　List of devices recently connected.
  console.log("device found : "+devices[0].name);
  let duty = 0;
  let dutyAdd = 16;
  let port = devices[0].gpioAccess.ports.get(2);
  await port.export("pwm");
  while(devices[0].isActive){
    await port.setPWM(duty);
    duty += dutyAdd;
    if(duty >= 255){
      duty = 255;
      dutyAdd = -16;
    }else if(duty <= 0){
      duty = 0;
      dutyAdd = 16;
    }
    await pio.wait(200);
  }
}

function onLeave(devices){ // devices = List of devices recently disconnected.
  console.log("device disconnected!"+devices[0].name);
}
