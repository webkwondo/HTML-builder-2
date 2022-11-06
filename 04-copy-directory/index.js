const path = require('path');
const { EOL } = require('os');
const { copyFile, mkdir, readdir, rm } = require('fs/promises');

const sourceDirName = 'files';
const sourceDirPath = path.join(__dirname, sourceDirName);
const destDirName = sourceDirName + '-copy';
const destDirPath = path.join(__dirname, destDirName);

async function createDir(dirPath) {
  return await mkdir(dirPath, { recursive: true }).catch((err) => {
    if (err) throw err;
  });
}

async function readDir(dirPath) {
  return await readdir(dirPath, { withFileTypes: true });
}

const allFiles = [];

async function copyDir(srcDirPath, destDirPath) {
  await createDir(destDirPath);
  const direntsArr = await readDir(srcDirPath);
  const arr = [];

  for (const entry of direntsArr) {
    const srcPath = path.join(srcDirPath, entry.name);
    const destPath = path.join(destDirPath, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      arr.push(destPath);
      allFiles.push(destPath);
      await copyFile(srcPath, destPath);
    }
  }

  return arr;
}

async function removeDir(dirPath) {
  return rm(dirPath, { recursive: true, force: true })
          .catch((error) => {
            console.error(error.message);
          });
}

(async function() {
  await removeDir(destDirPath);

  copyDir(sourceDirPath, destDirPath)
    .then((files) => console.log(allFiles, EOL, 'Copied!'))
    .catch((e) => console.error(e));
})();
