# CLAUDE.md

このファイルはリポジトリ内のコードを扱う際に Claude Code (claude.ai/code) へ提供するガイダンスです。

## プロジェクト概要

**web-pio** は、Web MIDI SysEx 通信を介してブラウザおよび Node.js からマイコン（RP2040/RP2350 ベース）の GPIO・I2C を制御する JavaScript ライブラリです。CHIRIMEN Open Hardware にインスパイアされています。

## コマンド

```bash
# 依存関係のインストール
npm i

# Express 開発サーバーの起動（http://localhost:3100 で配信）
node ./app.mjs

# Node.js サンプルを直接実行
node ./examples/js/gpio/blink.mjs

# CHIRIMEN ドライバのインストール（任意）
cd deps && bash ./install-chirimen-drivers.sh

# Arduino ファームウェアのビルド（Arduino CLI が必要）
cd firmware && ./build.sh
```

lint・テストランナー・バンドラーは設定されていません。コードベースはネイティブ ES モジュール（`.mjs`）を使用しており、トランスパイルは不要です。

```bash
# libs/ と examples/ に Prettier を一括適用
npm run format
```

Prettier の設定は `.prettierrc` で管理しています。適用対象は `libs/**/*.mjs` と `examples/**/*.{mjs,html}` です。主なルール：

- インデント: スペース2
- セミコロン: あり
- クォート: ダブルクォート
- 末尾カンマ: なし
- 行長制限: なし（強制改行しない）

## アーキテクチャ

### 通信レイヤー

すべてのデバイス通信は MIDI SysEx メッセージを経由します。スタック構成：

1. **`pomidi.mjs`** — ブラウザと Node.js の両方で Web MIDI API をラップ（Node.js では `@julusian/midi` を使用）
2. **`pipeline-midi.mjs`** — セッション/ID トラッキングと 5 秒タイムアウト付きの MIDI SysEx リクエスト/レスポンスルーティング
3. **`protocol-const.mjs`** — SysEx プロトコルのフィーチャーコードと方向定数

### ライブラリクラス（`libs/`）

```
Pio (pio.mjs)          — メインオーケストレーター。MIDIDevice インスタンスを管理
MIDIDevice (pio.mjs)   — デバイスごとの抽象化。GPIOAccess と I2CAccess を保持
GPIOAccess / GPIOPort  — GPIO API (gpio.mjs)
I2CAccess / I2CPort / I2CSlaveDevice — I2C API (i2c.mjs)
```

デバイスの機能プロファイル（GPIO/I2C ポートマッピング、ADC、LED）は `supportdevices.mjs` で定義され、`devconfig.mjs` で検証されます。

### API 設計規約

- ES6 Module スタイルの pure javascriptでコーディング
- HTMLは全体インデントなし。javascriptは先頭インデントなしからのタブ2でインデント。

例：
```
<html>
<header>
</header>
<body>
<h1>タイトル</h1>
<main>
<div></div>
<script>
import aaa from "/aaa.mjs";

let a;
for(let cnt=0;cnt<16;cnt++){
  a ++;
}

let b;
if(a > 12){
  b = true;
}else{
  b = false;
}

</script>
</body>
</html>
```
- すべての I/O 操作は async/Promise ベース。エラーは例外をスローせず `null` を返す
- デバイスのホットプラグは `pio.setOnFound()` / `pio.setOnLeave()` / `pio.setOnChange()` コールバックで処理
- デバッグログは各モジュール内の `DEB` フラグで制御

### 対応デバイス

現在の対応デバイスは、RP2040/RP2350を搭載した下記マイコンです。
- Seeed Studio XIAO RP2040
- Seeed Studio XIAO RP2350
- Raspberry Pi Pico
- Raspberry Pi Pico 2

ただし、将来 BLE-MIDIを経由した制御（PC側は Web Bluetooth ではなく、Web MIDIのまま）を計画しており、ESP32シリーズを採用予定です。

各デバイスのファームウェアの構成は下記の通りです。
- `firmware/arduino/` ファームウエアソースコードのルート
  - `firmware/arduino/common` プラットフォーム共通のコード
  - `firmware/arduino/platform/` プラットフォームで共通のコード
    - `firmware/arduino/platform/pico` RP2040/RP2350プラットフォーム用の共通コード
    - `firmware/arduino/platform/esp32` (現在は無いが、将来作成予定のESP32用の共通コード)
- `firmware/roms/` ビルド済みの各マイコン向けのROMファイル
- `firmware/web-pio-raspi-pico` Raspberry Pi Pico用のファームウエアルート
- `firmware/web-pio-raspi-pico2` Raspberry Pi Pico 2用のファームウエアルート
- `firmware/web-pio-xiao-RP2040` XIAO RP2040用のファームウエアルート
- `firmware/web-pio-xiao-RP2350` XIAO RP2350用のファームウエアルート

### サンプル構成

examples は javascript 初心者向けに、web-pio の利用方法を簡潔に伝えることを目的に、極力エラー処理などは書かずに目的のデバイスを制御する必要最低限のコードを目指して記述しています。

また、exampleのコードをブラウザ用とNode.js用で共通化するために、共通の ES6 Moduleを呼び出す構造としています。

`examples/js/` — Node.js 用（`.mjs`）
`examples/browser/` — ブラウザ用（`.html`）
いずれも GPIO（blink、input、pwm、adc）と I2C（detect、adt7410、sht40、vl53l0x）をカバーしています。

