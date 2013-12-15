
;require("require.async")(require);

const PATH = require("path");
const FS = require("fs-extra");
const HELPERS = require("./helpers").for(module);
const FLOW = require("./flow");


var Program = exports.Program = function Program(bootScript) {

	var self = this;

	self.flow = new FLOW.Harness("program");

	function augmentContextBasedOnProgramQueryPath(ctx, programQueryPath) {
		// Check for JavaScript program file.
		if (/\.js$/.test(programQueryPath)) {
			ctx.rootPath = HELPERS.getRootPath(programQueryPath.replace(/\.js$/, ""));
			ctx.programPath = programQueryPath.replace(/\.js$/, "");
			ctx.bootScript = programQueryPath;
			ctx.bootAdapter = "nodejs";
		} else
		// Check for path to package descriptor file.
		if (/\/package\.json$/.test(programQueryPath)) {
			ctx.rootPath = HELPERS.getRootPath(PATH.dirname(programQueryPath));
			ctx.programPath = PATH.dirname(programQueryPath);
			ctx.bootScript = programQueryPath;
		} else
		// Check for URI representing program.
		if (typeof programQueryPath.did === "string") {
			ctx.rootPath = HELPERS.getRootPath(PATH.join(ctx.getAbsolutePathFromProperty("programsPath", ctx.pinfEpoch), programQueryPath.did, ".pinf"));
			ctx.bootUri = programQueryPath;
			ctx.bootAdapter = "nodejs";
		} else
		// TODO: Add support for `*.pinf` commands that represent *virtual* programs.
		{
			// By default we assume we have a command we can just call.
			// TODO: Read command file and in comment find meta data to customize context of command.
			//       This is used in scenarios where the command installed on a system has a default
			//       set of configurations but we want to call it with a modified set.
			ctx.rootPath = HELPERS.getRootPath(programQueryPath);
			ctx.programPath = programQueryPath;
			ctx.bootScript = programQueryPath;
			ctx.bootAdapter = "command";
		}
	}

	self.flow.add(new FLOW.Task("init", function(context, callback) {

		function locateProgram(callback) {
			if (typeof bootScript === "string") {
				return callback(null, bootScript);
			}
			if (typeof bootScript.hostname === "undefined") {
				return callback(null, bootScript);
			}
			// Assuming `bootScript.hostname` is github.
			return require.async("../adapters/resolve/github.com.js", function(adapter) {
				return adapter.resolve(bootScript, callback);
			}, callback);
		}

		return locateProgram(function(err, programQueryPath) {
			if (err) return callback(err);

			function formulateContext(callback) {

				var ctx = {
					rootPath: null,
					pinfHome: context.getAbsolutePathFromProperty("pinfHome"),
					programPath: null,
					bootUri: null,
					bootScript: null,
					bootAdapter: null,
					adapterProperties: {
						authorize: {}
					},
					adapterMethods: {
						authorize: {},
						scmstatus: {},
						clone: {},
						export: {},
						describe: {},
						install: {},
						package: {},
						distribute: {}
					},
					used: {
						fs: {
							describe: []
						}
					}
				};

				augmentContextBasedOnProgramQueryPath(ctx, programQueryPath);

				return callback(null, ctx);
			}

			return formulateContext(function(err, ctx) {
				if (err) return callback(err);
				ctx = context.copy(ctx);
				return callback(null, ctx);
			});
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

	self.flow.add(new FLOW.Task("scmstatus", function(context, callback) {
		if (/\/package\.json$/.test(context.getAbsolutePathFromProperty("bootScript"))) {
			return require.async("../adapters/scmstatus/git.js", function(adapter) {
				return adapter.scmstatus(context, callback);
			}, callback);
		}
		return callback(null);
	}));

	self.flow.add(new FLOW.Task("clone", function(context, callback) {
		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}
		if (context.bootUri) {
			return context.bootUri.for(context).clone(callback);
		}
		return callback(null);
	}));

	self.flow.add(new FLOW.Task("export", function(context, callback) {
		context.adapterMethods.export.getPath = function(callback) {
			return callback(null, context.getAbsolutePathFromProperty("programPath"));
		}
		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}
		if (context.bootUri) {
			return context.bootUri.for(context).export(callback);
		}
		return callback(null);
	}));

	self.flow.add(new FLOW.Task("describe", function(context, callback) {
		return require.async("../adapters/describe/commonjs.js", function(adapter) {
			return adapter.for(context).describe(function(err) {
				if (err) return callback(err);
				try {
					return context.adapterMethods.describe.getDescriptor(function(err, descriptor) {
						if (err) return callback(err);

						context.version = descriptor.getPropertyObject("version");
						if (context.scm && context.scm.ref && context.scm.dirty === false) {
							context.version.setBuild(context.scm.ref.substring(0, 7));
						}
	
						if (context.bootUri) return callback(null);
						return require.async("../adapters/resolve/fs.js", function(adapter) {
							return adapter.resolve(context.getAbsolutePathFromProperty("bootScript"), function(err, bootUri) {
								if (err) return callback(err);
								context.bootUri = bootUri || null;
								return callback(null);
							});
						}, callback);
					});
				} catch(err) {
					return callback(err);
				}
			});
		}, callback);
	}));

	self.flow.add(new FLOW.Task("patch", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("install", function(context, callback) {
        context.adapterMethods.install.getPath = function(callback) {
            return callback(null, context.getAbsolutePathFromProperty("programPath"));
        }
		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}
		if (context.bootUri) {
			return context.bootUri.for(context).install(callback);
		}
   		return callback(null);
	}));

	self.flow.add(new FLOW.Task("augment", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("build", function(context, callback) {


		return callback(null);
	}));

//	self.flow.add(new FLOW.Task("hack", function(context, callback) {
//		return callback(null);
//	}));

	self.flow.add(new FLOW.Task("test", function(context, callback) {


		return callback(null);
	}));

	self.flow.add(new FLOW.Task("package", function(context, callback) {
		if (context.bootUri) {

			if (!context.scm) {
				context.logger.console.setup("Call `git init` to manage and publish source code.");
				return callback(null);
			}

			if (context.scm.dirty && context.ignoreScmDirty !== true) {
				context.logger.console.feature("Commit all changes to git to publish source code or use `---ignore-scm-dirty`.");
				return callback(null);
			}

			return context.bootUri.for(context).package(function(err) {
				if (err) return callback(err);

				if (typeof context.adapterMethods.package.getArchivePath !== "function") {
					// A package was not created.
					return callback(null);
				}
				// A package was created.
				return context.adapterMethods.package.getArchivePath(function(err, packageArchivePath) {
					if (err) return callback(err);
					context.packageArchivePath = packageArchivePath;
					return callback(null);
				});
			});
		}
		return callback(null);
	}));

	self.flow.add(new FLOW.Task("distribute", function(context, callback) {

console.log("context.packageArchivePath", context.packageArchivePath);

		// TODO: Call remote distribute if a new package is found.
		context.logger.console.setup("Set the `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` environment variables to enable sync to AWS S3!");

		if (context.bootScript) {
			// The boot script is already provisioned locally.
			return callback(null);
		}

		if (context.bootUri) {
			return context.bootUri.for(context).distribute(callback);
		}

		return callback(null);
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

			if (!context.bootAdapter) {
				context.logger.console.warn("Not booting program because `bootAdapter` is not set!");
				return callback(null);
			}

			return require.async("../adapters/boot/" + context.bootAdapter + ".js", function(adapter) {
				return adapter.boot(context, callback);
			}, callback);
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
