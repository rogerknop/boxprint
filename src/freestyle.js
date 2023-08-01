const jscad = require('@jscad/modeling');

const { writeFile } = require('node:fs/promises');
const fs = require('fs');
const jsonSerializer = require('@jscad/json-serializer');
const objSerializer = require('@jscad/obj-serializer');

const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;

class Freestyle {
    core;

    length = 0;
    computed = {};

    //-----------------------------------------------------------------------------------------------------------------
    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);
    }
    
    //-----------------------------------------------------------------------------------------------------------------
    export() {
        let jsonData = jsonSerializer.serialize({}, this.computed.freestyle);
        writeFile(`./export/json/` + this.core.config.techName + `.jscad.json`, jsonData);
        let objData = objSerializer.serialize({}, this.computed.freestyle);
        writeFile(`./export/obj/` + this.core.config.techName + `.obj`, objData);
    }
}
  
module.exports = Freestyle;

