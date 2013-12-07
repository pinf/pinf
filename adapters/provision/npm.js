
const PATH = require("path");
const FS = require("fs-extra");
const HELPERS = require("../../lib/helpers").for(module);
const SPAWN = require("child_process").spawn;


exports.for = function(context) {

	var exports = {};

	exports.install = function(path, callback) {
		return callNpm([
			"install",
			"--production"
		], {
			cwd: path
		}, function(err) {
			if (err) return callback(err);
			return callback(null);
		});
	}

	function callNpm(procArgs, options, callback) {
        var env = {};
        for (var name in process.env) {
            env[name] = process.env[name];
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
            buffer += data.toString();
        });
        proc.stderr.on("data", function(data) {
// TODO: Only log progress if in interactive shell.
//process.stderr.write(data.toString());
            buffer += data.toString();
        });
        proc.on("exit", function(code) {
            if (code !== 0) {
                if (!buffer) buffer = "(exit code " + code + ")";
                return callback(new Error("NPM error: " + buffer + " (git " + procArgs.join(" ") + " (cwd: " + (options.cwd || process.cwd()) + ")"));
            }
            return callback(null, buffer);
        });
    }

	return exports;
}
