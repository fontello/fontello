// Release locked resources
//
'use strict';


module.exports = function (sandbox) {
  sandbox.cache_db.close();

  sandbox.bundler.cache.get = null;
  sandbox.bundler.cache.put = null;
};
