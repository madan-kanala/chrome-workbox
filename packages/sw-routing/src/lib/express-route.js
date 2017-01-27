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

import ErrorFactory from './error-factory';
import Route from './route';
import pathToRegExp from 'path-to-regexp';

/**
 * `ExpressRoute` is a helper class to make defining Express-style
 * [Routes]{@link Route} easy.
 *
 * Under the hood, it uses the [`path-to-regexp`](https://www.npmjs.com/package/path-to-regexp)
 * library to transform the `path` parameter into a regular expression, which is
 * then matched against the URL's path.
 *
 * Please note that `ExpressRoute` can only match requests for URLs that are on
 * the same-origin as the current page. If you need to match cross-origin
 * requests, you can use either a generic [`Route`]{@link Route} or a
 * [`RegExpRoute`]{@link RegExpRoute}.
 *
 * @example
 * // Any same-origin requests that start with /path/to and end with one
 * // additional path segment will match this route, with the last path
 * // segment passed along to the handler via params.file.
 * const route = new goog.routing.ExpressRoute({
 *   path: '/path/to/:file',
 *   handler: {
 *     handle: ({event, params}) => {
 *       // params.file will be set based on the request URL that matched.
 *       // Do something that returns a Promise.<Response>, like:
 *       return caches.match(event.request);
 *     },
 *   },
 * });
 *
 * const router = new goog.routing.Router();
 * router.registerRoute({route});
 *
 * @memberof module:sw-routing
 * @extends Route
 */
class ExpressRoute extends Route {
  /**
   * Constructor for ExpressRoute.
   *
   * @param {Object} input
   * @param {string} input.path The path to use for routing.
   *        If the path contains [named parameters](https://github.com/pillarjs/path-to-regexp#named-parameters),
   *        then an Object mapping parameter names to the corresponding value
   *        will be passed to the handler via `params`.
   * @param {Object} input.handler - An Object with a `handle` method that
   *        will be used to respond to matching requests.
   * @param {string} [input.method] Only match requests that use this
   *        HTTP method. Defaults to `'GET'` if not specified.
   */
  constructor({path, handler, method}) {
    if (path.substring(0, 1) !== '/') {
      throw ErrorFactory.createError('express-route-requires-absolute-path');
    }

    let keys = [];
    // keys is populated as a side effect of pathToRegExp. This isn't the nicest
    // API, but so it goes.
    // https://github.com/pillarjs/path-to-regexp#usage
    const regExp = pathToRegExp(path, keys);
    const match = ({url}) => {
      // Return null immediately if we have a cross-origin request.
      if (url.origin !== location.origin) {
        return null;
      }

      const regexpMatches = url.pathname.match(regExp);
      // Return null immediately if this route doesn't match.
      if (!regexpMatches) {
        return null;
      }

      // If the route does match, then collect values for all the named
      // parameters that were returned in keys.
      // If there are no named parameters then this will end up returning {},
      // which is truthy, and therefore a sufficient return value.
      const namedParamsToValues = {};
      keys.forEach((key, index) => {
        namedParamsToValues[key.name] = regexpMatches[index + 1];
      });

      return namedParamsToValues;
    };

    super({match, handler, method});
  }
}

export default ExpressRoute;
