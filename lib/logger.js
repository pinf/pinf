
const UTIL = require("util");


var Logger = exports.Logger = function(context) {
	var self = this;

	// TODO: Scope console messages based on context.

	var handlers = {};
	var api = {};
	[
		"setup",
		"optimize",
		"feature",
		"debug",
		"log",
		"info",
		"notice",
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

	function makeHandler(severity, stream, options) {
		options = options || {};
		return function() {
			var prefix = "| " + severity + " |";
			if (options.color) {
				prefix = prefix[options.color];
			}
			if (options.bgcolor) {
				prefix = prefix[options.bgcolor];
			}
			stream.write(prefix + " ");
			Array.prototype.slice.call(arguments).forEach(function(arg, index) {
				if (arg instanceof Buffer) {
					arg = arg.toString("ascii");
				}
				stream.write((index > 0 ? " ":"") + UTIL.inspect(arg, {
					showHidden: false,
					depth: 3,
					colors: true
				}));
			});
			stream.write("\n");
		}
	}

	// Error messages.
	api.error = makeHandler("error", process.stderr, {
		color: "white",
		bgcolor: "redBG"
	});

	// Assertion error messages.
	api.assert = makeHandler("assert", process.stderr);

	switch(context.logLevel) {
		// Permanent debug messages.
		case "debug":
			api.debug = makeHandler("debug", process.stdout, {
				color: "cyan"
			});
		// Permanent warning messages.
		case "warn":
			api.warn = makeHandler("warn", process.stdout, {
				color: "yellow"
			});
		// Permanent notice messages.
		case "notice":
			api.warn = makeHandler("notice", process.stdout, {
				color: "white"
			});
		// Permanent information messages used to structure *warn* and *debug* messages.
		case "info":
			api.info = makeHandler("info", process.stdout, {
				color: "white",
				bgcolor: "blueBG"
			});
		// Permanent feature messages indicating what **MAY** be done to enable something optional.
		case "feature":
			api.feature = makeHandler("feature", process.stdout, {
				color: "blue",
				bgcolor: "cyanBG"
			});
		// Temporary development log messages.
		case "log":
			api.log = makeHandler("log", process.stdout);
			context.silent = false;
	}

	if (!context.silent) {
		// Messages indicating what **SHOULD** be done to optimize something.
		api.optimize = makeHandler("optimize", process.stdout);
		// Messages indicating what **SHOULD** be done to setup something.
		api.setup = makeHandler("setup", process.stdout, {
			color: "red",
			bgcolor: "yellowBG"
		});
	}

	self.console = api;
}
