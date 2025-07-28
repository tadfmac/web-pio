// web-pio
// app.mjs
// ©2025 by D.F.Mac. @TripArts Music

import http from "http";
import express from "express";
import cors from "cors";

const LISTEN_IP = "127.0.0.1";
const LISTEN_PORT = 3100;

let webServer;
let app;

try {
  await runExpressApp();
  await runWebServer();
} catch (err) {
  console.error(err);
}

async function runExpressApp() {
  app = express();
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(cors());
  app.use("/", express.static("./"));
}

async function runWebServer() {
  webServer = http.createServer(app);
  webServer.on("error", (err) => {
    console.error("starting web server failed:", err.message);
  });

  await new Promise((resolve) => {
    webServer.listen(LISTEN_PORT, () => {
      console.log("server is running PORT:" + LISTEN_PORT);
      resolve();
    });
  });
}
