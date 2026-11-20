// Natural French voice computed inside the browser: Piper neural text-to-speech (https://github.com/rhasspy/piper)
// run with onnxruntime-web. Every file is served from voix/ next to the app, so it works offline once downloaded.
(function (root) {
  "use strict";
  const BASE = "voix/";
  const CACHE = "darts-voix-v1";
  let ortP = null, phonP = null, phonQueue = Promise.resolve();
  const voices = {};

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = res; s.onerror = () => rej(new Error("chargement impossible : " + src));
      document.head.appendChild(s);
    });
  }
  // big files (voice model): kept in the browser cache after the first download, with progress
  async function fetchBig(url, onProgress) {
    let cache = null;
    try { cache = await caches.open(CACHE); const hit = await cache.match(url); if (hit) return await hit.arrayBuffer(); } catch (e) {}
    const r = await fetch(url);
    if (!r.ok) throw new Error("téléchargement impossible : " + url + " (" + r.status + ")");
    const total = +r.headers.get("content-length") || 0;
    let buf;
    if (r.body && r.body.getReader && onProgress) {
      const reader = r.body.getReader(), parts = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value); got += value.length;
        onProgress(got, total);
      }
      buf = new Uint8Array(got); let o = 0;
      for (const p of parts) { buf.set(p, o); o += p.length; }
      buf = buf.buffer;
    } else buf = await r.arrayBuffer();
    try { if (cache) await cache.put(url, new Response(buf.slice(0), { headers: { "Content-Type": "application/octet-stream" } })); } catch (e) {}
    return buf;
  }

  function getOrt() {
    if (!ortP) ortP = loadScript(BASE + "ort.wasm.min.js").then(() => {
      root.ort.env.wasm.wasmPaths = new URL(BASE, location.href).href;
      root.ort.env.wasm.numThreads = 1;
      return root.ort;
    });
    return ortP;
  }

  // espeak-ng phonemizer (WebAssembly). One instance, reused for every sentence.
  let printCb = null;
  function getPhonemizer() {
    if (!phonP) phonP = loadScript(BASE + "piper_phonemize.js").then(() => root.createPiperPhonemize({
      print: line => { if (printCb) printCb(line); },
      printErr: () => {},
      locateFile: f => BASE + f
    }));
    return phonP;
  }
  function phonemize(text, lang) {
    const job = phonQueue.then(async () => {
      const mod = await getPhonemizer();
      return await new Promise((resolve, reject) => {
        printCb = line => { try { resolve(JSON.parse(line).phoneme_ids); } catch (e) { reject(e); } };
        try { mod.callMain(["-l", lang, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]); }
        catch (e) { reject(e); }
      });
    });
    phonQueue = job.catch(() => {});
    return job;
  }

  async function load(name, onProgress) {
    if (voices[name]) return voices[name];
    const p = (async () => {
      const ort = await getOrt();
      const cfg = await (await fetch(BASE + name + ".onnx.json")).json();
      const model = await fetchBig(BASE + name + ".onnx", onProgress);
      const session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"] });
      await getPhonemizer();
      return { name, cfg, session, ort };
    })();
    voices[name] = p;
    p.catch(() => { delete voices[name]; });
    return p;
  }

  // text -> {pcm: Float32Array, sampleRate}
  async function synth(name, text, opts) {
    const v = await load(name);
    const o = Object.assign({ speaker: 0, speed: 1 }, opts || {});
    const parts = text.split(/(?<=[.!?…])\s+/).map(s => s.trim()).filter(Boolean);
    const pcms = [];
    for (const part of parts) {
      const ids = await phonemize(part, v.cfg.espeak.voice);
      const T = v.ort.Tensor, inf = v.cfg.inference;
      const feeds = {
        input: new T("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]),
        input_lengths: new T("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
        scales: new T("float32", Float32Array.from([inf.noise_scale, inf.length_scale / o.speed, inf.noise_w]), [3])
      };
      if (Object.keys(v.cfg.speaker_id_map || {}).length) feeds.sid = new T("int64", BigInt64Array.from([BigInt(o.speaker)]), [1]);
      const out = await v.session.run(feeds);
      pcms.push(out.output.data);
      pcms.push(new Float32Array(Math.round(v.cfg.audio.sample_rate * 0.12)));   // short pause between sentences
    }
    const len = pcms.reduce((s, a) => s + a.length, 0), pcm = new Float32Array(len);
    let off = 0; for (const a of pcms) { pcm.set(a, off); off += a.length; }
    return { pcm, sampleRate: v.cfg.audio.sample_rate };
  }

  async function isDownloaded(name) {
    try { const c = await caches.open(CACHE); return !!(await c.match(BASE + name + ".onnx")); } catch (e) { return false; }
  }

  root.PiperTTS = { load, synth, isDownloaded };
})(window);
