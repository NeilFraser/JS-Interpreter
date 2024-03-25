const fs = require('fs');

// File paths and content to add
const filesToModify = [
  { original: 'interpreter.js', new: 'interpreter-esm.js', insertionAnchor: 'var Interpreter', contentToAdd: "import { parse, version } from './acorn-esm.js';\nvar asEsm = true;\nexport { Interpreter, parse, version as acornVersion };\n\n" },
  { original: 'acorn.js', new: 'acorn-esm.js', insertionAnchor: 'var version', contentToAdd: "export { parse, version };\nvar asEsm = true;\n\n" }
];

// Loop through each file to modify
filesToModify.forEach(file => {
  const originalContent = fs.readFileSync(file.original, 'utf8');
  const insertionIndex = originalContent.indexOf(file.insertionAnchor);

  if (insertionIndex !== -1) {
    const insertionPoint = insertionIndex + file.insertionAnchor.length;
    const newContent = originalContent.substring(0, insertionPoint) + '\n' +  // Add newline character
                      file.contentToAdd +
                      originalContent.substring(insertionPoint);

    fs.writeFileSync(file.new, newContent);
    console.log(`Modified ${file.original} and saved as ${file.new}`);
  } else {
    console.error(`Insertion anchor not found in ${file.original}`);
  }
});
