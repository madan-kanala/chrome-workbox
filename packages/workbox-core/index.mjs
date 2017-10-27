/*
  Copyright 2017 Google Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import defaultExport from './_default.mjs';
import LOG_LEVELS from './models/LogLevels.mjs';
import * as _private from './_private.mjs';
import './_version.mjs';

/**
 * All of the Workbox service worker libraries use workbox-core for shared
 * code as well as setting default values that need to be shared (like cache
 * names).
 *
 * @module workbox-core
 */

/**
 * Utilities that are shared with other Workbox modules.
 *
 * @private
 * @alias module:workbox-core._private
 */

export {
  LOG_LEVELS,
  _private,
};

export default defaultExport;
