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

        const el1 = roundedCuboid({ size: [10, 5, 3], roundRadius: 0.7 });
        const el1Part = new Part(model, el1);
        el1Part.move({ x: 10 });
        el1Part.origin({ z: "min" });
        //el1Part.origin({ z: 0 });
        model.union(el1Part);

        let box = new Model("box");
        const aussen = new Part(box, roundedCuboid({ size: [obj.width, obj.depth, obj.height], roundRadius: obj.rounded }));        
        aussen.origin({ z: "min" });
        box.union(aussen);

        const innen = new Part(box, cuboid({ size: [obj.width-(2*obj.thickness), obj.depth-(2*obj.thickness), obj.height-(1*obj.thickness)] }));
        innen.alignTo({x: "center", y: "center", z: "max"}, aussen, {x: "center", y: "center", z: "max"});
        box.subtract(innen);

        const corner = new Part(box, cylinder( {radius: obj.cornerRound, height: obj.height}) );
        corner.move({ x: (obj.width/2)-obj.cornerRound, y: (obj.depth/2)-obj.cornerRound });
        //box.intersect(corner);

        let boxPart = new Part(model, box);
        boxPart.origin({ z: "min" });
        boxPart.move({ x: 100, y: 100 });
        model.union(boxPart);

        const el2 = cuboid({ size: [5, 10, 7] });
        let el2Part = new Part(model, el2);
        //el2Part.origin({ z: "min" }); IST DEFAULT
        model.union(el2Part);

        el2Part = new Part(model, el2);
        el2Part.move({ y: 15 });
        model.union(el2Part);

        let screwGroup = new Model("screwGroup");
        const screwOuter = new Part(screwGroup, cylinder( {radius: 4, height: 5}) );
        screwGroup.union(screwOuter);
        const screwHole = new Part(screwGroup, cylinder( {radius: 2, height: 5}) );
        screwGroup.subtract(screwHole);
        
        let screw = new Part(model, screwGroup);
        screw.move({ x: -20, y: -20 });
        model.union(screw);

        screw = new Part(model, screwGroup);
        //Rotate und Scale sollte immer zuerst erfolgen vor move oder origin
        screw.rotate({ x: 0, y: 90, z: 0 });
        screw.scale({ x: 2, y:1, z:2 });
        screw.origin({ z: "min" });
        screw.move({ x: 20, y: 10 });
        model.union(screw);

        let alignedScrew = new Part(model, screwGroup);
        alignedScrew.move({ x: 16, y: -20 }); //Keine Relevant wegen folgendem alignTo
        alignedScrew.move({ z: 10 }); //Keine Relevanz wegen folgendem Origin
        alignedScrew.origin({ z: "min" });
        alignedScrew.alignTo({x: "center", y: "center", z: "min"}, screw, {x: "center", y: "center", z: "max"});
        model.union(alignedScrew);

        //Dies bewirkt am Ende, dass das komplette Modell auf den "Boden" gestellt wird
        model.origin({ z: "min" });

        obj.computed.freestyle = model.render();
    }
}

module.exports = Extension;
