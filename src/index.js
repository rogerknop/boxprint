const Core = require('./core.js');
const Box = require('./box.js');

/*
rok-todo:

ToDo:
- git repo erstellen

Features:
- config in Datei auslagern und per command line parameter mitgeben - weitere werte
  . Höhe Platinen Sockel & Lochradius für Schrauben
- Schrauben Ja/Nein - cyl bis Deckel Achtung! Lochraster Sockel müssen dann evl. Platz lassen
  . Deckel
  . Boden
- Array für Löcher

DruckTests:
- kulanz 0.3
- größere Box => gleiches Klickverhalten

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
