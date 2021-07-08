// Init N.runtime with variables, injected into page.
//
// 1. Init should be done right after page dom load,
//    BEFORE any other activity.
// 2. The most important is setting `N.runtime.locale`,
//    used in i18n helpers. Without it nothing will work.
//
'use strict';


N.wire.once('init:assets', { priority: -1000 }, function runtime_vars_init() {
  // Note: server-side N.assets_hash variable exposed as N.runtime.assets_hash
  //       on the client to make merging easier.
  let runtime_page_data = JSON.parse($('#runtime').text());

  for (let key of Object.keys(runtime_page_data)) {
    N.runtime[key] = N.runtime[key] ?? runtime_page_data[key];
  }
});
