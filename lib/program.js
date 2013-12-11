
;require("require.async")(require);

const PATH = require("path");
const HELPERS = require("./helpers").for(module);
const FLOW = require("./flow");


var Program = exports.Program = function Program(bootScript) {

	var self = this;

	self.flow = new FLOW.Harness("program");

	self.flow.add(new FLOW.Task("init", function(context, callback) {

		self.flow.setLogger(context.getLogger());

		function locateProgram(callback) {
			if (typeof bootScript.hostname === "undefined") {
				return callback(null, bootScript);
			}
			return require.async("../adapters/resolve/github.com.js", function(adapter) {
				return adapter.resolve(bootScript, callback);
			}, callback);
		}

		return locateProgram(function(err, programPath) {
			if (err) return callback(err);

			var ctx = {
				rootPath: null,
				pinfHome: context.getAbsolutePathFromProperty("pinfHome"),
				programPath: null,
				bootUri: null,
				bootScript: null,
				adapterProperties: {
					boot: {},
					authorize: {}
				},
				adapterMethods: {
					authorize: {}
				}
			};

			if (/\.js$/.test(programPath)) {
				ctx.rootPath = HELPERS.getRootPath(programPath.replace(/\.js$/, ""));
				ctx.programPath = programPath.replace(/\.js$/, "");
				ctx.bootScript = programPath;
			} else
			if (typeof programPath.did === "string") {
				ctx.rootPath = HELPERS.getRootPath(PATH.join(context.getAbsolutePathFromProperty("programsPath", context.pinfEpoch), programPath.did, ".pinf"));
				ctx.bootUri = programPath;
			} else {
				console.error(programPath);
				return callback(new Error("Unable to init for `programPath`!"));
			}

			ctx = context.copy(ctx);

			self.flow.setLogger(ctx.getLogger());

			return callback(null, ctx);
		});
	}));

	self.flow.add(new FLOW.Task("authorize", function(context, callback) {
		return require.async("../adapters/authorize/keychain.js", function(adapter) {
			return adapter.authorize(context, function(err) {
				if (err) return callback(err);

				return require.async("../adapters/authorize/publicprivatekey.js", function(adapter) {
					return adapter.authorize(context, function(err) {
						if (err) return callback(err);

						return require.async("../adapters/authorize/registry.js", function(adapter) {
							return adapter.authorize(context, function(err) {
								if (err) return callback(err);

								return require.async("../adapters/authorize/github.com.js", function(adapter) {
									return adapter.authorize(context, callback);
								}, callback);
							});
						}, callback);
					});
				}, callback);
			});
		}, callback);
	}));

	self.flow.add(new FLOW.Task("clone", function(context, callback) {

		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}

		return context.bootUri.for(context).clone(function(err) {
			if (err) return callback(err);


console.log("CLONED!");

		});


console.log("context", context);

console.error("context.adapterProperties", context.adapterProperties);

/*
					return require.async("../adapters/provision/github.js", function(adapter) {
						var ctx = context.copy({
							cachePath: PATH.join(context.cachePath, NS, "adapters~provision~github")
						});
						ctx.clonePath = ctx._relpath(PATH.join(ctx.getAbsolutePath("cachePath"), "clones", uri.did));
						ctx.installPath = ctx._relpath(PATH.join(ctx.getAbsolutePath("cachePath"), "installs", uri.did));
						return adapter.for(ctx).provide(uri, callback);
					}, callback);
*/

//		return callback(null);
	}));

	self.flow.add(new FLOW.Task("export", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("patch", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("install", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("augment", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("build", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("hack", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("test", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("boot", function(context, callback) {

		return callback(null);

/*
			function getAdapterForBootScript(callback) {
				var ext = context.bootScript.split(".").pop();
				if (ext === "js") {
					context.adapterProperties.boot._adapter = "nodejs";
				} else {
					return callback(new Error("Cannot determine boot adapter for boot script '" + context.bootScript + "'!"));
				}
				return callback(null);
			}

			return getAdapterForBootScript(callback);
*/
//		return require.async("../adapters/boot/" + context.adapterProperties.boot._adapter + ".js", function(adapter) {
//			return adapter.boot(self, callback);
//		}, callback);
	}));

	self.flow.add(new FLOW.Task("run", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("shutdown", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("archive", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("finalize", function(context, callback) {


		return callback(null);
	}));
}

Program.prototype.boot = function(context, callback) {
	return this.flow.start(context, callback);
}
