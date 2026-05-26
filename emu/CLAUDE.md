# CLAUDE.md

## 目的

[web-pio](https://github.com/tadfmac/web-pio) 用のGPIO Webエミュレータを作成します。

将来的にはI2Cについても対応予定ですが、今回対象とするのは GPIOのみです。
このPJでは、一旦 parts/ フォルダ配下にある fritzing パーツを元に、SVG でボードの表示を行い、ボード のGPIOの横（ボードの右側のGPIOピンはその右側、ボードの左側のGPIOピンはその左側）に状態表示を行います。

一旦、表示機能（emuviwer.mjs）のみ作成します。
インターフェースは下記でお願いします。

class emuViewer{
  constructor(deviceName){
    // 指定された deviceName の device表示を 指定されたdomの子要素として作成する。
    // サイズはdomのサイズに合わせる
    // deviceName = supportedDevices の key
    //   pio_xiaoRP2040
    //   pio_xiaoRP2350
    //   pio_RaspiPico
    //   pio_RaspiPico2
    //   pio_xiaoESP32C6
    // deviceName は this.deviceName に保存しておく
  }
  async init(){
    // 非同期の初期化処理はこちら。
    // 各マイコンのGPIOを起動時のGPIO状態に設定する
  }
  async set(pinNum,direction,value){
    // 指定された GPIOピンの状態を変更する
  }
  async get(pinNum){
    // 指定された GPIOピンの状態を取得する
  }
  async getAll(){
    // 全GPIOピンの状態を取得する
  }
  resize(){
    // 親domのサイズが変更された時に呼び出す。サイズに合わせて再描画
  }
  setOnGPIOChange(func){
    // this.onGPIOChange に func を設定する
    // this.onGPIOCHange は 下記条件で呼び出される。パラメータは this.deviceName, pinNum, direction, value
    // direction が "in" or "in-pullup" かつ、value が変更になった時
  }

}

## コードルール

- HTML インデントしない
- pureJS
  - タブ2
  - 行末; あり
  - let const 利用、 var 利用しない
  - 命名は camelCase で
- jsファイルは全て ES6 Moduleで作成 .mjs で保存

## 状態表示の方法

状態は下記ルールで表示します。

- direction "none" は表示しない。水色の背景に黒字（border-radiusなし）
  - "none" : 未 export 状態 (初期値) 表示しない
  - "in" : input で export 済み
  - "out" : output で export 済み
  - "in-pullup" : in-pullup で export 済み
  - "pwm" : pwm で　export 済み
  - "adc" : adc で export 済み
- value
  - "HIGH" : HIGH 状態 (赤色に白字 border-radiusなし)
  - "LOW" : LOW 状態 (灰色に白字 border-radiusなし)
  - "数字" : PWMのduty or Analog値 (0-255) 紺色に白字

## 実装について

- test.html テスト用のhtml。内部で emuViewer をimport し表示を行う
- emuviewer.mjs 今回実装するライブラリ本体

## 実装済み内容（2026-05-11時点）

### emuviewer.mjs

**公開API:**
- `constructor(dom, deviceName)` — 指定domの子要素としてビューアを構築
- `async init()` — SVG読み込み・DOM構築・ResizeObserver登録
- `destroy()` — ResizeObserver解除・DOM削除
- `async set(pinNum, direction, value)` — ピン状態更新
- `async get(pinNum)` — ピン状態取得
- `async getAll()` — 全ピン状態取得
- `getPins()` — `{left:[{gpio,label},...], right:[...]}` を返す
- `resize()` — 手動リサイズトリガー（ResizeObserverが自動対応するため通常不要）
- `setOnGPIOChange(func)` — `this.onGPIOChange` にコールバックを設定

**レイアウト設計:**
- svgWrap（`position:relative`）にSVGと左右ピン列（`position:absolute; right/left:100%`）を格納
- rootを`display:flex; justify-content:center`でdomに対してセンタリング
- `_fitToContainer()` は解析的アプローチでフォントサイズ計算（反復法は振動するため不使用）
  - 参照サイズ11pxでcolWを1回計測 → スケール係数k取得 → 幅・高さ両制約を数式で同時に解く
  - プローブは select 要素を使って実際の幅を計測

**ピンラベル:** 0パディング統一（D00〜D10、GP00〜GP28）

**dirBadge 表示:**
- 全directionで固定幅（`width:5ch; text-align:center`）に揃えて表示
- "in-pullup" は "in-pu" と略称表示（`DIR_DISPLAY` テーブルで変換）

**UI入力（direction に応じて切り替え）:**
- "in" / "in-pullup" → `<select>` で HIGH/LOW を選択可能
- "adc" → `<input type="number" min=0 max=255>` で数値入力（`width:4ch`）
- 上記以外 → 従来のバッジ（valBadge）表示のみ
- UI操作後は `this.set()` を呼び出し、onGPIOChange も発火

**onGPIOChange コールバック:**
- `set()` 実行時、direction が "in" or "in-pullup" かつ value が変化した場合に呼び出し
- パラメータ: `(deviceName, pinNum, direction, value)`
- "in"/"in-pullup" の value は内部で "HIGH"/"LOW" に正規化して保存

### test.html

- viewer-container: `width:100%; resize:both; overflow:hidden` でマウスリサイズ可能
- 各ボード: 左側2ピン＋右側2ピンのテストボタン（OUT HIGH/LOW/IN/IN-PULLUP/ADC/PWM/reset all）
- 全ビューアで `setOnGPIOChange` を設定し、画面上部のイベントログエリアに表示



