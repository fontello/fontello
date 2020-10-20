// Font settings dialog
//
'use strict';


var ko = require('knockout');


N.wire.once('navigate.done', function () {

  function SettingsModel() {
    this.units      = ko.observable();
    this.ascent     = ko.observable();
    this.descent    = ko.observable();
    this.baseline   = ko.observable();
    this.hinting    = ko.observable();
    this.encoding   = ko.observable();
    this.fullname   = ko.observable();
    this.copyright  = ko.observable();

    // Lock to avoid circular updates
    var dependencies = true;
    var prev_units;

    // On units per em change - scale ascent/descent
    this.units.subscribe(function (units) {
      prev_units = units;
    }, null, 'beforeChange');

    this.units.subscribe(function (units) {
      dependencies = false;

      if (typeof prev_units !== 'undefined' && typeof this.baseline() !== 'undefined') {
        var scale = +units / prev_units;
        var ascent = +(this.ascent() * scale).toFixed(0);
        var descent = ascent - units;
        this.ascent(ascent);
        this.descent(descent);
        this.baseline(+(-descent / units * 100).toFixed(2));
      }

      dependencies = true;
    }, this);


    this.baseline.subscribe(function (baseline) {
      if (dependencies) {
        dependencies = false;

        var units = this.units();

        if (typeof units !== 'undefined') {
          var ascent = +(units * (1 - +baseline / 100)).toFixed(0);
          this.ascent(ascent);
          this.descent(ascent - units);
        }

        dependencies = true;
      }
    }, this);


    this.ascent.subscribe(function (ascent) {
      if (dependencies) {
        dependencies = false;

        var units = this.units();

        if (typeof units !== 'undefined') {
          var descent = +ascent - units;
          this.descent(descent);
          this.baseline(+(-descent / units * 100).toFixed(2));
        }

        dependencies = true;
      }
    }, this);


    this.descent.subscribe(function (descent) {
      if (dependencies) {
        dependencies = false;

        var units = this.units();

        if (typeof units !== 'undefined') {
          this.ascent(+units + +descent);
          this.baseline(+(-descent / units * 100).toFixed(2));
        }

        dependencies = true;
      }
    }, this);
  }


  var settings = new SettingsModel();
  var $dialog;

  N.wire.on('cmd:settings_dialog', function settings_dialog() {
    // Render dialog window.
    $dialog = $(N.runtime.render(module.apiPath)).appendTo('body');

    settings.units(N.app.fontUnitsPerEm());
    settings.ascent(N.app.fontAscent());
    settings.hinting(N.app.hinting());
    settings.encoding(N.app.encoding());
    settings.fullname(N.app.fontFullName());
    settings.copyright(N.app.fontCopyright());

    ko.applyBindings(settings, $dialog.get(0));

    $dialog.find('#st__upm').numeric({ decimal: false, negative: false });
    $dialog.find('#st__ascent').numeric({ decimal: false, negative: false });
    $dialog.find('#st__descent').numeric({ decimal: false });
    $dialog.find('#st__baseline').numeric();

    $dialog.find('._popover').popover();

    $dialog.on('shown.bs.modal', function () {
    });

    $dialog.on('hidden.bs.modal', function () {
      ko.cleanNode($(this));
      $(this).remove();
    });

    // Show dialog.
    $dialog.modal();
  });

  N.wire.on('cmd:settings_dialog.save', function settings_dialog_save() {
    N.app.fontUnitsPerEm(+settings.units());
    N.app.fontAscent(+settings.ascent());
    N.app.hinting(settings.hinting());
    N.app.encoding(settings.encoding());
    N.app.fontFullName(settings.fullname());
    N.app.fontCopyright(settings.copyright());
    $dialog.modal('hide');
  });

});
