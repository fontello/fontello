// Asset files handler. Serves Mincer's generated asset files:
// - stylesheets
// - client-side javascripts
// - compiled view templates
// - etc

'use strict';


module.exports = function (N) {
  N.validate('server_bin:core.assets', {
    // DON'T validate unknown params - those can sexists,
    // if someone requests '/myfile.txt?xxxx' instead of '/myfile.txt/
    additionalProperties: true,
    properties: {
      path: {
        type: 'string',
        required: true
      }
    }
  });


  N.wire.on('server_bin:core.assets', function asset_file_send(env) {
    // keep original url for log
    env.origin.req.originalUrl = env.origin.req.url;

    // rewrite url for mincer server
    env.origin.req.url = env.params.path;

    N.runtime.assets.server.handle(env.origin.req, env.origin.res);
  });
};
