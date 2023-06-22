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
        let w = 42;
        let d = 87;
        let hole = cylinder( {radius: 2, height: 10});
        let h = center({relativeTo: [w, d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
        h = center({relativeTo: [w, -d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
        h = center({relativeTo: [-w, d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
        h = center({relativeTo: [-w, -d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);

        hole = cylinder( {radius: 4, height: 23});
        h = center({relativeTo: [w, d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
        h = center({relativeTo: [w, -d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
        h = center({relativeTo: [-w, d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
        h = center({relativeTo: [-w, -d, 0]}, hole);
        box.computed.corpus = subtract(box.computed.corpus , h);
    }
}

module.exports = Extension;
