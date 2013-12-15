
const PATH = require("path");
const FS = require("fs-extra");
const GIT = require("../clone/git");


exports.scmstatus = function(context, callback) {

	var callGit = GIT.for(context).callGit;

	var repositoryPath = PATH.join(context.getAbsolutePathFromProperty("programPath"), ".git");

	return FS.exists(repositoryPath, function(exists) {
		if (!exists) {
			return callback(null);
		}

		context.scm = {
			type: "git",
			branch: null,
			ref: null,
			dirty: true
		};

        context.adapterMethods.scmstatus.getRepositoryPath = function(callback) {
            return callback(null, repositoryPath);
        }

        context.adapterMethods.scmstatus.getRefForTag = function(tag, callback) {
	        return callGit([
	            "rev-list",
	            "-1",
	            tag
	        ], {}, function(err, result) {
	            if (err) {
	            	if (/unknown revision or path not in the working tree/.test(err.message)) {
	            		return callback(null, false);
	            	}
	            	return callback(err);
	            }
				return callback(null, result.replace(/\n$/, ""));
	        });
        }

        // Info on how git returns status:
        //  * http://stackoverflow.com/questions/6245570/get-current-branch-name
        //  * http://stackoverflow.com/questions/3878624/how-do-i-programmatically-determine-if-there-are-uncommited-changes
        //  * http://stackoverflow.com/questions/2657935/checking-for-a-dirty-index-or-untracked-files-with-git

        // TODO: Speed up these calls. e.g. call within one exec (echo delimiters) or use module that does not spawn.

        function checkIfDirty(callback) {
	        return callGit([
	            "status",
	            "--porcelain"
	        ], {}, function(err, result) {
	            if (err) return callback(err);

				context.scm.dirty = !!result;

				return callback(null);
			});
        }

        function getBranch(callback) {
	        return callGit([
	            "symbolic-ref",
	            "-q",
	            "--short",
	            "HEAD"
	        ], {}, function(err, result) {
	            if (err) return callback(err);

				context.scm.branch = (result && result.replace(/\n$/, "")) || false;

				if (context.scm.branch === "rc") {
					context.console.error("The branch name of `rc` is reserved by PINF and may not be used directly in the working tree!");
					return callback(true);
				}

				return callback(null);
			});
        }

        function getRev(callback) {
	        return callGit([
	            "rev-parse",
	            "HEAD"
	        ], {}, function(err, result) {
	            if (err) {
	            	if (/unknown revision or path not in the working tree/.test(err.message)) {
	            		context.logger.console.error("You need to make at least one commit!");
	            		return callback(true);
	            	}
	            	return callback(err);
	            }

				context.scm.ref = (result && result.replace(/\n$/, "")) || null;

				return callback(null);
	        });
        }

        return checkIfDirty(function(err) {
            if (err) return callback(err);

	        return getBranch(function(err) {
	            if (err) return callback(err);

		        return getRev(function(err) {
		            if (err) return callback(err);

					return callback(null);
		        });
	        });
        });
	});

}
