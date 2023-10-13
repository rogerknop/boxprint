const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

// ********************************************************************************************
// Transform Object
function transformObject(obj, transform) {
    for (let i = 0; i < transform.length; i++) {
        const transformation = transform[i];
        transformation.values = initializeValues(transformation.values);

        if (transformation.kind === "move") {
            obj = transformMove(obj, transformation.values);
        }
        if (transformation.kind === "scale") {
            obj = transformScale(obj, transformation.values);
        }
        if (transformation.kind === "rotate") {
            obj = transformRotate(obj, transformation.values);
        }
        if (transformation.kind === "origin") {
            obj = transformOrigin(obj, transformation.values);
        }
    }
    return obj;
}

// ********************************************************************************************
// Initialize Values x, y and z if undefined
function initializeValues(values) {
    return values;
}

// ********************************************************************************************
// Transform MOVE
function transformMove(obj, values) {
    if (values.x !== undefined) { obj = center({ axes: [true, false, false], relativeTo: [values.x, 0, 0] }, obj); }
    if (values.y !== undefined) { obj = center({ axes: [false, true, false], relativeTo: [0, values.y, 0] }, obj); }
    if (values.z !== undefined) { obj = center({ axes: [false, false, true], relativeTo: [0, 0, values.z] }, obj); }
    return obj;
}

// ********************************************************************************************
// Transform ROTATE
function transformRotate(obj, values) {
    //return rotate([degToRad(values.x), degToRad(values.y), degToRad(values.z)], object);
    if (values.x !== undefined) { obj = rotateX(degToRad(values.x), obj); }
    if (values.y !== undefined) { obj = rotateY(degToRad(values.y), obj); }
    if (values.z !== undefined) { obj = rotateZ(degToRad(values.z), obj); }
    return obj;
}

// ********************************************************************************************
// Transform ZOOM
function transformScale(obj, values) {
    //rok-todo: fehlt
    return obj;
}

// ********************************************************************************************
// Align Origin
function alignOrigin(value, idx, dimensions, center, bounds) {
    let move = (dimensions[idx] / 2);
    if (value === "min") {
        move = move;
    }
    if (value === "max") {
        move = -move;
    }
    return move;
}

// ********************************************************************************************
// Transform ORIGIN
//   "min"=left or bottom or back / "max"=right or top or front
function transformOrigin(obj, values) {
    let bounds = measureBoundingBox(obj);
    let centerPoint = measureCenter(obj);
    let dimensions = measureDimensions(obj);

    if (values.x !== undefined) { obj = center({ axes: [true, false, false], relativeTo: [alignOrigin(values.x, 0, dimensions, centerPoint, bounds), 0, 0] }, obj); }
    if (values.y !== undefined) { obj = center({ axes: [false, true, false], relativeTo: [0, alignOrigin(values.y, 1, dimensions, centerPoint, bounds), 0] }, obj); }
    if (values.z !== undefined) { obj = center({ axes: [false, false, true], relativeTo: [0, 0, alignOrigin(values.z, 2, dimensions, centerPoint, bounds)] }, obj); }
    return obj;
}

// ********************************************************************************************
function createGuid(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

// ********************************************************************************************
module.exports = {
    transformObject,
    createGuid
};