# Box Creator für 3D Druck

npm install

In config/configfilename.json die entsprechenden Einstellungen vornehmen
node src/index.js [configfilename without .json]

npm run start -> Nodemon mit Watch über Änderungen in src oder config.

## Installation & Doku
* https://github.com/jscad/OpenJSCAD.org
* https://openjscad.xyz/docs/

npm install -D @jscad/cli

## JSCAD direkt ausführen
* npx jscad src/index.js -o export/result.jscad.json
* Über nodemon: npx nodemon -w ./src --exec npx jscad src/index.js -o export/result.jscad.json
