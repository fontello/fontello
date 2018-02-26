'use strict';



////////////////////////////////////////////////////////////////////////////////


const _  = require('lodash');


module.exports = function (N, apiPath) {

  N.validate(apiPath, {
    sid: { type: 'string', required: false, pattern: /^[0-9a-f]+/ }
  });


  // Process standerd GET/HEAD request
  //
  N.wire.on(apiPath, async function app(env) {
    env.res.layout = 'fontello.layout';

    // No params - return main page
    if (!env.params.sid) return;

    // if requested page with config id - try te fetch data,
    // and redirect to main on error
    let linkData;

    try {
      linkData = await N.shortlinks.get(env.params.sid, { valueEncoding: 'json' });
    } catch (err) {
      // if shortlink not found - redirect to root
      if (err.type === 'NotFoundError') throw { code: N.io.REDIRECT, head: { Location: '/' } };

      throw err;
    }

    // inject config to runtime & return main page
    env.runtime.page_data = _.pick(linkData, [ 'config', 'url' ]);
    env.runtime.page_data.sid = env.params.sid;
  });
};
