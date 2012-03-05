var Fontomas = (function (Fontomas) {
    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    app.collections.Glyph = Backbone.Collection.extend({
        model: app.models.Glyph
    });

    return Fontomas;
})(Fontomas || {});
