const Part = require('./part');

const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate, rotateX, rotateY, rotateZ, translate, translateX, translateY, translateZ, scaleX, scaleY, scaleZ } = jscad.transforms;
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
        if (transformation.kind === "alignTo") {
            obj = transformAlignTo(obj, transformation);
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
    if (values.x !== undefined) { obj = translateX(values.x, obj); }
    if (values.y !== undefined) { obj = translateY(values.y, obj); }
    if (values.z !== undefined) { obj = translateZ(values.z, obj); }
    return obj;
}

// ********************************************************************************************
// Transform ROTATE
function transformRotate(obj, values) {
    let info = getInfo(obj);
    transformMove(obj, {x:0, y:0, z:0});
    if (values.x !== undefined) { obj = rotateX(degToRad(values.x), obj); }
    if (values.y !== undefined) { obj = rotateY(degToRad(values.y), obj); }
    if (values.z !== undefined) { obj = rotateZ(degToRad(values.z), obj); }
    transformMove(obj, {x:info.centerPoint.x, y:info.centerPoint.y, z:info.centerPoint.z});
    return obj;
}

// ********************************************************************************************
// Transform ZOOM
function transformScale(obj, values) {
    let info = getInfo(obj);
    transformMove(obj, {x:0, y:0, z:0});
    if (values.x !== undefined) { obj = scaleX(values.x, obj); }
    if (values.y !== undefined) { obj = scaleY(values.y, obj); }
    if (values.z !== undefined) { obj = scaleZ(values.z, obj); }
    transformMove(obj, {x:info.centerPoint.x, y:info.centerPoint.y, z:info.centerPoint.z});
    return obj;
}

// ********************************************************************************************
// Align Origin
function alignOrigin(value, idx, info) {
    let move;
    if (value === "min") {
        move = -info.bounds[0][idx];
    }
    if (value === "max") {
        move = -info.bounds[1][idx];
    }
    return move;
}

// ********************************************************************************************
// Transform ORIGIN
//   "min"=left or bottom or back / "max"=right or top or front
function transformOrigin(obj, values) {
    let info = getInfo(obj);
    if (values.x !== undefined) { obj = transformMove(obj, {x: alignOrigin(values.x, 0, info)}); }
    if (values.y !== undefined) { obj = transformMove(obj, {y: alignOrigin(values.y, 1, info)}); }
    if (values.z !== undefined) { obj = transformMove(obj, {z: alignOrigin(values.z, 2, info)}); }
    return obj;
}

// ********************************************************************************************
// Transform Align to other Part
//   "min" / "max" or "center"
function transformAlignTo(obj, transformation) {
    let fromPartInfo = getInfo(obj);
    let toPartInfo = getInfo(transformation.toPart.getObject());

    let d = {};
    let dx = getAlignMoveValue(transformation.toPos.x, toPartInfo, 0) - getAlignMoveValue(transformation.fromPos.x, fromPartInfo, 0);
    if (!isNaN(dx)) { d.x = dx; }
    let dy = getAlignMoveValue(transformation.toPos.y, toPartInfo, 1) - getAlignMoveValue(transformation.fromPos.y, fromPartInfo, 1);
    if (!isNaN(dy)) { d.y = dy; }
    let dz = getAlignMoveValue(transformation.toPos.z, toPartInfo, 2) - getAlignMoveValue(transformation.fromPos.z, fromPartInfo, 2);
    if (!isNaN(dz)) { d.z = dz; }

    if (d.x || d.y || d.z) { obj = transformMove(obj, d); }
    return obj;
}

// ********************************************************************************************
// Compute Align Move Value
function getAlignMoveValue(pos, info, idx) {
    if (pos === undefined) { return undefined; }
    let result;
    const vmin = info.bounds[0][idx];
    const vmax = info.bounds[1][idx];
    if (pos === "min") {
        result = vmin;
    }
    if (pos === "max") {
        result = vmax;
    }
    if (pos === "center") {
        result = vmin + (info.dimensions[idx]/2);
    }
    return result;
}


// ********************************************************************************************
// Get Object Infos
function getInfo(obj) {
    let bounds = measureBoundingBox(obj);
    let centerPoint = measureCenter(obj);
    let dimensions = measureDimensions(obj);
    return { bounds: bounds, centerPoint: centerPoint, dimensions, dimensions };
}

// ********************************************************************************************
function createGuid() {
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0;
        dt = Math.floor(dt / 16);
        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid;
}

// ********************************************************************************************
module.exports = {
    transformObject,
    createGuid
};