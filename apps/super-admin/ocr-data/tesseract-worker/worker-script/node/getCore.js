'use strict';

const path = require('path');

// Simplified from tesseract.js's own getCore.js: the original picks between six
// SIMD/relaxed-SIMD/plain x LSTM/legacy WASM core variants at runtime via
// wasm-feature-detect. This app only ever calls createWorker with OEM.LSTM_ONLY
// (see lib/ocr-worker.ts), so the LSTM/non-SIMD variant -- vendored alongside this
// file as tesseract-core-lstm.{js,wasm} -- is the only one that's ever needed. That
// also drops the wasm-feature-detect dependency and the tesseract.js-core package
// entirely, both of which have the same "only reachable via a runtime path" problem
// that required vendoring this worker script in the first place.
let TesseractCore = null;

module.exports = async (_oem, _corePath, res) => {
  if (TesseractCore === null) {
    res.progress({ status: 'loading tesseract core', progress: 0 });
    TesseractCore = require(path.join(__dirname, 'tesseract-core-lstm.js'));
    res.progress({ status: 'loading tesseract core', progress: 1 });
  }
  return TesseractCore;
};
