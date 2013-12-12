
const PATH = require("path");
const FS = require("fs-extra");
const HELPERS = require("../../lib/helpers").for(module);
const SPAWN = require("child_process").spawn;


exports.for = function(context) {

	var exports = {};

    exports.install = function(callback) {

        return context.resolvePathFromProperty("installsPath", context.did, function(err, finalPath) {
            if (err) return callback(err);

            context.adapterMethods.install.getPath = function(callback) {
                return callback(null, finalPath);
            }

            return FS.exists(finalPath, function(exists) {
                if (exists) {
                    return callback(null);
                }

                return context.adapterMethods.export.getPath(function(err, exportPath) {
                    if (err) return callback(err);

                    var tmpPath = finalPath + "~" + Date.now();

                    return FS.mkdirs(PATH.dirname(finalPath), function(err) {
                        if (err) return callback(err);

                        return HELPERS.exec('cp -Rf "' + exportPath + '" "' + tmpPath + '"', function(err) {
                            if (err) return callback(err);

                            return callNpm([
                                "install",
                                "--production"
                            ], {
                                cwd: tmpPath
                            }, function(err) {
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
        });
    }

    function callNpm(procArgs, options, callback) {
        return context.getEnv(function(err, env) {
            if (err) return callback(err);
            if (process.env.DEBUG) {
                console.log("[pinf] Exec:", "git", procArgs);
            }
            var proc = SPAWN("npm", procArgs, {
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
                if (code !== 0) {
                    if (!buffer) buffer = "(exit code " + code + ")";
                    return callback(new Error("NPM error: " + buffer + " (git " + procArgs.join(" ") + " (cwd: " + (options.cwd || process.cwd()) + ")"));
                }
                return callback(null, buffer);
            });
        });
    }

	return exports;
}
