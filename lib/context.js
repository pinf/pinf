
const PATH = require("path");


var Context = exports.Context = function(context) {

	var self = this;

	context = context || {};

	self.rootPath = context.rootPath;
	self.epoch = context.epoch || "default";
	self.pinfHome = (self.pinfHome && self._relpath(self.pinfHome)) || ".";
	self.programPath = self._relpath(context.programPath || null);
	self.bootScript = self._relpath(context.bootScript || null);
	self.cachePath = self._relpath(context.cachePath || PATH.join(self.rootPath, "cache", self.epoch));
}

// If `path` is within the `rootPath` we return a relative path.
Context.prototype._relpath = function(path) {
	if (path && path.substring(0, this.rootPath.length) === this.rootPath) {
		return PATH.relative(this.rootPath, path);
	}
	return path;
}

Context.prototype.copy = function(context) {
	for (var name in this) {
		if (typeof context[name] === "undefined") {
			context[name] = this[name];
		}
	}
	return new Context(context);
}

Context.prototype.getAbsolutePath = function(propertyName) {
	if (typeof this[propertyName] !== "string") throw new Error("Property with name '" + propertyName + "' does not exist!");
	if (/^\//.test(this[propertyName])) {
		return this[propertyName];
	}
	return PATH.join(this.rootPath, this[propertyName]);
}
