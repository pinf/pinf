
const PATH = require("path");
const FS = require("fs-extra");
const HELPERS = require("../../lib/helpers").for(module);
const ESCAPE_REGEXP = require("escape-regexp");


exports.for = function(context) {

	var exports = {};

	exports.package = function (callback) {

		function getArchiveSubPath(path) {
			return context.getPackageId().replace("@","/") + ".tar.gz";
		}

		var archivePath = null;

        return context.resolvePathFromProperty("packagesPath", getArchiveSubPath(), function(err, finalPath) {
            if (err) return callback(err);

            context.adapterMethods.package.getArchivePath = function(callback) {
                return callback(null, archivePath);
            }

			context.adapterMethods.package.isArchiveSynced = function(alias, callback) {			
				var path = archivePath + "+synced-to-" + alias;
				return FS.exists(path, function(exists) {
					return callback(null, (exists)? path : false, function(data, callback) {
						return FS.outputFile(path, data, callback);
					});
				});
			}

            return FS.exists(finalPath, function(exists) {
                if (exists) {
                	// A release exists on the final (non rc) path so we
                	// cannot create any more release candidates for this version.
                	archivePath = finalPath;
        			context.logger.console.notice("Final release already found for package: " + context.getPackageId());
                    return callback(null);
                }

                // No final version has been released yet.


                function createRelease(prereleaseTag, callback) {
            		if (prereleaseTag === false) {
            			// Create a release candidate for the final release.
            			context.logger.console.notice("Creating RC for final release of: " + context.getPackageId());
            		} else {
            			context.logger.console.notice("Creating RC for dev release of: " + context.getPackageId());
            		}

	                function getNextRC(callback) {
	                	if (prereleaseTag === "rc") {
		                    context.logger.console.warn("We assume all release candidate packages for version " + context.version + " are in the cache: " + PATH.dirname(finalPath));
		                	return FS.exists(PATH.dirname(finalPath), function(exists) {
		                		if (!exists) return callback(null, 1);
			                	return FS.readdir(PATH.dirname(finalPath), function(err, releases) {
				                    if (err) return callback(err);
									var found = 0;
									var re = new RegExp(
									   "^(?:" +
										   ESCAPE_REGEXP(context.getPackageId().replace("@","-")) + "|" +
										   ESCAPE_REGEXP(context.getPackageId().split("@").pop()) +
									   ")(?:\\." + prereleaseTag + "\\.(\\d+))?(?:\\.tar\\.gz)?$"
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
	                	} else {
	                		// We are creating a release from a dev branch.
	                		// If all changes have been comitted the release tag is set to the git ref.
	                		if (context.scm.dirty === false) {
	                			return callback(null, context.scm.ref.substring(0, 7));
	                		}
	                		// Otherwise we set it to the current time.
	                		else {
	                			return callback(null, Math.floor(Date.now()/1000));
	                		}
	                	}
	                }

	                return getNextRC(function(err, prereleaseTagVersion) {
	                    if (err) return callback(err);

	                    context.version.appendTag(prereleaseTag, prereleaseTagVersion);

				        return context.resolvePathFromProperty("packagesPath", getArchiveSubPath(), function(err, releasePath) {
				            if (err) return callback(err);

				            return FS.exists(releasePath, function(exists) {
				                if (exists) {
				                	// A tagged release already exists.
				                	// This happens typically for dev releases and should not happen for
				                	// final version releases as `getNextRC()` ensures we always get a ner version.
				                	archivePath = releasePath;
				        			context.logger.console.notice("Dev release already found for package: " + context.getPackageId());
				                    return callback(null);
				                }

			                    var tmpPath = releasePath + "~" + Date.now();

				                return context.adapterMethods.install.getPath(function(err, installPath) {
				                    if (err) return callback(err);

				                    return FS.mkdirs(PATH.dirname(releasePath), function(err) {
				                        if (err) return callback(err);

				                        function copyAllDistributionFiles(callback) {
				                        	// TODO: Copy all files that should be published. Files in
				                        	//	     `.distignore` get ignored.
				                        	// For now we export all files.
				                        	return callback(null, PATH.join(PATH.dirname(releasePath), context.getPackageId().replace("@", "-")));
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

						                            return FS.rename(tmpPath, releasePath, function(err) {
						                                // NOTE: We ignore `err` on purpose!

						                                // New release candidate as been created.
									                	archivePath = releasePath;
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
                }

            	return context.adapterMethods.scmstatus.getRefForTag("v" + context.version, function(err, tagRef) {
                	if (err) return callback(err);

                	var prereleaseTag = null;

                	if (tagRef === context.scm.ref) {
            			// The current working tree commit is the same as the tagged version commit.
            			if (context.scm.dirty === false) {
            				// No pending changes to commit.
            				// We can make the final release.
            				prereleaseTag = "rc";
            			} else
            			if (context.ignoreScmDirty === true) {
            				// There are pending changes to commit.
            				// Even though we wish to ignore these pending changes we cannot
            				// publish the final release with the changes in place.
            				// So we make a dev release.
            				prereleaseTag = context.scm.branch;
            			}
            		} else {
            			// The current working tree commit is different to the tagged version commit.
            			// We need to make a dev release.
        				prereleaseTag = context.scm.branch;
            		}

        			return createRelease(prereleaseTag, callback);
                });

            });
        });
	}

	return exports;
}
