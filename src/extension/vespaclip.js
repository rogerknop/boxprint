const { Model, Part } = require('../rokcad');

const jscad = require('@jscad/modeling');
const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder, triangle } = jscad.primitives;

class Extension {
    //-----------------------------------------------------------------------------------------------------------------
    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);
    }

    processEnd(obj) {
        // RESULT für den Druck muss in result stehen

        let model = new Model("main");

        const length  = obj.innerLength  + (2*obj.thickness);
        const height = obj.rackDiameter + (2*obj.thickness);
        let width  = obj.width + (2*obj.rounded);

        const main = new Part(model, roundedCuboid({size: [length, height, width], roundRadius: obj.rounded}) );
        model.union(main);
        
        let notround = new Part(model, cuboid({size: [length, height, obj.rounded]}) );
        notround.alignTo({x: "center", y: "center", z: "min"}, main, {x: "center", y: "center", z: "min"});
        model.subtract(notround);
        notround = new Part(model, cuboid({size: [length, height, obj.rounded]}) );
        notround.alignTo({x: "center", y: "center", z: "max"}, main, {x: "center", y: "center", z: "max"});
        model.subtract(notround);

        const innerhole = new Part(model, roundedCuboid({size: [obj.innerLength, obj.rackDiameter, (obj.width*2)], roundRadius: obj.rackDiameter/2.00001}) );
        model.subtract(innerhole);

        const gap = new Part(model, cuboid({size: [obj.gapLength, (obj.thickness*2), width]}) );
        gap.alignTo({y: "max"}, main, {y: "max"});
        model.subtract(gap);

        let gapEndPoints = (obj.gapLength / 2) + obj.gapRoundedMoveOutside;
        let gapMoveEdge = (obj.rackDiameter/2)+obj.thickness-obj.gapRoundedRadius + obj.gapRoundedMoveEdge;
        let gaproundEl = cylinder( {radius: obj.gapRoundedRadius, height: obj.width});
        let gapround = new Part(model, gaproundEl);
        gapround.move({x:gapEndPoints, y:gapMoveEdge});
        model.union(gapround);
        gapround = new Part(model, gaproundEl);
        gapround.move({x:-gapEndPoints, y:gapMoveEdge});
        model.union(gapround);

        //Dies bewirkt am Ende, dass das komplette Modell auf den "Boden" gestellt wird
        model.origin({ z: "min" });

        obj.computed.freestyle = model.render();;
    }
}

module.exports = Extension;
