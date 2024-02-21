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

        const length  = obj.innerLength  + (2*obj.thickness);
        const height = obj.rackDiameter + (2*obj.thickness);
        let width  = obj.width + (2*obj.rounded);

        let moveHeight = (width / 2) - obj.rounded;
        let result = roundedCuboid({size: [length, height, width], roundRadius: obj.rounded});
        result = center({relativeTo: [0, 0, moveHeight]}, result);

        let notroundHeight = obj.rounded + 0.2;
        let notround = cuboid({size: [length, height, notroundHeight]});
        notround = center({relativeTo: [0, 0, -notroundHeight/2]}, notround);
        result = subtract(result, notround);
        notround = center({relativeTo: [0, 0, obj.width+notroundHeight/2]}, notround);
        result = subtract(result, notround);

        console.log("innerhole: " + obj.innerLength + " / " + obj.rackDiameter + " / " + (obj.width*2) + " / " + (obj.rackDiameter/2.00001));
        let innerhole = roundedCuboid({size: [obj.innerLength, obj.rackDiameter, (obj.width*2)], roundRadius: obj.rackDiameter/2.00001});
        innerhole = center({relativeTo: [0, 0, obj.width/2]}, innerhole);
        result = subtract(result, innerhole);

        let gap = cuboid({size: [obj.gapLength, (obj.thickness*2), width]});
        gap = center({relativeTo: [0, (obj.rackDiameter/2)+0.2, obj.width/2]}, gap);
        result = subtract(result, gap);
        
        let gapEndPoints = (obj.gapLength / 2) + obj.gapRoundedMoveOutside;
        let gapMoveEdge = (obj.rackDiameter/2)+obj.thickness-obj.gapRoundedRadius + obj.gapRoundedMoveEdge;
        let gapHeight = obj.width/2;
        let gapround = cylinder( {radius: obj.gapRoundedRadius, height: obj.width});
        gapround = center({relativeTo: [gapEndPoints, gapMoveEdge, gapHeight]}, gapround);
        result = union(result, gapround); 
        gapround = center({relativeTo: [-gapEndPoints, gapMoveEdge, gapHeight]}, gapround);
        result = union(result, gapround); 

        obj.computed.freestyle = result;
    }
}

module.exports = Extension;
