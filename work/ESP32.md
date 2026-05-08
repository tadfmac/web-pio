# CLAUDE.md

このファイルはリポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へ提供するガイダンスです。

## プロジェクト概要

**web-pio** は、Web MIDI SysEx 通信を介してブラウザおよび Node.js からマイコン（RP2040/RP2350 ベース）の GPIO・I2C を制御する JavaScript ライブラリです。CHIRIMEN Open Hardware にインスパイアされています。

## ESP32対応概要

ESP32版は USB-MIDIではなく BLE MIDI で接続を行います。
BLE MIDI デバイスとしてOSレベルでコネクション後、Web MIDI APIを経由して接続を行います。

RP2040/2350バージョン同様に、JavaScriptのライブラリを経由したコマンド送受信により pio.mjs 経由での GPIO/I2C 操作をアプリケーションに提供します。

ESP32用のファームウェアは Arduino ベースで提供します。
ESP32最初のターゲットデバイスは xiao ESP32C6 とします。

### フィージビリティ項目と技術選定

現時点では技術選定が終わっていませんので、フィージビリティスタディにより決定してください。
下記課題があります。

#### 1. マイコンごとのUUID の取得

web-pio では マイコンごとに接続/切断を管理する仕様です。これを実現するために、flash_get_unique_id() を用いて マイコンボードの FlashROMの IDを取得し、その値を USB Device Name に加工することで一意にボードの管理を行なっています。

BLE MIDI バージョンでも同様の管理を行いたいため、マイコンごとにユニークなIDを BLE Device Name に加工するなどする必要があります。

良い方法の検討をお願いします。

#### 2. BLE MIDI ライブラリ

RP2040/2350版の USB版 MIDI ファームウエアのMIDIスタック部分は、TinyUSB+Arduino MIDIライブラリという2段構成になっっており、その上で pio.cpp がプロトコル層として実装されています。
JavaScript側ライブラリの互換性のため、pio.cppに実装しているプロトコルスタックのIFは変更なく実装したいです。
BLE MIDIスタック部分について、Arduino MIDIライブラリの下に BLE MIDI スタックを実装するか、あるいは Arduino MIDI ライブラリを利用せずに直接 pio.mjs (ESP32用) で吸収するか、検討が必要です。

#### 3. ファームウエア配布方法の選定

ファームウエアは Arduino を用いた書き込みをサポートする予定ですが、RP2040/RP2350版では ビルドバイナリを .uf2 で配布できるため、ビルド済みの .uf2 も配布しています。
ESP32では USB経由でのマスストレージ書き込みには対応していないため .uf2 での配布は行えませんが、Arduino での開発環境を整えないとマイコンへの書き込みが行えない、という状況は期待値ではありません。
可能であれば バイナリファイルを配布し、簡易な操作でマイコンのアップデートを実現したいです。
検討をお願いします。

---

## フィージビリティスタディ結果（Claude追記）

### 前提理解

現在の RP2040 スタック構造：

```
pio.cpp (プロトコル層)  ← 変更なく維持したい
    ↓ MIDI.sendSysEx() / setHandleSystemExclusive()
Arduino MIDI Library
    ↓
TinyUSB SerialMIDI transport
    ↓
USB hardware
```

---

### 1. マイコンごとのユニークID取得

**推奨方針: eFuse MAC アドレスを利用**

ESP32C6 では `ESP.getEfuseMac()` で 48bit の固有 MAC アドレス（uint64_t）を取得できる。
この値を既存の `convert8bitToAscii()` に渡すことで、`makeUUID.cpp/h` を変更なしで再利用できる。

```cpp
uint64_t mac = ESP.getEfuseMac();
uint8_t macBytes[8];
memcpy(macBytes, &mac, 6);
macBytes[6] = 0; macBytes[7] = 0; // INPUT_SIZE=8 に合わせてゼロ埋め
convert8bitToAscii(macBytes, &prdDescStr[15]);
```

- eFuse MAC は工場出荷時書き込み済み・不変・48bit 固有値（Espressif OUI 割当）
- BLE Device Name 例: `"pio_xiaoESP32C6-XXXXXXXXXXX"` ≒ 27文字
  → BLE advertising の制約（31バイト）内に収まる
- C API では `esp_efuse_mac_get_default()` でも同様に取得可能

**既存コードへの影響**: `makeUUID.cpp/h` 変更なし

---

### 2. BLE MIDI ライブラリ

**推奨方針: `lathoub/BLE-MIDI-Transport` + NimBLE を採用**

```
pio.cpp (変更なし)
    ↓ MIDI.sendSysEx() / setHandleSystemExclusive()
Arduino MIDI Library (変更なし)
    ↓
BLEMIDI_Transport<BLEMIDI_ESP32nim, MySettings>
    ↓
NimBLE-Arduino (ESP32C6推奨、メモリ効率優位)
    ↓
BLE 5.0 hardware
```

`.ino` 側の変更イメージ：

```cpp
// RP2040 版
Adafruit_USBD_MIDI usb_midi;
MIDI_NAMESPACE::SerialMIDI<Adafruit_USBD_MIDI> serial_usb_midi(usb_midi);
MIDI_NAMESPACE::MidiInterface<...> MIDI(serial_usb_midi);

// ESP32C6 版
#include <BLEMIDI_Transport.h>
#include <hardware/BLEMIDI_ESP32_NimBLE.h>
BLEMIDI_CREATE_INSTANCE("pio_xiaoESP32C6-XXXXXXXXX", MIDI)
```

- `MIDI.sendSysEx()` / `MIDI.setHandleSystemExclusive()` インターフェースが維持されるため `pio.cpp` への変更はほぼゼロ
- BLE MTU はネゴシエートで最大 512 バイトまで拡張可能。`sysExOutData[256]` の分割送信は同ライブラリが自動対応
- BLE connection interval は通常 7.5〜100ms。5秒タイムアウトは十分だが体感レイテンシは USB より増す

**対応が必要な変更点**:
- `SerialTinyUSB` → `Serial` に変更（USB CDC）
- `INPUT_PULLDOWN` は ESP32C6 の一部ピンで使用不可のため `variant.h` で注意が必要

**却下した代替**: `max22-arduino/ESP32-BLE-MIDI` は Arduino MIDI Library に依存しない独自 API のため `pio.cpp` 改修が必要になり不採用。

**既存コードへの影響**: `pio.cpp` 変更なし、`.ino` のみ変更

---

### 3. ファームウェア配布方法

**推奨方針: ESP Web Tools をプライマリとして採用**

```
GitHub Pages / web-pio サイト
    └── flash.html（ESP Web Tools 組み込み）
            ↓ Web Serial API (Chrome/Edge)
        manifest.json → web-pio-xiao-esp32c6.bin
```

実装コスト最小で `.uf2` と同等の簡便さを実現できる。

```html
<!-- flash.html に数行追加するだけ -->
<esp-web-install-button manifest="manifest.json"></esp-web-install-button>
<script type="module" src="https://unpkg.com/esp-web-tools/dist/web/install-button.js"></script>
```

```json
{
  "name": "web-pio xiao-ESP32C6",
  "builds": [{"chipFamily": "ESP32-C6", "parts": [{"path": "roms/web-pio-xiao-esp32c6.bin", "offset": 0}]}]
}
```

- **ユーザー操作**: Chrome/Edge でページを開き、USB 接続、ボタン1クリック → 書き込み完了
- ソフトウェアインストール不要（ブラウザのみ）
- XIAO ESP32C6 は内蔵 USB-JTAG コントローラを持つため外部 USB-UART 変換チップ不要

**セカンダリ**: `esptool.py` での書き込み手順を README に記載（CI/CD・上級者向け）

**既存コードへの影響**: 新規 `flash.html` + `manifest.json` 追加のみ

---

### まとめ

| 課題 | 推奨方針 | 既存コードへの影響 |
|---|---|---|
| ユニークID | `ESP.getEfuseMac()` + 既存 `convert8bitToAscii()` 再利用 | `makeUUID.cpp/h` 変更なし |
| BLE MIDI | `lathoub/BLE-MIDI-Transport` + NimBLE | `pio.cpp` 変更なし、`.ino` のみ変更 |
| 配布 | ESP Web Tools (GitHub Pages) | 新規 `flash.html` + `manifest.json` 追加のみ |

技術的フィージビリティは高く、`pio.cpp` の再利用が可能な構成。最初の実装タスクは `.ino` ファイルの作成と `variant.h` でのピン定義になる。

---

## 作業計画（Claude追記）

### 作業全体像

```
Phase 1: ファームウェア開発
  1.1  platform/esp32/ の新設（pio.h / pio.cpp / midisettings.h）
  1.2  web-pio-xiao-esp32c6/ の新設（.ino / variant.h）
  1.3  単体動作確認（BLE MIDI 接続・SysEx 疎通）

Phase 2: JavaScript ライブラリ更新  ← Phase 1 完了後
  2.1  supportdevices.mjs にデバイスプロファイル追加
  2.2  pomidi.mjs 動作確認（変更不要の見込み）

Phase 3: ファームウェア配布対応  ← Phase 1 完了後（Phase 2 と並行可）
  3.1  build.sh に ESP32C6 ビルドコマンド追加
  3.2  flash.html + manifest.json の新設（ESP Web Tools）

Phase 4: 統合テスト  ← Phase 1・2 完了後
  4.1  GPIO 動作確認（blink / input / pwm / adc）
  4.2  I2C 動作確認（detect / adt7410 / sht40 / vl53l0x）
  4.3  BLE 接続・切断（ホットプラグ）確認
  4.4  ブラウザ・Node.js 両方での動作確認
```

---

### Phase 1: ファームウェア開発

#### 1.1 `firmware/arduino/platform/esp32/` の新設

| ファイル | 内容 | 元ファイルとの関係 |
|---|---|---|
| `midisettings.h` | BLE MIDI 用 MySettings（SysExMaxSize=256 は同値） | pico 版をほぼ流用 |
| `pio.h` | ESP32 版ヘッダ。`Adafruit_TinyUSB` 依存を除去し BLE-MIDI-Transport の MIDI 型に変更 | pico 版から変更 |
| `pio.cpp` | プロトコル実装本体。`SerialTinyUSB` → `Serial` に置換（`#ifdef` 分岐） | pico 版からほぼ流用 |

**`pio.h` の主な変更点:**
```cpp
// pico 版（変更前）
#include <Adafruit_TinyUSB.h>
extern Adafruit_USBD_MIDI usb_midi;
extern midi::MidiInterface<midi::SerialMIDI<Adafruit_USBD_MIDI>, MySettings> MIDI;

// esp32 版（変更後）
#include <BLEMIDI_Transport.h>
#include <hardware/BLEMIDI_ESP32_NimBLE.h>
// MIDI インスタンスは .ino 側で BLEMIDI_CREATE_INSTANCE により生成
```

**`pio.cpp` の変更点:**
```cpp
// SerialTinyUSB.print() / SerialTinyUSB.println() を Serial に置換（全箇所）
// それ以外のプロトコルロジックは変更なし
```

#### 1.2 `firmware/arduino/web-pio-xiao-esp32c6/` の新設

**`variant.h`**: XIAO ESP32C6 のピン定義（要実機確認）

```cpp
// XIAO ESP32C6 ピン割り当て（暫定、実機確認が必要）
// D0=GPIO2, D1=GPIO3, D2=GPIO4, D3=GPIO5
// D4=GPIO6(SDA), D5=GPIO7(SCL)
// D6=GPIO21, D7=GPIO20, D8=GPIO19, D9=GPIO8, D10=GPIO9
// UserLED=GPIO15, ADC対応: D0〜D2
```

**`web-pio-xiao-esp32c6.ino`** の主な構成:

```cpp
#include <BLEMIDI_Transport.h>
#include <hardware/BLEMIDI_ESP32_NimBLE.h>
#include <MIDI.h>
#include <Wire.h>
#include "makeUUID.h"
#include "midisettings.h"
#include "pio.h"

char bleName[32];

void makeBleName() {
  uint64_t mac = ESP.getEfuseMac();
  uint8_t macBytes[8] = {0};
  memcpy(macBytes, &mac, 6); // 6バイト MAC + 2バイトゼロ埋め
  bleName[0..14] = "pio_xiaoESP32C6-";
  convert8bitToAscii(macBytes, &bleName[16]); // makeUUID 再利用
}

BLEMIDI_CREATE_INSTANCE(bleName, MIDI) // BLE デバイス名を動的に設定する方法は要調査

void setup() {
  makeBleName();
  Serial.begin(115200);
  MIDI.begin(MIDI_CHANNEL_OMNI);
  MIDI.turnThruOff();
  Wire.begin(SDA_PIN, SCL_PIN);
  // BLE 接続待ちは不要（BLE MIDI は非同期接続）
  MIDI.setHandleSystemExclusive(handleSysEx);
  initI2CSlaveStatus();
}

void loop() {
  MIDI.read();
  delay(1);
  checkInput();
  checkI2cSlaveStatus();
}
```

> **要調査**: `BLEMIDI_CREATE_INSTANCE` は文字列リテラルを引数に取るため、`char[]` の動的デバイス名をセットする方法を lathoub/BLE-MIDI-Transport の API で確認する必要あり。代替として `BLEMIDI_CREATE_CUSTOM_INSTANCE` 等のオプションを確認する。

#### 1.3 単体動作確認

- BLE MIDI デバイスとして OS にペアリングされることを確認
- Web MIDI API からデバイス名（`pio_xiaoESP32C6-XXXXXXXXX`）が見えることを確認
- SysEx の送受信疎通確認（`DEVICE_INIT` コマンドのみ）

---

### Phase 2: JavaScript ライブラリ更新

#### 2.1 `libs/supportdevices.mjs` にデバイスプロファイル追加

```js
// 追加エントリ（ピン番号は variant.h 確定後に合わせる）
pio_xiaoESP32C6: {
  type: DEF.DEVICE_TYPE_MIDI,
  gpioPorts: [2, 3, 4, 5, 21, 20, 19, 8, 9],
  defaultGpioPort: 2,
  pinNames: ["D0", "D1", "D2", "D3", "D6", "D7", "D8", "D9", "D10"],
  adcPorts: [2, 3, 4],
  defaultAdcPort: 2,
  i2cPorts: [0],
  defaultI2cPort: 0,
  leds: {
    default: { type: DEF.LED_TYPE_MONO },
    0: { type: DEF.LED_TYPE_MONO }
  },
  info: {
    voltage: 3.3,
    reference: "https://wiki.seeedstudio.com/xiao_esp32c6_getting_started/"
  }
}
```

- `find()` は `deviceName.split("-")[0]` でプレフィックス照合するため、BLE Device Name 形式 `"pio_xiaoESP32C6-XXXXXXXXXXX"` は自動的に照合される（変更不要）
- `pomidi.mjs` / `pipeline-midi.mjs` / `pio.mjs` は変更不要の見込み

#### 2.2 `pomidi.mjs` 動作確認

- BLE MIDI は OS ペアリング後に Web MIDI API から USB MIDI と同様に見えるため、`pomidi.mjs` 側の変更は不要のはず
- Node.js 環境では `@julusian/midi` が BLE MIDI デバイスを認識するか確認が必要

---

### Phase 3: ファームウェア配布対応

#### 3.1 `firmware/build.sh` の更新

```bash
# 追加（FQBN は arduino-esp32 3.x 系、要確認）
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C6 --output-dir ./roms ./arduino/web-pio-xiao-esp32c6
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C6 --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-xiao-esp32c6

# ESP32 は .bin を配布（.uf2 は不要なので削除行も不要）
```

> **注意**: ESP32 向けの出力は `.uf2` ではなく `.bin`。既存の `rm -f ./roms/*.bin` 行が邪魔になるため修正が必要。

#### 3.2 ESP Web Tools 用ファイルの新設

`firmware/flash/` ディレクトリを新設:

```
firmware/flash/
  flash.html     ← ブラウザ書き込みページ
  manifest.json  ← デバイス・ファームウェア定義
```

`manifest.json` の構成例：

```json
{
  "name": "web-pio xiao-ESP32C6",
  "version": "1.0.0",
  "builds": [{
    "chipFamily": "ESP32-C6",
    "parts": [{"path": "../roms/web-pio-xiao-esp32c6.bin", "offset": 0}]
  }]
}
```

---

### 作業ファイル一覧

**新規作成:**
- `firmware/arduino/platform/esp32/midisettings.h`
- `firmware/arduino/platform/esp32/pio.h`
- `firmware/arduino/platform/esp32/pio.cpp`
- `firmware/arduino/web-pio-xiao-esp32c6/web-pio-xiao-esp32c6.ino`
- `firmware/arduino/web-pio-xiao-esp32c6/variant.h`
- `firmware/flash/flash.html`
- `firmware/flash/manifest.json`

**変更:**
- `firmware/build.sh` — ESP32C6 ビルドコマンド追加、`.bin` 削除行の修正
- `libs/supportdevices.mjs` — `pio_xiaoESP32C6` プロファイル追加

**変更なし（再利用）:**
- `firmware/arduino/common/makeUUID.cpp/h`
- `libs/pomidi.mjs` / `pipeline-midi.mjs` / `pio.mjs` / `gpio.mjs` / `i2c.mjs`
- `firmware/arduino/platform/pico/pio.cpp`（pio.cpp のプロトコルロジック自体は共通だが、esp32版は別ディレクトリにコピーして Serial 対応）

---

### 未解決事項（作業着手前に確認が必要な項目）

| # | 確認事項 | 影響箇所 |
|---|---|---|
| A | `BLEMIDI_CREATE_INSTANCE` での動的デバイス名の設定方法 | `web-pio-xiao-esp32c6.ino` |
| B | XIAO ESP32C6 の Arduino ピン番号（実機または Seeed Wiki で確認） | `variant.h` / `supportdevices.mjs` |
| C | ESP32C6 向け arduino-cli の FQBN 文字列 | `build.sh` |
| D | Node.js 環境（`@julusian/midi`）で BLE MIDI デバイスを認識できるか | `pomidi.mjs` / README |
| E | XIAO ESP32C6 の `INPUT_PULLDOWN` 対応ピンの制約 | `pio.cpp` の `gpioUnexport()` |

---

## 未解決事項フィージビリティ計画（Claude追記）

### 確認ステップの分類

| 分類 | 項目 | ESP32C6 実機 | 備考 |
|---|---|---|---|
| ソフトウェア調査のみ | B, C, E | 不要 | 既存ツール・ドキュメントで解決 |
| BLE 環境テスト | D | 不要 | 任意の BLE MIDI デバイスで代替可 |
| 実機必須 | A | 必要 | ファームウェア書き込み後に確認 |

---

### 項目 B: Arduino ピン番号 ✅ 解決済み

**確認方法:** インストール済み board package のバリアントファイルを直接参照

```
~/.arduino15/packages/esp32/hardware/esp32/3.3.0/variants/XIAO_ESP32C6/pins_arduino.h
```

**確認結果（`pins_arduino.h` より）:**

| Dピン | Arduino pin # | 備考 |
|---|---|---|
| D0 | 0 | ADC (A0) |
| D1 | 1 | ADC (A1) |
| D2 | 2 | ADC (A2) |
| D3 | 21 | |
| D4 | 22 | SDA → GPIO から除外 |
| D5 | 23 | SCL → GPIO から除外 |
| D6 | 16 | |
| D7 | 17 | |
| D8 | 19 | |
| D9 | 20 | |
| D10 | 18 | |
| LED | 15 | active LOW |

**対応済み:** `web-pio-xiao-esp32c6.ino` の `pinNumbers[]`・`Wire.begin()` および `supportdevices.mjs` の `gpioPorts` / `adcPorts` を修正完了。

---

### 項目 C: arduino-cli FQBN ✅ 解決済み

**確認方法:** `arduino-cli board listall | grep -i XIAO`

**確認結果:**

```
XIAO_ESP32C6    esp32:esp32:XIAO_ESP32C6   (esp32 platform 3.3.0)
```

**対応:** `build.sh` に以下を追加する（Phase 3.1）:

```bash
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C6 --output-dir ./roms ./arduino/web-pio-xiao-esp32c6
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C6 --output-dir ./debug --build-property compiler.cpp.extra_flags="-DDEB" ./arduino/web-pio-xiao-esp32c6
```

---

### 項目 E: INPUT_PULLDOWN 対応ピンの制約 ✅ 解決済み（分析）

**確認方法:** ESP32-C6 Technical Reference Manual の GPIO 章を参照

**確認結果:** ESP32-C6 の全 GPIO ピン（GPIO0〜GPIO30）は PAD 単位でプルアップ・プルダウン抵抗を持つ。使用するピン（Arduino 0, 1, 2, 21, 16, 17, 19, 20, 18）はすべて `INPUT_PULLDOWN` 対応。旧 ESP32 の GPIO34〜39 のような制限なし。

なお `WIFI_ENABLE(GPIO3)` / `WIFI_ANT_CONFIG(GPIO14)` は `pinNumbers[]` に含めていないため問題なし。

**対応:** `pio.cpp` の変更不要。

---

### 項目 D: Node.js (@julusian/midi) での BLE MIDI 認識 ✅ 解決済み

**確認方法:** ESP32C6 実機（`pio_xiaoESP32C6-j3f5__w9000`）を Audio MIDI Setup でペアリング後、以下スクリプトを実行。

```js
// work/test-ble-midi.mjs
import midi from "@julusian/midi";
const input = new midi.Input();
const output = new midi.Output();
for (let i = 0; i < input.getPortCount(); i++) console.log(`[${i}] ${input.getPortName(i)}`);
for (let i = 0; i < output.getPortCount(); i++) console.log(`[${i}] ${output.getPortName(i)}`);
```

**確認結果:**

```
MIDI Input ports:
  [0] IACドライバ バス1
  [1] pio_xiaoESP32C6-j3f5__w9000 Bluetooth
MIDI Output ports:
  [0] IACドライバ バス1
  [1] pio_xiaoESP32C6-j3f5__w9000 Bluetooth
```

macOS では BLE MIDI デバイスが Audio MIDI Setup でペアリングされると CoreMIDI デバイスとして登録される。`@julusian/midi` は CoreMIDI バインディングのため、BLE MIDI デバイスも USB MIDI と同様にポートリストに現れる。

**対応:** `pomidi.mjs` / `pipeline-midi.mjs` の変更不要。Node.js でも BLE MIDI は完全動作する。

---

### 項目 A: BLE デバイス名の動的設定 ✅ 解決済み

**採用方針:** BLE-MIDI ライブラリは NimBLE ではなく BlueDroid バックエンド（`BLEMIDI_ESP32.h`）を採用。

**実装:**

```cpp
BLEMIDI_CREATE_INSTANCE("web-pio", MIDI) // placeholder（実際の名前は BLEDevice::init() で上書き）

void setup() {
  makeBleName();           // eFuse MAC から "pio_xiaoESP32C6-XXXXXXXXXXX" を生成
  BLEDevice::init(bleName); // BLE スタックを正しい名前で初期化
  MIDI.begin(MIDI_CHANNEL_OMNI); // 内部の BLEDevice::init() は initialized フラグでスキップ

  // アドバタイズパケット（31B）はサービス UUID（18B）+フラグ（3B）で満杯のため
  // 27文字のデバイス名はスキャンレスポンスに格納する
  BLEAdvertising *pAdv = BLEDevice::getAdvertising();
  pAdv->stop();
  BLEAdvertisementData scanResp;
  scanResp.setName(bleName);
  pAdv->setScanResponseData(scanResp);
  pAdv->start();
}
```

**確認結果:** Bluetooth MIDI Monitor および `@julusian/midi` でデバイス名 `pio_xiaoESP32C6-j3f5__w9000` が正しく表示された。

**NimBLE を採用しなかった理由:** BLE-MIDI 2.2 が使用する `NimBLESecurity` が NimBLE 2.x で削除済み。NimBLE 1.4.2 は ESP32 core 3.3.0 と非互換（`esp_coexist_internal.h` 欠如）。BlueDroid は ESP32 core に内蔵されており、ライブラリパッチ（`inline` 付与・`String` 型修正・セキュリティ行削除）のみで動作した。


