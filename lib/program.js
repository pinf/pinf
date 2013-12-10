
;require("require.async")(require);

const PATH = require("path");
const HELPERS = require("./helpers").for(module);
const FLOW = require("./flow");


exports.for = function(context, programPath) {
	return new Program(context, programPath);
}


var Program = function Program(context, programPath) {

	var self = this;

	if (/\.js$/.test(programPath)) {
		self.context = context.copy({
			rootPath: HELPERS.getRootPath(programPath.replace(/\.js$/, "")),
			pinfHome: context.getAbsolutePathFromProperty("pinfHome"),
			programPath: programPath.replace(/\.js$/, ""),
			bootScript: programPath,
			adapterProperties: {
				boot: {},
				authorize: {}
			},
			adapterMethods: {
				authorize: {}
			}
		});
	} else {
		// We assume path is a directory.
		// TODO: Confirm that path is a directory.
		throw new Error("Program in directory not yet supported!");
//		self.dir = programPath;
//		self.boot = programPath;
	}

	self.flow = new FLOW.Harness("program");
//	self.flow.setLogger(self.context.getLogger());

	self.flow.add(new FLOW.Task("init", function(context, callback) {

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

//console.log("context.adapterProperties", context.adapterProperties);

		return callback(null);
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
		return require.async("../adapters/boot/" + context.adapterProperties.boot._adapter + ".js", function(adapter) {
			return adapter.boot(self, callback);
		}, callback);
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

Program.prototype.boot = function(callback) {
	var self = this;
	return self.flow.start(self.context, callback);
}

Program.prototype.getAbsolutePathFromProperty = function(propertyName) {
	return this.context.getAbsolutePathFromProperty(propertyName);
}
