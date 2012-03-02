var fm = (function (fm) {
    var App = fm.App,
        cfg = fm.cfg,
        env = fm.env,
        debug = fm.debug;

    var init = function () {
        // check browser's capabilities
        if (!isOkBrowser()) {
            console.log("bad browser");
            $(cfg.id.bad_browser).modal({keyboard: false});
            return;
        };

        //initGlobals();

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

        // FF4+ Chrome11+
        var indexeddb = env.indexeddb = Modernizr.indexeddb;

        // IE8+ FF3.5+ Chrome4+ Safari4+ Opera10.5+
        var localstorage = env.localstorage = Modernizr.localstorage;

        // IE8+ FF3.5+ Chrome4+ Safari4+ Opera10.5+
        return (indexeddb || localstorage);
    };

    // public interface
    return $.extend(true, fm, {
        init: init
    });
})(fm || {});

// entry point
$(fm.init);
