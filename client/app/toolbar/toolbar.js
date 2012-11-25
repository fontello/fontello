'use strict';


/*global window, _, $, ko, N*/


var readConfig = require('./_reader');


// prevent the event from bubbling to ancestor elements
function stopPropagation(event) {
  event.preventDefault();
  event.stopPropagation();
}


// starts download of the result font
function start_download(id, url) {
  $('iframe#' + id).remove();
  $('<iframe></iframe>').attr({id: id, src: url}).css('display', 'none')
    .appendTo(window.document.body);
}


function ToolbarModel() {
  var self = this;

  N.on('fonts_ready', function (fontsList) {
    self.selectedGlyphs = fontsList.selectedGlyphs;
    self.selectedCount  = fontsList.selectedCount;
  });

  this.fontname = ko.observable('');

  function getConfig() {
    var config = {name: $.trim(self.fontname()), glyphs: []};

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

  this.startDownload    = function () {
    if (0 === this.selectedCount()) {
      return;
    }

    N.server.font.generate(getConfig(), function (err, msg) {
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
  }.bind(this);
}


var keywords = _.chain(require('../../../lib/shared/embedded_fonts'))
  .map(function (font) {
    return _.map(font.glyphs, function (glyph) {
      return glyph.search;
    });
  })
  .flatten()
  .map(String)
  .uniq()
  .value();


var model = new ToolbarModel();


//
// Subscribe to events
//


N.on('reset_selected', function () {
  model.fontname('');
});


N.on('reset_all', function () {
  model.fontname('');
});


model.fontname.subscribe(_.debounce(function (value) {
  N.emit('session_save', { fontname: value });
}, 250));


N.on('session_load', function (session) {
  model.fontname(session.fontname || '');
});


$(function () {
  var $view = $('#toolbar'), $glyph_size_value, $glyphs, $search, on_search_change;

  var notify_font_size_change = _.debounce(function (val) {
    N.emit('font_size_change', val);
  }, 175);

  // initialize glyph-size slider
  $glyph_size_value = $('#glyph-size-value');
  $('#glyph-size-slider').slider({
    orientation:  'horizontal',
    range:        'min',
    value:        N.config.app.glyph_size.val,
    min:          N.config.app.glyph_size.min,
    max:          N.config.app.glyph_size.max,
    slide:        function (event, ui) {
      /*jshint bitwise:false*/
      var val = ~~ui.value;
      $glyph_size_value.text(val + 'px');
      notify_font_size_change(val);
    }
  });

  $glyphs = $('.glyph');

  // search query change event listener
  on_search_change = function (event) {
    var q = $.trim($search.val());

    if (0 === q.length) {
      $glyphs.show();
      return;
    }

    $glyphs.hide().filter(function () {
      var model = ko.dataFor(this);
      return model && 0 <= model.keywords.indexOf(q);
    }).show();
  };

  // init search input
  $search = $('#search')
    .on('change', on_search_change)
    .on('keyup', _.debounce(on_search_change, 250))
    .on('focus keyup', _.debounce(function () {
      $search.typeahead('hide');
    }, 5000))
    .typeahead({
      source: keywords
    });

  $view.find('#reset-app-all').click(function () {
    if (window.confirm(N.runtime.t('confirm.app_reset'))) {
      N.emit('reset_all');
    }
  });

  $view.find('#reset-app-selected').click(function () {
    N.emit('reset_selected');
  });

  $view.find('#import-app-config').click(function (event) {
    event.preventDefault();

    if (!window.FileReader) {
      N.emit('notification', 'error', N.runtime.t('errors.no_file_reader'));
      return false;
    }

    $view.find('#import-app-config-file').click();
    return false;
  });

  $view.find('#import-app-config-file').change(function (event) {
    var file = (event.target.files || [])[0];

    // we must "reset" value of input field, otherwise Chromium will
    // not fire change event if the same file will be chosen twice, e.g.
    // import config -> made changes -> import config

    $(this).val('');

    readConfig(file);
  });

  ko.applyBindings(model, $view.get(0));
});
