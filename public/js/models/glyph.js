var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Models.Glyph = Backbone.Model.extend({
        // FIXME: the model isn't sync()ed to server yet
        sync: function () {
            console.log("Models.Font.sync()");
        }
    });

    return fm;
})(fm || {});
