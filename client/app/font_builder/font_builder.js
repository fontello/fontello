'use strict';


/*global window, _, $, ko, N*/


// starts download of the result font
//
function injectDownloadUrl(id, url) {
  $('iframe#' + id).remove();
  $('<iframe></iframe>').attr({id: id, src: url}).css('display', 'none')
    .appendTo(window.document.body);
}


function notifyError(err) {
  var msg;

  if (err.code && 100 > err.code) {
    // do not handle system-wide errors
    return;
  }

  // try to extract error message
  msg = err.message || err.body || (err.code ? 'ERR' + err.code : null);

  N.emit('notify', 'error', N.runtime.t('app.font_builder.errors.fatal', {
    error: msg || 'Unexpected error'
  }));
}


// poll status update. starts download when font is ready.
//
function pollStatus(id) {
  N.server.font.status({id: id}, function (err, msg) {
    if (err) {
      notifyError(err);
      N.emit('build.finished');
      return;
    }

    if ('error' === msg.data.status) {
      N.emit('notify', 'error', N.runtime.t('app.font_builder.errors.generic', {
        error: (msg.data.error || "Unexpected error.")
      }));
      N.emit('build.finished');
      return;
    }

    if ('finished' === msg.data.status) {
      // TODO: normal notify about success
      N.logger.info("Font successfully generated. " +
                    "Your download link: " + msg.data.url);
      injectDownloadUrl(id, msg.data.url);
      N.emit('build.finished');
      return;
    }

    if ('enqueued' === msg.data.status) {
      // TODO: notify about queue
      N.logger.info("Your request is in progress and will be available soon.");
      setTimeout(function () {
        pollStatus(id);
      }, 500);
      return;
    }

    // Unexpected behavior
    N.logger.error("Unexpected behavior");
  });
}


function startBuilder(config) {
  N.logger.debug('About to build font', config);

  N.server.font.generate(config, function (err, msg) {
    var font_id;

    if (err) {
      notifyError(err);
      return;
    }

    font_id = msg.data.id;

    N.emit('notify', 'information', {
      layout:   'bottom',
      closeOnSelfClick: false,
      timeout:  20000 // 20 secs
    }, N.runtime.t('app.font_builder.download_banner'));

    N.emit('build.started');

    // start polling
    pollStatus(font_id);
  });
}


// Request font build and download on success
//
module.exports.init = function () {
  var
  selectedCount   = $.noop,
  selectedGlyphs  = $.noop,
  fontname        = $.noop;

  N.once('fonts_ready', function (fontsList) {
    selectedCount   = fontsList.selectedCount;
    selectedGlyphs  = fontsList.selectedGlyphs;
  });

  N.once('toolbar_ready', function (toolbar) {
    fontname = toolbar.fontname;
  });

  N.on('build_font', function () {
    var config = { name: $.trim(fontname()) };

    if (!selectedCount()) {
      return;
    }

    config.glyphs = _.map(selectedGlyphs(), function (glyph) {
      return glyph.serialize();
    });

    startBuilder(config);
  });
};
