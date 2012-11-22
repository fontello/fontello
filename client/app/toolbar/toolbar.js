'use strict';


/*global window, _, $, ko, N*/


var render = require('../../../lib/render/client');


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

  this.glyphs = ko.observableArray();

  this.addGlyph = function (glyph) {
    this.glyphs.push(glyph);
  }.bind(this);

  this.removeGlyph = function (glyph) {
    this.glyphs.remove(glyph);
  }.bind(this);

  this.countSelectedGlyphs = ko.computed(function () {
    return this.glyphs().length;
  }, this);

  this.with3DEffect     = ko.observable(true);
  this.fontname         = ko.observable('');

  function getConfig() {
    var config = {name: $.trim(self.fontname()), glyphs: []};

    _.each(self.glyphs(), function (glyph) {
      config.glyphs.push({
        uid: glyph.uid,
        src: glyph.font.fontname
      });
    });

    N.logger.debug('Built result font config', config);

    return config;
  }

  this.startDownload    = function () {
    if (0 === this.glyphs().length) {
      return;
    }

    N.server.font.generate(getConfig(), function (err, msg) {
      var font_id;

      if (err) {
        N.emit('notification', 'error', render('errors.fatal', {
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
            N.emit('notification', 'error', render('errors.fatal', {
              error: (err.message || String(err))
            }));
            return;
          }

          if ('error' === msg.data.status) {
            N.emit('notification', 'error', render('errors.fatal', {
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
// Expose some events
//

model.with3DEffect.subscribe(function (value) {
  N.emit('3d-mode:change', value);
});


//
// Subscribe to events
//


N.on('glyph:selected',    model.addGlyph);
N.on('glyph:unselected',  model.removeGlyph);


N.once('page:loaded', function () {
  $(function () {
    var $view = $('#toolbar'), $glyph_size_value, $glyphs, $search, on_search_change;

    var notify_font_size_change = _.debounce(function (val) {
      N.emit('font-size:change', val);
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

    ko.applyBindings(model, $view.get(0));
  });
});
