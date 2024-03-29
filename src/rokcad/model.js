const Part = require('./part');
const utils = require('./utils');

const jscad = require('@jscad/modeling');
const { subtract, union, intersect } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

class Model {
    #id;
    #parts = [];
    #locked = false;
    #transform = [];

    // ********************************************************************************************
    // Constructor
    constructor(id) {
        this.#id = id;
    }

    // ********************************************************************************************
    // Transform element
    move(values) { this.transform("move", values); }
    scale(values) { this.transform("scale", values); }
    rotate(values) { this.transform("rotate", values); }
    origin(values) { this.transform("origin", values); }
    transform(kind, values) {
        this.#transform.push({
            kind: kind,
            values: values
        });
    }
    
    // ********************************************************************************************
    // Create new Part
    union(part) {
        if (this.#locked) {
            throw new Error("Model " + this.#id + " is already rendered. Union is no more possible!");
        }
        //if (!(part instanceof Part)) {
        //    throw new Error("Model " + this.#id + " tried to union a NON Part Class Object!");
        //}
        part.setAction("union");
        part.setParent(this);
        this.#parts.push(part);
    }

    // ********************************************************************************************
    // Subtract element from model
    subtract(part) {
        if (this.#locked) {
            throw new Error("Model " + this.#id + " is already rendered. Subtract is no more possible!");
        }
        //if (!(part instanceof Part)) {
        //    throw new Error("Model " + this.#id + " tried to subtract a NON Part Class Object!");
        //}
        part.setAction("subtract");
        part.setParent(this);
        this.#parts.push(part);
    }

    // ********************************************************************************************
    // Intersect element from model
    intersect(part) {
        if (this.#locked) {
            throw new Error("Model " + this.#id + " is already rendered. Intersect is no more possible!");
        }
        //if (!(part instanceof Part)) {
        //    throw new Error("Model " + this.#id + " tried to intersect a NON Part Class Object!");
        //}
        part.setAction("intersect");
        part.setParent(this);
        this.#parts.push(part);
    }

    // ********************************************************************************************
    // Get ID
    getId() {
        return this.#id;
    }

    // ********************************************************************************************
    // Model is Locked?
    isLocked() {
        return this.#locked;
    }

    // ********************************************************************************************
    // Render Model
    render() {
        let obj = undefined;

        for (let i = 0; i < this.#parts.length; i++) {
            const part = this.#parts[i];
            let partObj = part.render();

            if (obj === undefined) {
                obj = partObj;
            }
            else {
                if (part.getAction() === "union") {
                    obj = union(obj, partObj);
                }
                if (part.getAction() === "subtract") {
                    obj = subtract(obj, partObj);
                }
                if (part.getAction() === "intersect") {
                    obj = intersect(obj, partObj);
                }
            }
        }

        this.#locked = true;

        obj = utils.transformObject(obj, this.#transform);

        return obj;
    }

}

module.exports = Model;