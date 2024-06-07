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

        const sockel = new Part(model, cuboid({ size: [obj.bottomWidth, obj.length, obj.thickness] }) );
        model.union(sockel);

        const wall = new Part(model, cuboid({ size: [obj.thickness, obj.length, obj.height] }) );
        sockel.alignTo({z: "min"}, wall, {z: "min"});
        model.union(wall);

        //Dies bewirkt am Ende, dass das komplette Modell auf den "Boden" gestellt wird
        model.origin({ z: "min" }); 
        obj.computed.freestyle = model.render();
    }
}

module.exports = Extension;
