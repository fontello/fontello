/*global fontomas, _, $, Backbone, Handlebars*/

;(function () {
  "use strict";


  var config = fontomas.config;


  fontomas.ui.app = Backbone.View.extend({
    myfiles:        [],
    next_font_id:   1,
    fonts:          null,
    glyph_size:     config.preview_glyph_sizes[config.preview_glyph_sizes.length-1],

    font_toolbar:   null,
    fontviews:      {},
    resultfontview: null,
    wizard_steps:   null,

    events:         {},


    initialize: function () {
      _.bindAll(this);

      this.wizard_steps = new fontomas.ui.wizard.steps();
      this.font_toolbar = new fontomas.ui.wizard.selector.toolbar({
        el: $("#fm-font-toolbar")[0]
      });

      this.font_toolbar.on("changeGlyphSize", this.onChangeGlyphSize, this);
      this.font_toolbar.on("fileUpload",      this.onFileUpload,      this);
      this.font_toolbar.on("useEmbeddedFont", this.onUseEmbeddedFont, this);

      this.fonts = new Backbone.Collection;
      this.fonts.on("add",   this.onAddFont, this);
      this.fonts.on("reset", function () {
        this.fonts.each(this.onAddFont);
      }, this);

      this.resultfontview = new fontomas.ui.wizard.result.pane({
        el:         $("#fm-result-font")[0],
        model:      new fontomas.models.result_font,
        glyph_size: this.glyph_size
      });

      this.resultfontview.on("someGlyphsSelected", function () {
        this.toggleMenu(true);
      },  this);
      this.resultfontview.on("noGlyphsSelected", function () {
        this.toggleMenu(false);
      }, this);

      this.on("fileLoaded", this.onLoadFont, this);
    },


    onChangeGlyphSize: function (size) {
      this.glyph_size = size;

      _.each(this.fontviews, function (view) {
        view.changeGlyphSize(size);
      });

      this.resultfontview.changeGlyphSize(size);
    },


    onFileUpload: function (files) {
      this.doUploadFonts(files);
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
      $("#fm-font-list").append(view.render().el);
    },


    onRemoveFont: function (id) {
      delete this.fontviews[id];
    },


    toggleMenu: function (enabled) {
      if (enabled) {
        this.wizard_steps.enable('#result');
      } else {
        this.wizard_steps.disable('#result');
      }
    },

    
    doUploadFonts: function (files) {
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
          // FIXME self?
          self.trigger("fileLoaded", event, fileinfo);
        };

        reader.readAsBinaryString(f);
      }, this);
    },


    onLoadFont: function (event, fileinfo) {
      // font parsing is disabled
      fontomas.util.notify_alert(
        "Sorry, but parsing the fonts is temporary disabled."
      );
      return;
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
      var glyph, found_glyph;

      found_glyph = this.resultfontview.model.glyphs.find(function (item) {
        var glyph = item.get("source_glyph");

        return  glyph.font_id === data.font_id &&
                glyph.glyph_id === data.glyph_id;
      });

      if (found_glyph) {
        found_glyph.destroy();
      } else {
        glyph = new fontomas.models.glyph({source_glyph: data});
        this.resultfontview.model.glyphs.add(glyph);
      }
    },


    onCloseEmbeddedFont: function () {
      this.font_toolbar.renderUseEmbedded();
    },


    onCloseFont: function (font_id) {
      this.resultfontview.removeGlyphsByFont(font_id);

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
    },


    render: function () {
      // auto load embedded fonts
      this.addEmbeddedFonts(fontomas.embedded_fonts);
      this.wizard_steps.activate('#selector');
      return this;
    }
  });

}());
