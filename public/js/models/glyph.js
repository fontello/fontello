var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    App.Models.Glyph = Backbone.Model.extend({
        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("Models.Font.sync()");
        }
    });

    return Fontomas;
})(Fontomas || {});
