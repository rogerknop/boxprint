const jscad = require('@jscad/modeling');

const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder, triangle } = jscad.primitives;
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

    processEnd(obj) {
        // RESULT für den Druck muss in result stehen
        const lochRadius   = obj.screwHoleRadius;

        const width  = obj.width  + obj.thickness;
        const height = obj.height + obj.thickness;
        const depth  = obj.depth;
        const z = depth / 2;

        let result = roundedCuboid({size: [width, obj.thickness, depth], roundRadius: obj.rounded});
        result = center({relativeTo: [0, 0, z]}, result);

        let sideWidth = width/2;
        let sideDepth = (height/2)-(obj.thickness/2);
        let side = roundedCuboid({size: [obj.thickness, height, depth], roundRadius: obj.rounded});
        side = center({relativeTo: [sideWidth, sideDepth, z]}, side);
        result = union(result , side);
        side = center({relativeTo: [-sideWidth, sideDepth, z]}, side);
        result = union(result , side);

        let footSize = obj.foot + obj.thickness;
        let footWidth = sideWidth + (footSize/2) - (obj.thickness/2);
        let footDepth = sideDepth + (height/2) - (obj.thickness/2);
        let foot = roundedCuboid({size: [footSize, obj.thickness, depth], roundRadius: obj.rounded});
        foot = center({relativeTo: [footWidth, footDepth, z]}, foot);
        result = union(result , foot);
        foot = center({relativeTo: [-footWidth, footDepth, z]}, foot);
        result = union(result , foot);

        let hole = cylinder( {radius: lochRadius, height: obj.thickness*2});
        hole = rotate([degToRad(90),0,0], hole);
        let shift = 4;
        let holeWidth = footWidth + 3;
        hole = center({relativeTo: [holeWidth-8, footDepth, depth/2]}, hole);
        result = subtract(result , hole);
        hole = center({relativeTo: [holeWidth+8, footDepth, depth/2]}, hole);
        result = subtract(result , hole);
        hole = center({relativeTo: [-holeWidth-8, footDepth, depth/2]}, hole);
        result = subtract(result , hole);
        hole = center({relativeTo: [-holeWidth+8, footDepth, depth/2]}, hole);
        result = subtract(result , hole);
       
        obj.computed.freestyle = result;
    }
}

module.exports = Extension;
