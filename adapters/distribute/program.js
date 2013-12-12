
const PATH = require("path");
const FS = require("fs-extra");
const HELPERS = require("../../lib/helpers").for(module);


exports.for = function(context) {

	var exports = {};

    exports.distribute = function(callback) {

        return context.resolvePathFromProperty("programsPath", context.duid, function(err, finalPath) {
            if (err) return callback(err);

            context.adapterMethods.distribute.getPath = function(callback) {
                return callback(null, finalPath);
            }

            return FS.exists(finalPath, function(exists) {
                if (exists) {
                    return callback(null);
                }

                return context.adapterMethods.install.getPath(function(err, installPath) {
                    if (err) return callback(err);

                    var tmpPath = finalPath + "~" + Date.now();

                    return FS.mkdirs(PATH.dirname(finalPath), function(err) {
                        if (err) return callback(err);

                        return HELPERS.exec('cp -Rf "' + installPath + '" "' + tmpPath + '"', function(err) {
                            if (err) return callback(err);

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

    return exports;
}
