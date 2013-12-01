// Populates `env.res.head.assets` with generic assets needed for the given
// method (based on locale and package name), such as: translations, views, etc.
//

'use strict';


var _ = require('lodash');


module.exports = function (N) {

  N.wire.after('server_chain:http:*', { priority: 80 }, function assets_info_inject(env, callback) {

    var key = env.runtime.locale, assetsMap, stylesheetsMap;

    if (!N.runtime.assets.distribution[key]) {
      // should never happen
      callback(new Error('Can\'t find assets map for ' + key));
      return;
    }

    env.res.head = env.res.head || {};
    assetsMap      = env.res.head.assets      = {};
    stylesheetsMap = env.res.head.stylesheets = {};

    _.each(N.runtime.assets.distribution[key], function (assets, pkgName) {
      assetsMap[pkgName] = {
        packagesQueue: assets.packagesQueue,
        css: N.runtime.router.linkTo('core.assets', {
          path: N.runtime.assets.manifest.assets[assets.stylesheet]
        }),
        js: N.runtime.router.linkTo('core.assets', {
          path: N.runtime.assets.manifest.assets[assets.javascript]
        })
      };

      stylesheetsMap[pkgName] = assets.stylesQueue.map(function (stylesheet) {
        return N.runtime.router.linkTo('core.assets', {
          path: N.runtime.assets.manifest.assets[stylesheet]
        });
      });
    });

    callback();
  });
};
