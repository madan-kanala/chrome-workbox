import {expect} from 'chai';
import sinon from 'sinon';
import clearRequire from 'clear-require';

import constants from '../../../../../gulp-tasks/utils/constants.js';

constants.BUILD_TYPES.forEach((buildType) => {
  describe(`workbox-core messageGenerator - ${buildType}`, function() {
    const detailsObj = {
      exampleDetail: 'With Value',
    };
    const detailsString = `${JSON.stringify([detailsObj])}`;

    const MSG_GEN_PATH = '../../../../../packages/workbox-core/models/messages/messageGenerator.mjs';
    let sandbox;
    let messageGenerator;

    before(async function() {
      sandbox = sinon.sandbox.create();
      process.env.NODE_ENV = buildType;

      clearRequire.all();

      const messageGenModule = await import(MSG_GEN_PATH);
      messageGenerator = messageGenModule.default;
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should handle unknown codes', function() {
      if (process.env.NODE_ENV === 'production') {
        const message = messageGenerator('fake-code');

        expect(message).to.equal('fake-code');
      } else {
        expect(() => {
          messageGenerator('fake-code');
        }).to.throw();
      }
    });

    it('should return the code with details if the code is unknown', function() {
      if (process.env.NODE_ENV === 'production') {
        const message = messageGenerator('fake-code', detailsObj);
        expect(message).to.equal(`fake-code :: ${detailsString}`);
      } else {
        expect(() => {
          messageGenerator('fake-code', detailsObj);
        }).to.throw();
      }
    });

    it('should throw an error if the code is valid but no required details are defined', function() {
      if (process.env.NODE_ENV === 'production') {
        const message = messageGenerator('invalid-type');
        expect(message).to.equal(`invalid-type`);
      } else {
        expect(() => {
          messageGenerator('invalid-type');
        }).to.throw();
      }
    });

    it('should throw an error if the code is valid but the arguments are missing details', function() {
      if (process.env.NODE_ENV === 'production') {
        const message = messageGenerator('invalid-type', detailsObj);
        expect(message).to.equal(`invalid-type :: ${detailsString}`);
      } else {
        expect(() => {
          messageGenerator('invalid-type', {random: 'details'});
        }).to.throw();
      }
    });

    it('should return the message if the code and details are valid', function() {
      const invalidTypeDetails = {
        paramName: 'Param',
        expectedType: 'Type',
        value: {
          example: 'Value',
        },
      };

      const message = messageGenerator('invalid-type', invalidTypeDetails);
      if (process.env.NODE_ENV === 'production') {
        expect(message).to.equal(`invalid-type :: ${JSON.stringify([invalidTypeDetails])}`);
      } else {
        expect(message.indexOf('invalid-type')).to.equal(-1);
      }
    });
  });
});
