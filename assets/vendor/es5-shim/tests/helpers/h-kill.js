// This methods allows the killing of built-in functions,
// so the shim can take over with that implementation
var HLP = (function() {
    "use strict";
    var kill;

    kill = function(_class, methods) {
        /*if(!Array.isArray(methods))
            return;*/
        if(!_class.originals)
            _class.originals = {};

        for (var i = 0, len = methods.length; i < len; i++) {
            var obj = methods[i];
            _class.originals[obj] = _class[obj];
            delete _class[obj];
            if (obj in _class) {
                // try something more aggressive since V8 at least
                // appears to ignore the delete.
                _class[obj] = null;
                if (_class[obj]) {
                    console.log("Couln't overwrite", obj, "of", _class);
                }
            }
        }
    };
    return { kill: kill };
}());

HLP.kill(Function.prototype, [
    'bind'
]);

HLP.kill(String.prototype, [
    "trim"
]);

HLP.kill(Number.prototype, [
    'toFixed'
]);

HLP.kill(Date, [
    'now', 'parse'
]);

HLP.kill(Date.prototype, [
    "toJSON", "toISOString"
]);

HLP.kill(Array.prototype, [
    'some', 'every',
    'indexOf', 'lastIndexOf',
    'reduce', 'reduceRight'
]);

/* Kill a few more functions, unless we're running under node */
/* (these are used internally by 'require' in node) */
if (typeof process === 'undefined') {
    HLP.kill(Array, [
        'isArray'
    ]);

    HLP.kill(Object, [
        'keys'
    ]);

    HLP.kill(Array.prototype, [
        'forEach', 'map', 'filter',
    ]);
}
