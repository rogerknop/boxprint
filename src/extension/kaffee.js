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

        let lowerRingGroup = new Model("lowerRingGroup");
        const lowerRingOuter = new Part(lowerRingGroup, cylinder( {radius: (obj.lowerInnerDiameter+(2*obj.thickness))/2, height: obj.lowerHeight}) );
        lowerRingOuter.origin({ z: "min" });
        lowerRingGroup.union(lowerRingOuter);
        const lowerRingHole = new Part(lowerRingGroup, cylinder( {radius: obj.lowerInnerDiameter/2, height: obj.lowerHeight}) );
        lowerRingHole.origin({ z: "min" });
        lowerRingGroup.subtract(lowerRingHole);

        let upperRingGroup = new Model("upperRingGroup");
        const upperRingOuter = new Part(upperRingGroup, cylinder( {radius: (obj.lowerInnerDiameter+(2*obj.thickness))/2, height: obj.upperHeight}) );
        upperRingOuter.origin({ z: "min" });
        upperRingGroup.union(upperRingOuter);
        const upperRingHole = new Part(upperRingGroup, cylinder( {radius: obj.upperInnerDiameter/2, height: obj.upperHeight}) );
        upperRingHole.origin({ z: "min" });
        upperRingGroup.subtract(upperRingHole);

        let lowerRing = new Part(model, lowerRingGroup);
        model.union(lowerRing);

        let upperRing = new Part(model, upperRingGroup);
        //upperRing.move({ x: 0, y: -20 });
        upperRing.alignTo({x: "center", y: "center", z: "min"}, lowerRing, {x: "center", y: "center", z: "max"});
        model.union(upperRing);

        //Dies bewirkt am Ende, dass das komplette Modell auf den "Boden" gestellt wird
        model.origin({ z: "min" });

        obj.computed.freestyle = model.render();;
    }
}

module.exports = Extension;
