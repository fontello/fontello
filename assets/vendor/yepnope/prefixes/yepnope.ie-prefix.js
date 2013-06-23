/**
 * Yepnope IE detection prefix
 * 
 * Use a combination of any of these, and they should work
 * Usage: ['ie6!ie6styles.css', 'ie7!ie7styles.css', 'ie!allIEstyles.css', 'ie6!ie7!oldIEstyles.css']
 * Usage: ['iegt5!iebutnot5.css', 'iegt6!ieHigherThan6.css', 'iegt7!gt7.css', 'iegt8!gt8.css']
 * Usage: ['ielt7!ieLessThan7.css', 'ielt8!lt8.css', 'ielt9!lt9.css']
 * 
 * A logical OR will be applied to any combination of the supported prefixes.
 *
 * Official Yepnope Plugin
 *
 * WTFPL License
 *
 * by Alex Sexton | AlexSexton@gmail.com
 */
(function(yepnope){

  // hasOwnProperty shim by kangax needed for Safari 2.0 support
  var _hasOwnProperty = ({}).hasOwnProperty, hasOwnProperty;
  if (typeof _hasOwnProperty !== 'undefined' && typeof _hasOwnProperty.call !== 'undefined') {
    hasOwnProperty = function (object, property) {
      return _hasOwnProperty.call(object, property);
    };
  }
  else {
    hasOwnProperty = function (object, property) { /* yes, this can give false positives/negatives, but most of the time we don't care about those */
      return ((property in object) && typeof object.constructor.prototype[property] === 'undefined');
    };
  }


  // ----------------------------------------------------------
  // A short snippet for detecting versions of IE in JavaScript
  // without resorting to user-agent sniffing
  // ----------------------------------------------------------
  // If you're not in IE (or IE version is less than 5) then:
  //     ie === undefined
  // If you're in IE (>=5) then you can determine which version:
  //     ie === 7; // IE7
  // Thus, to detect IE:
  //     if (ie) {}
  // And to detect the version:
  //     ie === 6 // IE6
  //     ie > 7 // IE8, IE9 ...
  //     ie < 9 // Anything less than IE9
  // ----------------------------------------------------------

  // UPDATE: Now using Live NodeList idea from @jdalton

  var ie = (function(){

    var undef,
        v = 3,
        div = document.createElement('div'),
        all = div.getElementsByTagName('i');
    
    while (
      div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
      all[0]
    );
    
    return v > 4 ? v : undef;
    
  }()),

  iePrefixes = {
    ie:    !!ie,
    ie5:   (ie === 5),
    ie6:   (ie === 6),
    ie7:   (ie === 7),
    ie8:   (ie === 8),
    ie9:   (ie === 9),
    iegt5: (ie > 5),
    iegt6: (ie > 6),
    iegt7: (ie > 7),
    iegt8: (ie > 8),
    ielt7: (ie < 7),
    ielt8: (ie < 8),
    ielt9: (ie < 9)
  },
  checkAllIEPrefixes = function(resource) {
    var prefixes = resource.prefixes,
        pfx, k;
    
    // go through all other prefixes
    for (k = 0; k < prefixes.length; k++) {
      pfx = prefixes[k];
      // find other ie related prefixes that aren't this one
      if (hasOwnProperty(iePrefixes, pfx)) {
        // If any of the tests pass, we return true. Logical OR
        if (iePrefixes[pfx]) {
          return true;
        }
      }
    }
    return false;
  },
  i;
  
  // Add each test as a prefix
  for (i in iePrefixes) {
    if (hasOwnProperty(iePrefixes, i)) {
      // add each prefix
      yepnope.addPrefix(i, function(resource){
        // if they all all fail, set a bypass flag
        if (!checkAllIEPrefixes(resource)) {
          resource.bypass = true;
        }
        // otherwise, carry on
        return resource;
      });
    }
  }
})(this.yepnope);
