var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Models.Font = Backbone.Model.extend({
        defaults: function () {
            return {
                fontname:   "unknown",
                is_loaded:  false,
                is_ok:      false,
                is_added:   false
            };
        },

        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("Models.Font.sync()");
        }
    });

    App.Collections.Font = Backbone.Collection.extend({
        model: App.Models.Font,

        parseId: function (pair_id) {
            var pair = pair_id.split("-"),
                result = {font_id: pair[0], glyph_id: pair[1]};
            return result;
        },

        getFont: function (pair_id) {
            var pair = this.parseId(pair_id),
                font = this.get(pair.font_id);
            return font.get("font");
        },

        getGlyph: function (pair_id) {
            var pair = this.parseId(pair_id),
                font = this.get(pair.font_id),
                glyph = font.get("font").glyphs[pair.glyph_id];
            return glyph;
        },
    });

    return fm;
})(fm || {});
