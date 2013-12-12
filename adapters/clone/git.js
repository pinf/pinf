
const PATH = require("path");
const FS = require("fs-extra");
const SPAWN = require("child_process").spawn;
const ESCAPE_REGEXP = require("escape-regexp");


exports.clone = function(context, uri, callback) {

	var callGit = exports.for(context).callGit;

	return context.resolvePathFromProperty("clonesPath", context.duid, function(err, finalPath) {
        if (err) return callback(err);

		context.adapterMethods.clone.getPath = function(callback) {
			return callback(null, finalPath);
		}

        function pullIfNeeded(callback) {
        	function pull(callback) {
				return callGit([
	                "fetch",
	                "--tags"
	            ], {}, function(err) {
	            	if (err) return callback(err);
	            	return callback(null);
	            });
        	}
        	function checkIfTag(callback) {
	    		// Check if *selector* is a tagged version.
	    		return FS.exists(PATH.join(finalPath, ".git/refs/tags", context.selector), function(exists) {
	    			if (exists) {
	            		// Selector is a tagged commit. No need to pull as code at tag will never change.
		                return callback(null, true);
	    			} else {
				        // Pull latest commits and tags.
		                return callback(null, false);
	    			}
	    		});
			}
        	function checkIfBranch(callback) {
	    		// Check if *selector* is a branch name.
	    		return FS.exists(PATH.join(finalPath, ".git/refs/heads", context.selector), function(exists) {
	    			if (exists) {
		                return callback(null, true);
	    			} else {
		                return callback(null, false);
	    			}
	    		});
			}
			return checkIfTag(function(err, isTag) {
				if (err) return callback(err);
				if (isTag) return callback(null);

				return checkIfBranch(function(err, isBranch) {
					if (err) return callback(err);
					if (isBranch) return pull(callback);

					// See if we can find commit ref.
					return callGit([
		                "rev-parse",
		                context.selector
		            ], {}, function(err, result) {
		            	if (err) {
				            if (/unknown revision or path not in the working tree/.test(err.message)) {
				            	return pull(callback);
							}
			        		return callback(err);
		            	}
		            	if (result.substring(0, context.selector.length) === context.selector) {
		            		// Selector is a commit ref. No need to pull as code at commit will never change.
			        		return callback(null);
		            	}
		            	console.error("context", context);
		            	console.error("result", result);
		            	return callback(new Error("We should never get here!"));
		            });
	            });
			});
        }

        return FS.exists(finalPath, function(exists) {
        	if (exists) {
        		return pullIfNeeded(callback);
        	}

		    var tmpPath = finalPath + "~" + Date.now();

		    return FS.mkdirs(PATH.dirname(finalPath), function(err) {
		        if (err) return callback(err);
		        return callGit([
		            "clone",
		            "--progress",
		            uri,
		            tmpPath
		        ], {}, function(err, result) {
		            if (err) return callback(err);
		            // TODO: Verify git repository.
		            return FS.rename(tmpPath, finalPath, function(err) {
		                // NOTE: We ignore `err` on purpose!
		                return callback(null);
		            });
		        });
		    });
        });
	});
}

exports.for = function(context) {

	var exports = {};

	exports.callGit = function (procArgs, options, callback) {
		return context.getEnv(function(err, env) {
			if (err) return callback(err);
			if (process.env.DEBUG) {
				console.log("[pinf] Exec:", "git", procArgs);
			}
		    var proc = SPAWN("git", procArgs, {
		        cwd: options.cwd || process.cwd(),
		        env: env
		    });
		    var buffer = "";
		    proc.on("error", function(err) {
		        return callback(err);
		    });
		    proc.stdout.on("data", function(data) {
		// TODO: Only log progress if in interactive shell.
		//process.stdout.write(data.toString());
                if (process.env.DEBUG) {
                    process.stdout.write(data);
                }
		        buffer += data.toString();
		    });
		    proc.stderr.on("data", function(data) {
		// TODO: Only log progress if in interactive shell.
		//process.stderr.write(data.toString());
                if (process.env.DEBUG) {
                    process.stderr.write(data);
                }
		        buffer += data.toString();
		    });
		    proc.on("exit", function(code) {
		        // NOTE: Sometimes `git describe --tags <non-existent-rev>` exits with code 128 (git did not exit cleanly)
		        //       instead of code 1 and buffer `fatal: No names found, cannot describe anything.`.
		        // @issue https://github.com/sourcemint/sm/issues/3
		        if (code !== 0) {
		            if (!buffer) buffer = "(exit code " + code + ")";
		            return callback(new Error("Git error: " + buffer + " (git " + procArgs.join(" ") + " (cwd: " + (options.cwd || process.cwd()) + ")"));
		        }
		        if (/^fatal:/.test(buffer)) {
		            return callback(new Error("Git error: " + buffer));
		        }
		        return callback(null, buffer);
		    });
		});
	}

	return exports;
}

