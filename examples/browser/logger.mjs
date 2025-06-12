// web-pio example
// logger.mjs
// ©2025 by D.F.Mac. @TripArts Music

class logger{
  constructor(elm){
    const originalLog = console.log.bind(console);
    console.log = (...args) => {
      originalLog(...args);
      let msg = "";
      for(let cnt=0;cnt<args.length;cnt++){
        msg += args[cnt]+" ";
      }
      elm.innerHTML += msg + '<br>';
      elm.scrollTop = elm.scrollHeight;
    };
  }
}

export default logger;