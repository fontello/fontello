/*global fontomas, _, $, Backbone, Handlebars, FileReader*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.ui.wizard.selector.pane = Backbone.View.extend({
    next_font_id:   1,
    fonts:          null,
    glyph_size:     _.last(config.preview_glyph_sizes),

    font_toolbar:   null,
    fontviews:      {},


    initialize: function (attributes) {
      _.bindAll(this);

      this.font_toolbar = new fontomas.ui.wizard.selector.toolbar();

      this.font_toolbar.on("change:glyph-size",   this.changeGlyphSize,   this);
      this.font_toolbar.on("change:local-files",  this.loadFiles,         this);
      this.font_toolbar.on("click:embedded-font", this.clickEmbeddedFont, this);

      this.fonts = new Backbone.Collection();
      this.fonts.on("add", this.onAddFont, this);
    },


    changeGlyphSize: function (size) {
      this.glyph_size = size;

      _.each(this.fontviews, function (view) {
        view.changeGlyphSize(size);
      });
    },


    loadFiles: function (files) {
      fontomas.util.notify_alert("Sorry, user-fonts are not supported yet.");
      //var self = this;
      //
      //_.each(files, function (f) {
      //  var fileinfo, reader = new FileReader();
      //
      //  fileinfo = {
      //    id:             this.myfiles.length,
      //    filename:       f.name,
      //    filesize:       f.size,
      //    filetype:       f.type,
      //    fontname:       "unknown",
      //    is_loaded:      false,
      //    is_ok:          false,
      //    is_added:       false,
      //    is_dup:         false,
      //    error_msg:      "",
      //    content:        null,
      //    font_id:        null,
      //    embedded_id:    null
      //  };
      //
      //  this.myfiles.push(fileinfo);
      //
      //  reader.onload = function (event) {
      //    fontomas.util.notify_alert("Sorry, but parsing the fonts is temporary disabled.");
      //  };
      //
      //  reader.readAsBinaryString(f);
      //}, this);
    },


    clickEmbeddedFont: function (font_id) {
      var font = fontomas.embedded_fonts[font_id];

      if (font && !font.is_added) {
        this.addEmbeddedFonts([font]);
      }
    },


    // a model has been added, so we create a corresponding view for it
    onAddFont: function (font) {
      var view = new fontomas.ui.wizard.selector.source_font({
        model:      font,
        glyph_size: this.glyph_size
      });

      view.on("toggleGlyph",        this.onToggleGlyph, this);
      view.on("remove",             this.removeFont,    this);

      this.fontviews[font.id] = view;
      $("#selector-fonts").append(view.render().el);
    },


    removeFont: function (font) {
      delete this.fontviews[font.id];

      // KLUDGE: TO BE REFACTORED
      _.find(fontomas.embedded_fonts, function (f, id) {
        if (id === font.get('embedded_id')) {
          f.is_added = false;
          this.font_toolbar.renderEmbededFontsSelector();
        }
      }, this);

      this.trigger('remove:font', font);
    },


    addEmbeddedFonts: function (embedded_fonts) {
      _.each(embedded_fonts, function (f) {
        var font = new fontomas.models.source_font({
          id:           this.next_font_id++,
          fontname:     f.fontname,
          glyphs:       _.map(f.glyphs, function (i) {
                          return {unicode_code: i};
                        }),
          is_embedded:  true,
          embedded_id:  f.id
        });

        this.fonts.add(font);

        f.is_added = true;
      }, this);

      this.font_toolbar.renderEmbededFontsSelector();
    },


    onToggleGlyph: function (data) {
      this.trigger('click:glyph', data);
    }
  });

}());
