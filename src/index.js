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

    if (core.config.type == "box") {
      let box = new Box(core, core.config.modelData);
      box.export();
    }
}

main();
