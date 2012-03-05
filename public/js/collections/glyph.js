var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    App.Collections.Glyph = Backbone.Collection.extend({
        model: App.Models.Glyph
    });

    return Fontomas;
})(Fontomas || {});
