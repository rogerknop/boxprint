const Part = require('./part');
const utils = require('./utils');

const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

class Model {
    #id;
    #parts = [];
    #locked = false;

    // ********************************************************************************************
    // Constructor
    constructor(id) {
        this.#id = id;
    }

    // ********************************************************************************************
    // Create new Part
    union(part) {
        if (this.#locked) {
            throw new Error("Model " + this.#id + " is already rendered. Union is no more possible!");
        }
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
        part.setAction("subtract");
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
                else {
                    obj = subtract(obj, partObj);
                }
            }
        }

        this.#locked = true;

        return obj;
    }

}

module.exports = Model;