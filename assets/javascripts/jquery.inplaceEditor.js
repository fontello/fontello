;(function ($) {
  'use strict';


  function InplaceEditor(el, options) {
    var self = this;

    this.$el      = $(el);
    this.options  = options;

    this.$el.on('click', function () {
      self.activate();
    });

    this.$el.on('blur', function () {
      self.deactivate();
    });

    if (options.validateChar) {
      this.isValidChar = function (char) {
        return options.validateChar.call(this, char);
      };
    }

    if (options.filterValue) {
      this.update = function () {
        var original  = this.getValue(),
            clean     = options.filterValue.call(this, original);

        if (original !== clean) {
          this.setValue(clean);
        }
      }
    }
  }


  InplaceEditor.prototype.activate = function () {
    var self = this;

    if (!!this.activated) {
      return;
    }

    this.initialValue = this.getValue();
    this.lastChar     = null;
    this.activated    = true;

    //
    // Do not allow paste if it was disabled
    //

    if (this.options.noPaste) {
      this.$el.on('paste.inplaceEditor', function (event) {
        event.stopImmediatePropagation();
        return false;
      });
    }

    //
    // Listen for any keystrokes (used for chars filtration)
    //

    this.$el.on('keypress.inplaceEditor', function (event) {
      // ENTER
      if (13 === event.keyCode) {
        self.deactivate();
        return;
      }

      // Validate incoming character
      if (event.which !== 0 && event.charCode !== 0) {
        if (false === self.isValidChar(String.fromCharCode(event.charCode))) {
          // char fails validation
          event.stopImmediatePropagation();
          return false;
        }

        self.update();
        self.lastChar = String.fromCharCode(event.charCode);
      }
    });

    //
    // Listen for ESCape
    //

    this.$el.on('keyup.inplaceEditor', function (event) {
      // ESC
      if (27 === event.keyCode) {
        event.stopImmediatePropagation();
        self.setValue(self.initialValue);
        self.deactivate();
        return false;
      }
    });

    //
    // Focus on enabled input
    //

    this.$el.attr('contenteditable', true).focus();
  };


  InplaceEditor.prototype.deactivate = function () {
    var value;

    if (!this.activated) {
      return;
    }

    this.activated = false;

    this.$el.off('.inplaceEditor');
    this.$el.attr('contenteditable', false);

    // run filters on exit
    this.update();

    // get new value ONLY after update()
    value = this.getValue();

    if (this.initialValue !== value) {
      if (!value && !this.options.allowEmpty) {
        this.setValue(this.initialValue);
      } else {
        this.$el.trigger('change', [value]);
      }
    }

    this.$el.blur();
  };


  InplaceEditor.prototype.setValue = function setValue(val) {
    this.$el['html' === this.options.type ? 'html' : 'text'](val);
  };


  InplaceEditor.prototype.getValue = function getValue() {
    return this.$el['html' === this.options.type ? 'html' : 'text']();
  };


  // By default isValidChar does nothing
  InplaceEditor.prototype.isValidChar = $.noop;


  // By default update does nothing
  InplaceEditor.prototype.update = $.noop;


  $.fn.inplaceEditor = function (options) {
    return this.each(function () {
      var $this   = $(this),
          data    = $this.data('inplaceEditor');

      if (!data) {
        return $this.data('inplaceEditor', new InplaceEditor(this, options));
      }
    });
  };
}(jQuery));
