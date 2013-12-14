
const PATH = require("path");
const FS = require("fs-extra");


exports.for = function(context) {

	var exports = {};

	exports.describe = function (callback) {

		function loadPackageDescriptor(path, callback) {
			// TODO: Automatically call this by getting FS API from context.
			context.used.fs.describe.push(path);

			return FS.readJson(path, function(err, descriptor) {
				if (err) return callback(err);

				context.adapterMethods.describe.getDescriptor = function(callback) {
					return callback(null, descriptor);
				};

				return callback(null);
			});
		}

		return context.adapterMethods.export.getPath(function(err, exportPath) {
			if (err) return callback(err);

			var descriptorPath = PATH.join(exportPath, "package.json");

			return FS.exists(descriptorPath, function(exists) {
				if (!exists) return callback(null);

				return loadPackageDescriptor(descriptorPath, callback);
			});
		});
	}

	return exports;
}