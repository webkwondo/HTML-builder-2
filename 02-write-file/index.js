const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { EOL } = require('os');
const process = require('process');
const { stdin, stdout, exit } = process;

const file = fs.createWriteStream(path.join(__dirname, 'output.txt'));
const question = 'Hi there! What do you think?' + EOL;
const goodbye = 'Goodbye then!' + EOL;

const rl = readline.createInterface({
  input: stdin,
  output: stdout
});

const writeToFile = (fileStream, end = false, inputStr) => {
  if (end) {
    return fileStream.end();
  }

  if (inputStr) {
    inputStr += EOL;
    return fileStream.write(inputStr);
  }

  return false;
};

const ask = (q) => rl.question(q, (answer) => {
  if (answer.trim() === 'exit') {
    writeToFile(file, true);
    rl.close();
    return exit();
  }

  writeToFile(file, false, answer);
  ask('');
});

ask(question);

process.on('exit', () => stdout.write(goodbye));
