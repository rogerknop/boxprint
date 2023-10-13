const Model = require('./model');
const Element = require('./element');
const utils = require('./utils');

const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

class Part {
    #parentModel;
    #action;
    #part;
    #transform = [];
    #object;
    #isModel;
    #rendered;

    // ********************************************************************************************
    // Constructor
    constructor(parentModel, part) {
        this.#parentModel = parentModel;
        if (part instanceof Model) {
            this.#isModel = true;
        }
        else {
            part = new Element(part);
            this.#isModel = false;
        }
        this.#rendered = false;
        this.#part = part;
    }

    // ********************************************************************************************
    // Transform element
    move(values) { this.transform("move", values); }
    scale(values) { this.transform("scale", values); }
    rotate(values) { this.transform("rotate", values); }
    origin(values) { this.transform("origin", values); }
    transform(kind, values) {
        if (this.#parentModel?.isLocked()) {
            throw new Error("Model " + this.#parentModel.getId() + " is already rendered. Transformation is no more possible!");
        }
        this.#transform.push({
            kind: kind,
            values: values
        });
    }

    // ********************************************************************************************
    // Align Parts
    alignTo(fromPos, part, toPos) {
        this.#transform.push({
            kind: "alignTo",
            fromPart: this,
            fromPos: fromPos,
            toPart: part,
            toPos: toPos
        });
    }

    // ********************************************************************************************
    // Set Action
    setAction(action) {
        this.#action = action;
    }

    // ********************************************************************************************
    // Set Action
    setAction(action) {
        this.#action = action;
    }

    // ********************************************************************************************
    // Get Action
    getAction() {
        return this.#action;
    }

    // ********************************************************************************************
    // Set parentModel
    setParent(parentModel) {
        this.#parentModel = parentModel;
    }

    // ********************************************************************************************
    // Get Part
    getPart() {
        return this.#part;
    }

    // ********************************************************************************************
    // Get Object
    getObject() {
        return this.#object;
    }

    // ********************************************************************************************
    // Render Part (Element or Model)
    render(dontremember) {
        if (this.#rendered) { return this.#object; }
        let obj = this.#part.render();
        obj = utils.transformObject(obj, this.#transform);
        //if (!dontremember) {
            this.#rendered = true; 
            this.#object = obj;
        //}
        return obj;
    }

}

module.exports = Part;


