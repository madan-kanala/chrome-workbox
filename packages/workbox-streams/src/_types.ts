/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import './_version.js';

/**
 * @typedef {Response|ReadableStream|BodyInit} StreamSource
 * @memberof workbox.streams
 */

export type StreamSource = Response | ReadableStream | BodyInit;
