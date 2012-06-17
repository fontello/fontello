/*global window, nodeca, jQuery, Handlebars, Backbone, $, _*/


"use strict";


var raise_max_glyphs_reached = _.throttle(function () {
  nodeca.client.fontomas.util.notify('error',
    nodeca.client.fontomas.render('selector:max-glyphs-error', {
      max: nodeca.config.fontomas.max_glyphs
    }));
}, 1000);


// starts download of the result font
function start_download(id, url) {
  $('iframe#' + id).remove();
  $('<iframe></iframe>').attr({id: id, src: url}).css('display', 'none')
    .appendTo(window.document.body);
}


module.exports = Backbone.Collection.extend({
  initialize: function () {
    this.maxGlyphs = nodeca.config.fontomas.max_glyphs || null;
    this.usedCodes = {};
    this.usedCss   = {};
  },


  add: function (models, options) {
    models = _.filter(_.isArray(models) ? models.slice() : [models], function (model) {
      var code = model.get('code'),
          css  = model.get('css');

      // css already taken
      if (this.usedCss[css]) {
        css = this._getFreeCss(css);
      }

      // code is already taken
      if (this.usedCodes[code]) {
        code = this._getFreeCode();

        // no more free codes
        if (null === code) {
          // this should never happen in real life.
          nodeca.client.fontomas.util.notify('error',
            "Internal Error. Can't allocate code for glyph.");

          // model cannot be added to the collection
          return false;
        }
      }

      // lock the css & code
      this.usedCss[css]    = true;
      this.usedCodes[code] = true;

      model.set('css',  css);
      model.set('code', code);

      model.on('change:code', this.onChangeGlyphCode, this);

      // model is correct and got bindings
      return true;
    }, this);

    Backbone.Collection.prototype.add.call(this, models, options);
    this.validate();

    return this;
  },


  remove: function (models, options) {
    _.each(_.isArray(models) ? models.slice() : [models], function (model) {
      var code = model.get('code'), css = model.get('css');

      if (!this.usedCodes[code]) {
        // this should never happen in real life.
        nodeca.logger.error(
          "models.glyphs_collection.remove: code <" + code + "> " +
          "not found in used_codes map"
        );
        return;
      }

      // unlock the css & code
      this.usedCss[css]    = false;
      this.usedCodes[code] = false;

      model.off('change:code', this.onChangeGlyphCode, this);
    }, this);

    return Backbone.Collection.prototype.remove.apply(this, arguments);
  },


  validate: function () {
    if (null === this.maxGlyphs || this.length <= this.maxGlyphs) {
      // max glyphs limit is not reached.
      // config is valid if it has at least one glyph selected.
      return (0 < this.length);
    }

    raise_max_glyphs_reached();
    return false;
  },


  getConfig: function (name) {
    var config = {name: $.trim(name), glyphs: []};

    this.each(function (glyph) {
      config.glyphs.push({
        uid:        glyph.get('uid'),

        orig_css:   glyph.get('source').css,
        orig_code:  glyph.get('source').code,

        css:        glyph.get('css'),
        code:       glyph.get('code'),

        src:        glyph.get('font').get('font').fontname
      });
    });

    return config;
  },


  startDownload: function (name) {
    var self = this;

    if (!this.validate()) {
      return;
    }

    nodeca.server.fontomas.font.generate(this.getConfig(name), function (err, msg) {
      var font_id;

      if (err) {
        nodeca.client.fontomas.util.notify('error',
          nodeca.client.fontomas.render('error:rpc', {
            error: (err.message || String(err))
          }));
        return;
      }

      font_id = msg.data.id;

      nodeca.client.fontomas.util.notify('information', {
          layout:   'bottom',
          closeOnSelfClick: false,
          timeout:  20000 // 20 secs
        }, nodeca.client.fontomas.render('selector:download-banner'));

      function poll_status() {
        nodeca.server.fontomas.font.status({id: font_id}, function (err, msg) {
          if (err) {
            nodeca.client.fontomas.util.notify('error',
              nodeca.client.fontomas.render('error:rpc', {
                error: (err.message || String(err))
              }));
            return;
          }

          if ('error' === msg.data.status && 'UNKNOWN_FONT_ID' === msg.data.error.code) {
            nodeca.client.fontomas.util.notify('error',
              nodeca.client.fontomas.render('error:font-generate'));

            // resend build request
            self.startDownload(name);
            return;
          }

          if ('error' === msg.data.status){
            nodeca.client.fontomas.util.notify('error',
              nodeca.client.fontomas.render('error:rpc', {
                error: (msg.data.error || "Unexpected error.")
              }));
            return;
          }

          if ('finished' === msg.data.status) {
            // TODO: normal notification about success
            nodeca.logger.info("Font successfully generated. " +
                               "Your download link: " + msg.data.url);
            start_download(font_id, msg.data.url);
            return;
          }

          if ('processing' === msg.data.status) {
            // TODO: notification about queue
            nodeca.logger.info("Your request is in progress and will be available soon.");
            setTimeout(poll_status, 500);
            return;
          }

          if ('enqueued' === msg.data.status) {
            // TODO: notification about queue
            nodeca.logger.info("Your request is in queue #" + msg.data.position);
            setTimeout(poll_status, 3000);
            return;
          }

          // Unexpected behavior
          nodeca.logger.error("Unexpected behavior");
        });
      }

      poll_status();
    });
  },


  // release/overtake new code by glyph
  // swaps glyphs if new code is already taken.
  onChangeGlyphCode: function (model, new_code) {
    var conflict, old_code = model.previous('code');

    // conflicting glyph
    conflict = this.find(function (m) {
      return m !== model && m.get('code') === new_code;
    });

    if (conflict) {
      // this will never run an infinitive loop, because other model
      // is already updated, so there will be no conflict glyph for
      // this one.
      conflict.set('code', old_code);
      return;
    }

    this.usedCodes[new_code] = true;
    this.usedCodes[old_code] = !!this.find(function (model) {
      return old_code === model.get('code');
    });
  },


  _getFreeCode: function () {
    var code = nodeca.config.fontomas.autoguess_charcode.min;

    while (code <= nodeca.config.fontomas.autoguess_charcode.max) {
      if (!this.usedCodes[code]) {
        // got unused code
        return code;
      }

      // try next code
      code += 1;
    }

    // can't find empty code.
    // should never happen in real life.
    return null;
  },


  _getFreeCss: function (css) {
    var i = 1, tmp;

    do {
      tmp = css + '-' + i;
      i++;
    } while (!!this.usedCss[tmp]);

    return tmp;
  },


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});
