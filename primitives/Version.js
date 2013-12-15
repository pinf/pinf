
const SEMVER = require("semver");


var Version = exports.Version = function(context) {
	this.context = context;
	this.major = null;
	this.minor = null;
	this.patch = null;
	this.prereleaseTag = null;
	this.prereleaseVersion = null;
	this.build = null;
}

Version.prototype.fromString = function(str) {
	var m = null;
	if (
		!SEMVER.valid(str) ||
		!(m = str.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([^\+]+))?(?:\+(.+))?$/))
	) {
		throw new Error("Could not parse version string '" + str + "'!");
	}
	this.major = (m[1] != "") ? parseInt(m[1]) : null;
	if (this.major === null) {
		throw new Error("Major version component must be specified!");
	}
	this.minor = (m[2] != "") ? parseInt(m[2]) : null;
	this.patch = (m[3] != "") ? parseInt(m[3]) : null;
	if (m[4]) {
		var parts = m[4].split(".");
		if (/^\d+$/.test(parts[parts.length-1])) {
			this.prereleaseVersion = parts.pop();
		}
		this.prereleaseTag = parts;
	}
	this.build = m[5] || null;
	return this;
}

Version.prototype.toString = function() {
	var parts = [];
	parts.push(this.major);
	if (this.minor !== null) {
		parts.push(this.minor);
	}
	if (this.patch !== null) {
		parts.push(this.patch);
	}
	if (this.prereleaseTag !== null) {
		parts.push(this.prereleaseTag);
	}
	if (this.prereleaseVersion !== null) {
		parts.push(this.prereleaseVersion);
	}
	parts = [ parts.join(".") ];
	if (this.build !== null) {
		parts.push(this.build);
	}
	return parts.join("+");
}
