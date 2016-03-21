// json-schema for incoming font config validation
//
'use strict';


module.exports = {

  type: 'object',
  additionalProperties: false,
  required: true,
  properties: {
    name:             { type: 'string',   required: false, 'default': 'fontello' },
    css_prefix_text:  { type: 'string',   required: false, 'default': 'icon-' },
    css_use_suffix:   { type: 'boolean',  required: false, 'default': false },
    hinting:          { type: 'boolean',  required: false, 'default': false },
    units_per_em:     { type: 'integer',  required: false, 'default': 1000, minimum: 10 },
    ascent:           { type: 'integer',  required: false, 'default': 850,  minimum: 10 },
    fullname:         { type: 'string',   required: false },
    copyright:        { type: 'string',   required: false },
    glyphs: {
      type: 'array',
      minItems: 1,
      items: {
        oneOf: [
          // embedded glyph schema
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              uid:  { type: 'string',  required: true },
              css:  { type: 'string',  required: true },
              code: { type: 'integer', required: true, minimum: 1 },
              src:  { type: 'string',  required: true },
              // Fields below not used but can exists in old config formats
              selected: { type: 'boolean', required: false },
              from: { type: 'integer',  required: false }
            }
          },
          // custom icon schema
          {
            type: 'object',
            additionalProperties: false,
            properties: {
              uid:  { type: 'string',  required: true },
              css:  { type: 'string',  required: true },
              code: { type: 'integer', required: true,  minimum: 1 },
              src:  { type: 'string',  required: true,  pattern: /^custom_icons$/ },
              search: {
                type: 'array',
                required: false,
                items: { type: 'string' }
              },
              svg: {
                type: 'object',
                required: true,
                additionalProperties: false,
                properties: {
                  path:   { type: 'string',  required: true },
                  width:  { type: 'number', required: true,  minimum: 0 }
                }
              },
              selected: {
                type: 'boolean',
                required: false
              }
            }
          }
        ]
      }
    }
  }
};
