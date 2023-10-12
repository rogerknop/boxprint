const Element = require('./element');
const utils = require('./utils');

const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

class Group {
    #id = '';
    #guid = '';
    #parts = [];
    #transform = [];

    // ********************************************************************************************
    // Constructor
    constructor(id) {
        this.#id = id;
        this.#guid = utils.createGuid();
    }

    // ********************************************************************************************
    // Get ID
    getId() {
        return this.#id;
    }

    // ********************************************************************************************
    // Get GUID
    getGuid() {
        return this.#guid;
    }

    // ********************************************************************************************
    // Transform element
    transform(kind, values) {
        this.#transform.push({
            kind: kind,
            values: values
        });
    }

    // ********************************************************************************************
    // Add grel
    add(grel, action) {
        if (action === undefined) {
            action = "union";
        }
        else {
            if ((action !== "u") && (action !== "union") && (action !== "s") && (action !== "subtract")) {
                console.error("Fehler bei Parameter 'action' (add group " + this.#id + ")");
                return;
            }
            if (action === "u") action = "union";
            if (action === "s") action = "subtract";
        }

        this.#parts.push({
            grel: grel,
            action: action
        });
    }

    // ********************************************************************************************
    // Render group
    get() {
        let obj;

        for (let i = 0; i < this.#parts.length; i++) {
            const part = this.#parts[i];
            if (i == 0) {
                obj = part.grel.get();
            }
            else {
                if (part.action === "union") {
                    obj = union(obj, part.grel.get());
                }
                else {
                    obj = subtract(obj, part.grel.get());
                }
            }
        }

        for (let i = 0; i < this.#transform.length; i++) {
            const transformation = this.#transform[i];
            utils.transformObject(obj, transformation);
        }

        return obj;
    }

}

module.exports = Group;


