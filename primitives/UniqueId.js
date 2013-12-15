
const URL = require("url");
const SEMVER = require("semver");


var UniqueId = exports.UniqueId = function(context) {
	this.context = context;
	this.uri = null;
}

UniqueId.prototype.fromString = function(str) {
	var m = null;
	str = str.replace(/~/g, "/");
	if (
		!(m = URL.parse("http://" + str)) ||
		!m.hostname ||
		!m.pathname
	) {
		throw new Error("Could not parse unique id string '" + str + "'!");
	}
	this.namespace = m.hostname + m.pathname;
	return this;
}

UniqueId.prototype.toString = function(format) {
	if (format === "dirname") {
		return this.namespace.replace(/\//g, "~");
	}
	return this.namespace;
}
