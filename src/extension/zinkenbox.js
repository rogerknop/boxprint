const jscad = require('@jscad/modeling');

const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { extrudeLinear, extrudeRectangular } = jscad.extrusions;

class Extension {
    //-----------------------------------------------------------------------------------------------------------------
    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);
    }

    processEnd(box) {
        let fraeserSocket = box.getScrewSocket(box.screw.height);
        //fraeserSocket = center({relativeTo: [20, 20, ]}, fraeserSocket);

        let height = (box.screw.height/2) + box.thickness;

        let f1 = center({relativeTo: [18, 30, height]}, fraeserSocket);
        let result = union(box.computed.corpus, f1);

        let f2 = center({relativeTo: [-18, 30, height]}, fraeserSocket);
        result = union(result, f2);
        
        box.computed.corpus = result;
    }
}

module.exports = Extension;
