"use strict";


////////////////////////////////////////////////////////////////////////////////

/*
function hash(str) {
  return require('crypto').createHash('md5').update(str).digest('hex');
}
*/

////////////////////////////////////////////////////////////////////////////////


// FIXME: this works for single-process model only.
//        switch to shared cache in future.
//var etag = hash('fontello-app-' + Date.now());


////////////////////////////////////////////////////////////////////////////////

var revalidator = require('revalidator');
var fs          = require('fs');
var _           = require('lodash');

module.exports = function (N, apiPath) {
  N.validate(apiPath, {
    id: {
      type: 'string',
      required: false
    }
  });

  // Allow http requests only (no rpc)
  //
  N.wire.before(apiPath, function app_filter_http(env, callback) {
    if ('http' !== env.request.type) {
      callback({ code: N.io.BAD_REQUEST, message: 'HTTP only' });
      return;
    }
    callback();
  });

  // Process post request (user send config file)
  //
  N.wire.on(apiPath, function app_post(env, callback) {

    // if not POST request - continue to next handler
    if ('POST' !== env.origin.req.method) {
      callback();
      return;
    }

    // Validate post form
    var fields = revalidator.validate(env.post.fields, {
      properties : {
        url : {
          format : 'url',
          maxLength : 200,
          required  : false,
          messages: {
            format: 'Invalid URL format',
            maxLength: 'URL too long'
          }
        }
      }
    });
    if (!fields.valid) {
      callback({ code: N.io.BAD_REQUEST, message: fields.errors[0].message });
      return;
    }

    var files = revalidator.validate(env.post.files, {
      properties : {
        config : {
          type : 'object',
          required  : true,
          messages: {
            required: 'Missed "config" param - must be file'
          }
        }
      }
    });
    if (!files.valid) {
      callback({ code: N.io.BAD_REQUEST, message: fields.errors[0].message });
      return;
    }

    // Try to extract config
    var configPath = env.post.files.config.path;
    var config;

    fs.readFile(configPath, { encoding: 'utf-8'}, function (err, configFile) {
      if (err) {
        callback(err);
        return;
      }

      try {
        config = JSON.parse(configFile);
      } catch (err) {
        callback({ code: N.io.BAD_REQUEST, message: "Can't parse config data" });
        return;
      }

      // place config to DB & return link id
      var shortLink = new N.models.ShortLink();

      shortLink.ts = Date.now();
      shortLink.ip = env.request.ip;
      shortLink.config = config;
      if (env.post.fields.url) { shortLink.url = env.post.fields.url; }

      shortLink.save(function (err, sl) {
        if (err) {
          callback(err);
          return;
        }

        callback({ code: N.io.OK, message: sl.id });
      });
    });
  });


  // Process standerd GET/HEAD request
  //
  N.wire.on(apiPath, function app_post(env, callback) {
    // Page cache headers temporary disabled - seems to cause error
    // on assets change, 'must-revalidate' does not help.
    // set headers
    //env.headers['ETag']          = etag;
    //env.headers['Cache-Control'] = 'private, max-age=0, must-revalidate';

    env.response.layout          = 'fontello.layout';

    // if requested page with config id - try te fetch data,
    // and redirect to main on error
    if (env.params.id) {
      N.models.ShortLink.findOne({_id: env.params.id}, function(err, sl) {
        if (err) {
          callback(err);
          return;
        }

        // if shortlink not found - redirect to root
        if (!sl) {
          callback({
            code: N.io.REDIRECT,
            head: { 'Location': '/' }
          });
          return;
        }

        // inject config to runtime & return main page
        env.runtime.page_data = _.pick(sl.toObject(), [ 'config', 'url' ]);

        callback();
      });
      return;
    }

    // No params - return main page
    callback();
  });
};
