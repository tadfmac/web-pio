/**
 * checkmidi.mjs
 * Estimates and returns Web MIDI API support status from the browser UA.
 *
 * Detection rules:
 *   - iOS (iPhone / iPad / iPod): false
 *   - Android + Opera or Firefox: false
 *   - Android + other: true
 *   - PC + IE (MSIE / Trident): false
 *   - PC + Safari (Safari that is not Chrome): false
 *   - Otherwise: true
 */

/**
 * @returns {boolean} true if Web MIDI API is likely available
 */
export function checkmidi() {
  const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "";

  // iOS (iPhone / iPad / iPod) — always false
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return false;
  }

  const isAndroid = /Android/i.test(ua);

  if (isAndroid) {
    // Android + Opera or Firefox is false
    if (/OPR\/|Opera\/|OPiOS\//i.test(ua)) {
      return false;
    }
    if (/Firefox\//i.test(ua)) {
      return false;
    }
    // Android + other: proceed to API existence check
  }

  // Desktop
  // IE (MSIE or Trident layout engine) is false
  if (/MSIE |Trident\//i.test(ua)) {
    return false;
  }

  // Safari is false (Chrome/Chromium-based browsers also contain "Chrome", so they are excluded)
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    return false;
  }

  // If not blocked by UA check, make final determination based on the existence of navigator.requestMIDIAccess
  return (typeof navigator !== "undefined" && typeof navigator.requestMIDIAccess === "function");
}
