var Fontomas = (function (Fontomas) {
    "use strict";

    var app = Fontomas.app,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug,
        Backbone = window.Backbone;

    app.collections.Glyph = Backbone.Collection.extend({
        model: app.models.Glyph
    });

    return Fontomas;
}(Fontomas || {}));
