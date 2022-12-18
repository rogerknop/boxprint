const { Console } = require('console');
const fs = require('fs-extra');

const JSON5 = require('json5')

const util = require('util');
const exec = util.promisify(require('child_process').exec);

class Core {

    //****************************************************************************************************
    constructor() {
    }

    //****************************************************************************************************
    async readConfig() {
        if (!fs.existsSync('./config')){
            console.log("Konfigurationsverzeichnis 'config' existiert nicht!");
            process.exit();
        }        
        var file = "./config/default.json";
        if (process.argv[2]) {
            file = "./config/" + process.argv[2] + ".json";
        }
        if (fs.existsSync(file)) {
            try {
                this.config = JSON5.parse(fs.readFileSync(file),'UTF8');
            } catch (e) {
                console.log("Fehlerhafte Konfiguration! " + file);
                process.exit();
            }
        }
        else {
            console.log("Konfigurationsdatei " + file + " existiert nicht!");
            process.exit();
        }
    }
    
}

module.exports = Core;