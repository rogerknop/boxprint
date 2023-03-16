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
        let innerWidth = 50.05;
        let innerDepth = 76;
        let display = cuboid({size: [innerWidth, innerDepth, 15]});
        display = center({relativeTo: [0, 0, 0]}, display);
        box.computed.lid = subtract(box.computed.lid , display);

        let shift = 2;
        display = cuboid({size: [60, 93, 4]});
        display = center({relativeTo: [0, shift, 2 + 3.54 - 2]}, display);
        box.computed.lid = subtract(box.computed.lid , display);

        let screwSocket = box.getScrewSocket(2);
        let socket_height = (2 + (3.54-2) - 1);

        let shiftWidth = (innerWidth/2) - 1.3;
        let shiftDepth = (innerDepth/2) + 4.5;
        let s = center({relativeTo: [-shiftWidth, -shiftDepth, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
        s = center({relativeTo: [-shiftWidth, shiftDepth + 3, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
        s = center({relativeTo: [shiftWidth, shiftDepth + 3, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
        s = center({relativeTo: [shiftWidth, -shiftDepth, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
    }
}

module.exports = Extension;
