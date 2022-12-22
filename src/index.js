const Core = require('./core.js');
const Box = require('./box.js');

/*
rok-todo:

ToDo:
- git repo erstellen

Features:
- Schrauben Ja/Nein - cyl bis Deckel Achtung! Lochraster Sockel müssen dann evl. Platz lassen
  . Deckel
  . Boden
- Schrauben aussen ja/nein - aussen an den 4 ecken ringe
- Array für Löcher

*/

function main () {
    let core = new Core();
    core.readConfig();
    
    //Require extension if available
    
    try {
      const Extension = require('./extension/' + core.config.techName + ".js");
      core.config.extensionAvailable=true;
      core.config.extension = new Extension(core, core.config.modelData);
    } catch (e) {
      core.config.extensionAvailable=false;
    }

    if (core.config.type == "box") {
      let box = new Box(core, core.config.modelData);
      
      if (core.config.extensionAvailable) {
        try {
          core.config.extension.processEnd(box);
        } catch (e) {}
      }

      box.export();
    }
}

main();
