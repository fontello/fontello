// Populates `env.res.head.assets` with generic assets needed for the given
// method (based on locale and package name), such as: translations, views, etc.
//

'use strict';


const _ = require('lodash');


module.exports = function (N) {

  N.wire.after('server_chain:http:*', { priority: 80 }, function assets_info_inject(env) {

    let key = env.runtime.locale, assetsMap, stylesheetsMap;

    if (!N.assets.distribution[key]) {
      // should never happen
      return new Error(`Can't find assets map for ${key}`);
    }

    env.res.head = env.res.head || {};
    assetsMap      = env.res.head.assets      = {};
    stylesheetsMap = env.res.head.stylesheets = {};

    _.forEach(N.assets.distribution[key], (assets, pkgName) => {
      assetsMap[pkgName] = {
        packagesQueue: assets.packagesQueue,
        css: assets.stylesheets.map(path => N.assets.asset_url(path)),
        js: assets.javascripts.map(path => N.assets.asset_url(path))
      };

      stylesheetsMap[pkgName] = assets.stylesQueue.map(path => N.assets.asset_url(path));
    });
  });
};
