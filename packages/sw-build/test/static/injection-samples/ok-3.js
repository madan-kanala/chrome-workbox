/* global goog */
// Example code above

importScripts('./sample-import.js');

const cacheRevisionedAssets = (input) => {
  console.log('This is valid, but dangerous', input);
};

cacheRevisionedAssets([]);

goog.swlib.cacheRevisionedAssets(    [    ]    );
