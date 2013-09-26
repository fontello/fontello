// json-schema for font config validation
//

module.exports = {

  type: 'object',
  additionalProperties: false,
  properties: {
    name:             { type: 'string',   required: false },
    css_prefix_text:  { type: 'string',   required: true  },
    css_use_suffix:   { type: 'boolean',  required: true  },
    hinting:          { type: 'boolean',  required: false },
    units_per_em:     { type: 'integer',  required: false, minimum: 10 },
    ascent:           { type: 'integer',  required: false, minimum: 10 },
    glyphs: {
      type: 'array',
      minItems: 1,
      items: [
        // embedded glyph schema
        {
          type: 'object',
          additionalProperties: false,
          properties: {
            uid:  { type: 'string',  required: true },
            css:  { type: 'string',  required: true },
            code: { type: 'integer', required: true, minimum: 1 },
            src:  { type: 'string',  required: true },
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
            svg: {
              type: 'object',
              required: true,
              additionalProperties: false,
              properties: {
                path:   { type: 'string',  required: true },
                width:  { type: 'integer', required: true,  minimum: 10 },
              }
            }
          }
        }
      ]
    }
  }
};