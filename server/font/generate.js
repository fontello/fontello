// Handles requests for font generation.
//


'use strict';


var fontBuilder = require('./_lib/builder');


module.exports = function (N, apiPath) {
  var builder = fontBuilder(N);


  N.validate(apiPath, {
    name:             { type: 'string',   required: false },
    css_prefix_text:  { type: 'string',   required: true  },
    css_use_suffix:   { type: 'boolean',  required: true  },
    hinting:          { type: 'boolean',  required: false },
    units_per_em:     { type: 'integer',  required: false, minimum: 10 },
    ascent:           { type: 'integer',  required: false, minimum: 10 },
    glyphs: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          uid:  { type: 'string',   required: true  },
          css:  { type: 'string',   required: true  },
          code: { type: 'integer',  required: true  },
          src:  { type: 'string',   required: true  },
          svg: {
            type: 'object',
            required: false,
            default: {},
            additionalProperties: false,
            properties: {
              path:   { type: 'string',   required: true  },
              width:  { type: 'string',   required: true  },
            }
          }
        }
      }
    }
  });


  N.wire.on(apiPath, function (env, callback) {
    builder.buildFont(env.params, function (err, info) {
      if (err) {
        callback(err);
        return;
      }

      env.res.id = info.fontId;
      callback();
    });
  });
};
