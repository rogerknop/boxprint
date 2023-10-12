const utils = require('./utils');

const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

class Element {
    #id = '';
    #guid = '';
    #transform = [];

    #object;

    // ********************************************************************************************
    // Constructor
    constructor(id, object) {
        this.#id = id;
        this.#object = object;
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
    move(values) { this.transform("move", values); }
    zoom(values) { this.transform("zoom", values); }
    rotate(values) { this.transform("rotate", values); }
    origin(values) { this.transform("origin", values); }
    transform(kind, values) {
        this.#transform.push({
            kind: kind,
            values: values
        });
    }

    // ********************************************************************************************
    // Render element
    get() {
        let obj = this.#object;
        obj = utils.transformObject(obj, this.#transform);
        return obj;
    }
}

module.exports = Element;
