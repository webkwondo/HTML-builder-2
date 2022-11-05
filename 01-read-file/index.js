const fs = require('fs');
const path = require('path');
const process = require('process');
const { stdout } = process;

const readableStream = fs.createReadStream(path.join(__dirname, 'text.txt'));
readableStream.pipe(stdout);
