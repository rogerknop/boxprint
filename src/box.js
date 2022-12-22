const jscad = require('@jscad/modeling');

const { writeFile } = require('node:fs/promises');
const fs = require('fs');
const jsonSerializer = require('@jscad/json-serializer');
const objSerializer = require('@jscad/obj-serializer');

const { roundedCuboid, cuboid, rectangle, roundedRectangle, cylinder } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { extrudeLinear, extrudeRectangular } = jscad.extrusions;
const { vectorText } = jscad.text;
const { path2 } = jscad.geometries;
const { measureDimensions, measureCenter } = jscad.measurements;

const segmentToPath = (segment) => { return path2.fromPoints({close: false}, segment) };

class Box {
    core;

    width = 0;
    depth = 0; 
    height = 0;
    thickness = 2;
    rounded = 0.25;
    socket = {};
    click = {}; 
    ventilation = {};

    computed = {
    }

    //-----------------------------------------------------------------------------------------------------------------
    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);

        this.computed.corpus = this.corpus();
        this.computed.lid    = this.lid();
    }
    
    //-----------------------------------------------------------------------------------------------------------------
    corpus() {
        this.computed.innerWidth = this.width-(this.thickness*2);
        this.computed.innerDepth = this.depth-(this.thickness*2);
        this.computed.innerHeight = this.height-this.thickness;
        this.computed.innerCenterHeight = (this.computed.innerHeight/2)+this.thickness;

        let result = roundedCuboid({size: [this.width, this.depth, this.height+this.rounded], center: [0, 0, ((this.height+this.rounded)/2)], roundRadius: this.rounded});
        result = subtract(result,  roundedCuboid({size: [this.computed.innerWidth, this.computed.innerDepth, this.height+this.rounded], center: [0, 0, ((this.height+this.rounded)/2)+this.thickness], roundRadius: this.rounded}));
        
        /*
        let desc = vectorText({ yOffset: 0, height: 10, extrudeOffset: 2, input: 'Rogi' });
        let p = [];
        desc.forEach(function (s) {
            //p.push(extrudeRectangular(s, { w: 3, h: 3 }));
            result = union(result, extrudeRectangular(s, { w: 3, h: 3 }));
        });
        result = union(result, p);
        

        const paths = desc.map((segment) => segmentToPath(segment))
        let text = this.csgFromSegments(2, desc);
        */

        let notround = cuboid({size: [this.width, this.depth, this.rounded]});
        notround = center({relativeTo: [0, 0, this.height+(this.rounded/2)]}, notround);
        result = subtract(result, notround);

        let r = ((this.thickness/2) * this.click.radiusPercent) - 0.05; 
        let h = this.click.heightCorpus;
        let clickDepth = (this.depth/2) - this.thickness;
        let clickWidth = (this.width/2) - this.thickness;
        let clickHeight = this.height - r - ((this.thickness -(2*r)) / 2);
        
        let cyl = cylinder( {radius: r, height: h});
        cyl = rotate([0,degToRad(90),0], cyl);
        
        if (this.click.active) {
            let c = center({relativeTo: [0, clickDepth, clickHeight]}, cyl);
            result = union(result, c);
            c = center({relativeTo: [0, -clickDepth, clickHeight]}, cyl);
            result = union(result, c);
            cyl = rotate([0,0,degToRad(90)], cyl);
            c = center({relativeTo: [ clickWidth, 0, clickHeight]}, cyl);
            result = union(result, c);
            c = center({relativeTo: [-clickWidth, 0, clickHeight]}, cyl);
            result = union(result, c);
        }

        //Sockets
        if (this.socketBreadboard?.active) {
            result = this.addSocketBreadboard(result);
        }
        if (this.socketShelly?.active) {
            result = this.addSocketShelly(result);
        }

        if (this.outerScrews) {
            let screw_width = 5;
            let screw_depth = 5;
            let outer_screw = roundedCuboid({size: [screw_width+this.thickness, screw_depth, this.thickness], center: [0, 0, 0], roundRadius: this.rounded});
            outer_screw = center({relativeTo: [0, 0, this.thickness/2]}, outer_screw);

            let outer_screw_hole = cylinder( {radius: 1.5, height: this.thickness*3});
            outer_screw = subtract(outer_screw, outer_screw_hole);

            let osHeight = (this.thickness/2);
            let osWidth = (this.width/2);
            let osDepth = (this.depth/2);
            osWidth = osWidth + (screw_width/2);
            osDepth = osDepth - (screw_depth/2);
                
            let os = center({relativeTo: [osWidth, osDepth, osHeight]}, outer_screw);
            result = union(result, os);
            os = center({relativeTo: [osWidth, -osDepth, osHeight]}, outer_screw);
            result = union(result, os);
            os = center({relativeTo: [-osWidth, -osDepth, osHeight]}, outer_screw);
            result = union(result, os);
            os = center({relativeTo: [-osWidth, osDepth, osHeight]}, outer_screw);
            result = union(result, os);
        }

        if (this.holeControl.active && (this.holeControl.holes.length>0)) {
            this.holeControl.holes.forEach((hole) => {
                if (hole.active) result = this.addHole(result, hole);
            });
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    lid() {    
        let result = roundedCuboid({size: [this.width, this.depth, this.thickness], center: [0, 0, (this.thickness/2)], roundRadius: this.rounded});
        result = center({relativeTo: [0, 0, this.thickness/2]}, result);
        let notround = cuboid({size: [this.width, this.depth, this.rounded]});
        notround = center({relativeTo: [0, 0, -(this.rounded/2)+this.thickness]}, notround);
        result = subtract(result, notround);
    
        let lid = roundedRectangle({size: [this.computed.innerWidth-this.click.lidReduce, this.computed.innerDepth-this.click.lidReduce], roundRadius: 2})
        lid = extrudeLinear({height: this.thickness}, lid);
        lid = center({relativeTo: [0, 0, (this.thickness/2)+this.thickness-this.rounded]}, lid);
        result = union(result, lid);
    
        let r = (this.thickness/2) * this.click.radiusPercent;
        let h = this.click.heightLid;
        let clickWidth = (this.width/2) - this.thickness - this.click.lidReduce;
        let clickDepth = (this.depth/2) - this.thickness - this.click.lidReduce;
        let clickHeight = (this.thickness*2) - r - ((this.thickness -(2*r)) / 2) - this.rounded;

        let c;

        let cyl = cylinder( {radius: r, height: h});
        cyl = rotate([0,degToRad(90),0], cyl);

        let gapcyl = cylinder( {radius: r*2, height: h});
        gapcyl = rotate([0,degToRad(90),0], gapcyl);
        
        if (this.click.active) {
            //Lücken zum Abheben
            c = center({relativeTo: [0, (this.depth/2), this.thickness-r]}, gapcyl);
            result = subtract(result, c);
            c = center({relativeTo: [0, -(this.depth/2), this.thickness-r]}, gapcyl);
            result = subtract(result, c);

            //Click Lücken
            c = center({relativeTo: [0, clickDepth, clickHeight]}, cyl);
            result = subtract(result, c);
            c = center({relativeTo: [0, -clickDepth, clickHeight]}, cyl);
            result = subtract(result, c);
            cyl = rotate([0,0,degToRad(90)], cyl);
            c = center({relativeTo: [clickWidth, 0, clickHeight]}, cyl);
            result = subtract(result, c);
            c = center({relativeTo: [-clickWidth, 0, clickHeight]}, cyl);
            result = subtract(result, c);
        }    

        if (this.ventilation.active && (this.ventilation.count>0)) {
            let ventilationWidth = this.ventilation.width;
            let ventilationShift = this.ventilation.shift || 0;
            let availDepth = this.computed.innerDepth-(this.click.lidReduce*2);
            let availWidth = this.computed.innerWidth-(this.click.lidReduce*2);
            let ventilationLength = availDepth * this.ventilation.lengthPercent;
            let gap = (availWidth / (this.ventilation.count + 1));
            let currPos = -(availWidth / 2) ;
            let gapCuboid = cuboid({size: [ventilationWidth, ventilationLength, this.thickness * 5]});
            for (let i = 1; i<=this.ventilation.count; i++) {
                currPos += gap;
                gapCuboid = center({relativeTo: [currPos, ventilationShift, 0]}, gapCuboid);
                result = subtract(result, gapCuboid);
            }
        }
    
        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addHole(result, hole) {
        let holeShape;
        if (hole.shape=="c") {
            holeShape = cylinder( {radius: hole.radius, height: this.thickness*1.1});
        }
        if (hole.shape=="r") {
            holeShape = roundedCuboid({size: [hole.width, hole.depth, this.thickness*1.5], roundRadius: 0.1});
        }

        let width=0;
        let depth=0;
        let height=this.computed.innerCenterHeight;
        let rotateX=0;
        let rotateY=0;

        if (hole.position=="b") {
            rotateX=90;
            width+=hole.shiftWidth;
            depth=-((this.computed.innerDepth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
        }
        if (hole.position=="f") {
            rotateX=90;
            width-=hole.shiftWidth;
            depth=((this.computed.innerDepth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
        }
        if (hole.position=="r") {
            rotateX=90;
            rotateY=90;
            depth-=hole.shiftWidth;
            width=-((this.computed.innerWidth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
        }
        if (hole.position=="l") {
            rotateX=90;
            rotateY=90;
            depth+=hole.shiftWidth;
            width=((this.computed.innerWidth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
        }
        if (hole.position=="g") {
            width=-hole.shiftDepth;
            depth=-hole.shiftWidth;
            height=(this.thickness)/2;
        }

        holeShape = rotate([degToRad(rotateX), 0, degToRad(rotateY)], holeShape);
        holeShape = center({relativeTo: [width, depth, height]}, holeShape);

        if (holeShape) {
            //result = union(result, holeShape);
            result = subtract(result, holeShape);
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addSocketBreadboard(result) {
        //Für generische schneidbare Platinen
        this.socket = this.socketBreadboard;

        let socket_r = this.socket.outerRadius;
        let socket_h = this.socket.height;
        let socket = cylinder( {radius: socket_r, height: socket_h});
        let socket_innen_r = this.socket.innerRadius;
        let socket_innen = cylinder( {radius: socket_innen_r, height: socket_h});
        let socket_height = (this.thickness/2)+this.thickness+(socket_h/2);
        socket = subtract(socket, socket_innen);
        socket = center({relativeTo: [0, 0, socket_height]}, socket);
        
        //Min 2mm Abstand vom Rand
        let socketDepth; 
        let socketWidth;
        if (this.socket.maxDepth>0) { socketDepth = this.socket.maxDepth / 2; }
        else { socketDepth = (this.depth/2) - this.thickness - socket_r - 2; }
        if (this.socket.maxWidth>0) { socketWidth = this.socket.maxWidth / 2; }
        else { socketWidth = (this.width/2) - this.thickness - socket_r - 2; }

        //socketDepth und socketWidth auf Lochabstand der Platine normalisieren
        let lochabstand = 2.54;
        socketDepth = (Math.floor( (socketDepth*2) / lochabstand) * lochabstand) / 2;
        socketWidth = (Math.floor( (socketWidth*2) / lochabstand) * lochabstand) / 2;
        let shiftDepth = this.socket.shiftDepth;
        let shiftWidth = this.socket.shiftWidth;

        let s = center({relativeTo: [socketWidth+shiftWidth, socketDepth+shiftDepth, socket_height]}, socket);
        result = union(result, s);
        s = center({relativeTo: [socketWidth+shiftWidth, -socketDepth+shiftDepth, socket_height]}, socket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth+shiftWidth, -socketDepth+shiftDepth, socket_height]}, socket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth+shiftWidth, socketDepth+shiftDepth, socket_height]}, socket);
        result = union(result, s);
        
        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addSocketShelly(result) {
        this.socket = this.socketShelly;

        let socketWidth = 1;
        let socketDepth = 1;
        let height = 4;
        let socketThickness = 1;

        if (this.socket.model=="rgb") {
            socketWidth = 42.7; //Shelly Maß 42.7; 42.8 locker
            socketDepth = 38; //Shelly Maß 38; 38.1 locker
        }

        let centerWidthShift = -(this.computed.innerWidth-socketWidth)/2;
        let centerDepthShift = (this.computed.innerDepth-socketDepth-socketThickness)/2;
        let centerWidthDepthShift = -( (this.computed.innerDepth/2) - (this.computed.innerDepth-socketDepth) + (socketThickness/2) );
        let centerDepthWidthShift = ((this.computed.innerWidth-socketThickness)/2)+(centerWidthShift*2)+socketThickness;
        let shellybox = cuboid({size: [socketWidth, socketThickness, height], center: [centerWidthShift, centerWidthDepthShift, (height/2)+this.thickness]});
        result = union(result, shellybox);

        //let dim = measureDimensions(shellybox);
        //let center = measureCenter(shellybox)

        shellybox = cuboid({size: [socketThickness, socketDepth+socketThickness, height], center: [centerDepthWidthShift, centerDepthShift, (height/2)+this.thickness]});
        result = union(result, shellybox);

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    export() {
        let jsonData = jsonSerializer.serialize({}, this.computed.corpus);
        writeFile(`./export/json/` + this.core.config.techName + `-corpus.jscad.json`, jsonData);
        let objData = objSerializer.serialize({}, this.computed.corpus);
        writeFile(`./export/obj/` + this.core.config.techName + `-corpus.obj`, objData);

        jsonData = jsonSerializer.serialize({}, this.computed.lid);
        writeFile(`./export/json/` + this.core.config.techName + `-lid.jscad.json`, jsonData);
        objData = objSerializer.serialize({}, this.computed.lid);
        writeFile(`./export/obj/` + this.core.config.techName + `-lid.obj`, objData);
    }

    //-----------------------------------------------------------------------------------------------------------------
    csgFromSegments (extrudeOffset, segments) {
        let output = [];
        for (let i = 0, il = segments.length; i < il; i++) {
          output.push(rectangular_extrude(segments[i], { w: extrudeOffset, h: 2 }));
        }
        return union(output);
    }
}
  
module.exports = Box;

