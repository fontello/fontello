var express = require('express'),
		exec		= require('child_process').exec,
		app = module.exports = express.createServer();

// Configuration
app.configure(function(){
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + "/.."));
  app.use(express.errorHandler()); 
});

// Routes
app.get( '/tests/js/*', function( req, res ) {
	var url = req.url,
			date, sleep, basename;

	res.setHeader("Content-Type", "text/javascript");

	// No cache
	if ( ~ url.indexOf("no-cache")) {
		date = (new Date( (+new Date() - 2000000) )).toUTCString();
		res.setHeader("Last-Modified", date); 
		res.setHeader("Expires", date); 
		res.setHeader("Pragma", "no-cache"); 
	} else {
		res.setHeader("Expires", "Thu, 31 Dec 2020 20:00:00 GMT");
	}

	// Sleep to simulate a slow loading server
	sleep = /\/sleep-(\d+)\//.exec( url );
	if ( sleep ) {
		sleep = sleep.pop() * 1000;
	} else {
		sleep = 0;
	}

	setTimeout(function() {
		basename = url.split("/").pop().split(".").shift();
		res.end([
			"window." + basename + "time = (+new Date);",
			"window." + basename + " = true"
		].join("\n"));

	}, sleep);

});

app.get( '/tests/css/*', function( req, res ) {
	var url = req.url,
			date, sleep, basename;

	res.setHeader("Content-Type", "text/css"); 
	res.setHeader("Expires", "Thu, 31 Dec 2020 20:00:00 GMT"); 

	// Sleep to simulate a slow loading server
	sleep = /\/sleep-(\d+)\//.exec( url );
	if ( sleep ) {
		sleep = sleep.pop() * 1000;
	} else {
		sleep = 0;
	}

	setTimeout(function() {
		var basename = url.split("/").pop().split(".").shift();
		res.end("#item_" + basename.split(",").join("") + " { color: rgb(" + basename + ");}");
	}, sleep);

});


app.listen(3000);
console.log("Launching yepnope.js unit tests...");
exec("open http://localhost:3000/tests/index.html");
