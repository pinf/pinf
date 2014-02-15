
const AWS = require("aws-sdk");
const HELPERS = require("../../lib/helpers").for(module);


exports.for = function(context) {

	function getAWS() {
	    AWS.config = new AWS.Config({
	    	// TODO: Pull these from config.
			accessKeyId: process.env.AWS_ACCESS_KEY,
			secretAccessKey: process.env.AWS_SECRET_KEY,
	        region: 'us-east-1'
	    });
		return AWS;
	}

	function exists(callback) {
		var s3 = new (getAWS().S3)();
		return s3.listObjects({
			Bucket: "i.hcs.io"
		}, function (err, data) {
			if (err) return callback(err);
			var instances = {};
			if (data && data.Contents) {
				data.Contents.forEach(function(record) {
					if (/\/$/.test(record.Key)) {
						instances[record.Key.replace(/\/$/, "")] = {};
					}
				});
			}
			return callback(null, instances);
		});		
	}

	function upload(callback) {
		var s3 = new (getAWS().S3)();
		return s3.putObject({
			ACL: "private",
			Bucket: "i.hcs.io",
			ContentType: "application/javascript",
			Key: CONFIG.getConfig().instanceId + "/config.json",
			ServerSideEncryption: "AES256",
			Body: new Buffer(JSON.stringify(CONFIG.getConfig(), null, 4))
		}, function (err, data) {
			if (err) return callback(err);		
			return callback(null);
		});
	}

	var exports = {};

    exports.distribute = function(callback) {

		if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
			// TODO: Call remote distribute if a new package is found.
			context.logger.console.setup("Set the `AWS_ACCESS_KEY` and `AWS_SECRET_KEY` environment variables to enable sync to AWS S3!");
			return callback(null);
		}

		return exists(function(err, exists) {
			if (err) return callback(err);
			if (exists) return callback(null);

console.log("upload", context.packageArchivePath);

		});
    }

    return exports;
}
