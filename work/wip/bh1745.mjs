import Pio from "../../libs/pio.mjs";
import BH1745NCU from "./bh1745ncu.js";

let pio = new Pio();
pio.setOnFound(onFound);
await pio.init();

async function onFound(devices) {

const defaultPort = devices[0].conf.getDefaultI2CPort();
const i2cPort = devices[0].i2cAccess.ports.get(defaultPort);

// インスタンス生成処理
const bh1745ncu = new BH1745NCU(i2cPort, 0x39);
// 初期化処理
await bh1745ncu.init();

const interval = setInterval(async function() {
    
    let data = await bh1745ncu.get_val();
    
    console.dir({"RED":data[0], "GREEN":data[1], "BLUE":data[2], "CLEAR":data[3]});

}, 1000);

}