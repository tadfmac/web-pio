import Pio from "../../libs/pio.mjs";
import QR from "./qr.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices) {

const defaultPort = devices[0].conf.getDefaultI2CPort();
const i2cPort = devices[0].i2cAccess.ports.get(defaultPort);

const qr = new QR(i2cPort, 0x21);
await qr.init();
await qr.setTriggerMode(qr.c.AUTO_SCAN_MODE);

for(;;){
  if(await qr.getDecodeReadyStatus() == 1){
    let len = await qr.getDecodeLength();
    console.log("scan length="+len);
    let data = await qr.getDecodeData(len);
    console.dir(data);
  }
  await wait(10); // なんかオーバーフローしてそうなので間引く
}

}

function wait(ms){
  return new Promise((resolve)=>{
  	setTimeout(()=>{
      resolve();
  	},ms);
  })
}
