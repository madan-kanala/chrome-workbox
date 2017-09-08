import {expect} from 'chai';
import sinon from 'sinon';
import clearRequire from 'clear-require';

import expectError from '../../../infra/utils/expectError';
import constants from '../../../gulp-tasks/utils/constants.js';

describe(`WorkboxPrecaching`, function() {
  let sandbox;

  before(function() {
    sandbox = sinon.sandbox.create();
  });

  beforeEach(function() {
    clearRequire.all();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe(`Used in a window`, function() {
    it(`should throw in dev builds when loaded outside of a service worker`, async function() {
      process.env.NODE_ENV = 'dev';

      return expectError(async () => {
        await import('../../../packages/workbox-precaching/index.mjs');
      }, 'not-in-sw', (err) => {
        expect(err.details).to.have.property('moduleName').that.equal('workbox-precaching');
      });
    });

    it(`should not throw in dev builds when in SW`, async function() {
      process.env.NODE_ENV = 'dev';

      const coreModule = await import('../../../packages/workbox-core/index.mjs');
      sandbox.stub(coreModule.default.assert, 'isSwEnv').callsFake(() => true);

      await import('../../../packages/workbox-precaching/index.mjs');
    });

    it(`should not throw in production builds`, async function() {
      process.env.NODE_ENV = 'production';

      await import('../../../packages/workbox-precaching/index.mjs')
    });
  });
});
