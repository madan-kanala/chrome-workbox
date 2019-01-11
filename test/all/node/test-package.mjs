/*
  Copyright 2018 Google LLC

  Use of this source code is governed by an MIT-style
  license that can be found in the LICENSE file or at
  https://opensource.org/licenses/MIT.
*/

import glob from 'glob';
import path from 'path';
import fs from 'fs-extra';
import {expect} from 'chai';

import constants from '../../../gulp-tasks/utils/constants';
import pkgPathToName from '../../../gulp-tasks/utils/pkg-path-to-name';

describe(`[all] Test package.json`, function() {
  it(`should expose correct main, browser and module fields`, function() {
    const packageFiles = glob.sync('packages/**/package.json', {
      ignore: ['packages/*/node_modules/**/*'],
      cwd: path.join(__dirname, '..', '..', '..'),
      absolute: true,
    });
    packageFiles.forEach((packagePath) => {
      const pkg = require(packagePath);
      switch (pkg.workbox.packageType) {
        case 'browser': {
          const propertiesToCheck = [
            'main',
            'module',
          ];

          propertiesToCheck.forEach((propertyName) => {
            if (!pkg[propertyName]) {
              throw new Error(`The package.json at '${path.relative(process.cwd(), packagePath)}' isn't exposing a '${propertyName}' property`);
            }

            const fullPath = path.join(path.dirname(packagePath), pkg[propertyName]);
            if (!fs.existsSync(fullPath)) {
              throw new Error(`${path.relative(process.cwd(), packagePath)} has an invalid '${propertyName}' property: '${pkg[propertyName]}'`);
            }
          });
          break;
        }
        case 'window': {
          break;
        }
        case 'node': {
          break;
        }
        default:
          throw new Error(`Unknown package.json workbox.packageType: '${pkg.workbox.packageType}' in ${path.relative(process.cwd(), packagePath)}`);
      }
    });
  });

  it(`should import _version.mjs in each .mjs file`, function() {
    const importRegex = /import\s+'[./]*_version.mjs';/;

    // Find directories with package.json file
    const packageFiles = glob.sync('packages/*/package.json', {
      ignore: ['packages/*/node_modules/**/*'],
      cwd: path.join(__dirname, '..', '..', '..'),
      absolute: true,
    });
    packageFiles.forEach((packagePath) => {
      // skip non-browser modules
      const pkg = require(packagePath);
      if (pkg.workbox.packageType !== 'browser') {
        return;
      }

      // Glob for all js and mjs files in the package
      const packageName = pkgPathToName(path.dirname(packagePath));
      const packageFiles = glob.sync(`packages/${packageName}/**/*.{js,mjs}`, {
        ignore: [
          'packages/*/node_modules/**/*',
          'packages/*/_version.mjs',
          `packages/*/${constants.PACKAGE_BUILD_DIRNAME}/**/*`,
        ],
        cwd: path.join(__dirname, '..', '..', '..'),
        absolute: true,
      });

      // Find the version in each file.
      packageFiles.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath).toString();
        const results = importRegex.exec(fileContents);
        if (!results) {
          throw new Error(`Unable to find the workbox version in '${path.relative(process.cwd(), filePath)}'`);
        }
      });
    });
  });

  it(`should contain the file version`, function() {
    const versionRegex = /['|"]workbox:((?:[^:'"]*|:)*)['|"]/;

    // Find directories with package.json file
    const packageFiles = glob.sync('packages/*/package.json', {
      ignore: ['packages/*/node_modules/**/*'],
      cwd: path.join(__dirname, '..', '..', '..'),
      absolute: true,
    });
    packageFiles.forEach((packagePath) => {
      // skip non-browser modules
      const pkg = require(packagePath);
      if (pkg.workbox.packageType !== 'browser') {
        return;
      }

      // Glob for all js and mjs files in the package
      const packageName = pkgPathToName(path.dirname(packagePath));
      const packageFiles = glob.sync(`packages/${packageName}/${constants.PACKAGE_BUILD_DIRNAME}/**/*.{js,mjs}`, {
        ignore: ['packages/*/node_modules/**/*'],
        cwd: path.join(__dirname, '..', '..', '..'),
        absolute: true,
      });

      // Find the version in each file.
      packageFiles.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath).toString();
        const results = versionRegex.exec(fileContents);
        if (!results) {
          throw new Error(`Unable to find the workbox version in '${path.relative(process.cwd(), filePath)}'`);
        }

        const metadata = results[1].split(':');
        try {
          expect(metadata[0]).to.equal(pkg.name.replace('workbox-', ''));
          expect(metadata[1]).to.equal(pkg.version);
        } catch (err) {
          throw new Error(`Invalid file version ${filePath}: ${metadata}`);
        }
      });
    });
  });

  it(`should have correct details in _version.mjs`, function() {
    const versionRegex = /['|"]workbox:((?:[^:'"]*|:)*)['|"]/;

    // Find directories with package.json file
    const packageFiles = glob.sync('packages/*/package.json', {
      ignore: ['packages/*/node_modules/**/*'],
      cwd: path.join(__dirname, '..', '..', '..'),
      absolute: true,
    });
    packageFiles.forEach((packagePath) => {
      // skip non-browser modules
      const pkg = require(packagePath);
      if (pkg.workbox.packageType !== 'browser') {
        return;
      }

      // Glob for all js and mjs files in the package
      const packageName = pkgPathToName(path.dirname(packagePath));
      const packageFiles = glob.sync(`packages/${packageName}/_version.mjs`, {
        ignore: ['packages/*/node_modules/**/*'],
        cwd: path.join(__dirname, '..', '..', '..'),
        absolute: true,
      });

      // Find the version in each file.
      packageFiles.forEach((filePath) => {
        const fileContents = fs.readFileSync(filePath).toString();
        const results = versionRegex.exec(fileContents);
        if (!results) {
          throw new Error(`Unable to find the workbox version in '${path.relative(process.cwd(), filePath)}'`);
        }

        const metadata = results[1].split(':');
        try {
          expect(metadata[0]).to.equal(pkg.name.replace('workbox-', ''));
          expect(metadata[1]).to.equal(pkg.version);
        } catch (err) {
          throw new Error(`Invalid file version ${filePath}: ${metadata}`);
        }
      });
    });
  });
});
