var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    App.Models.Main = Backbone.Model.extend({
        fonts: new App.Collections.Font,
        genfont: new App.Models.GeneratedFont,
        next_font_id: 1,
        xml_template: null,
        myfiles: []
    });

    return fm;
})(fm || {});
