
const PATH = require("path");
const FS = require("fs-extra");
const GIT = require("../clone/git");


exports.export = function(context, callback) {

	var callGit = GIT.for(context).callGit;

	return context.resolvePathFromProperty("exportsPath", context.did, function(err, finalPath) {
        if (err) return callback(err);

		context.adapterMethods.export.getPath = function(callback) {
			return callback(null, finalPath);
		}

        return FS.exists(finalPath, function(exists) {
        	if (exists) {
        		return callback(null);
        	}

			return context.adapterMethods.clone.getPath(function(err, clonePath) {
		        if (err) return callback(err);

			    var tmpPath = finalPath + "~" + Date.now();

			    return FS.mkdirs(PATH.dirname(finalPath), function(err) {
			        if (err) return callback(err);
			        return callGit([
			            "clone",
		                "--depth", "1",
		                "--branch", context.selector,
		                "file://" + clonePath,
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
	});
}
