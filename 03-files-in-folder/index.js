const path = require('path');
const { EOL } = require('os');
const { readdir, stat } = require('fs/promises');

const dirPath = path.join(__dirname, 'secret-folder');

async function getFilesInfo(dir) {
  const files = await readdir(dir, { withFileTypes: true });

  const paths = files.map(async (file) => {
    const p = path.join(dir, file.name);

    if (file.isDirectory()) {
      return null;
      // return await getFilesInfo(p);
    }

    let { base, ext, name } = path.parse(p);

    if (base.split('.')[0] === '') {
      name = '';
      ext = '.' + base.split('.')[1];
    }

    const fileSize = ((await stat(p)).size / 1024) + 'kb';

    return [name, ext.slice(1), fileSize].join(' - ');
  });

  return (await Promise.all(paths)).flat(Infinity).filter((i) => i).join(EOL);
}

getFilesInfo(dirPath)
  .then((files) => console.log(files))
  .catch((e) => console.error(e));
