
;require("require.async")(require);

const HELPERS = require("../../lib/helpers").for(module);


exports.canResolve = function(uri) {
	if (/\/package\.json$/.test(uri)) {
		return true;
	}
	return false;
}

exports.resolve = function(uri, callback) {
	if (!exports.canResolve(uri)) {
		return callback(new Error("Cannot resolve uri '" + uri + "'!"));
	}

	uri = {
		uri: uri
	};

	uri.for = function(context) {

		var ctx = null;
		function ensureContext(callback) {
			if (ctx) return callback(null, ctx);
			return context.adapterMethods.describe.getDescriptor(function(err, descriptor) {
				if (err) return callback(err);

				var info = {
					id: context.getAbsolutePathFromProperty("programPath").replace(/[:@#\+]/g, "-")
				};
				info.uid = descriptor.uid || null;
				info.selector = null;
				info.streamid = null;
				info.did = (info.id && info.id.replace(/\//g, "~")) || null;
				info.duid = (info.uid && info.uid.replace(/\//g, "~")) || null;
				info.dstreamid = (info.streamid && info.streamid.replace(/\//g, "~")) || null;

				// Add a package context.
				ctx = context.copy(info);

				return callback(null, ctx);
			});
		}

		var exports = {};

		exports.package = function(callback) {

			return ensureContext(function(err, ctx) {
				if (err) return callback(err);

				if (!ctx.uid) {
					ctx.logger.console.setup("Set `uid` in `package.json` to publish the package!");
					return callback(null);
				}

				if (!ctx.version) {
					ctx.logger.console.setup("Set `version` in `package.json` to publish the package!");
					return callback(null);
				}

				ctx.packageId = ctx.duid + "@" + ctx.version;
				if (ctx.scm && ctx.scm.ref && ctx.scm.dirty === false) {
					ctx.packageId += "+" + ctx.scm.ref.substring(0, 7);
				}

				return require.async("../package/commonjs.js", function(adapter) {
					return adapter.for(ctx).package(callback);
				}, callback);
			});
		}

		return exports;
	}

	return callback(null, uri);
}
