
;require("require.async")(require);

const PATH = require("path");
const FS = require("fs-extra");
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
					authorize: {}
				},
				adapterMethods: {
					authorize: {},
					clone: {},
					export: {},
					install: {},
					distribute: {}
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
				return callback(new Error("Unable to init for programPath `" + programPath + "`!"));
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
		return context.bootUri.for(context).clone(callback);
	}));

	self.flow.add(new FLOW.Task("export", function(context, callback) {
		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}
		return context.bootUri.for(context).export(callback);
	}));

	self.flow.add(new FLOW.Task("patch", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("install", function(context, callback) {
		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}
		return context.bootUri.for(context).install(callback);
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

	self.flow.add(new FLOW.Task("distribute", function(context, callback) {
		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}
		return context.bootUri.for(context).distribute(callback);
	}));

	self.flow.add(new FLOW.Task("boot", function(context, callback) {

		function ensureBootScript(callback) {
			if (context.bootScript) {
				return callback(null);
			}
			return context.adapterMethods.distribute.getPath(function(err, distPath) {
				if (err) return callback(null);
				if (context.bootUri.path) {
					distPath = PATH.join(distPath, context.bootUri.path);
				}
				context.programPath = context._relpath(distPath);
				context.bootScript = distPath;

				function checkIfJavaScriptProgramFile(callback) {
					return FS.exists(context.getAbsolutePathFromProperty("bootScript") + ".js", function(exists) {
						if (exists) return callback(null, context.bootScript + ".js");
						return callback(null, null);
					});
				}

				return checkIfJavaScriptProgramFile(function(err, bootScriptPath) {
					if (err) return done(err);
					if (bootScriptPath) {
						context.bootScript = context._relpath(bootScriptPath);
					}
					return callback(null);
				});
			});
		}

		return ensureBootScript(function(err) {
			if (err) return callback(err);

			function getAdapterForBootScript(callback) {
				var ext = context.bootScript.split(".").pop();
				var adapter = null;
				if (ext === "js") {
					adapter = "nodejs";
				} else {
					return callback(new Error("Cannot determine boot adapter for boot script '" + context.bootScript + "'!"));
				}
				return callback(null, adapter);
			}

			return getAdapterForBootScript(function(err, adapter) {
				if (err) return callback(err);

				return require.async("../adapters/boot/" + adapter + ".js", function(adapter) {
					return adapter.boot(context, callback);
				}, callback);
			});
		});
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
