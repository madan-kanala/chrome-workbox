/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

const ExtendableEvent = require('./ExtendableEvent');

// FetchEvent
// https://www.w3.org/TR/service-workers-1/#fetch-event-section
class FetchEvent extends ExtendableEvent {
  constructor(type, init = {}) {
    super(type, init);

    if (!init.request) {
      throw new TypeError(`Failed to construct 'FetchEvent': ` +
          `Missing required member(s): request.`);
    }

    this.request = init.request;
    this.clientId = init.clientId || null;
    this.isReload = init.isReload || false;
  }

  respondWith(promise) {
    this._extendLifetimePromises.add(promise);
  }
}

module.exports = FetchEvent;
