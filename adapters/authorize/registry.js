
const PATH = require("path");
const FS = require("fs");
const CRYPTO = require("crypto");
const DEEPMERGE = require("deepmerge");
const HELPERS = require("../../lib/helpers").for(module);


exports.authorize = function(context, callback) {

	return context.resolvePathFromProperty("pinfHome", "auth.registry.json.secure", function(err, registryPath) {
		if (err) return callback(err);

		var registry = {};

		context.adapterMethods.authorize.setInRegistry = function(key, value, callback) {
			if (registry[key] === value) return callback(null);
			registry[key] = value;
			return save(callback);
		}

		context.adapterMethods.authorize.getFromRegistry = function(key, callback) {
			return callback(null, registry[key] || null);
		}

		function load(callback) {
			return FS.exists(registryPath, function(exists) {
				if (exists) {
					return FS.readFile(registryPath, "utf8", function(err, data) {
						if (err) return callback(err);
						return context.adapterMethods.authorize.decryptData("registry", data, function(err, data) {
							if (err) return callback(err);
							registry = JSON.parse(data);
							return callback(null);
						});
					});
				}
				return callback(null);
			});
		}

		function save(callback) {
			var pendingRegistry = registry;
			// Merge any changes on disk with our changes before saving.
			return load(function(err) {
				if (err) return callback(err);
				registry = DEEPMERGE(registry, pendingRegistry);
				return context.adapterMethods.authorize.encryptData("registry", JSON.stringify(registry), function(err, data) {
					if (err) return callback(err);
					var path = registryPath + "~" + Date.now();
					return FS.writeFile(path, data, "utf8", function(err) {
						if (err) return callback(err);
						return HELPERS.exec('mv -f "' + path+ '" "' + registryPath + '"', callback);
					});
				});
			});
		}

		return load(callback);
	});
}
