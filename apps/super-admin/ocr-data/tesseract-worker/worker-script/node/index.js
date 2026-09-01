'use strict';

/**
 *
 * Tesseract Worker Script for Node
 *
 * @fileoverview Node worker implementation
 * @author Kevin Kwok <antimatter15@gmail.com>
 * @author Guillermo Webster <gui@mit.edu>
 * @author Jerome Wu <jeromewus@gmail.com>
 */
const path = require('path');
// Use built-in fetch if available, otherwise fallback to node-fetch
const fetch = global.fetch || require('node-fetch');
const { parentPort } = require('worker_threads');
// Vercel's serverless Node runtime intercepts require() for a file loaded as a
// worker_threads entry point and mishandles plain relative specifiers ('..', './x')
// -- every one of these must be an absolute path (see HANDOFF.md's OCR section for
// the full story of how this was diagnosed).
const worker = require(path.join(__dirname, '..', 'index.js'));
const getCore = require(path.join(__dirname, 'getCore.js'));
const gunzip = require(path.join(__dirname, 'gunzip.js'));
const cache = require(path.join(__dirname, 'cache.js'));

/*
 * register message handler
 */
parentPort.on('message', (packet) => {
  worker.dispatchHandlers(packet, (obj) => parentPort.postMessage(obj));
});

worker.setAdapter({
  getCore,
  gunzip,
  fetch,
  ...cache,
});
