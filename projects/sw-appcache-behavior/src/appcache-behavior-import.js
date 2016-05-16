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

/* eslint-env worker, serviceworker */

(function(global) {
  'use strict';
  // Code in the ServiceWorkerGlobalScope can safely assume that a greater
  // set of ES2015 features are available, without having to transpile.

  global.goog = global.goog || {};

  const log = global.goog.DEBUG ? console.debug.bind(console) : () => {};

  const constants = require('./lib/constants.js');
  const idb = require('./lib/idb-helpers.js');

  /**
   * Determines what the most likely URL is associated with the client page from
   * which the event's request originates. This is used to determine which
   * AppCache manifest's rules should be applied.
   *
   * @private
   * @param {FetchEvent} event
   * @returns {Promise.<String>} The client URL
   */
  function getClientUrlForEvent(event) {
    // If our service worker implementation supports client identifiers, try
    // to get the client URL using that.
    return global.clients.get(event.clientId)
      .then(client => client.url)
      // If those aren't supported, .catch() any errors and try something else.
      .catch(error => {
        log('Error while using clients.get(event.clientId).url: ' + error);
        // Firefox currently sets the referer to 'about:client' for initial
        // navigations, but that's not useful for our purposes.
        if (event.request.referrer &&
            event.request.referrer !== 'about:client') {
          return event.request.referrer;
        }

        // Use the event's request URL as the last resort, with the assumption
        // that this is a navigation request.
        return event.request.url;
      });
  }

  /**
   * Finds the longest matching prefix, given an array of possible matches.
   *
   * @private
   * @param {Array.<String>} urlPrefixes
   * @param {String} fullUrl
   * @returns {String} The longest matching prefix, or '' if none match
   */
  function longestMatchingPrefix(urlPrefixes, fullUrl) {
    return urlPrefixes
      .filter(urlPrefix => fullUrl.startsWith(urlPrefix))
      .reduce((longestSoFar, current) => {
        return longestSoFar.length >= current.length ? longestSoFar : current;
      }, '');
  }

  /**
   * Performs a fetch(), using a cached response as a fallback if that fails.
   *
   * @private
   * @param {Request} request
   * @param {String} fallbackUrl
   * @param {String} cacheName
   * @returns {Promise.<Response>}
   */
  function fetchWithFallback(request, fallbackUrl, cacheName) {
    log('Trying fetch for', request.url);
    return fetch(request).then(response => {
      // Succesful but error-like responses are treated as failures.
      // Ditto for redirects to other origins.
      if (!response.ok || (new URL(response.url).origin !== location.origin)) {
        throw Error('Fallback request failure.');
      }
      return response;
    }).catch(() => {
      log('fetch() failed. Falling back to cache of', fallbackUrl);
      return caches.open(cacheName).then(
        cache => cache.match(fallbackUrl));
    });
  }

  /**
   * Checks IndexedDB for a manifest with a given URL. If found, it fulfills
   * with info about the latest version.
   *
   * @private
   * @param {String} manifestUrl
   * @returns {Promise.<Object>}
   */
  function getLatestManifestVersion(manifestUrl) {
    return idb.get(constants.STORES.MANIFEST_URL_TO_CONTENTS, manifestUrl)
      .then(versions => {
        if (versions && versions.length) {
          return versions[versions.length - 1];
        }
      });
  }

  /**
   * Checks IndexedDB for a manifest with a given URL, versioned with the
   * given hash. If found, it fulfills with the parsed manifest.
   *
   * @private
   * @param {String} manifestUrl
   * @param {String} manifestHash
   * @returns {Promise.<Object>}
   */
  function getParsedManifestVersion(manifestUrl, manifestHash) {
    return idb.get(constants.STORES.MANIFEST_URL_TO_CONTENTS, manifestUrl)
      .then(versions => {
        versions = versions || [];
        log('versions is', versions);
        return versions.reduce((result, current) => {
          log('current is', current);
          // If we already have a result, just keep returning it.
          if (result) {
            log('result is', result);
            return result;
          }

          // Otherwise, check to see if the hashes match. If so, use the parsed
          // manifest for the current entry as the result.
          if (current.hash === manifestHash) {
            log('manifestHash match', current);
            return current.parsed;
          }

          return null;
        }, null);
      });
  }

  /**
   * Updates the CLIENT_ID_TO_HASH store in IndexedDB with the client id to
   * hash association.
   *
   * @private
   * @param {String} clientId
   * @param {String} hash
   * @returns {Promise.<T>}
   */
  function saveClientIdAndHash(clientId, hash) {
    if (clientId) {
      return idb.put(constants.STORES.CLIENT_ID_TO_HASH, clientId, hash);
    }

    // Return a fulfilled Promise so that we can still call .then().
    return Promise.resolve();
  }

  /**
   * Implements the actual AppCache logic, given a specific manifest and hash
   * used as a cache identifier.
   *
   * @private
   * @param {FetchEvent} event
   * @param {Object} manifest
   * @param {String} hash
   * @param {String} clientUrl
   * @returns {Promise.<Response>}
   */
  function appCacheLogic(event, manifest, hash, clientUrl) {
    log('manifest is', manifest, 'version is', hash);
    const requestUrl = event.request.url;

    // Is our request URL listed in the CACHES section?
    // Or is our request URL the client URL, since any page that
    // registers a manifest is treated as if it were in the CACHE?
    if (manifest.cache.includes(requestUrl) || requestUrl === clientUrl) {
      log('CACHE includes URL; using cache.match()');
      // If so, return the cached response.
      return caches.open(hash).then(cache => cache.match(requestUrl));
    }

    // Otherwise, check the FALLBACK section next.
    // FALLBACK keys are URL prefixes, and if more than one prefix
    // matches our request URL, the longest prefix "wins".
    // (Of course, it might be that none of the prefixes match.)
    const fallbackKey = longestMatchingPrefix(Object.keys(manifest.fallback),
      requestUrl);
    if (fallbackKey) {
      log('fallbackKey in parsedManifest matches', fallbackKey);
      return fetchWithFallback(event.request, manifest.fallback[fallbackKey],
        hash);
    }

    // If CACHE and FALLBACK don't apply, try NETWORK.
    if (manifest.network.includes(requestUrl) ||
        manifest.network.includes('*')) {
      log('Match or * in NETWORK; using fetch()');
      return fetch(event.request);
    }

    // If nothing matches, then return an error response.
    log('Nothing matches; using Response.error()');
    return Response.error();
  }

  /**
   * The behavior when there's a matching manifest for our client URL.
   *
   * @private
   * @param {FetchEvent} event
   * @param {String} manifestUrl
   * @param {String} clientUrl
   * @returns {Promise.<Response>}
   */
  function manifestBehavior(event, manifestUrl, clientUrl) {
    if (event.clientId) {
      return idb.get(constants.STORES.CLIENT_ID_TO_HASH, event.clientId)
        .then(hash => {
          // If we already have a hash assigned to this client id, use that
          // manifest to implement the AppCache logic.
          if (hash) {
            return getParsedManifestVersion(manifestUrl, hash)
              .then(parsedManifest => appCacheLogic(event, parsedManifest, hash,
                clientUrl));
          }

          // If there's isn't yet a hash for this client id, then get the latest
          // version of the manifest, and use that to implement AppCache logic.
          // Also, establish the client id to hash mapping for future use.
          return getLatestManifestVersion(manifestUrl).then(latest => {
            return saveClientIdAndHash(event.clientId, latest.hash)
              .then(() => appCacheLogic(event, latest.parsed, latest.hash,
                clientUrl));
          });
        });
    }

    // If there's no client id, then just use the latest version of the
    // manifest to implement AppCache logic.
    return getLatestManifestVersion(manifestUrl).then(
      latest => appCacheLogic(event, latest.parsed, latest.hash, clientUrl));
  }

  /**
   * The behavior when there is no matching manifest for our client URL.
   *
   * @private
   * @param {FetchEvent} event
   * @returns {Promise.<Response>}
   */
  function noManifestBehavior(event) {
    // If we fall through to this point, then we don't have a known
    // manifest associated with the client making the request.
    // We now need to check to see if our request URL matches a prefix
    // from the FALLBACK section of *any* manifest in our origin. If
    // there are multiple matches, the longest prefix wins. If there are
    // multiple prefixes of the same length in different manifest, then
    // the one returned last from IDB wins. (This might not match
    // browser behavior.)
    // See https://www.w3.org/TR/2011/WD-html5-20110525/offline.html#concept-appcache-matches-fallback
    return idb.getAll(constants.STORES.MANIFEST_URL_TO_CONTENTS)
      .then(manifests => {
        log('All manifests:', manifests);
        // Use .map() to create an array of the longest matching prefix
        // for each manifest. If no prefixes match for a given manifest,
        // the value will be ''.
        const longestForEach = manifests.map(manifestVersions => {
          // Use the latest version of a given manifest.
          const parsedManifest =
            manifestVersions[manifestVersions.length - 1].parsed;
          return longestMatchingPrefix(
            Object.keys(parsedManifest.fallback), event.request.url);
        });
        log('longestForEach:', longestForEach);

        // Next, find which of the longest matching prefixes from each
        // manifest is the longest overall. Return both the index of the
        // manifest in which that match appears and the prefix itself.
        const longest = longestForEach.reduce((soFar, current, i) => {
          if (current.length >= soFar.prefix.length) {
            return {prefix: current, index: i};
          }

          return soFar;
        }, {prefix: '', index: 0});
        log('longest:', longest);

        // Now that we know the longest overall prefix, we'll use that
        // to lookup the fallback URL value in the winning manifest.
        const fallbackKey = longest.prefix;
        log('fallbackKey:', fallbackKey);
        if (fallbackKey) {
          const winningManifest = manifests[longest.index];
          log('winningManifest:', winningManifest);
          const winningManifestVersion =
            winningManifest[winningManifest.length - 1];
          log('winningManifestVersion:', winningManifestVersion);
          const hash = winningManifestVersion.hash;
          const parsedManifest = winningManifestVersion.parsed;
          return fetchWithFallback(event.request,
            parsedManifest.fallback[fallbackKey], hash);
        }

        // If nothing matches, then just fetch().
        log('Nothing at all matches. Using fetch()');
        return fetch(event.request);
      });
  }

  /**
   * An attempt to mimic AppCache behavior, using the primitives available to
   * a service worker.
   *
   * @private
   * @param {FetchEvent} event
   * @returns {Promise.<Response>}
   */
  function appCacheBehaviorForEvent(event) {
    const requestUrl = new URL(event.request.url);
    log('Starting appCacheBehaviorForUrl for ' + requestUrl);

    // If this is a request that, as per the AppCache spec, should be handled
    // via a direct fetch(), then do that and bail early.
    if (event.request.headers.get('X-Use-Fetch') === 'true') {
      log('Using fetch() because X-Use-Fetch: true');
      return fetch(event.request);
    }

    // Appcache rules only apply to GETs & same-scheme requests.
    if (event.request.method !== 'GET' ||
        requestUrl.protocol !== location.protocol) {
      log('Using fetch() because AppCache does not apply to this request.');
      return fetch(event.request);
    }

    return getClientUrlForEvent(event).then(clientUrl => {
      log('clientUrl is', clientUrl);
      return idb.get(constants.STORES.PATH_TO_MANIFEST, clientUrl)
        .then(manifestUrl => {
          log('manifestUrl is', manifestUrl);

          if (manifestUrl) {
            return manifestBehavior(event, manifestUrl, clientUrl);
          }

          log('No matching manifest for client found.');
          return noManifestBehavior(event);
        });
    });
  }

  /**
   * Given a list of client ids that are still active, this:
   * 1. Gets a list of all the client ids in IndexedDB's CLIENT_ID_TO_HASH
   * 2. Filters them to remove the active ones
   * 3. Delete the inactive entries from IndexedDB's CLIENT_ID_TO_HASH
   * 4. For each inactive one, return the corresponding hash association.
   *
   * @private
   * @param {Array.<String>} idsOfActiveClients
   * @returns {Promise.<Array.<String>>}
   */
  function cleanupClientIdAndHash(idsOfActiveClients) {
    return idb.getAllKeys(constants.STORES.CLIENT_ID_TO_HASH)
      .then(allKnownIds => {
        return allKnownIds.filter(id => !idsOfActiveClients.includes(id));
      }).then(idsOfInactiveClients => {
        return Promise.all(idsOfInactiveClients.map(id => {
          return idb.get(constants.STORES.CLIENT_ID_TO_HASH, id).then(hash => {
            return idb.delete(constants.STORES.CLIENT_ID_TO_HASH, id)
              .then(() => hash);
          });
        }));
      });
  }

  /**
   * Fulfills with an array of all the hash ids that correspond to outdated
   * manifest versions.
   *
   * @private
   * @returns {Promise.<Array.<String>>}
   */
  function getHashesOfOlderVersions() {
    return idb.getAll(constants.STORES.MANIFEST_URL_TO_CONTENTS)
      .then(manifests => {
        return manifests.map(versions => {
          // versions.slice(0, -1) will give all the versions other than the
          // last, or [] if there's aren't any older versions.
          return versions.slice(0, -1).map(version => version.hash);
        }).reduce((prev, curr) => {
          // Flatten the array-of-arrays into an array.
          return prev.concat(curr);
        }, []);
      });
  }

  /**
   * Does the following:
   * 1. Gets a list of all client ids associated with this service worker.
   * 2. Calls cleanupClientIdAndHash() to remove the out of date client id
   *    to hash associations.
   * 3. Calls getHashesOfOlderVersions() to get a list of all the hashes
   *    that correspond to out-of-date manifest versions.
   * 4. If there's a match between an out of date hash and a hash that is no
   *    longer being used by a client, then it deletes the corresponding cache.
   *
   * @private
   * @returns {Promise.<T>}
   */
  function cleanupOldCaches() {
    global.clients.matchAll().then(clients => {
      return clients.map(client => client.id);
    }).then(idsOfActiveClients => {
      return cleanupClientIdAndHash(idsOfActiveClients);
    }).then(hashesNotInUse => {
      return getHashesOfOlderVersions().then(hashesOfOlderVersions => {
        return hashesOfOlderVersions.filter(hashOfOlderVersion => {
          return hashesNotInUse.includes(hashOfOlderVersion);
        });
      });
    }).then(idsToDelete => {
      log('deleting cache ids', idsToDelete);
      return Promise.all(idsToDelete.map(cacheId => caches.delete(cacheId)));
    });

    // TODO: Delete the entry in the array stored in MANIFEST_URL_TO_CONTENT.
  }

  /**
   * The main entry point into the library.
   * It is meant to be called by a service worker's `fetch` event handler:
   *
   *     self.addEventListener('fetch', event => {
   *       event.respondWith(goog.legacyAppCacheBehavior(event).catch(error => {
   *         // Fallback behavior goes here, e.g. return fetch(event.request);
   *       }));
   *     });
   *
   * `goog.legacyAppCacheBehavior()` can be selectively applied to only a subset
   * of requests, to aid in the migration off of App Cache and onto a more
   * robust service worker implementation:
   *
   *     self.addEventListener('fetch', event => {
   *       if (event.request.url.match(/legacyRegex/)) {
   *         event.respondWith(goog.legacyAppCacheBehavior(event));
   *       } else {
   *         event.respondWith(robustServiceWorkerBehavior(event));
   *       }
   *     });
   *
   * @param {FetchEvent} event
   * @returns {Promise.<Response>}
   */
  global.goog.legacyAppCacheBehavior = event => {
    log('client id is', event.clientId);
    return appCacheBehaviorForEvent(event).then(response => {
      // If this is a navigation, clean up unused caches that correspond to old
      // AppCache manifest versions which are no longer associated with an
      // active client. This will be done asynchronously, and won't block the
      // response from being returned to the onfetch handler.
      if (event.request.mode === 'navigate') {
        cleanupOldCaches();
      }

      return response;
    });
  };
})(self);
