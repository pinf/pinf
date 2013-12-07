
const PATH = require("path");
const FS = require("fs");
const VM = require("vm");
const UTIL = require("util");


exports.boot = function(program, done) {

	var scriptPath = program.getAbsolutePath("bootScript");

	function Process(overrides) {
		var self = this;
		for (var name in process) {
			self[name] = process[name];
		}
		for (var name in overrides) {
			self[name] = overrides[name];
		}
	}

	var trackingFunctions = {};

	function isAllDone() {
		var count = 0;
		for (var name in trackingFunctions) {
			if (trackingFunctions[name] > 0) {
				count += trackingFunctions[name];
			}
		}
		if (count === 0) return true;
		return false;
	}

	var pendingCallback = null;
	function callback(err) {
		if (err) return done(err);
		if (isAllDone()) {
			return done(null);
		}
		pendingCallback = function() {
			if (isAllDone()) {
				pendingCallback = null;
				return done(null);
			}
		}
	}

	function trackFunction(name, func) {
		trackingFunctions[name] = 0;
		return function(cb, t) {
			var id = func(function() {
				trackingFunctions[name] -= 1;
				cb.call(this);
				if (trackingFunctions[name] <= 0 && pendingCallback) {
					pendingCallback();
				}
			}, t);
			trackingFunctions[name] += 1;
			return id;
		}
	}
	function trackClearFunction(name, func) {
		return function(id) {
			func(id);
			trackingFunctions[name] -= 1;
			if (trackingFunctions[name] <= 0 && pendingCallback) {
				pendingCallback();
			}
		}
	}

	function evalBundle(uri, code, _globals) {
    	// NOTE: If there are sytnax errors in code this will print
    	//		 error to stdout (if fourth argument set to `true`).
    	//		 There is no way to capture errors from here.
    	// @see https://github.com/joyent/node/issues/1307#issuecomment-1551157
    	// TODO: Find a better solution to handle errors here.
    	// TODO: Capture errors by watching this processe's stdout file log from
    	//		 another process.
    	var globals = {
        	// TODO: Wrap to `console` object and inject module info.
        	console: console,
        	// NodeJS globals.
        	// @see http://nodejs.org/docs/latest/api/globals.html
        	global: global,
        	require: require,
        	__dirname: PATH.dirname(uri),
        	__filename: uri,
        	process: new Process({
        		stdin: program.stdin,
        		stdout: program.stdout,
        		argv: process.argv.map(function(item, index) {
        			if (index === 2) return uri;
					return item;        			
        		}).slice(1)
        	}),
        	Buffer: Buffer,
        	setTimeout: trackFunction("setTimeout", setTimeout),
        	clearTimeout: trackClearFunction("setTimeout", clearTimeout),
        	setInterval: trackFunction("setInterval", setInterval),
        	clearInterval: trackClearFunction("setInterval", clearInterval),
        	setImmediate: trackFunction("setImmediate", setImmediate)
    	};
    	for (var name in _globals) {
    		globals[name] = _globals[name];
    	}
        VM.runInNewContext(code, globals, uri, true);
	}

	return FS.readFile(scriptPath, function(err, code) {
		if (err) return callback(err);

		code = [
			';____PINF_HARNESS____.start();',
			code,
			';____PINF_HARNESS____.started();'
		].join("\n");

		var inputListeners = {};

		return evalBundle(scriptPath, code, {
			"____PINF_HARNESS____": {
	    		start: function() {
	    			program.startTime = Date.now();
	    		},
	    		started: function() {
    				// See if program is listening for stdin.
	    			if (
	    				(
	    					Array.isArray(program.stdin._events.readable) &&
	    					program.stdin._events.readable.length >= 2
	    				) ||
	    				program.stdin._events.data ||
	    				program.stdin._events.end
	    			) {    				
		    			program.stdin.on("ended", function() {
		    				return process.nextTick(function() {
								return callback(null);
		    				});
		    			});
						return program.stdin.ready();
	    			} else {
						return callback(null);
	    			}
	    		}
	    	}
    	});
	});

	return callback(null);
}
