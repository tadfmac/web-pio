const BASE_URL = new URL('.', import.meta.url).href;

// gpio: null のピンは I2C 専用（GPIO 制御不可）。i2c プロパティで SDA/SCL バッジを表示する。
const SUPPORTED_DEVICES = {
  pio_xiaoRP2040: {
    svgFile: 'svgs/xiaoRP2040.svg',
    svgRotate: 0,
    leftPins: [
      {gpio: 26,   label: 'D00', y: 21.0},
      {gpio: 27,   label: 'D01', y: 31.8},
      {gpio: 28,   label: 'D02', y: 42.6},
      {gpio: 29,   label: 'D03', y: 53.5},
      {gpio: null, label: 'D04', y: 64.3, i2c: 'SDA 0'},
      {gpio: null, label: 'D05', y: 75.1, i2c: 'SCL 0'},
      {gpio: 0,    label: 'D06', y: 85.9},
    ],
    rightPins: [
      {gpio: null, pwr: '5V',   y: 21.0},
      {gpio: null, pwr: 'GND',  y: 31.8},
      {gpio: null, pwr: '3.3V', y: 42.6},
      {gpio: 3,  label: 'D10', y: 53.5},
      {gpio: 4,  label: 'D09', y: 64.3},
      {gpio: 2,  label: 'D08', y: 75.1},
      {gpio: 1,  label: 'D07', y: 85.8},
    ],
  },
  pio_xiaoRP2350: {
    svgFile: 'svgs/xiaoRP2350.svg',
    svgRotate: 0,
    leftPins: [
      {gpio: 26,   label: 'D00', y: 21.0},
      {gpio: 27,   label: 'D01', y: 31.8},
      {gpio: 28,   label: 'D02', y: 42.6},
      {gpio: 5,    label: 'D03', y: 53.5},
      {gpio: null, label: 'D04', y: 64.3, i2c: 'SDA 1'},
      {gpio: null, label: 'D05', y: 75.1, i2c: 'SCL 1'},
      {gpio: 0,    label: 'D06', y: 85.9},
    ],
    rightPins: [
      {gpio: null, pwr: '5V',   y: 21.0},
      {gpio: null, pwr: 'GND',  y: 31.8},
      {gpio: null, pwr: '3.3V', y: 42.6},
      {gpio: 3,  label: 'D10', y: 53.5},
      {gpio: 4,  label: 'D09', y: 64.3},
      {gpio: 2,  label: 'D08', y: 75.1},
      {gpio: 1,  label: 'D07', y: 85.8},
    ],
  },
  pio_xiaoESP32C6: {
    svgFile: 'svgs/xiaoESP32C6.svg',
    svgRotate: 90,
    leftPins: [
      {gpio: 0,    label: 'D00', y: 21.0},
      {gpio: 1,    label: 'D01', y: 31.8},
      {gpio: 2,    label: 'D02', y: 42.6},
      {gpio: 21,   label: 'D03', y: 53.5},
      {gpio: null, label: 'D04', y: 64.3, i2c: 'SDA 0'},
      {gpio: null, label: 'D05', y: 75.1, i2c: 'SCL 0'},
      {gpio: 16,   label: 'D06', y: 85.9},
    ],
    rightPins: [
      {gpio: null, pwr: '5V',   y: 21.0},
      {gpio: null, pwr: 'GND',  y: 31.8},
      {gpio: null, pwr: '3.3V', y: 42.6},
      {gpio: 18, label: 'D10', y: 53.5},
      {gpio: 20, label: 'D09', y: 64.3},
      {gpio: 19, label: 'D08', y: 75.1},
      {gpio: 17, label: 'D07', y: 85.8},
    ],
  },
  pio_RaspiPico: {
    svgFile: 'svgs/raspiPico.svg',
    svgRotate: 0,
    leftPins: [
      {gpio: 0,    label: 'GP00', y: 6.4},
      {gpio: 1,    label: 'GP01', y: 11.1},
      {gpio: null, pwr: 'GND',   y: 15.8}, // pin3
      {gpio: 2,    label: 'GP02', y: 20.7},
      {gpio: 3,    label: 'GP03', y: 25.5},
      {gpio: 4,    label: 'GP04', y: 30.3},
      {gpio: 5,    label: 'GP05', y: 35.0},
      {gpio: null, pwr: 'GND',   y: 39.7}, // pin8
      {gpio: 6,    label: 'GP06', y: 44.7},
      {gpio: 7,    label: 'GP07', y: 49.5},
      {gpio: 8,    label: 'GP08', y: 54.3},
      {gpio: 9,    label: 'GP09', y: 59.0},
      {gpio: null, pwr: 'GND',   y: 63.7}, // pin13
      {gpio: 10,   label: 'GP10', y: 68.7},
      {gpio: 11,   label: 'GP11', y: 73.4},
      {gpio: 12,   label: 'GP12', y: 78.3},
      {gpio: 13,   label: 'GP13', y: 83.0},
      {gpio: null, pwr: 'GND',   y: 87.7}, // pin18
      {gpio: null, i2c: 'SDA 1', y: 92.7}, // GP14 Wire1 SDA
      {gpio: null, i2c: 'SCL 1', y: 97.4}, // GP15 Wire1 SCL
    ],
    rightPins: [
      {gpio: null, pwr: '5V',   y: 6.4},  // VBUS  pin40 (VSYS/pin39 skip)
      {gpio: null, pwr: 'GND',  y: 15.8}, // GND   pin38 (3V3_EN/pin37 skip)
      {gpio: null, pwr: '3.3V', y: 25.2}, // 3V3   pin36 (ADC_VREF/pin35 skip)
      {gpio: 28,   label: 'GP28', y: 35.0},
      {gpio: null, pwr: 'GND',   y: 39.7}, // pin33
      {gpio: 27,   label: 'GP27', y: 44.7},
      {gpio: 26,   label: 'GP26', y: 49.5},
      {gpio: 22,   label: 'GP22', y: 59.1},
      {gpio: null, pwr: 'GND',   y: 63.8}, // pin28
      {gpio: 21,   label: 'GP21', y: 68.7},
      {gpio: 20,   label: 'GP20', y: 73.4},
      {gpio: 19,   label: 'GP19', y: 78.2},
      {gpio: 18,   label: 'GP18', y: 83.0},
      {gpio: null, pwr: 'GND',   y: 87.7}, // pin23
      {gpio: null, i2c: 'SCL 0', y: 92.7}, // GP17 Wire SCL
      {gpio: null, i2c: 'SDA 0', y: 97.4}, // GP16 Wire SDA
    ],
  },
  pio_RaspiPico2: {
    svgFile: 'svgs/raspiPico2.svg',
    svgRotate: 0,
    leftPins: [
      {gpio: 0,    label: 'GP00', y: 6.4},
      {gpio: 1,    label: 'GP01', y: 11.1},
      {gpio: null, pwr: 'GND',   y: 15.8}, // pin3
      {gpio: 2,    label: 'GP02', y: 20.7},
      {gpio: 3,    label: 'GP03', y: 25.5},
      {gpio: 4,    label: 'GP04', y: 30.3},
      {gpio: 5,    label: 'GP05', y: 35.0},
      {gpio: null, pwr: 'GND',   y: 39.7}, // pin8
      {gpio: 6,    label: 'GP06', y: 44.7},
      {gpio: 7,    label: 'GP07', y: 49.5},
      {gpio: 8,    label: 'GP08', y: 54.3},
      {gpio: 9,    label: 'GP09', y: 59.0},
      {gpio: null, pwr: 'GND',   y: 63.7}, // pin13
      {gpio: 10,   label: 'GP10', y: 68.7},
      {gpio: 11,   label: 'GP11', y: 73.4},
      {gpio: 12,   label: 'GP12', y: 78.3},
      {gpio: 13,   label: 'GP13', y: 83.0},
      {gpio: null, pwr: 'GND',   y: 87.7}, // pin18
      {gpio: null, i2c: 'SDA 1', y: 92.7}, // GP14 Wire1 SDA
      {gpio: null, i2c: 'SCL 1', y: 97.4}, // GP15 Wire1 SCL
    ],
    rightPins: [
      {gpio: null, pwr: '5V',   y: 6.4},  // VBUS  pin40 (VSYS/pin39 skip)
      {gpio: null, pwr: 'GND',  y: 15.8}, // GND   pin38 (3V3_EN/pin37 skip)
      {gpio: null, pwr: '3.3V', y: 25.2}, // 3V3   pin36 (ADC_VREF/pin35 skip)
      {gpio: 28,   label: 'GP28', y: 35.0},
      {gpio: null, pwr: 'GND',   y: 39.7}, // pin33
      {gpio: 27,   label: 'GP27', y: 44.7},
      {gpio: 26,   label: 'GP26', y: 49.5},
      {gpio: 22,   label: 'GP22', y: 59.1},
      {gpio: null, pwr: 'GND',   y: 63.8}, // pin28
      {gpio: 21,   label: 'GP21', y: 68.7},
      {gpio: 20,   label: 'GP20', y: 73.4},
      {gpio: 19,   label: 'GP19', y: 78.2},
      {gpio: 18,   label: 'GP18', y: 83.0},
      {gpio: null, pwr: 'GND',   y: 87.7}, // pin23
      {gpio: null, i2c: 'SCL 0', y: 92.7}, // GP17 Wire SCL
      {gpio: null, i2c: 'SDA 0', y: 97.4}, // GP16 Wire SDA
    ],
  },
};

export class emuViewer {
  constructor(dom, deviceName) {
    this._dom = dom;
    this._deviceName = deviceName;
    this._config = SUPPORTED_DEVICES[deviceName];
    this._pinStates = new Map();
    this._pinElements = new Map();
    this._root = null;
    this._svgWrap = null;
    this._leftCol = null;
    this._rightCol = null;
    this._svgAr = 1;
    this.onGPIOChange = null;
  }

  async init() {
    const config = this._config;
    // gpio: null のピン（I2C専用）は pinStates に登録しない
    [...config.leftPins, ...config.rightPins].forEach(pin => {
      if (pin.gpio !== null) {
        this._pinStates.set(pin.gpio, {direction: 'none', value: null});
      }
    });
    await this._buildDOM();
    this._ro = new ResizeObserver(() => this._fitToContainer());
    this._ro.observe(this._dom);
  }

  destroy() {
    if (this._ro) {
      this._ro.disconnect();
      this._ro = null;
    }
    if (this._root) {
      this._root.remove();
      this._root = null;
    }
  }

  setOnGPIOChange(func) {
    this.onGPIOChange = func;
  }

  async set(pinNum, direction, value) {
    const state = this._pinStates.get(pinNum);
    if (!state) return;
    const oldValue = state.value;
    state.direction = direction;

    let normalized;
    if (direction === 'in' || direction === 'in-pullup') {
      normalized = (value === 1 || value === true || value === 'HIGH') ? 'HIGH' : 'LOW';
    } else {
      normalized = (value !== undefined) ? value : null;
    }
    state.value = normalized;

    this._updatePinDisplay(pinNum);

    if (this.onGPIOChange &&
        (direction === 'in' || direction === 'in-pullup') &&
        normalized !== oldValue) {
      this.onGPIOChange(this._deviceName, pinNum, direction, normalized);
    }
  }

  async get(pinNum) {
    const state = this._pinStates.get(pinNum);
    return state ? {...state} : null;
  }

  async getAll() {
    const result = {};
    for (const [gpio, state] of this._pinStates) {
      result[gpio] = {...state};
    }
    return result;
  }

  // gpio: null ピン（I2C専用）は返さない
  getPins() {
    return {
      left:  this._config.leftPins.filter(p => p.gpio !== null).map(p => ({gpio: p.gpio, label: p.label})),
      right: this._config.rightPins.filter(p => p.gpio !== null).map(p => ({gpio: p.gpio, label: p.label})),
    };
  }

  resize() {
    this._fitToContainer();
  }

  async _buildDOM() {
    const root = document.createElement('div');
    root.style.cssText = [
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'width:100%',
      'height:100%',
      'box-sizing:border-box',
      'font-family:monospace',
      'font-size:11px',
      'background:#fff',
    ].join(';');

    const svgWrap = await this._buildSVGWrap();
    const leftCol = this._buildPinCol('left');
    const rightCol = this._buildPinCol('right');

    svgWrap.appendChild(leftCol);
    svgWrap.appendChild(rightCol);
    root.appendChild(svgWrap);

    this._svgWrap = svgWrap;
    this._leftCol = leftCol;
    this._rightCol = rightCol;
    this._root = root;
    this._dom.appendChild(root);

    this._fitToContainer();
  }

  _fitToContainer() {
    if (!this._svgWrap || !this._svgAr) return;
    const domW = this._dom.clientWidth;
    const domH = this._dom.clientHeight;
    if (!domW || !domH) return;
    const minGap = this._minPinGap();
    const svgAr = this._svgAr;
    const gapFactor = minGap / 100;

    const fRef = 11;
    this._root.style.fontSize = fRef + 'px';
    const colRef = this._measureMaxColWidth();
    const k = colRef / fRef;

    const fMaxWidth = (gapFactor * domW / svgAr - 2) / (1 + gapFactor * 2 * k / svgAr);
    const fMaxHeight = gapFactor * domH - 2;
    const fontSize = Math.max(8, Math.floor(Math.min(fMaxWidth, fMaxHeight)));

    const availW = Math.max(0, domW - k * fontSize * 2);
    const svgH = Math.floor(Math.min(domH, availW / svgAr));
    if (svgH <= 0) return;

    this._svgWrap.style.height = svgH + 'px';
    this._root.style.fontSize = fontSize + 'px';
  }

  _measureMaxColWidth() {
    // GPIO 制御ピン（gpio !== null）の中で最長ラベルを使って計測
    const gpioOnlyPins = [...this._config.leftPins, ...this._config.rightPins].filter(p => p.gpio !== null);
    const maxLabel = gpioOnlyPins.reduce((a, b) => b.label.length > a.label.length ? b : a).label;

    const probe = document.createElement('div');
    probe.style.cssText = [
      'position:fixed',
      'top:-9999px',
      'left:0',
      'visibility:hidden',
      'white-space:nowrap',
      'line-height:1',
      'font-family:monospace',
      `font-size:${this._root.style.fontSize}`,
      'display:flex',
      'align-items:center',
      'gap:2px',
    ].join(';');

    const lbl = document.createElement('span');
    lbl.textContent = maxLabel;
    const dir = document.createElement('span');
    dir.style.cssText = 'padding:1px 3px;width:5ch;text-align:center;box-sizing:content-box;display:inline-block;';
    dir.textContent = 'in-pu';
    const sel = document.createElement('select');
    sel.style.cssText = `font-size:${this._root.style.fontSize};padding:1px 2px;`;
    sel.appendChild(new Option('HIGH', 'HIGH'));
    sel.appendChild(new Option('LOW', 'LOW'));

    probe.appendChild(lbl);
    probe.appendChild(dir);
    probe.appendChild(sel);
    document.body.appendChild(probe);
    const w = probe.offsetWidth;
    document.body.removeChild(probe);
    return w;
  }

  _minPinGap() {
    let min = Infinity;
    for (const pins of [this._config.leftPins, this._config.rightPins]) {
      for (let i = 1; i < pins.length; i++) {
        min = Math.min(min, pins[i].y - pins[i - 1].y);
      }
    }
    return min;
  }

  _buildPwrBadge(pwrLabel) {
    const isGND = pwrLabel === 'GND';
    const badge = document.createElement('span');
    badge.textContent = pwrLabel;
    badge.style.cssText = [
      'display:inline-block',
      'min-width:4em',
      'padding:1px 3px',
      'box-sizing:border-box',
      'text-align:center',
      isGND ? 'background:#111;color:white' : 'background:#dc2626;color:white',
      'font-size:0.85em',
      'line-height:1.2',
      'flex-shrink:0',
    ].join(';');
    return badge;
  }

  _buildI2CBadge(i2cLabel) {
    const isSDA = i2cLabel.startsWith('SDA');
    const badge = document.createElement('span');
    badge.textContent = i2cLabel;
    badge.style.cssText = [
      'display:inline-block',
      'min-width:4em',
      'padding:1px 3px',
      'box-sizing:border-box',
      'text-align:center',
      isSDA ? 'background:#facc15;color:#333' : 'background:#fda4af;color:#333',
      'font-size:0.85em',
      'line-height:1.2',
      'flex-shrink:0',
    ].join(';');
    return badge;
  }

  _buildPinCol(side) {
    const col = document.createElement('div');
    col.style.cssText = [
      'position:absolute',
      'top:0',
      'height:100%',
      side === 'left' ? 'right:100%' : 'left:100%',
      'min-width:68px',
    ].join(';');

    const pins = side === 'left' ? this._config.leftPins : this._config.rightPins;

    for (const pin of pins) {
      const row = document.createElement('div');
      row.style.cssText = [
        'position:absolute',
        `top:${pin.y}%`,
        'transform:translateY(-50%)',
        'display:flex',
        'align-items:center',
        'gap:2px',
        'white-space:nowrap',
        'line-height:1',
      ].join(';');

      const label = document.createElement('span');
      label.textContent = pin.label;
      label.style.cssText = 'color:#444;';

      if (pin.gpio === null) {
        // 電源ピン / I2C 専用ピン: バッジのみ表示
        let badge = null;
        if (pin.pwr) {
          badge = this._buildPwrBadge(pin.pwr);
        } else if (pin.i2c) {
          badge = this._buildI2CBadge(pin.i2c);
        }
        if (side === 'left') {
          row.style.right = '0';
        } else {
          row.style.left = '0';
        }
        if (badge) row.appendChild(badge);
        col.appendChild(row);
        continue;
      }

      // GPIO 制御ピン（i2c プロパティがある場合は badge も表示）
      const i2cBadge = pin.i2c ? this._buildI2CBadge(pin.i2c) : null;

      const dirBadge = document.createElement('span');
      dirBadge.style.cssText = [
        'display:none',
        'padding:1px 3px',
        'width:5ch',
        'text-align:center',
        'box-sizing:content-box',
        'background:cyan',
        'color:black',
      ].join(';');

      const valBadge = document.createElement('span');
      valBadge.style.cssText = [
        'display:none',
        'padding:1px 3px',
        'color:white',
      ].join(';');

      const valSelect = document.createElement('select');
      valSelect.style.cssText = 'display:none;font-size:inherit;padding:1px 2px;cursor:pointer;';
      valSelect.appendChild(new Option('HIGH', 'HIGH'));
      valSelect.appendChild(new Option('LOW', 'LOW'));
      valSelect.addEventListener('change', async () => {
        const state = this._pinStates.get(pin.gpio);
        if (!state) return;
        await this.set(pin.gpio, state.direction, valSelect.value);
      });

      const valInput = document.createElement('input');
      valInput.type = 'number';
      valInput.min = '0';
      valInput.max = '255';
      valInput.style.cssText = 'display:none;font-size:inherit;width:4ch;padding:1px 2px;box-sizing:content-box;';
      valInput.addEventListener('change', async () => {
        const state = this._pinStates.get(pin.gpio);
        if (!state) return;
        const v = Math.max(0, Math.min(255, parseInt(valInput.value, 10) || 0));
        await this.set(pin.gpio, state.direction, v);
      });

      if (side === 'left') {
        row.style.right = '0';
        row.appendChild(valInput);
        row.appendChild(valSelect);
        row.appendChild(valBadge);
        row.appendChild(dirBadge);
        if (i2cBadge) row.appendChild(i2cBadge);
        row.appendChild(label);
      } else {
        row.style.left = '0';
        row.appendChild(label);
        if (i2cBadge) row.appendChild(i2cBadge);
        row.appendChild(dirBadge);
        row.appendChild(valBadge);
        row.appendChild(valSelect);
        row.appendChild(valInput);
      }

      col.appendChild(row);
      this._pinElements.set(pin.gpio, {dirBadge, valBadge, valSelect, valInput});
    }

    return col;
  }

  async _buildSVGWrap() {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;flex-shrink:0;';

    const config = this._config;
    const svgUrl = new URL(config.svgFile, BASE_URL).href;
    const res = await fetch(svgUrl);
    const svgText = await res.text();
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;

    const vb = svgEl.getAttribute('viewBox').split(' ').map(Number);
    const [, , vbW, vbH] = vb;

    if (config.svgRotate !== 0) {
      svgEl.setAttribute('viewBox', `0 0 ${vbH} ${vbW}`);
      svgEl.setAttribute('width', `${vbH}mm`);
      svgEl.setAttribute('height', `${vbW}mm`);
      const ns = 'http://www.w3.org/2000/svg';
      const g = svgDoc.createElementNS(ns, 'g');
      g.setAttribute('transform', `translate(${vbH},0) rotate(90)`);
      while (svgEl.firstChild) g.appendChild(svgEl.firstChild);
      svgEl.appendChild(g);
      this._svgAr = vbH / vbW;
    } else {
      this._svgAr = vbW / vbH;
    }

    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');

    const imported = document.importNode(svgEl, true);
    imported.style.cssText = 'height:100%;width:auto;display:block;';
    wrap.appendChild(imported);

    return wrap;
  }

  _updatePinDisplay(gpio) {
    const elems = this._pinElements.get(gpio);
    const state = this._pinStates.get(gpio);
    if (!elems || !state) return;

    const {dirBadge, valBadge, valSelect, valInput} = elems;

    valBadge.style.display = 'none';
    valSelect.style.display = 'none';
    valInput.style.display = 'none';

    if (state.direction === 'none') {
      dirBadge.style.display = 'none';
      return;
    }

    const DIR_DISPLAY = {'in-pullup': 'in-pu'};
    dirBadge.style.display = 'inline-block';
    dirBadge.textContent = DIR_DISPLAY[state.direction] || state.direction;

    const v = state.value;

    if (state.direction === 'in' || state.direction === 'in-pullup') {
      valSelect.style.display = 'inline-block';
      valSelect.value = (v === 'HIGH') ? 'HIGH' : 'LOW';
    } else if (state.direction === 'adc') {
      valInput.style.display = 'inline-block';
      valInput.value = (v !== null && v !== undefined) ? String(v) : '0';
    } else {
      if (v === null || v === undefined) return;
      valBadge.style.display = 'inline-block';

      if (state.direction === 'pwm') {
        valBadge.style.background = 'navy';
        valBadge.textContent = String(v);
      } else if (v === 1 || v === true || v === 'HIGH') {
        valBadge.style.background = 'red';
        valBadge.textContent = 'HIGH';
      } else {
        valBadge.style.background = 'gray';
        valBadge.textContent = 'LOW';
      }
    }
  }
}
