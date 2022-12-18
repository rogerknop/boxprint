const jscad = require('@jscad/modeling');

const { writeFile } = require('node:fs/promises');
const fs = require('fs');
const jsonSerializer = require('@jscad/json-serializer');
const objSerializer = require('@jscad/obj-serializer');

class Box {
    core;

    width = 0;
    depth = 0; 
    height = 0;
    thickness = 2;
    rounded = 0.25;
    ventilationCount = 0;
    sockelType = 1;
    lid_kulanz = 0.3; //0.3 Press / 0.4 minimal spiel aber klickt gut
    clickRadiusPercent = 0.4; //Prozent von Thickness
    clickHeightCorpus = 9;
    clickHeightLid = 10;
    ventilationLengthPercent = 0.8;
    socketHeight = 5;
    socketOuterRadius = 2;
    socketInnerRadius = 1;

    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);
    }
    
    corpus() {
        const { roundedCuboid, cuboid, cylinder } = jscad.primitives;
        const { subtract, union } = jscad.booleans;
        const { center, rotate } = jscad.transforms;
        const { degToRad } = jscad.utils;

        let result = roundedCuboid({size: [this.width, this.depth, this.height+this.rounded], center: [0, 0, (this.height/2)], roundRadius: this.rounded});
        result = subtract(result,  roundedCuboid({size: [this.width-(this.thickness*2), this.depth-(this.thickness*2), this.height+this.rounded], center: [0, 0, (this.height/2)+(this.thickness*2)], roundRadius: this.rounded}));
        let notround = cuboid({size: [this.width, this.depth, this.rounded]});
        notround = center({relativeTo: [0, 0, this.height]}, notround);
        result = subtract(result, notround);

        let r = ((this.thickness/2) * this.clickRadiusPercent) - 0.05; 
        let h = this.clickHeightCorpus;
        let clickDepth = (this.depth/2) - this.thickness;
        let clickWidth = (this.width/2) - this.thickness;
        let clickHeight = this.height - r - ((this.thickness -(2*r)) / 2);
        
        let cyl = cylinder( {radius: r, height: h});
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

        if (this.sockelType>0) {
            if (this.sockelType==1) {
                //Für generische schneidbare Platinen
                let sockel_r = this.socketOuterRadius;
                let sockel_h = this.socketHeight;
                let sockel = cylinder( {radius: sockel_r, height: sockel_h});
                let sockel_innen_r = this.socketInnerRadius;
                let sockel_innen = cylinder( {radius: sockel_innen_r, height: sockel_h});
                let sockel_height = (this.thickness/2)+this.thickness+(sockel_h/2);
                sockel = subtract(sockel, sockel_innen);
                sockel = center({relativeTo: [0, 0, sockel_height]}, sockel);

                //Min 2mm Abstand vom Rand
                let sockelDepth = (this.depth/2) - this.thickness - sockel_r - 2; 
                let sockelWidth = (this.width/2) - this.thickness - sockel_r - 2;

                //sockelDepth und sockelWidth auf Lochabstand der Platine normalisieren
                let lochabstand = 2.54;
                sockelDepth = (Math.floor( (sockelDepth*2) / lochabstand) * lochabstand) / 2;
                sockelWidth = (Math.floor( (sockelWidth*2) / lochabstand) * lochabstand) / 2;

                let s = center({relativeTo: [sockelWidth, sockelDepth, sockel_height]}, sockel);
                result = union(result, s);
                s = center({relativeTo: [sockelWidth, -sockelDepth, sockel_height]}, sockel);
                result = union(result, s);
                s = center({relativeTo: [-sockelWidth, -sockelDepth, sockel_height]}, sockel);
                result = union(result, s);
                s = center({relativeTo: [-sockelWidth, sockelDepth, sockel_height]}, sockel);
                result = union(result, s);
            }
        }

        return result;
    }

    lid() {
        const { extrudeLinear } = jscad.extrusions
        const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder } = jscad.primitives
        const { subtract, union } = jscad.booleans;
        const { center, rotate } = jscad.transforms;
        const { degToRad } = jscad.utils;
    
        let result = roundedCuboid({size: [this.width, this.depth, this.thickness], center: [0, 0, (this.thickness/2)], roundRadius: this.rounded});
        result = center({relativeTo: [0, 0, this.thickness/2]}, result);
        let notround = cuboid({size: [this.width, this.depth, this.rounded]});
        notround = center({relativeTo: [0, 0, -(this.rounded/2)+this.thickness]}, notround);
        result = subtract(result, notround);
    
        let lid = roundedRectangle({size: [this.width-(this.thickness*2)-this.lid_kulanz, this.depth-(this.thickness*2)-this.lid_kulanz], roundRadius: 2})
        lid = extrudeLinear({height: this.thickness}, lid);
        lid = center({relativeTo: [0, 0, (this.thickness/2)+this.thickness-this.rounded]}, lid);
        result = union(result, lid);
    
        let r = (this.thickness/2) * this.clickRadiusPercent;
        let h = this.clickHeightLid;
        let clickWidth = (this.width/2) - this.thickness - this.lid_kulanz;
        let clickDepth = (this.depth/2) - this.thickness - this.lid_kulanz;
        let clickHeight = (this.thickness*2) - r - ((this.thickness -(2*r)) / 2) - this.rounded;

        let c;

        let cyl = cylinder( {radius: r, height: h});
        cyl = rotate([0,degToRad(90),0], cyl);

        let gapcyl = cylinder( {radius: r*2, height: h});
        gapcyl = rotate([0,degToRad(90),0], gapcyl);
        
        //Lücken zum Abheben
        c = center({relativeTo: [0, (this.depth/2), this.thickness-r]}, gapcyl);
        result = subtract(result, c);
        c = center({relativeTo: [0, -(this.depth/2), this.thickness-r]}, gapcyl);
        result = subtract(result, c);

        //Click Lücken
        c = center({relativeTo: [0, clickDepth, clickHeight]}, cyl);
        result = subtract(result, c);
        c = center({relativeTo: [0, -clickDepth, clickHeight]}, cyl);
        result = subtract(result, c);
        cyl = rotate([0,0,degToRad(90)], cyl);
        c = center({relativeTo: [clickWidth, 0, clickHeight]}, cyl);
        result = subtract(result, c);
        c = center({relativeTo: [-clickWidth, 0, clickHeight]}, cyl);
        result = subtract(result, c);
    
        if (this.ventilationCount>0) {
            let ventilationWidth = 1;
            let availDepth = this.depth-(this.thickness*2)-(this.lid_kulanz*2);
            let availWidth = this.width-(this.thickness*2)-(this.lid_kulanz*2);
            let ventilationLength = availDepth * this.ventilationLengthPercent;
            let gap = (availWidth / (this.ventilationCount + 1));
            let currPos = -(availWidth / 2) ;
            let gapCuboid = cuboid({size: [ventilationWidth, ventilationLength, this.thickness * 5]});
            for (let i = 1; i<=this.ventilationCount; i++) {
                currPos += gap;
                gapCuboid = center({relativeTo: [currPos, 0, 0]}, gapCuboid);
                result = subtract(result, gapCuboid);
            }
        }
    
        return result;
    }

    export() {
        let corpus = this.corpus();

        let jsonData = jsonSerializer.serialize({}, corpus);
        writeFile(`./export/json/` + this.core.config.exportPrefix + `-corpus.jscad.json`, jsonData);
        let objData = objSerializer.serialize({}, corpus);
        writeFile(`./export/obj/` + this.core.config.exportPrefix + `-corpus.obj`, objData);

        let lid = this.lid();

        jsonData = jsonSerializer.serialize({}, lid);
        writeFile(`./export/json/` + this.core.config.exportPrefix + `-lid.jscad.json`, jsonData);
        objData = objSerializer.serialize({}, lid);
        writeFile(`./export/obj/` + this.core.config.exportPrefix + `-lid.obj`, objData);
    }
}
  
module.exports = Box;

