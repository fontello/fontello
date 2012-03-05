var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

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

    return Fontomas;
})(Fontomas || {});
