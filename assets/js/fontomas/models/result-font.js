/*global Fontomas, _, Backbone*/

;(function () {
  "use strict";


  var config = Fontomas.config;


  Fontomas.models.ResultFont = Backbone.Model.extend({
    defaults: {
      glyph_count:  0,
      xml_template: null
    },


    initialize: function () {
      Fontomas.logger.debug("models.ResultFont.initialize");

      this.set("xml_template", this.initSvgFontTemplate());
      this.glyphs = new Fontomas.models.GlyphsCollection;

      this.glyphs.on("add",     this.incCounter, this);
      this.glyphs.on("remove",  this.decCounter, this);
    },


    initSvgFontTemplate: function () {
      var xml_string, xml_template;

      try {
        xml_string    = $('#fm-font-output').html().trimLeft();
        xml_template  = $.parseXML(xml_string);
      } catch (e) {
        Fontomas.logger.error(
          "initSvgFontTemplate: invalid xml template=",
          $('#fm-font-output').html(),
          "e=", e
        );
        Fontomas.util.notify_alert("Internal error: can't parse output template.");
        return null;
      }

      $(xml_template)
        .find("metadata").text(config.output.metadata)
        .end()
        .find("font").attr({
          "id":           config.output.font_id,
          "horiz-adv-x":  config.output.horiz_adv_x
        })
        .end()
        .find("font-face").attr({
          "units-per-em": config.output.units_per_em,
          "ascent":       config.output.ascent,
          "descent":      config.output.descent
        })
        .end()
        .find("missing-glyph").attr({
          "horiz-adv-x":  config.output.missing_glyph_horiz_adv_x
        });

        return xml_template;
    },


    incCounter: function () {
      this.set("glyph_count", this.get("glyph_count") + 1);
    },


    decCounter: function () {
      this.set("glyph_count", this.get("glyph_count") - 1);
      Fontomas.logger.assert(this.get("glyph_count") >= 0);
    },


    // FIXME: the model isn't sync()ed to server yet
    sync: function () {
      Fontomas.logger.debug("models.ResultFont.sync()");
    }
  });

}());
