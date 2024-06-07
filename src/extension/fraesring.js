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

        const ringOuter = new Part(model, cylinder( {radius: obj.outerDiameter/2, height: obj.height, segments: 300}) );
        ringOuter.origin({ z: "min" });
        model.union(ringOuter);
        const ringHole = new Part(model, cylinder( {radius: obj.innerDiameter/2, height: obj.height, segments: 200}) );
        ringHole.origin({ z: "min" });
        model.subtract(ringHole);

        let holeModel = new Model("hole");
        const holeEl = cylinder( {radius: obj.screwDiameter/2, height: obj.screwHoleHeight});
        
        let x = (obj.outerDiameter/2) - (obj.screwDiameter/2) - obj.screwOuterDistance;

        let hole1 = new Part(model, holeEl);
        hole1.origin({ x: "center", y: "center", z: "center" });
        hole1.move({ x: x, z: obj.height-obj.screwHoleHeight });
        model.subtract(hole1);

        let hole2 = new Part(model, holeEl);
        hole2.origin({ x: "center", y: "center", z: "center" });
        hole2.move({ x: -x, z: obj.height-obj.screwHoleHeight });
        model.subtract(hole2);

        //Dies bewirkt am Ende, dass das komplette Modell auf den "Boden" gestellt wird
        model.origin({ z: "min" }); 
        obj.computed.freestyle = model.render();
    }
}

module.exports = Extension;
