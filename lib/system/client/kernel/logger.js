/**
 *  assert(format[, ...params]) -> Void
 *  error(format[, ...params]) -> Void
 *  info(format[, ...params]) -> Void
 *  warn(format[, ...params]) -> Void
 *  debug(format[, ...params]) -> Void
 *  - format (Mixed): Format string (with %d, %s and %j directives) or any
 *    object to print in JSON.
 *  - params (Mixed): Arguments for the format string.
 **/


'use strict';


[ 'assert', 'error', 'info', 'warn', 'debug' ].forEach(level => {
  exports[level] = function (object) {
    let message,
        params = arguments,
        index  = 1; // Format argument index; Always starts from 1.

    if (!(window.console && window.console.log)) return;

    if (typeof object === 'string') { // Format string.
      message = object.replace(/%[sdj%]/, function (match) {
        if (index >= params.length) return match;

        switch (match) {
          case '%%':
            return '%';
          case '%s':
            return String(params[index++]);
          case '%d':
            return Number(params[index++]);
          case '%j':
            return JSON.stringify(params[index++]);
          default:
            return match;
        }
      });
    } else { // Log as is.
      message = object;
    }

    try {
      if (window.console[level]) {
        window.console[level](message);
      } else {
        window.console.log(message);
      }
    } catch (__) {}
  };
});
