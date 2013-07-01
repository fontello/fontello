/**
 *  assert(format[, ...parameters]) -> Void
 *  error(format[, ...parameters]) -> Void
 *  info(format[, ...parameters]) -> Void
 *  warn(format[, ...parameters]) -> Void
 *  debug(format[, ...parameters]) -> Void
 *  - format (Mixed): Format string (with %d, %s and %j directives) or any
 *    object to print in JSON.
 *  - parameters (Mixed): Arguments for the format string.
 **/


'use strict';


['assert', 'error', 'info', 'warn', 'debug'].forEach(function (level) {
  exports[level] = function (object) {
    var message
      , parameters = arguments
      , index      = 1; // Format argument index; Always starts from 1.

    if (!(window.console && window.console.log)) {
      return;
    }

    if ('string' === typeof object) { // Format string.
      message = object.replace(/%[sdj%]/, function (match) {
        if (index >= parameters.length) {
          return match;
        }

        switch (match) {
        case '%%':
          return '%';
        case '%s':
          return String(parameters[index++]);
        case '%d':
          return Number(parameters[index++]);
        case '%j':
          return JSON.stringify(parameters[index++]);
        default:
          return match;
        }
      });
    } else { // Simple object.
      message = JSON.stringify(object);
    }

    try {
      if (window.console[level]) {
        window.console[level](message);
      } else {
        window.console.log(message);
      }
    } catch (err) {
      // Do nothing.
    }
  };
});
