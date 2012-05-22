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
  },


  add: function () {
    Backbone.Collection.prototype.add.apply(this, arguments);
    this.validate();
    return this;
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


  getConfig: function () {
    var config = {glyphs: []};

    this.each(function (glyph) {
      config.glyphs.push({
        code: glyph.get('code'),
        css:  glyph.get('css'),
        from: glyph.get('source').code,
        src:  glyph.get('font').get('font').fontname
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
