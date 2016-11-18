/*
 Copyright 2016 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import RequestWrapper from './request-wrapper';

/**
 * This a base class meant to be extended by other classes that implement
 * specific request strategies.
 *
 * @memberof module:sw-runtime-caching
 */
class Handler {
  /**
   * @param {Object} input
   * @param {RequestWrapper} [input.requestWrapper] An optional `RequestWrapper`
   *        that is used to configure the cache name and request behaviors. If
   *        not provided, a new `RequestWrapper` using the
   *        [default cache name](#defaultCacheName) will be used.
   */
  constructor({requestWrapper} = {}) {
    if (requestWrapper) {
      this.requestWrapper = requestWrapper;
    } else {
      this.requestWrapper = new RequestWrapper();
    }
  }

  /**
   * An abstract method that each subclass must implement.
   *
   * @abstract
   * @param {Object} input
   * @param {FetchEvent} input.event The event that triggered the service
   *        worker's fetch handler.
   * @param {Object} [input.params] Additional parameters that might be passed
   *        in to the method. If used in conjunction with the `Route` class,
   *        then the return value from the `match` function in `Route` will
   *        be passed in via this parameter.
   * @return {Promise.<Response>} A response, obtained from whichever strategy
   *         is implemented.
   */
  handle({event, params} = {}) {
    throw Error('This abstract method must be implemented in a subclass.');
  }
}

export default Handler;
