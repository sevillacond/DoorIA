/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "41f238683283c9e52168c414d3b39e27"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9e72032de291d0b80324d9eefdc13e93"
  }, {
    "url": "pwa-192x192.png",
    "revision": "343f9716a51f651e5267c5d92a3c5a9f"
  }, {
    "url": "index.html",
    "revision": "52ee23fefade9e2f1c0d59d6e69b72bf"
  }, {
    "url": "icon.svg",
    "revision": "93e3aa5fd22fe197da673fca6e5f9880"
  }, {
    "url": "icon-maskable.svg",
    "revision": "2740a2225b0f91b7a10d3096aaabdd6a"
  }, {
    "url": "favicon.ico",
    "revision": "e645ff974641504469c77e15f2fb9071"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "3d1b849f78a7414d768dfc435461d0b0"
  }, {
    "url": "assets/index-DeCqSAmG.css",
    "revision": null
  }, {
    "url": "assets/index-Cdt0PHVd.js",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "3d1b849f78a7414d768dfc435461d0b0"
  }, {
    "url": "favicon.ico",
    "revision": "e645ff974641504469c77e15f2fb9071"
  }, {
    "url": "icon.svg",
    "revision": "93e3aa5fd22fe197da673fca6e5f9880"
  }, {
    "url": "pwa-192x192.png",
    "revision": "343f9716a51f651e5267c5d92a3c5a9f"
  }, {
    "url": "pwa-512x512.png",
    "revision": "9e72032de291d0b80324d9eefdc13e93"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "41f238683283c9e52168c414d3b39e27"
  }, {
    "url": "manifest.webmanifest",
    "revision": "4ad1ef6bb069d73d2db98a284e44a235"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
