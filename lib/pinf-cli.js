#!/usr/bin/env node


// NOTE: We listen for stdin here so we can ensure we always catch the event!
var buffer = [];
var bufferEnded = false;
process.stdin.on('data', function(chunk) {
	if (typeof buffer === "function") {
		buffer(chunk);
	} else {
		buffer.push(chunk);
	}
});
process.stdin.on('end', function() {
	bufferEnded = true;
});
process.stdin.resume();


const HELPERS = require("../lib/helpers").for(module);
const PATH = require("path");
const FS = require("fs");
const WAITFOR = require("waitfor");
const PROGRAM = require("./program");


HELPERS.runMainAndExit(function(callback) {

	var stdin = new HELPERS.InputStreamProxy(process.stdin, buffer, bufferEnded);
	buffer = stdin.buffer.bind(stdin);

	var stdout = new HELPERS.OutputStreamProxy(process.stdout);

	// Optional Environment Variables:
	//  * PINF_PROGRAMS - Paths separated by ':' containing program boot scripts or program directories.
	//  * PINF_HOME - Path to root directory of PINF registry, cache and other services.
	//  * HOME - Path to home directory of OS user.

	function programPathForQuery(query, callback) {

		// Check if `query` is a program in `PINF_PROGRAM_PATHS`.
		function checkIfProgram(callback) {
			if (!process.env.PINF_PROGRAMS) return callback(null, null);
			var found = false;
			var waitfor = WAITFOR.serial(function(err) {
				if (err) return callback(err);
				if (found) return callback(null, found);
				return callback(null, null);
			});
			process.env.PINF_PROGRAMS.split(":").forEach(function(path) {
				return waitfor(function(done) {
					if (found) return done(null);

					function checkIfJavaScriptProgramFile(callback) {
						return FS.exists(PATH.join(path, query + ".js"), function(exists) {
							if (exists) return callback(null, PATH.join(path, query + ".js"));
							return callback(null, null);
						});
					}

					return checkIfJavaScriptProgramFile(function(err, programPath) {
						if (err) return done(err);
						if (programPath) {
							found = programPath;
							return done(null);
						}

						// TODO: Lookup query using other mechanisms.
						return done(null);
					});
				});
			});
			return waitfor();
		}

		// Check if `query` is a PINF-based command on `PATH` that we can call with a custom context.
		function checkIfCommand(callback) {
			var found = false;
			var waitfor = WAITFOR.serial(function(err) {
				if (err) return callback(err);
				if (found) return callback(null, found);
				return callback(null, null);
			});
			process.env.PATH.split(":").forEach(function(path) {
				return waitfor(function(done) {
					if (found) return done(null);
					return FS.exists(PATH.join(path, query), function(exists) {
						if (exists) {
//							found = PATH.join(path, query);
// TODO: Read command file and in comment find meta data to customize context of command.
//       This is used in scenarios where the command installed on a system has a default
//       set of configurations but we want to call it with a modified set.
						}
						return done(null);
					});
				});
			});
			return waitfor();
		}

		return checkIfProgram(function(err, programPath) {
			if (err) return callback(err);
			if (programPath) return callback(null, programPath);

			return checkIfCommand(function(err, programPath) {
				if (err) return callback(err);
				if (programPath) return callback(null, programPath);
				// TODO: Lookup query using other mechanisms.
				return callback(new Error("No program found for '" + query + "'!"));
			});
		});
	}

	return programPathForQuery(process.argv[2], function(err, programPath) {
		if (err) return callback(err);

		//console.log("programPath", programPath);

		var program = PROGRAM.for(programPath);

		program.stdin = stdin;
		program.stdout = stdout;

		return program.boot(callback);
	});
});
