/**
 * Copyright 2016 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/

'use strict';

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const minimist = require('minimist');
const updateNotifier = require('update-notifier');

const swcliModule = require('../index');
const logHelper = require('../lib/log-helper');
const errors = require('../lib/errors');
const pkg = require('../../package.json');
const constants = require('../lib/constants.js');

const DEBUG = false;

/**
 * This class is a wrapper to make test easier. This is used by
 * ./bin/index.js to pass in the args when the CLI is used.
 */
class SWCli {
  /**
   * This is a helper method that allows the test framework to call argv with
   * arguments without worrying about running as an actual CLI.
   *
   * @private
   * @param {Object} argv The value passed in via process.argv.
   * @return {Promise} Promise is returned so testing framework knows when
   * handling the request has finished.
   */
  argv(argv) {
    updateNotifier({pkg}).notify();

    const cliArgs = minimist(argv);
    if (cliArgs._.length > 0) {
      // We have a command
      return this.handleCommand(cliArgs._[0], cliArgs._.splice(1), cliArgs)
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
    } else {
      // we have a flag only request
      return this.handleFlag(cliArgs)
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
        process.exit(1);
      });
    }
  }

  /**
   * Prints the help text to the terminal.
   */
  printHelpText() {
    const helpText = fs.readFileSync(
      path.join(__dirname, 'cli-help.txt'), 'utf8');
    logHelper.info(helpText);
  }

  /**
   * If there is no command given to the CLI then the flags will be passed
   * to this function in case a relevant action can be taken.
   * @param {object} flags The available flags = require(the command line.
   * @return {Promise} returns a promise once handled.
   */
  handleFlag(flags) {
    let handled = false;
    if (flags.h || flags.help) {
      this.printHelpText();
      handled = true;
    }

    if (flags.v || flags.version) {
      logHelper.info(pkg.version);
      handled = true;
    }

    if (handled) {
      return Promise.resolve();
    }

    // This is a fallback
    this.printHelpText();
    return Promise.reject();
  }

  /**
   * If a command is given in the command line args, this method will handle
   * the appropriate action.
   * @param {string} command The command name.
   * @param {object} args The arguments given to this command.
   * @param {object} flags The flags supplied with the command line.
   * @return {Promise} A promise for the provided task.
   */
  handleCommand(command, args, flags) {
    switch (command) {
      case 'generate-sw':
        return this._generateSW();
      case 'build-file-manifest':
        logHelper.error(`TODO: Implement.`);
        return Promise.reject();
      default:
        logHelper.error(`Invlaid command given '${command}'`);
        return Promise.reject();
    }
  }

  /**
   * This method will generate a working Service Worker with a file manifest.
   * @return {Promise} The promise returned here will be used to exit the
   * node process cleanly or not.
   */
  _generateSW() {
    let rootDirectory;
    let fileExtentionsToCache;
    let fileManifestName;
    let serviceWorkerName;
    let saveConfig;

    return this._getRootOfWebApp()
    .then((rDirectory) => {
      rootDirectory = rDirectory;
      return this._getFileExtensionsToCache(rootDirectory);
    })
    .then((extensionsToCache) => {
      fileExtentionsToCache = extensionsToCache;
      return this._getFileManifestName();
    })
    .then((manifestName) => {
      fileManifestName = manifestName;
      return this._getServiceWorkerName();
    })
    .then((swName) => {
      serviceWorkerName = swName;
      return this._saveConfigFile();
    })
    .then((sConfig) => {
      saveConfig = sConfig;

      logHelper.warn('Root Directory: ' + rootDirectory);
      logHelper.warn('File Extensions to Cache: ' + fileExtentionsToCache);
      logHelper.warn('File Manifest: ' + fileManifestName);
      logHelper.warn('Service Worker: ' + serviceWorkerName);
      logHelper.warn('Save to Config File: ' + saveConfig);
      logHelper.warn('');

      const relativePath = path.relative(process.cwd(), rootDirectory);

      const excludeFiles = [
        fileManifestName,
        serviceWorkerName,
        relativePath,
      ];
      return swcliModule.generateSW({
        rootDirectory,
        relativePath,
        fileExtentionsToCache,
        serviceWorkerName,
        excludeFiles,
      });
    });
  }

  /**
   * This method requests the root directory of the web app.
   * The user can opt to type in the directory OR select = require(a list of
   * directories in the current path.
   * @return {Promise<string>} Promise the resolves with the name of the root
   * directory if given.
   */
  _getRootOfWebApp() {
    const manualEntryChoice = 'Manually Enter Path';
    const currentDirectory = process.cwd();

    return new Promise((resolve, reject) => {
      fs.readdir(currentDirectory, (err, directoryContents) => {
        if (err) {
          return reject(err);
        }

        resolve(directoryContents);
      });
    })
    .then((directoryContents) => {
      return directoryContents.filter((directoryContent) => {
        return fs.statSync(directoryContent).isDirectory();
      });
    })
    .then((subdirectories) => {
      return subdirectories.filter((subdirectory) => {
        return !constants.blacklistDirectoryNames.includes(subdirectory);
      });
    })
    .then((subdirectories) => {
      const choices = subdirectories.concat([
        new inquirer.Separator(),
        manualEntryChoice,
      ]);
      return inquirer.prompt([
        {
          name: 'rootDir',
          message: 'What is the root of your web app?',
          type: 'list',
          choices: choices,
        },
        {
          name: 'rootDir',
          message: 'Please manually enter the root of your web app?',
          when: (answers) => {
            return answers.rootDir === manualEntryChoice;
          },
        },
      ]);
    })
    .then((answers) => {
      return path.join(currentDirectory, answers.rootDir);
    })
    .catch((err) => {
      logHelper.error(
        errors['unable-to-get-rootdir'],
        err
      );
      throw err;
    });
  }

  _getFileExtensionsToCache(rootDirectory) {
    return this._getFileContents(rootDirectory)
    .then((files) => {
      return this._getFileExtensions(files);
    })
    .then((fileExtensions) => {
      if (fileExtensions.length === 0) {
        throw new Error(errors['no-file-extensions-found']);
      }

      return inquirer.prompt([
        {
          name: 'cacheExtensions',
          message: 'Which file types would you like to cache?',
          type: 'checkbox',
          choices: fileExtensions,
          default: fileExtensions,
        },
      ]);
    })
    .then((results) => {
      if (results.cacheExtensions.length === 0) {
        throw new Error(errors['no-file-extensions-selected']);
      }

      return results.cacheExtensions;
    })
    .catch((err) => {
      logHelper.error(
        errors['unable-to-get-file-extensions'],
        err
      );
      throw err;
    });
  }

  _getFileContents(directory) {
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (err, directoryContents) => {
        if (err) {
          return reject(err);
        }

        resolve(directoryContents);
      });
    })
    .then((directoryContents) => {
      const promises = directoryContents.map((directoryContent) => {
        const fullPath = path.join(directory, directoryContent);
        if (fs.statSync(fullPath).isDirectory()) {
          if (!constants.blacklistDirectoryNames.includes(directoryContent)) {
            return this._getFileContents(fullPath);
          } else {
            return [];
          }
        } else {
          return fullPath;
        }
      });

      return Promise.all(promises);
    })
    .then((fileResults) => {
      return fileResults.reduce((collapsedFiles, fileResult) => {
        return collapsedFiles.concat(fileResult);
      }, []);
    });
  }

  _getFileExtensions(files) {
    const fileExtensions = new Set();
    files.forEach((file) => {
      const extension = path.extname(file);
      if (extension && extension.length > 0) {
        fileExtensions.add(extension);
      } else if (DEBUG) {
        logHelper.warn(
          errors['no-extension'],
          file
        );
      }
    });

    // Strip the '.' character if it's the first character.
    return [...fileExtensions].map(
      (fileExtension) => fileExtension.replace(/^\./, ''));
  }

  _getFileManifestName() {
    return inquirer.prompt([
      {
        name: 'fileManifestName',
        message: 'What should we name the file manifest?',
        type: 'input',
        default: 'precache-manifest.js',
      },
    ])
    .then((results) => {
      const manifestName = results.fileManifestName.trim();
      if (manifestName.length === 0) {
        logHelper.error(
          errors['invalid-file-manifest-name']
        );
        throw new Error(errors['invalid-file-manifest-name']);
      }

      return manifestName;
    })
    .catch((err) => {
      logHelper.error(
        errors['unable-to-get-file-manifest-name'],
        err
      );
      throw err;
    });
  }

  _getServiceWorkerName() {
    return inquirer.prompt([
      {
        name: 'serviceWorkerName',
        message: 'What should we name your service worker file?',
        type: 'input',
        default: 'sw.js',
      },
    ])
    .then((results) => {
      const serviceWorkerName = results.serviceWorkerName.trim();
      if (serviceWorkerName.length === 0) {
        logHelper.error(
          errors['invalid-sw-name']
        );
        throw new Error(errors['invalid-sw-name']);
      }

      return serviceWorkerName;
    })
    .catch((err) => {
      logHelper.error(
        errors['unable-to-get-sw-name'],
        err
      );
      throw err;
    });
  }

  _saveConfigFile() {
    return inquirer.prompt([
      {
        name: 'saveConfig',
        message: 'Last Question - Would you like to save these settings to ' +
          'a config file?',
        type: 'confirm',
        default: true,
      },
    ])
    .then((results) => results.saveConfig)
    .catch((err) => {
      logHelper.error(
        errors['unable-to-get-save-config'],
        err
      );
      throw err;
    });
  }
}

module.exports = SWCli;
