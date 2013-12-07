
process.stdin.on('data', function(chunk) {
	process.stdout.write(chunk);
});

process.stdin.on('end', function() {
	process.stdout.write(process.argv[2]);
});

process.stdin.resume();
