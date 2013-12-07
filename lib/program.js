
;require("require.async")(require);

const PATH = require("path");
const HELPERS = require("./helpers").for(module);


exports.for = function(context, programPath) {
	return new Program(context, programPath);
}


var Program = function Program(context, programPath) {

	var self = this;

	if (/\.js$/.test(programPath)) {
		self.context = context.copy({
			rootPath: HELPERS.getRootPath(programPath.replace(/\.js$/, "")),
			pinfHome: context.getAbsolutePath("pinfHome"),
			programPath: programPath.replace(/\.js$/, ""),
			bootScript: programPath
		});
	} else {
		// We assume path is a directory.
		// TODO: Confirm that path is a directory.
		throw new Error("Program in directory not yet supported!");
//		self.dir = programPath;
//		self.boot = programPath;
	}
}

Program.prototype.boot = function(callback) {

	var self = this;

	function getHandlerForBootScript(callback) {

		var ext = self.context.bootScript.split(".").pop();

		if (ext === "js") {
			return require.async("../adapters/boot/nodejs.js", function(adapter) {
				return callback(null, adapter);
			}, callback);
		}

		return callback(new Error("Cannot determine boot handler for boot script '" + self.context.bootScript + "'!"));
	}

	return getHandlerForBootScript(function(err, handler) {
		if (err) return callback(err);

		return handler.boot(self, callback);
	});
}

Program.prototype.getAbsolutePath = function(propertyName) {
	return this.context.getAbsolutePath(propertyName);
}
