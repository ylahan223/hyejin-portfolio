const fs = require('node:fs/promises');
const path = require('node:path');

const siteFiles = ['index.html', 'archive.html', 'script.js', 'style.css', 'favicon.svg', 'og-image.png', 'admin.html', 'admin-local.js'];

async function buildPublic(root = __dirname) {
  root = await fs.realpath(root);
  const output = path.join(root, 'dist');
  const prior = await fs.lstat(output).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (prior?.isSymbolicLink()) throw new Error('Refusing to replace a linked dist directory.');
  const source = await fs.readFile(path.join(root, 'works-data.js'), 'utf8');
  const match = source.match(/export\s+const\s+worksData\s*=\s*([\s\S]*);\s*$/);
  if (!match) throw new Error('Invalid works-data.js format.');
  const allWorks = JSON.parse(match[1]);
  const publicWorks = allWorks.filter(work => work.isPublic === true);
  const assets = new Set(publicWorks.flatMap(work => [work.coverUrl, ...(work.images || []).map(image => image.url)]).filter(Boolean));
  const files = new Map();
  for (const name of siteFiles) {
    const bytes = await fs.readFile(path.join(root, name));
    files.set(name, bytes);
    if (/\.(html|css)$/.test(name)) {
      for (const match of bytes.toString().matchAll(/["'(]((?:\.\/)?assets\/[^"'()\s<>]+)/g)) assets.add(match[1]);
    }
  }
  const copies = [];
  for (const url of assets) {
    const relative = url.replace(/^\.\//, '');
    if (!relative.startsWith('assets/') || relative.split('/').some(part => part === '..') || relative.includes('\\')) throw new Error(`Invalid asset path: ${url}`);
    const absolute = await fs.realpath(path.join(root, relative));
    if (!absolute.startsWith(root + path.sep)) throw new Error(`Asset outside repository: ${url}`);
    copies.push([relative, absolute]);
  }
  // Only this build's fixed output directory is replaced; source data stays untouched.
  await fs.rm(output, {recursive: true, force: true});
  await fs.mkdir(output, {recursive: true});
  for (const [name, bytes] of files) await fs.writeFile(path.join(output, name), bytes);
  await fs.writeFile(path.join(output, 'works-data.js'), `// Public portfolio data. Generated during deployment.\nexport const worksData = ${JSON.stringify(publicWorks, null, 2)};\n`);
  for (const [relative, absolute] of copies) {
    const target = path.join(output, relative);
    await fs.mkdir(path.dirname(target), {recursive: true});
    await fs.copyFile(absolute, target);
  }
  return {publicWorks: publicWorks.length, excludedWorks: allWorks.length-publicWorks.length, assets: copies.length};
}

module.exports = {buildPublic};
if (require.main === module) buildPublic().then(result => console.log(JSON.stringify(result))).catch(error => {console.error(error); process.exitCode=1;});
