
const PATH = require("path");
const FS = require("fs-extra");
const UUID = require("node-uuid");


var Context = exports.Context = function(context) {

	var self = this;

	context = context || {};

	// The base path for the context. All paths within this base path
	// will be formatted relative to `rootPath`.
	// If `context.pinfHome` is not set, `rootPath` is considered to be the `pinfHome`.
	self.rootPath = context.rootPath;

	// The path to the requested program.
	self.programPath = self._relpath(context.programPath || null);
	// The boot script that led or uri that is going to lead to the requested program.
	self.bootUri = context.bootUri || null;
	self.bootScript = (context.bootScript && self._relpath(context.bootScript)) || null;

	// The list (delimited by `:`) of contexts to overlay for the active context.
	// When files are searched for, the first match found when searching `split(epoch)`
	// in reverse order is returned. See `self.resolvePathFromProperty()`.
	self.epoch = context.epoch || "default";

	// NOTE: The following path properties must be resolved by splicing in
	//       the `epoch`. See `self.getAbsolutePathFromProperty()`.

	// The base path for all files belonging to an epoch.
	self.pinfHome = (context.pinfHome && self._relpath(context.pinfHome)) || ".";
	self.pinfHomeUid = context.pinfHomeUid || null;
	// The last listed epoch is the most narrow and active one for all writes.
	self.pinfEpoch = self.epoch.split(":").pop();

	// The id and uid of the epoch that contains the auth files.
	self.authEpoch = context.authEpoch || null;
	self.authUid = context.authUid || null;

	self.cachePath = (context.cachePath && self._relpath(context.cachePath)) || "./cache";
	self.clonesPath = (context.clonesPath && self._relpath(context.clonesPath)) || "./clones";
	self.installPath = (context.installPath && self._relpath(context.installPath)) || "./install";
	self.programsPath = (context.programsPath && self._relpath(context.programsPath)) || "./programs";

	// Scoped utility methods and properties.
	// TODO: Move concept of adapter helpers into `flow`.
	self.adapterProperties = context.adapterProperties || {};
	self.adapterMethods = context.adapterMethods || {};

	// NOTE: The following properties are used when narrowing the program context to a package.
	self.uid = context.uid || null;
	self.did = context.did || null;
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

Context.prototype.getAbsolutePathFromProperty = function(propertyName, epoch) {
	var self = this;
	if (typeof self[propertyName] !== "string") throw new Error("Property with name '" + propertyName + "' does not exist!");
	if (/^\//.test(self[propertyName])) {
		return self[propertyName];
	}
	if (epoch) return PATH.join(self.rootPath, epoch, self[propertyName]);
	return PATH.join(self.rootPath, self[propertyName]);
}

Context.prototype.resolvePathFromProperty = function(propertyName, subpath, callback) {
	var self = this;
	if (typeof subpath === "function" && typeof callback === "undefined") {
		callback = subpath;
		subpath = null;
	}
	if (typeof self[propertyName] !== "string") throw new Error("Property with name '" + propertyName + "' does not exist!");
	if (/^\//.test(self[propertyName])) {
		var path = self[propertyName];
		if (subpath) path = PATH.join(path, subpath);
		return callback(null, path, null);
	}
	var epochs = self.epoch.split(":");
	function tryNextEpoch(callback) {
		if (epochs.length === 0) return callback(null, null, null);
		var epoch = epochs.pop();
		var path = PATH.join(self.rootPath, epoch, self[propertyName]);
		if (subpath) path = PATH.join(path, subpath);
		return FS.exists(path, function(exists) {
			if (exists) return callback(null, path, epoch);
			return tryNextEpoch(callback);
		});
	}
	return tryNextEpoch(function(err, path, epoch) {
		if (err) return callback(err);
		if (path) return callback(null, path, epoch);
		var path = PATH.join(self.rootPath, self.pinfEpoch, self[propertyName]);
		if (subpath) path = PATH.join(path, subpath);
		return callback(null, path, self.pinfEpoch);
	});
}

Context.prototype.getLogger = function() {
	// TODO: Scope console messages based on context.
	return console;
}

Context.prototype.getEnv = function(callback) {
	var self = this;
	var env = {};
	for (var name in process.env) {
		env[name] = process.env[name];
	}
	return self.adapterMethods.authorize.getSshAskpassEnvVars(function(err, _env) {
		for (var name in _env) {
			env[name] = _env[name];
		}
		return self.adapterMethods.authorize.getGitSshEnvVars(function(err, _env) {
			for (var name in _env) {
				env[name] = _env[name];
			}
			return callback(null, env);
		});
	});
}


Context.prototype.ready = function(callback) {
	var self = this;

	function generateUid() {
		// Time-based + Random UUID.
		return [UUID.v1(), UUID.v4()].join("-");
	}

	function ensureDescriptor(callback) {
		var path = PATH.join(self.getAbsolutePathFromProperty("pinfHome", self.pinfEpoch), "package.json");
		return FS.exists(path, function(exists) {
			if (exists) return callback(null, path);
			return FS.outputFile(path, JSON.stringify({
				"uid": generateUid(),
				"ctime": Date.now()
			}, null, 4), function(err) {
				if (err) return callback(err);
				return callback(null, path);
			});
		});
	}

	function ensureUid(callback) {
		if (self.pinfHomeUid) return callback(null);
		return ensureDescriptor(function(err, descriptorPath) {
			if (err) return callback(err);
			return FS.readJson(descriptorPath, function(err, descriptor) {
				if (err) return callback(err);
				if (descriptor.uid) {
					self.pinfHomeUid = descriptor.uid;
					return callback(null);
				}
				self.pinfHomeUid = descriptor.uid = generateUid();
				return FS.outputFile(path, JSON.stringify(descriptor, null, 4));
			});
		});
	}

	function findAuthHome(callback) {
		// The `authHome` is in the epoch where the `/id_rsa` file is found.
		return self.resolvePathFromProperty("pinfHome", "id_rsa", function(err, privateKeyPath, epoch) {
			if (err) return callback(err);

			self.authEpoch = epoch;

			function getUid(callback) {
				var packageDescriptorPath = PATH.join(privateKeyPath, "..", "package.json");
				return FS.exists(packageDescriptorPath, function(exists) {
					if (!exists) return callback(null, self.pinfHomeUid);
					return FS.readJson(packageDescriptorPath, function(err, packageDescriptor) {
						if (err) return callback(err);
						return callback(null, packageDescriptor.uid);
					});
				});
			}

			return getUid(function(err, uid) {
				if (err) return callback(err);

				self.authUid = uid;

				return callback(null);
			});
		});
	}

	return ensureUid(function(err) {
		if (err) return callback(err);

		return findAuthHome(callback);
	});
}
