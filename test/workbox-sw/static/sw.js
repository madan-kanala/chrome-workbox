importScripts('../../../packages/workbox-sw/build/browser/workbox-sw.js');

const wb = new self.WorkboxSW({
  modulePathCb: (moduleName, debug) => {
    const build = debug ? 'dev' : 'prod';
    return `../../../packages/${moduleName}/build/browser/${moduleName}.${build}.js`;
  },
});

wb.skipWaiting();
wb.clientsClaim();

wb.core.setLogLevel(self.workbox.core.LOG_LEVELS.debug);

wb.precaching.precache([
  'example.css',
  'example.js',
]);
