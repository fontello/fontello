var Fontomas = (function (Fontomas) {
    var App = Fontomas.App,
        cfg = Fontomas.cfg,
        env = Fontomas.env,
        debug = Fontomas.debug;

    var init = function () {
        // check browser's capabilities
        if (!isOkBrowser()) {
            console.log("bad browser");
            $(cfg.id.bad_browser).modal({keyboard: false});
            return;
        };

        // show loading tab
        $(cfg.id.tab).tab("show");

        // main model
        App.main = new App.Models.Main;
        // main view
        App.mainview = new App.Views.Main({model: App.main});

        App.mainview.render();
    };

    var isOkBrowser = function () {
        // FF3.6+ Chrome6+ Opera11.1+
        var filereader = env.filereader = !!window.FileReader;

        // debug: simulate no filereader is available
        if (debug.is_on && debug.nofilereader)
            env.filereader = false;

        return true;
    };

    // public interface
    return $.extend(true, Fontomas, {
        init: init
    });
})(Fontomas || {});

// entry point
$(Fontomas.init);
