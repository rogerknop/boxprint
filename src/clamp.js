const jscad = require('@jscad/modeling');

const { writeFile } = require('node:fs/promises');
const fs = require('fs');
const jsonSerializer = require('@jscad/json-serializer');
const objSerializer = require('@jscad/obj-serializer');

const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;

class Clamp {
    core;

    length = 0;
    computed = {};

    //-----------------------------------------------------------------------------------------------------------------
    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);

        this.computed.clamp = this.clamp();
    }
    
    //-----------------------------------------------------------------------------------------------------------------
    clamp() {
        let thickness = 1;
        let height = this.clickHeight + (2 * this.clickRadius) + thickness;
        this.width+=(2*thickness);
        this.depth+=(2*thickness); 
        let result = roundedCuboid({size: [this.width, this.depth, height], center: [0, 0, height/2], roundRadius: 0.1});
        result = subtract(result,  roundedCuboid({size: [this.width-(thickness*2), this.depth-(thickness*2), height], center: [0, 0, (height/2)+thickness], roundRadius: 0.1}));

        let clickRadius = this.clickRadius;
        let length = 8;
        let clickWidth = (this.width/2) - thickness;
        let clickDepth = (this.depth/2) - thickness;
        let clickHeight = this.clickHeight + clickRadius + thickness;
        
        //Click
        let cyl = cylinder( {radius: clickRadius, height: length});
        cyl = rotate([0,degToRad(90),0], cyl);
    
        let c = center({relativeTo: [0, clickDepth, clickHeight]}, cyl);
        result = union(result, c);
        c = center({relativeTo: [0, -clickDepth, clickHeight]}, cyl);
        result = union(result, c);
        cyl = rotate([0,0,degToRad(90)], cyl);
        c = center({relativeTo: [ clickWidth, 0, clickHeight]}, cyl);
        result = union(result, c);
        c = center({relativeTo: [-clickWidth, 0, clickHeight]}, cyl);
        result = union(result, c);

        //Schraub Teil
        let lochabstand = 2.542372881355932;
        let holeWidth = (Math.floor( (this.width + (thickness*2) + 7) / lochabstand) * lochabstand);
        let screwWidth = holeWidth + 7;
        let screw = roundedCuboid({size: [screwWidth, 7, thickness], center: [0, 0, thickness/2], roundRadius: 0.1});
        
        //Schraub Löcher
        let holeRadius = 2;
        let holeHeight = thickness*1.2;
        let screwHole = cylinder( {radius: holeRadius, height: holeHeight});
        let s = center({relativeTo: [holeWidth/2, 0, holeHeight/2]}, screwHole);
        screw = subtract(screw, s);
        s = center({relativeTo: [-holeWidth/2, 0, holeHeight/2]}, screwHole);
        screw = subtract(screw, s);
        result = union(result, screw);

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    export() {
        let jsonData = jsonSerializer.serialize({}, this.computed.clamp);
        writeFile(`./export/json/` + this.core.config.techName + `-clamp.jscad.json`, jsonData);
        let objData = objSerializer.serialize({}, this.computed.clamp);
        writeFile(`./export/obj/` + this.core.config.techName + `-clamp.obj`, objData);
    }
}
  
module.exports = Clamp;

