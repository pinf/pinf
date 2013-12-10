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


;require("require.async")(require);


const HELPERS = require("../lib/helpers").for(module);
const PATH = require("path");
const FS = require("fs");
const WAITFOR = require("waitfor");
const CONTEXT = require("./context");
const PROGRAM = require("./program");
const URL = require("url");

const NS = "github.com~pinf~pinf";


HELPERS.runMainAndExit(function(callback) {

	var stdin = new HELPERS.InputStreamProxy(process.stdin, buffer, bufferEnded);
	buffer = stdin.buffer.bind(stdin);

	var stdout = new HELPERS.OutputStreamProxy(process.stdout);
	var context = new CONTEXT.Context({
		rootPath: HELPERS.getRootPath(),
		epoch: process.env.PINF_EPOCH
	});

	return context.ready(function(err) {
		if (err) return callback(err);

		// Optional Environment Variables:
		//  * PINF_EPOCH - The root context ID for this execution used to namespace all data and objects.
		//  * PINF_PROGRAMS - Paths separated by ':' containing program boot scripts or program directories.
		//  * PINF_HOME - Path to root directory of PINF registry, cache and other services.
		//  * HOME - Path to home directory of OS user.

		function programPathForQuery(query, callback) {

			function checkIfUri(callback) {
				if (!/.+\.\w+\//.test(query)) return callback(null, null);
				var uri = HELPERS.parsePointerUri(query);
				if (/(?:^|\.)github\./.test(uri.hostname)) {

					return require.async("../adapters/provision/github.js", function(adapter) {
						var ctx = context.copy({
							cachePath: PATH.join(context.cachePath, NS, "adapters~provision~github")
						});
						ctx.clonePath = ctx._relpath(PATH.join(ctx.getAbsolutePath("cachePath"), "clones", uri.did));
						ctx.installPath = ctx._relpath(PATH.join(ctx.getAbsolutePath("cachePath"), "installs", uri.did));
						return adapter.for(ctx).provide(uri, callback);
					}, callback);

				} else {
					return callback(new Error("Adapter for uri '" + query + "' not yet implemented!"));
				}
			}

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

			return checkIfUri(function(err, programPath) {
				if (err) return callback(err);
				if (programPath) return callback(null, programPath);

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
			});
		}

		return programPathForQuery(process.argv[2], function(err, programPath) {
			if (err) return callback(err);

			//console.log("programPath", programPath);

			var program = PROGRAM.for(context, programPath);

			program.stdin = stdin;
			program.stdout = stdout;

			return program.boot(callback);
		});
	});
});
