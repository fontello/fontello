var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Collections.Glyph = Backbone.Collection.extend({
        model: App.Models.Glyph
    });

    return fm;
})(fm || {});
