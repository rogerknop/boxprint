const jscad = require('@jscad/modeling');

const { Model, Part } = require('../rokcad');

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

    processEnd(obj) {
        
        let model = new Model("main");

        const el1 = roundedCuboid({ size: [10, 5, 7], roundRadius: 0.3 });

        const el1Part = new Part(model, el1);
        el1Part.move({ x: 10 });
        el1Part.origin({ z: "max" });
        //el1Part.origin({ z: 0 });
        model.union(el1Part);

        const el2 = cuboid({ size: [5, 10, 7] });
        let el2Part = new Part(model, el2);
        model.union(el2Part);
        
        el2Part = new Part(model, el2);
        el2Part.move({ y: 15 });
        model.union(el2Part);

        let screwGroup = new Model("screwGroup");
        const screwOuter = new Part(screwGroup, cylinder( {radius: 4, height: 5}) );
        screwOuter.origin({ z: "min" });
        screwGroup.union(screwOuter);
        const screwHole = new Part(screwGroup, cylinder( {radius: 2, height: 5}) );
        screwHole.origin({ z: "min" });
        screwGroup.subtract(screwHole);
        
        let screw = new Part(model, screwGroup);
        screw.move({ x: -20, y: -20 });
        model.union(screw);

        screw = new Part(model, screwGroup);
        screw.rotate({ x: 45, y: 0, z: 0 });
        screw.move({ x: 20, y: -20 });
        screw.origin({ z: "min" });
        model.union(screw);

        obj.computed.freestyle = model.render();
    }
}

module.exports = Extension;
