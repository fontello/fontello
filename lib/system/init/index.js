// Initializer skeleton. Load all generic handlers,
// to call them later from any CLI script.

'use strict';


module.exports = function (N) {
  require('./models.js')(N);
  require('./bundle.js')(N);
  require('./server.js')(N);
};
