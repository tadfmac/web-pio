/**
 * checkmidi.mjs
 * ブラウザの UA から Web MIDI API の対応状況を推定して返す。
 *
 * 判定ルール:
 *   - iOS (iPhone / iPad / iPod): false
 *   - Android + Opera または Firefox: false
 *   - Android + その他: true
 *   - PC + IE (MSIE / Trident): false
 *   - PC + Safari (Chrome でない Safari): false
 *   - それ以外: true
 */

/**
 * @returns {boolean} Web MIDI API が使える可能性が高い場合 true
 */
export function checkmidi() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "";

  // iOS (iPhone / iPad / iPod) — 全般 false
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return false;
  }

  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    // Android + Opera または Firefox は false
    if (/OPR\/|Opera\/|OPiOS\//i.test(ua)) {
      return false;
    }
    if (/Firefox\//i.test(ua)) {
      return false;
    }
    // Android + その他は API 存在確認へ
  }

  // PC 系
  // IE (MSIE または Trident レイアウトエンジン) は false
  if (/MSIE |Trident\//i.test(ua)) {
    return false;
  }

  // Safari は false（Chrome/Chromium ベースは "Chrome" も含むため除外）
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    return false;
  }

  // UA で弾かれなかった場合は navigator.requestMIDIAccess の存在で最終判定
  return (typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function");
}
