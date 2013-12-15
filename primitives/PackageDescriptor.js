
const FS = require("fs-extra");
const PRIMITIVES = require("../lib/primitives");


var PackageDescriptor = exports.PackageDescriptor = function(context) {
	this.context = context;
	this.path = null;
	this.json = null;
}

PackageDescriptor.prototype.fromPath = function(path, callback) {
	var self = this;
	self.path = path;
	return FS.readJson(path, function(err, json) {
		if (err) return callback(err);
		self.json = json;
		return callback(null);
	});
}

PackageDescriptor.prototype.getProperty = function(name) {
	if (typeof this.json[name] === "undefined") {
		return null;
	}
	return this.json[name];
}

PackageDescriptor.prototype.getPropertyObject = function(name) {
	var value = this.getProperty(name);
	if (value === null) return null;
	if (name === "version") {
		try {
			return new PRIMITIVES.Version(this.context).fromString(this.json.version);
		} catch (err) {
			this.context.logger.console.error("The `version` property in `package.json` does not match the http://semver.org/ format!");
			var error = new Error(true);
			error.previous = err;
			throw error;
		}
	} else
	if (name === "uid") {
		try {
			return new PRIMITIVES.UniqueId(this.context).fromString(this.json.uid);
		} catch (err) {
			this.context.logger.console.error("The `uid` property in `package.json` does not follow the proper format!");
			var error = new Error(true);
			error.previous = err;
			throw error;
		}
	}
	throw new Error("No object for property: " + name);
}
