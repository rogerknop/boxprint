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

        const lampOuter = new Part(model, cylinder( {radius: (obj.innerDiameter+(2*obj.thickness))/2, height: obj.height}) );
        lampOuter.origin({ z: "min" });
        model.union(lampOuter);
        const lampHole = new Part(model, cylinder( {radius: obj.innerDiameter/2, height: obj.height}) );
        lampHole.origin({ z: "min" });
        model.subtract(lampHole);

        let holeModel = new Model("hole");
        const holeEl = cylinder( {radius: 2, height: obj.thickness*2});
        let hole = new Part(holeModel, holeEl);
        hole.origin({ x: "center", y: "center", z: "center" });
        hole.rotate({ x: 0, y: 90, z: 0 });
        hole.move({ x: -obj.thickness, z: 10 });
        holeModel.union(hole);

        let xmove = (obj.innerDiameter+obj.thickness)/2;
        let ymove = 29.44;

        let hole1 = new Part(model, holeModel);
        hole1.move({ x: xmove, z: 10 });
        model.subtract(hole1);

        let hole2 = new Part(model, holeModel);
        hole2.rotate({ z: 58});
        hole2.move({ x: -xmove/2, y: -ymove/2, z: 10 });
        model.subtract(hole2);

        let hole3 = new Part(model, holeModel);
        hole3.rotate({ z: 180-58});
        hole3.move({ x: -xmove/2, y: ymove/2, z: 10 });
        model.subtract(hole3);

        //Dies bewirkt am Ende, dass das komplette Modell auf den "Boden" gestellt wird
        model.origin({ z: "min" }); 
        obj.computed.freestyle = model.render();
    }
}

module.exports = Extension;
