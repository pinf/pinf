
;require("require.async")(require);

const PATH = require("path");


exports.for = function(programPath) {
	return new Program(programPath);
}


var Program = function Program(programPath) {

	var self = this;

	if (/\.js$/.test(programPath)) {
		self.rootPath = programPath.replace(/\.js$/, "");
		self.bootScript = PATH.relative(self.rootPath, programPath);
	} else {
		// We assume path is a directory.
		// TODO: Confirm that path is a directory.
		throw new Error("Program in directory not yet supported!");
//		self.dir = programPath;
//		self.boot = programPath;
	}

	// If `path` is within the `rootPath` we use a relative path.
	function relpath(path) {
		if (path.substring(0, self.rootPath.length) === self.rootPath) {
			return PATH.relative(self.rootPath, path);
		}
		return path;
	}

	// See if a custom home directory is desired.
	if (process.env.PINF_HOME) {
		self.pinfHome = relpath(process.env.PINF_HOME);
	} else
	// If not, we keep everything on a OS user level.
	if (process.env.HOME) {
		self.pinfHome = relpath(PATH.join(process.env.HOME, ".pinf"));
	} else
	// In case we run without a user context.
	{
		self.pinfHome = "./.pinf";
	}

}

Program.prototype.boot = function(callback) {

	var self = this;

	function getHandlerForBootScript(callback) {

		var ext = self.bootScript.split(".").pop();

		if (ext === "js") {
			return require.async("../adapters/boot/nodejs.js", function(adapter) {
				return callback(null, adapter);
			}, callback);
		}

		return callback(new Error("Cannot determine boot handler for boot script '" + self.bootScript + "'!"));
	}

	return getHandlerForBootScript(function(err, handler) {
		if (err) return callback(err);

		return handler.boot(self, callback);
	});
}

Program.prototype.getAbsolutePath = function(propertyName) {
	if (typeof this[propertyName] !== "string") throw new Error("Property with name '" + propertyName + "' does not exist!");
	if (/^\//.test(this[propertyName])) {
		return this[propertyName];
	}
	return PATH.join(this.rootPath, this[propertyName]);
}
