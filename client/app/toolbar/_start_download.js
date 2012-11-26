'use strict';


/*global window, _, $, ko, N*/


// starts download of the result font
function start_download(id, url) {
  $('iframe#' + id).remove();
  $('<iframe></iframe>').attr({id: id, src: url}).css('display', 'none')
    .appendTo(window.document.body);
}


function get_config(self) {
  var config = {
    name:   $.trim(self.fontname()),
    glyphs: []
  };

  _.each(self.selectedGlyphs(), function (glyph) {
    config.glyphs.push({
      uid:        glyph.uid,

      orig_css:   glyph.originalName,
      orig_code:  glyph.originalCode,

      css:        glyph.name(),
      code:       glyph.code(),

      src:        glyph.font.fontname
    });
  });

  N.logger.debug('Built result font config', config);

  return config;
}


function downloader() {
  var self = this;

  if (0 === self.selectedCount()) {
    return;
  }

  N.server.font.generate(get_config(self), function (err, msg) {
    var font_id;

    if (err) {
      N.emit('notification', 'error', N.runtime.t('errors.fatal', {
        error: (err.message || String(err))
      }));
      return;
    }

    font_id = msg.data.id;

    N.emit('notification', 'information', {
      layout:   'bottom',
      closeOnSelfClick: false,
      timeout:  20000 // 20 secs
    }, N.runtime.t('info.download_banner'));

    function poll_status() {
      N.server.font.status({id: font_id}, function (err, msg) {
        if (err) {
          N.emit('notification', 'error', N.runtime.t('errors.fatal', {
            error: (err.message || String(err))
          }));
          return;
        }

        if ('error' === msg.data.status) {
          N.emit('notification', 'error', N.runtime.t('errors.fatal', {
            error: (msg.data.error || "Unexpected error.")
          }));
          return;
        }

        if ('finished' === msg.data.status) {
          // TODO: normal notification about success
          N.logger.info("Font successfully generated. " +
                        "Your download link: " + msg.data.url);
          start_download(font_id, msg.data.url);
          return;
        }

        if ('enqueued' === msg.data.status) {
          // TODO: notification about queue
          N.logger.info("Your request is in progress and will be available soon.");
          setTimeout(poll_status, 500);
          return;
        }

        // Unexpected behavior
        N.logger.error("Unexpected behavior");
      });
    }

    poll_status();
  });
}


module.exports = function () {
  console.log(arguments);
};
