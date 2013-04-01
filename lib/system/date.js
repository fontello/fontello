'use strict';


/**
 *  shared
 **/



////////////////////////////////////////////////////////////////////////////////


// returns `Date` object based on value
function get_timestamp(date) {
  if (date instanceof Date) {
    return date.getTime();
  }

  if (String(date) !== String(+date)) {
    return Date.parse(date);
  }

  return +date;
}


var format_date = (function () {
  // Shamelesly taken from https://github.com/michaelbaldry/formatDate-js
  var re = new RegExp(/%(a|A|b|B|c|C|d|D|e|F|h|H|I|j|k|l|L|m|M|n|p|P|r|R|s|S|t|T|u|U|v|V|W|w|x|X|y|Y|z)/g);
  var abbreviatedWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  var fullWeekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var abbreviatedMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  function padNumber(num, count, padCharacter) {
    if (typeof padCharacter === "undefined") {
      padCharacter = "0";
    }
    var lenDiff = count - String(num).length;
    var padding = "";

    if (lenDiff > 0) {
      while (lenDiff--) {
        padding += padCharacter;
      }
    }

    return padding + num;
  }

  function dayOfYear(d) {
    var oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((d - oneJan) / 86400000);
  }

  function weekOfYear(d) {
    var oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  }

  function isoWeekOfYear(d) {
    var target  = new Date(d.valueOf());
    var dayNr   = (d.getDay() + 6) % 7;

    target.setDate(target.getDate() - dayNr + 3);

    var jan4    = new Date(target.getFullYear(), 0, 4);
    var dayDiff = (target - jan4) / 86400000;

    return 1 + Math.ceil(dayDiff / 7);
  }

  function tweleveHour(d) {
    return d.getHours() > 12 ? d.getHours() - 12 : d.getHours();
  }

  function timeZoneOffset(d) {
    var hoursDiff = (-d.getTimezoneOffset() / 60);
    var result = padNumber(Math.abs(hoursDiff), 4);
    return (hoursDiff > 0 ? "+" : "-") + result;
  }

  return function (date, formatString) {
    return formatString.replace(re, function (m, p) {
      switch (p) {
      case "a":
        return abbreviatedWeekdays[date.getDay()];
      case "A":
        return fullWeekdays[date.getDay()];
      case "b":
        return abbreviatedMonths[date.getMonth()];
      case "B":
        return fullMonths[date.getMonth()];
      case "c":
        return date.toLocaleString();
      case "C":
        return Math.round(date.getFullYear() / 100);
      case "d":
        return padNumber(date.getDate(), 2);
      case "D":
        return date.format("%m/%d/%y");
      case "e":
        return padNumber(date.getDate(), 2, " ");
      case "F":
        return date.format("%Y-%m-%d");
      case "h":
        return date.format("%b");
      case "H":
        return padNumber(date.getHours(), 2);
      case "I":
        return padNumber(tweleveHour(date), 2);
      case "j":
        return padNumber(dayOfYear(date), 3);
      case "k":
        return padNumber(date.getHours(), 2, " ");
      case "l":
        return padNumber(tweleveHour(date), 2, " ");
      case "L":
        return padNumber(date.getMilliseconds(), 3);
      case "m":
        return padNumber(date.getMonth() + 1, 2);
      case "M":
        return padNumber(date.getMinutes(), 2);
      case "n":
        return "\n";
      case "p":
        return date.getHours() > 11 ? "PM" : "AM";
      case "P":
        return date.format("%p").toLowerCase();
      case "r":
        return date.format("%I:%M:%S %p");
      case "R":
        return date.format("%H:%M");
      case "s":
        return date.getTime() / 1000;
      case "S":
        return padNumber(date.getSeconds(), 2);
      case "t":
        return "\t";
      case "T":
        return date.format("%H:%M:%S");
      case "u":
        return date.getDay() === 0 ? 7 : date.getDay();
      case "U":
        return padNumber(weekOfYear(date), 2); //either date or W is wrong (or both)
      case "v":
        return date.format("%e-%b-%Y");
      case "V":
        return padNumber(isoWeekOfYear(date), 2);
      case "W":
        return padNumber(weekOfYear(date), 2); //either date or U is wrong (or both)
      case "w":
        return padNumber(date.getDay(), 2);
      case "x":
        return date.toLocaleDateString();
      case "X":
        return date.toLocaleTimeString();
      case "y":
        return String(date.getFullYear()).substring(2);
      case "Y":
        return date.getFullYear();
      case "z":
        return timeZoneOffset(date);
      default:
        return m;
      }
    });
  };
}());


////////////////////////////////////////////////////////////////////////////////


/**
 *  shared.date(value, format, locale, tzOffset) -> String
 *  - value (Date|String|Number): Date instance, DateTime string or timestamp.
 *    This must be a date in UTC TZ.
 *  - format (String): `date`, `time`, `datetime`, `iso` or `timestamp`.
 *  - locale (String): Locale you want date to be formatted with
 *  - tzOffset (Number): TZ offset in minutes
 *
 *  Returns date string with requested format.
 **/
module.exports = function date(value, format, locale, tzOffset) {
  value     = get_timestamp(value);
  tzOffset  = (tzOffset || 0) * 60 * 1000;

  switch (format) {
  case 'date':
    return format_date(new Date(value + tzOffset), '%d %B %Y');
  case 'time':
    return format_date(new Date(value + tzOffset), '%R');
  case 'datetime':
    return format_date(new Date(value + tzOffset), '%d %B %Y %R');
  // valid datetime attribute needs 0 or 4 fractional digits.
  // toISOString() returns 3 digits. So, we need to cut those.
  case 'iso':
    return (new Date(value)).toISOString().slice(0, 19) + 'Z';
  case 'timestamp':
    return value;
  default:
    return format_date(new Date(value + tzOffset), format);
  }
};
