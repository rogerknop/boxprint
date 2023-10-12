const utils = require('./utils');

const jscad = require('@jscad/modeling');
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

class Model {
    #actions = {};
    #elements = {};
    #groups = {};

    // ********************************************************************************************
    // Constructor
    constructor() {
        //this.#model = new Group('');
        //this.#lookupGuid[this.#model.getGuid()] = this.#model;
        this.#actions.root = [];
    }

    // ********************************************************************************************
    // Create Element
    createElement(element) {
        let guid = utils.createGuid();
        this.#elements[guid] = element;
        this.#actions[guid] = [];
        return guid;
    }

    // ********************************************************************************************
    // Create Group
    createGroup() {
        let guid = utils.createGuid();
        this.#groups[guid] = { obj: false };
        this.#actions[guid] = [];
        return guid;
    }


    /* 
    // ********************************************************************************************
    // Add element or group to model
    add(grel, targetGroupGuid) {
        let group;
        if (targetGroupGuid === undefined) {
            group = this.#model;
        }
        else {
            if (!this.#groups[grtargetGroupIdoupid]) {
                this.#defineGroup(targetGroupId);
            }
            group = this.group[groupid];
        }
        
        group.add(element, action);
        //this.#lookupId[element.getId()] = element;

        if (element instanceof Element) {
        }
        if (grel instanceof Group) {
            group.add(grel, action);
            this.#lookupel[grel.getId()] = grel;
        }
    }
    */

    // ********************************************************************************************
    // Add Union Action
    union(guid, groupGuid) {
        if (groupGuid === undefined) { groupGuid = "root"; }
        this.#actions[groupGuid].push({
            guid: guid,
            kind: "union"
        });
    }

    // ********************************************************************************************
    // Add Subtraction Action
    subtract(guid, groupGuid) {
        if (groupGuid === undefined) { groupGuid = "root"; }
        this.#actions[groupGuid].push({
            guid: guid,
            kind: "subtract"
        });
    }

    // ********************************************************************************************
    // Transform element
    move(guid, values, groupGuid) { this.transform(guid, "move", values, groupGuid); }
    zoom(guid, values, groupGuid) { this.transform(guid, "zoom", values, groupGuid); }
    rotate(guid, values, groupGuid) { this.transform(guid, "rotate", values, groupGuid); }
    origin(guid, values, groupGuid) { this.transform(guid, "origin", values, groupGuid); }
    transform(guid, kind, values, groupGuid) {
        if (groupGuid === undefined) { groupGuid = "root"; }
        this.#actions[groupGuid].push({
            guid: guid,
            kind: kind,
            transform: true,
            values: values
        });
    }

    // ********************************************************************************************
    // Render Model
    get() {
        return this.getGroup("root");
    }
    
    // ********************************************************************************************
    // Render Group
    getGroup(groupGuid) {
        let obj = undefined;

        for (let i = 0; i < this.#actions[groupGuid].length; i++) {
            const action = this.#actions[groupGuid][i];
            let result;

            if (this.#elements[action.guid]) {
                // Element
                result = this.getElement(action.guid);
            }
            else if (this.#groups[action.guid]) {
                // Group
                result = this.getGroup(action.guid);                
            }
            else {
                console.error("Die GUID " + action.guid + " ist nicht definiert!");
            }
            
            if (obj === undefined) {
                obj = result.obj;
            }
            else {
                if (result.action.kind === "union" ) {
                    obj = union(obj, result.obj);
                }
                else {
                    obj = subtract(obj, result.obj);
                }
            }
        }

        return obj;
    }

    // ********************************************************************************************
    // Render Model
    getElement(guid) {
        let obj = this.#elements[guid];
        let returnAction
        for (let i = 0; i < this.#actions[guid].length; i++) {
            const action = this.#actions[guid][i];
            if (action.transform) {
                utils.transformObject(obj, action);
            }
            else {
        	    returnAction = action;
            }
        }
        return {action: returnAction, obj: obj};
    }

}

module.exports = Model;