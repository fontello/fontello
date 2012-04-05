/*global fontomas, _, $, Backbone, Handlebars, FileReader*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.ui.wizard.selector.pane = Backbone.View.extend({
    myfiles:        [],
    next_font_id:   1,
    fonts:          null,
    glyph_size:     _.last(config.preview_glyph_sizes),

    font_toolbar:   null,
    fontviews:      {},

    events:         {},


    initialize: function (attributes) {
      _.bindAll(this);

      this.font_toolbar = new fontomas.ui.wizard.selector.toolbar();

      this.font_toolbar.on("changeGlyphSize", this.onChangeGlyphSize, this);
      this.font_toolbar.on("fileUpload",      this.onLoadFiles,       this);
      this.font_toolbar.on("useEmbeddedFont", this.onUseEmbeddedFont, this);

      this.fonts = new Backbone.Collection();
      this.fonts.on("add", this.onAddFont, this);
    },


    onChangeGlyphSize: function (size) {
      this.glyph_size = size;

      _.each(this.fontviews, function (view) {
        view.changeGlyphSize(size);
      });
    },


    onLoadFiles: function (files) {
      var self = this;

      _.each(files, function (f) {
        var fileinfo, reader = new FileReader();

        fileinfo = {
          id:             this.myfiles.length,
          filename:       f.name,
          filesize:       f.size,
          filetype:       f.type,
          fontname:       "unknown",
          is_loaded:      false,
          is_ok:          false,
          is_added:       false,
          is_dup:         false,
          error_msg:      "",
          content:        null,
          font_id:        null,
          embedded_id:    null
        };

        this.myfiles.push(fileinfo);

        reader.onload = function (event) {
          fontomas.util.notify_alert("Sorry, but parsing the fonts is temporary disabled.");
        };

        reader.readAsBinaryString(f);
      }, this);
    },


    onUseEmbeddedFont: function (font) {
      this.addEmbeddedFonts([font]);
    },


    // a model has been added, so we create a corresponding view for it
    onAddFont: function (font) {
      var view = new fontomas.ui.wizard.selector.source_font({
        model:      font,
        glyph_size: this.glyph_size
      });

      view.on("toggleGlyph",        this.onToggleGlyph,       this);
      view.on("closeEmbeddedFont",  this.onCloseEmbeddedFont, this);
      view.on("closeFont",          this.onCloseFont,         this);
      view.on("remove",             this.onRemoveFont,        this);

      this.fontviews[font.id] = view;
      $("#selector-fonts").append(view.render().el);
    },


    onRemoveFont: function (id) {
      delete this.fontviews[id];
    },


    addEmbeddedFonts: function (embedded_fonts) {
      _.each(embedded_fonts, function (f) {
        var font = {
          fontname:     f.fontname,
          glyphs:       _.map(f.glyphs, function (i) {
                          return {unicode_code: i};
                        }),
          is_embedded:  true,
          embedded_id:  f.id
        };
        this.createFont(font);

        f.is_added = true;
      }, this);

      this.font_toolbar.renderUseEmbedded();
    },


    onToggleGlyph: function (data) {
      this.trigger('glyph-click', data);
    },


    onCloseEmbeddedFont: function () {
      this.font_toolbar.renderUseEmbedded();
    },


    onCloseFont: function (font_id) {
      this.trigger('font-close', font_id);

      var found_font = _.find(this.myfiles, function (f) {
        return f.font_id === font_id;
      }, this);

      if (found_font) {
        found_font.font_id = null;
        found_font.is_added = false;
      }
    },


    createFont: function (attrs) {
      //if (!attrs.id) // FIXME
      attrs.id = this.next_font_id++;
      var font = new fontomas.models.source_font(attrs);

      this.fonts.create(font);
      return attrs.id;
    }
  });

}());
