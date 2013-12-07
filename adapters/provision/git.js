
const PATH = require("path");
const FS = require("fs-extra");
const SPAWN = require("child_process").spawn;
const NPM = require("./npm");


exports.for = function(context) {

    var exports = {};

    exports.clone = function(uri, callback) {

        var finalPath = context.getAbsolutePath("clonePath");
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
    }

    exports.export = function(selector, callback) {
        var clonePath = context.getAbsolutePath("clonePath");
        var finalPath = context.getAbsolutePath("installPath");
        var tmpPath = finalPath + "~" + Date.now();
        return FS.mkdirs(PATH.dirname(finalPath), function(err) {
            if (err) return callback(err);
            return callGit([
                "clone",
                "--depth", "1",
                "--branch", selector,
                clonePath,
                tmpPath
            ], {
                cwd: clonePath
            }, function(err, result) {
                if (err) return callback(err);
                // TODO: Verify git repository.

                return NPM.for(context).install(tmpPath, function(err) {
                    if (err) return callback(err);

                    return FS.rename(tmpPath, finalPath, function(err) {
                        // NOTE: We ignore `err` on purpose!
                        return callback(null);
                    });
                });
            });
        });
    }


    function callGit(procArgs, options, callback) {
        var env = {};
        for (var name in process.env) {
            env[name] = process.env[name];
        }
        env.GIT_SSH = PATH.join(__dirname, "git", "git-ssh.sh");
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
            buffer += data.toString();
        });
        proc.stderr.on("data", function(data) {
// TODO: Only log progress if in interactive shell.
//process.stderr.write(data.toString());
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
    }

    return exports;
}
