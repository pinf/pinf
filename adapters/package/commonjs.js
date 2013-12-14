
const PATH = require("path");
const FS = require("fs-extra");
const HELPERS = require("../../lib/helpers").for(module);
const ESCAPE_REGEXP = require("escape-regexp");


exports.for = function(context) {

	var exports = {};

	exports.package = function (callback) {

		function getPackageIdForRC(rc) {
			return context.packageId + (rc ? (".rc." + rc) : "");
		}

		function getArchiveSubPathForRC(rc) {
			return getPackageIdForRC(rc).replace("@","/") + ".tar.gz";
		}

		var archivePath = null;

        return context.resolvePathFromProperty("packagesPath", getArchiveSubPathForRC(), function(err, finalPath) {
            if (err) return callback(err);

            context.adapterMethods.package.getArchivePath = function(callback) {
                return callback(null, archivePath);
            }

            return FS.exists(finalPath, function(exists) {
                if (exists) {
                	// A release exists on the final (non rc) path so we
                	// cannot create any more release candidates for this version.
                	archivePath = finalPath;
                    return callback(null);
                }

                // No final version has yet been released.

// TODO: Check if version has been tagged. If so Its a final version adnw e check if its created yet or not.
//       If not tagged we create tags.

                // We can create the next RC release.

                function getNextRC(callback) {
                    context.logger.console.warn("We assume all release candidate packages for version " + context.version + " are in the cache: " + PATH.dirname(finalPath));
                	return FS.exists(PATH.dirname(finalPath), function(exists) {
                		if (!exists) return callback(null, 1);
	                	return FS.readdir(PATH.dirname(finalPath), function(err, releases) {
		                    if (err) return callback(err);
							var found = 0;
							var re = new RegExp(
							   "^(?:" +
								   ESCAPE_REGEXP(getPackageIdForRC().replace("@","-")) + "|" +
								   ESCAPE_REGEXP(getPackageIdForRC().split("@").pop()) +
							   ")(?:\\.rc\\.(\\d+))?(?:\\.tar\\.gz)?$"
							);
							releases.forEach(function(release) {
								if ((m = re.exec(release))) {
									found = Math.max(found, parseInt(m[1]));
								}
							});
							found += 1;							
							return callback(null, found);
	                	});
                	});
                }

                return getNextRC(function(err, rc) {
                    if (err) return callback(err);

			        return context.resolvePathFromProperty("packagesPath", getArchiveSubPathForRC(rc), function(err, rcPath) {
			            if (err) return callback(err);

	                    var tmpPath = rcPath + "~" + Date.now();

		                return context.adapterMethods.install.getPath(function(err, installPath) {
		                    if (err) return callback(err);

		                    return FS.mkdirs(PATH.dirname(rcPath), function(err) {
		                        if (err) return callback(err);

		                        function copyAllDistributionFiles(callback) {
		                        	// TODO: Copy all files that should be published. Files in
		                        	//	     `.distignore` get ignored.
		                        	// For now we export all files.
		                        	return callback(null, PATH.join(PATH.dirname(rcPath), getPackageIdForRC(rc).replace("@", "-")));
		                        }

		                        return copyAllDistributionFiles(function(err, distPath) {
		                            if (err) return callback(err);

			                        return FS.symlink(installPath, distPath, function(err) {
			                            if (err) return callback(err);

			                            context.logger.console.warn("All symbolic links in `distPath` (" + distPath + ") get followed when creating package archive!");

				                        return HELPERS.exec('tar --dereference -zcf "' + tmpPath + '" "' + PATH.basename(distPath) + '/"', {
				                        	cwd: PATH.dirname(distPath)
				                        }, function(err) {
				                            if (err) return callback(err);

				                            return FS.rename(tmpPath, rcPath, function(err) {
				                                // NOTE: We ignore `err` on purpose!

				                                // New release candidate as been created.
							                	archivePath = rcPath;
				                                return callback(null);
				                            });
				                        });
			                        });
		                        });
		                    });
		                });
			        });
                });
            });
        });
	}

	return exports;
}
