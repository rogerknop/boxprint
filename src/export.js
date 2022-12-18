const jsonSerializer = require('@jscad/json-serializer')
const objSerializer = require('@jscad/obj-serializer')

const { writeFile } = require('node:fs/promises');
const fs = require('fs');

let exportToFiles = (objects, path, params) => {
  if (params.export != "true") {
    return
  }

  const subpath = path.replace(process.cwd(), ".").replace("./src/", "./");

  for (let [k, v] of Object.entries(objects)) {
    
    const jsonData = jsonSerializer.serialize({}, v)
    fs.mkdirSync(`./out/${subpath}/json/`, { recursive: true });
    writeFile(`./out/${subpath}/json/${k}.jscad.json`, jsonData);
    const objData = objSerializer.serialize({}, v)
    fs.mkdirSync(`./out/${subpath}/obj/`, { recursive: true });

    writeFile(`./out/${subpath}/obj/${k}.obj`, objData);
  }
}

module.exports = exportToFiles;
