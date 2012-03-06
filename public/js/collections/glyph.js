var Fontomas = (function (Fontomas) {
    "use strict";

    var app = Fontomas.app,
        Backbone = window.Backbone;

    app.collections.Glyph = Backbone.Collection.extend({
        model: app.models.Glyph
    });

    return Fontomas;
}(Fontomas || {}));
