const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(adminDir);

allFiles.forEach((filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  content = content
    .replace(/emerald-950\/[0-9]+/g, 'amber-950/25')
    .replace(/emerald-950/g, 'amber-950')
    .replace(/emerald-900\/[0-9]+/g, 'amber-900/40')
    .replace(/emerald-900/g, 'amber-900')
    .replace(/emerald-600\/[0-9]+/g, 'amber-600/30')
    .replace(/shadow-emerald-500\/[0-9]+/g, 'shadow-amber-500/20')
    .replace(/from-emerald-500 via-teal-400 to-green-300/g, 'from-amber-400 via-yellow-400 to-amber-500')
    .replace(/from-emerald-600 group-hover:to-teal-500/g, 'from-amber-500 group-hover:to-yellow-500')
    .replace(/bg-\[#0a1e16\]\/80 hover:bg-\[#0d261c\]/g, 'bg-zinc-900/90 hover:bg-zinc-800');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Deep cleansed theme in: ${path.relative(adminDir, filePath)}`);
  }
});
