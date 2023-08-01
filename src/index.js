const Core = require('./core.js');
const Box = require('./box.js');
const Clamp = require('./clamp.js');
const Freestyle = require('./freestyle.js');

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
        } catch (e) {console.log(e.message); throw e;}
      }

      box.logMeasurements();
      box.export();
    }

    if (core.config.type == "clamp") {
      let clamp = new Clamp(core, core.config.modelData);
      
      if (core.config.extensionAvailable) {
        try {
          core.config.extension.processEnd(clamp);
        } catch (e) {}
      }

      clamp.export();
    }

    if (core.config.type == "freestyle") {
      let freestyle = new Freestyle(core, core.config.modelData);
      
      if (core.config.extensionAvailable) {
        try {
          core.config.extension.processEnd(freestyle);
        } catch (e) {}
      }

      freestyle.export();
    }

}

main();
