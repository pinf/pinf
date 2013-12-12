
const UTIL = require("util");


var Logger = exports.Logger = function(context) {
	var self = this;

	// TODO: Scope console messages based on context.

	var handlers = {};
	var api = {};
	[
		"setup",
		"optimize",
		"debug",
		"log",
		"info",
		"warn",
		"error",
/*
		"dir",
		"time",
		"timeEnd",
		"trace",
*/
		"assert"
	].forEach(function(name) {
		api[name] = function() {
			// Do nothing.
		};
	});

	function makeHandler(severity, stream) {
		return function() {
			stream.write("[" + severity + "] ");
			Array.prototype.slice.call(arguments).forEach(function(arg, index) {
				if (arg instanceof Buffer) {
					arg = arg.toString("ascii");
				}
				stream.write((index > 0 ? " ":"") + UTIL.inspect(arg, {
					showHidden: true,
					depth: 3,
					colors: true
				}));
			});
			stream.write("\n");
		}
	}

	// Messages indicating what **MUST** be done to setup something.
	api.setup = makeHandler("setup", process.stderr);

	// Error messages.
	api.error = makeHandler("error", process.stderr);

	// Assertion error messages.
	api.assert = makeHandler("assert", process.stderr);

	if (!context.silent) {
		// Messages indicating what **MAY** be done to optimize something.
		api.optimize = makeHandler("optimize", process.stdout);
	}

	switch(context.logLevel) {
		// Permanent debug messages.
		case "debug":
			api.debug = makeHandler("debug", process.stdout);
		// Permanent warning messages.
		case "warn":
			api.warn = makeHandler("warn", process.stdout);
		// Permanent information messages used to structure *warn* and *debug* messages.
		case "info":
			api.info = makeHandler("info", process.stdout);
		// Temporary development log messages.
		case "log":
			api.log = makeHandler("log", process.stdout);
	}

	self.console = api;
}
