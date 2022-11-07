const path = require('path');
const fs = require('fs');
const { EOL } = require('os');
const { readdir, mkdir, copyFile, rm } = require('fs/promises');
const { Readable } = require('stream');

const destDirName = 'project-dist';
const destDirPath = path.join(__dirname, destDirName);
const componentsDirName = 'components';
const componentsDirPath = path.join(__dirname, componentsDirName);
const templateRegex = /{{.+}}/g;
const sourceHtmlTemplateFileName = 'template.html';
const sourceHtmlTemplateFilePath = path.join(__dirname, sourceHtmlTemplateFileName);
const destHtmlFileName = 'index.html';
const destHtmlFilePath = path.join(destDirPath, destHtmlFileName);
const sourceStylesDirName = 'styles';
const sourceStylesDirPath = path.join(__dirname, sourceStylesDirName);
const destStylesFileName = 'style.css';
const destStylesFilePath = path.join(destDirPath, destStylesFileName);
const stylesExtention = '.css';
const sourceAssetsDirName = 'assets';
const sourceAssetsDirPath = path.join(__dirname, sourceAssetsDirName);
const destAssetsDirName = sourceAssetsDirName;
const destAssetsDirPath = path.join(destDirPath, destAssetsDirName);

function matchString(regexp, haystack) {
  const arr = [...haystack.matchAll(regexp)];
  const newArr = [];
  let unique;

  for (const item of arr) {
    newArr.push(item[0]);
  }

  unique = [...new Set(newArr)];

  return unique;
}

function getFileName(templateStr) {
  return templateStr.slice(2, templateStr.length - 2);
}

async function pipeFileAsync(readableStream, writable, callback) {
  readableStream.setEncoding('utf8');
  let lastChunk = '';

  if (typeof writable === 'string') {
    let data = writable;

    for await (const chunk of readableStream) {
      lastChunk = chunk;
      data += chunk;
    }

    if (lastChunk.slice(-1) !== EOL) {
      data += EOL;
    }

    return data;
  } else {
    for await (const chunk of readableStream) {
      lastChunk = chunk;
      writable.write(chunk);
    }

    if (lastChunk.slice(-1) !== EOL) {
      writable.write(EOL);
    }

    if (callback) {
      callback();
    }

    return writable;
  }
}

async function createDir(dirPath) {
  return await mkdir(dirPath, { recursive: true }).catch((err) => {
    if (err) throw err;
  });
}

async function readDir(dirPath) {
  return readdir(dirPath, { withFileTypes: true });
}

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
      await copyFile(srcPath, destPath);
    }
  }

  return arr;
}

async function mergeFiles(srcDirPath, destPath, extention) {
  const writableFileStream = fs.createWriteStream(destPath);
  const dirents = await readDir(srcDirPath);

  for (let entry of dirents) {
    const srcPath = path.join(srcDirPath, entry.name);
    const { ext } = path.parse(srcPath);

    if (entry.isDirectory() || ext !== extention) {
      continue;
    }

    const readableFileStream = fs.createReadStream(srcPath);
    await pipeFileAsync(readableFileStream, writableFileStream);
  }

  writableFileStream.end();
}

async function buildHtml(templatePath, templatePartsPath, regexp) {
  const readableStream = fs.createReadStream(templatePath);
  let data = await pipeFileAsync(readableStream, '');

  const templateStrings = matchString(regexp, data);
  const dirents = await readDir(templatePartsPath);
  const onlyFiles = dirents.filter((item) => item.isFile() && path.parse(item.name).ext === '.html');
  const paths = [];
  const names = [];

  for (const item of onlyFiles) {
    const p = path.join(templatePartsPath, item.name);
    let { name } = path.parse(p);
    paths.push(p);
    names.push(name);
  }

  for (const str of templateStrings) {
    const fileName = getFileName(str);
    const index = names.indexOf(fileName);

    if (names.includes(fileName)) {
      const regex =  new RegExp(str, 'ig');
      const rStream = fs.createReadStream(paths[index]);
      const dt = await pipeFileAsync(rStream, '');
      data = data.replace(regex, dt);
    }
  }

  return data;
}

async function removeDir(dirPath) {
  return rm(dirPath, { recursive: true, force: true }).then(() => {
    console.log('Directory removed');
  }).catch((error) => {
    console.error(error.message);
  });
}

(async function() {
  // Специально был закомментирован вызов функции удаления папки перед записью файлов. Это связано с тем, что при работе Live Server (VS Code) может возникать конфликт прав доступа/записи/удаления файлов и папок (ENOTEMPTY). При отключении Live Server (и включенном вызове удаления папки перед записью файлов) ошибок не возникает.
  await removeDir(destDirPath);
  await createDir(destDirPath);

  mergeFiles(sourceStylesDirPath, destStylesFilePath, stylesExtention)
    .then(() => console.log('Styles merged'))
    .catch((e) => console.error(e));

  copyDir(sourceAssetsDirPath, destAssetsDirPath)
    .then(() => console.log('Assets copied'))
    .catch((e) => console.error(e));

  const htmlStr = await buildHtml(sourceHtmlTemplateFilePath, componentsDirPath, templateRegex);
  const rStream = Readable.from([htmlStr]);
  const wStream = fs.createWriteStream(destHtmlFilePath);

  await pipeFileAsync(rStream, wStream, () => {
    console.log('Html built');
  });

  wStream.end();
})();
