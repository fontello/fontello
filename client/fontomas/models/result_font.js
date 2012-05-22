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


module.exports = Backbone.Model.extend({
  initialize: function () {
    this.glyphs = new nodeca.client.fontomas.models.glyphs_collection();
    this.max_glyphs = nodeca.config.fontomas.max_glyphs || null;
  },


  getGlyph: function (font_id, glyph_id) {
    return this.glyphs.find(function (glyph) {
      var src = glyph.get('source_glyph');
      return font_id === src.font_id && glyph_id === src.glyph_id;
    });
  },


  addGlyph: function (data) {
    var model = new nodeca.client.fontomas.models.glyph({source_glyph: data});
    this.trigger('add-glyph', model);
    this.glyphs.add(model);
    this.validate();
  },


  validate: function () {
    if (null === this.max_glyphs || this.glyphs.length <= this.max_glyphs) {
      // max glyphs limit is not reached.
      // config is valid if it has at least one glyph selected.
      return (0 < this.glyphs.length);
    }

    raise_max_glyphs_reached();
    return false;
  },


  getConfig: function () {
    var config = {glyphs: []};

    this.glyphs.forEach(function (g) {
      var src = g.get('source_glyph'), fontname;

      fontname = _.find(nodeca.shared.fontomas.embedded_fonts, function (cfg) {
        return cfg.id === src.embedded_id;
      }).font.fontname;

      config.glyphs.push({
        code: g.get('code'),
        css:  g.get('css'),
        from: src.code,
        src:  fontname
      });
    });

    return config;
  },


  startDownload: function () {
    if (!this.validate()) {
      return;
    }

    nodeca.server.fontomas.font.generate(this.getConfig(), function (err, msg) {
      var font_id = msg.data.id;

      if (err) {
        // TODO: notification about error
        nodeca.logger.error(err);
        return;
      }

      nodeca.client.fontomas.util.notify('information', {
          layout:   'bottom',
          closeOnSelfClick: false,
          timeout:  20000 // 20 secs
        }, nodeca.client.fontomas.render('selector:download-banner'));

      function poll_status() {
        nodeca.server.fontomas.font.status({id: font_id}, function (err, msg) {
          if (err) {
            // TODO: notification about error
            nodeca.logger.error(err);
            return;
          }

          if ('error' === msg.data.status) {
            // TODO: notification about error
            nodeca.logger.error(msg.data.error || "Unexpected error.");
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


  // Stub to prevent Backbone from reading or saving the model to the server.
  // Backbone calls `Backbone.sync()` function (on fetch/save/destroy)
  // if model doesn't have own `sync()` method.
  sync: function () {}
});
