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
        let innerWidth = 22.05;
        let innerDepth = 22;
        //let display = cuboid({size: [innerWidth, innerDepth, 15]});
        //display = center({relativeTo: [0, 0, 0]}, display);
         //box.computed.lid = subtract(box.computed.lid , display);

        let shift = 0;
        let versenkt = 2;
        let display = cuboid({size: [35, 35, 4]});
        display = center({relativeTo: [0, shift, 2 + box.computed.lid_thickness_complete - versenkt]}, display);
        box.computed.lid = subtract(box.computed.lid , display);

        let ueberstand = 0;
        let screwSocket = box.getScrewSocket(versenkt+ueberstand);
        let socket_height = (versenkt/2) + (box.computed.lid_thickness_complete - versenkt + ueberstand);

        let shiftWidth = 12;
        let shiftDepth = 12;
        let s = center({relativeTo: [-shiftWidth, -shiftDepth, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
        s = center({relativeTo: [-shiftWidth, shiftDepth, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
        s = center({relativeTo: [shiftWidth, shiftDepth, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
        s = center({relativeTo: [shiftWidth, -shiftDepth, socket_height]}, screwSocket);
        box.computed.lid = union(box.computed.lid, s);
    }
}

module.exports = Extension;
