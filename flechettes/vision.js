// Automatic dart scoring: geometry and image helpers shared by cameras.html and the tests.
// Board coordinates are millimetres from the bull, x to the right, y downwards, 20 at the top (as seen by the player).
// Image coordinates are normalised (0..1 across the camera frame) so calibration does not depend on resolution.
(function (root) {
  "use strict";
  const ORDER = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
  const RING = { bull: 6.35, obull: 15.9, tIn: 99, tOut: 107, dIn: 162, dOut: 170 }; // standard board, mm

  // The 4 calibration points: outer edge of the double ring on the wires 20|1, 6|10, 3|19 and 11|14.
  const CAL_ANGLES = [-81, 9, 99, 189];
  const CAL_NAMES = ["20 | 1", "6 | 10", "3 | 19", "11 | 14"];
  const rad = a => a * Math.PI / 180;
  const calPoints = () => CAL_ANGLES.map(a => [RING.dOut * Math.cos(rad(a)), RING.dOut * Math.sin(rad(a))]);

  // ---------- homography ----------
  // H maps src -> dst (4 point pairs), returned as 9 numbers row-major.
  function solveH(src, dst) {
    const A = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = src[i], [u, v] = dst[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
    }
    for (let c = 0; c < 8; c++) {                       // Gauss-Jordan with partial pivoting
      let p = c;
      for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      if (Math.abs(A[p][c]) < 1e-12) return null;       // degenerate (3 points aligned)
      [A[c], A[p]] = [A[p], A[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
      }
    }
    const h = A.map((row, i) => row[8] / row[i]);
    h.push(1);
    return h;
  }
  function applyH(H, p) {
    const w = H[6] * p[0] + H[7] * p[1] + H[8];
    return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w];
  }
  function invH(H) {
    const [a, b, c, d, e, f, g, h, i] = H;
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    const det = a * A + b * B + c * C;
    if (Math.abs(det) < 1e-15) return null;
    return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
            B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
            C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
  }
  // homography board(mm) -> image(normalised) from the 4 clicked calibration points
  const calibrate = imgPts => solveH(calPoints(), imgPts);

  // ---------- scoring ----------
  function score(p) {
    const r = Math.hypot(p[0], p[1]);
    if (r <= RING.bull) return { n: 25, m: 2 };
    if (r <= RING.obull) return { n: 25, m: 1 };
    if (r > RING.dOut) return { n: 0, m: 1 };
    const a = Math.atan2(p[1], p[0]) * 180 / Math.PI + 90;      // 0° = straight up
    const n = ORDER[((Math.round(a / 18) % 20) + 20) % 20];
    const m = r >= RING.tIn && r <= RING.tOut ? 3 : r >= RING.dIn ? 2 : 1;
    return { n, m };
  }
  const label = d => d.n === 0 ? "Raté" : d.n === 25 ? (d.m === 2 ? "Bull" : "25") : (d.m === 3 ? "T" : d.m === 2 ? "D" : "S") + d.n;

  // ---------- image processing (grey images as Uint8Array, w*h) ----------
  function toGray(rgba, out) {
    for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
    return out;
  }
  // pixels that changed by more than thr; returns the count
  function diffMask(a, b, thr, mask) {
    let n = 0;
    for (let i = 0; i < a.length; i++) { const on = Math.abs(a[i] - b[i]) > thr ? 1 : 0; mask[i] = on; n += on; }
    return n;
  }
  // count of changed pixels without building a mask (motion check, sampled every `step` pixels)
  function diffCount(a, b, thr, step) {
    let n = 0;
    for (let i = 0; i < a.length; i += step) if (Math.abs(a[i] - b[i]) > thr) n++;
    return n * step;
  }
  // largest 8-connected group of mask pixels
  function largestBlob(mask, w, h) {
    const seen = new Uint8Array(mask.length), stack = new Int32Array(mask.length);
    let best = null;
    for (let s = 0; s < mask.length; s++) {
      if (!mask[s] || seen[s]) continue;
      let top = 0, cur = [];
      stack[top++] = s; seen[s] = 1;
      while (top) {
        const i = stack[--top]; cur.push(i);
        const x = i % w, y = (i - x) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const k = ny * w + nx;
          if (mask[k] && !seen[k]) { seen[k] = 1; stack[top++] = k; }
        }
      }
      if (!best || cur.length > best.length) best = cur;
    }
    return best ? { area: best.length, px: best } : { area: 0, px: [] };
  }
  // The dart tip is the end of the blob on the board side ("down" = towards the bottom of the picture).
  // Returns the tip in pixels, averaged over the last few rows so a single noisy pixel does not move it.
  function tipOf(blob, w, dir) {
    const vert = dir === "down" || dir === "up";
    const sign = dir === "down" || dir === "right" ? 1 : -1;
    let ext = -Infinity;
    const pts = blob.px.map(i => { const x = i % w, y = (i - x) / w; return [x, y]; });
    for (const [x, y] of pts) ext = Math.max(ext, sign * (vert ? y : x));
    let s = 0, n = 0;
    for (const [x, y] of pts) if (sign * (vert ? y : x) >= ext - 2) { s += vert ? x : y; n++; }
    const along = sign * ext + 0.5 * sign, across = s / n + 0.5;
    return vert ? [across, along] : [along, across];
  }
  // Each camera sees the tip precisely sideways but poorly in depth, so it gives a line on the board.
  // obs: [{p:[x,y] board point, d:[dx,dy] unit direction of that line}] -> best board point
  function triangulate(obs) {
    if (!obs.length) return null;
    if (obs.length === 1) return obs[0].p.slice();
    let a = 0, b = 0, c = 0, bx = 0, by = 0;
    for (const o of obs) {
      const [dx, dy] = o.d, nxx = 1 - dx * dx, nxy = -dx * dy, nyy = 1 - dy * dy;
      a += nxx; b += nxy; c += nyy;
      bx += nxx * o.p[0] + nxy * o.p[1];
      by += nxy * o.p[0] + nyy * o.p[1];
    }
    const det = a * c - b * b;
    if (det < 0.05 * obs.length) {        // lines almost parallel: average the points
      return [obs.reduce((s, o) => s + o.p[0], 0) / obs.length, obs.reduce((s, o) => s + o.p[1], 0) / obs.length];
    }
    return [(c * bx - b * by) / det, (a * by - b * bx) / det];
  }
  // tip (normalised image coords) seen by one camera -> its line on the board
  function observe(Hinv, tip, dir) {
    const step = 0.01;
    const off = dir === "down" ? [0, -step] : dir === "up" ? [0, step] : dir === "right" ? [-step, 0] : [step, 0];
    const p = applyH(Hinv, tip), q = applyH(Hinv, [tip[0] + off[0], tip[1] + off[1]]);
    let dx = q[0] - p[0], dy = q[1] - p[1];
    const l = Math.hypot(dx, dy);
    if (!isFinite(l) || l === 0) return null;
    return { p, d: [dx / l, dy / l] };
  }

  const api = { ORDER, RING, CAL_ANGLES, CAL_NAMES, calPoints, solveH, applyH, invH, calibrate, score, label,
                toGray, diffMask, diffCount, largestBlob, tipOf, triangulate, observe };
  root.DartVision = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
