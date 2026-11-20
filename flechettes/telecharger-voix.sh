#!/bin/sh
# Remplit flechettes/voix/ avec la voix IA « Jessica » (Piper fr_FR-upmc-medium, CC BY-SA 4.0) et son moteur
# (onnxruntime-web, MIT ; piper-phonemize/espeak-ng, GPL). Ces fichiers (~105 Mo) ne sont pas dans Git.
set -e
cd "$(dirname "$0")"
mkdir -p voix tmp-voix && cd tmp-voix
npm pack --silent onnxruntime-web@1.20.1 @diffusionstudio/piper-wasm@1.0.0 >/dev/null 2>&1
tar xzf onnxruntime-web-1.20.1.tgz && cp package/dist/ort.wasm.min.js package/dist/ort-wasm-simd-threaded.mjs package/dist/ort-wasm-simd-threaded.wasm ../voix/ && rm -rf package
tar xzf diffusionstudio-piper-wasm-1.0.0.tgz && cp package/build/piper_phonemize.js package/build/piper_phonemize.wasm package/build/piper_phonemize.data ../voix/ && rm -rf package
curl -sL https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-fr_FR-upmc-medium.tar.bz2 | tar xj
cp vits-piper-fr_FR-upmc-medium/fr_FR-upmc-medium.onnx vits-piper-fr_FR-upmc-medium/fr_FR-upmc-medium.onnx.json ../voix/
cd .. && rm -rf tmp-voix
echo "voix/ prête :" && ls -la voix
