
const PATH = require("path");
const FS = require("fs");
const SPAWN = require("child_process").spawn;


exports.boot = function(context, callback) {

	var scriptPath = context.getAbsolutePathFromProperty("bootScript");

	var procArgs = process.argv.slice(3);

	return context.getEnv(function(err, env) {
		if (err) return callback(err);
		if (process.env.DEBUG) {
			console.log("[pinf] Exec:", scriptPath, procArgs);
		}
	    var proc = SPAWN(scriptPath, procArgs, {
	        cwd: process.cwd(),
	        // TODO: Use `context.stdin`, `context.stdout` and `context.stderr`.
	        //       Currently not working due to: `TypeError: Incorrect value for stdio stream: [object Object]`
	        stdio: [process.stdin, process.stdout, process.stderr],
	        env: env
	    });
	    proc.on("error", function(err) {
	        return callback(err);
	    });
	    proc.on("exit", function(code) {
	        if (code !== 0) {
	            return callback(new Error("Got status '" + code + "' while calling: " + [scriptPath].concat(procArgs).join(" ") + " (cwd: " + (options.cwd || process.cwd()) + ")"));
	        }
	        return callback(null);
	    });
	});
}
