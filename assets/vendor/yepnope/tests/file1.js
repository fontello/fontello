window.file1 = true;
yepnope({
  load : 'file2.js',
  callback: function() {
    ok( window.file2, 'file2.js has loaded.');
  },
  complete: function() {
  	start();
  }
});