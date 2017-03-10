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

import assert from '../../../../lib/assert';
import {defaultMethod, validMethods} from './constants';

/**
 * A `Route` allows you to tell a service worker that it should handle
 * certain network requests using a specific response strategy.
 *
 * Two configuration options are required:
 *
 * - A `match` function, which examines
 * an incoming [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request)
 * to determine whether this `Route` should apply. The function should return
 * a [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy) value
 * if the `Route` matches, in which case that return value is passed along to
 * the `handle` function.
 * - A `handler` object, which should in turn have a function defined on it
 * named `handle`. This `handle` function is given the incoming request along
 * with any additional parameters generated during the `match`, and returns a
 * Promise for a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response).
 *
 * Instead of implementing your own `handler`, you can use one of the
 * pre-defined runtime caching strategies from the
 * {@link module:sw-runtime-caching|sw-runtime-caching} module.
 *
 * While you can use `Route` directly, the [`RegExpRoute`]{@link RegExpRoute}
 * and [`ExpressRoute`]{@link ExpressRoute} subclasses provide a convenient
 * wrapper with a nicer interface for using regular expressions or Express-style
 * routes as the `match` criteria.
 *
 * @example
 * // Any navigation requests for URLs that start with /path/to/ will match.
 * const route = new goog.routing.Route({
 *   match: ({url, event}) => {
 *     return event.request.mode === 'navigation' &&
 *            url.pathname.startsWith('/path/to/');
 *   },
 *   handler: ({event}) => {
 *     // Do something that returns a Promise.<Response>, like:
 *     return caches.match(event.request);
 *   },
 * });
 *
 * const router = new goog.routing.Router();
 * router.registerRoute({route});
 *
 * @memberof module:sw-routing
 */
class Route {
  /**
   * Constructor for Route class.
   * @param {Object} input
   * @param {function} input.match The function that determines whether the
   *        route matches. The function is passed an object with two properties:
   *        `url`, which is a [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL),
   *        and `event`, which is a [FetchEvent](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent).
   *        `match` should return a truthy value when the route applies, and
   *        that value is passed on to the handle function.
   * @param {function|Object} input.handler A function, or an Object with a
   *        `handle` method. As parameters, the handler is passed object with
   *        the same `url` and `event` properties as `match` received, along
   *        with an additional property, `params`, set to the truthy value
   *        `match` returned.
   * @param {string} [input.method] Only match requests that use this
   *        HTTP method. Defaults to `'GET'` if not specified.
   */
  constructor({match, handler, method} = {}) {
    assert.isType({match}, 'function');
    if (typeof handler === 'object') {
      assert.hasMethod({handler}, 'handle');
    } else {
      assert.isType({handler}, 'function');
    }


    this.match = match;
    // Normalize things so that even if the handler is a function, this.handler
    // gets set to an object with a handle method.
    this.handler = typeof handler === 'function' ? {handle: handler} : handler;
    if (method) {
      assert.isOneOf({method}, validMethods);
      this.method = method;
    } else {
      this.method = defaultMethod;
    }
  }
}

export default Route;
