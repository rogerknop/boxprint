https://github.com/jscad/OpenJSCAD.org

https://openjscad.xyz/docs/

npm install -D @jscad/cli

npx jscad src/index.js -o export/result.jscad.json

npx nodemon -w ./src --exec npx jscad src/index.js -o export/result.jscad.json

node src/index.js [configfilename without .json]