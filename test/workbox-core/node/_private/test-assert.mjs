import sinon from 'sinon';
import {expect} from 'chai';
import expectError from '../../../../infra/testing/expectError';
import {devOnly, prodOnly} from '../../../../infra/testing/env-it';
import assert from '../../../../packages/workbox-core/_private/assert';

describe(`workbox-core  assert`, function() {
  describe(`Production Environment`, function() {
    prodOnly.it(`should return null`, function() {
      expect(assert).to.equal(null);
    });
  });

  describe(`isSwEnv`, function() {
    let sandbox;
    before(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    devOnly.it(`should throw if ServiceWorkerGlobalScope is not defined`, async function() {
      const originalServiceWorkerGlobalScope = global.ServiceWorkerGlobalScope;
      delete global.ServiceWorkerGlobalScope;

      await expectError(() => assert.isSwEnv('example-module'), 'not-in-sw');

      global.ServiceWorkerGlobalScope = originalServiceWorkerGlobalScope;
    });

    devOnly.it(`should return false if self is not an instance of ServiceWorkerGlobalScope`, function() {
      sandbox.stub(global, 'self').value({});

      return expectError(() => assert.isSwEnv('example-module'), 'not-in-sw');
    });

    devOnly.it(`should not throw is self is an instance of ServiceWorkerGlobalScope`, function() {
      sandbox.stub(global, 'self').value(new ServiceWorkerGlobalScope());
      assert.isSwEnv('example-module');
    });
  });

  describe(`isArray`, function() {
    devOnly.it(`shouldn't throw when given an array`, function() {
      assert.isArray([], {
        moduleName: 'module',
        className: 'class',
        funcName: 'func',
        paramName: 'param',
      });
    });

    devOnly.it(`should throw when value isn't an array`, function() {
      return expectError(() => {
        assert.isArray({}, {
          moduleName: 'module',
          className: 'class',
          funcName: 'func',
          paramName: 'param',
        });
      }, 'not-an-array');
    });
  });

  describe(`hasMethod`, function() {
    devOnly.it(`should throw when it has no method`, function() {
      return expectError(() => {
        assert.hasMethod({}, 'methodName', {
          moduleName: 'module',
          className: 'class',
          funcName: 'func',
          paramName: 'param',
        });
      }, 'missing-a-method');
    });

    devOnly.it(`should throw when it has no method`, function() {
      assert.hasMethod({methodName: () => {}}, 'methodName', {
        moduleName: 'module',
        className: 'class',
        funcName: 'func',
        paramName: 'param',
      });
    });
  });

  describe(`isInstance`, function() {
    devOnly.it(`should throw when it is not an instance`, function() {
      class Example {}
      return expectError(() => {
        assert.isInstance({}, Example, {
          moduleName: 'module',
          className: 'class',
          funcName: 'func',
          paramName: 'param',
        });
      }, 'incorrect-class');
    });

    devOnly.it(`should not throw when it is an instance`, function() {
      class Example {}
      assert.isInstance(new Example(), Example, {
        moduleName: 'module',
        className: 'class',
        funcName: 'func',
        paramName: 'param',
      });
    });
  });

  describe(`isOneOf`, function() {
    devOnly.it(`should throw when it is not an instance`, function() {
      return expectError(() => {
        assert.isOneOf('not-ok', ['ok-value'], {
          moduleName: 'module',
          className: 'class',
          funcName: 'func',
          paramName: 'param',
        });
      }, 'invalid-value');
    });

    devOnly.it(`should throw when it is not an instance`, function() {
      assert.isOneOf('ok-value', ['ok-value'], {
        moduleName: 'module',
        className: 'class',
        funcName: 'func',
        paramName: 'param',
      });
    });
  });
});
