
var count = 0;

function send() {
	count += 1;
	process.stdout.write(process.argv[3] + "\n");
	if (count < parseInt(process.argv[2])) {
		setTimeout(send, 50);
	}
}

send();
