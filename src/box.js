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

    computed = {};
    logMeasure = [];

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

        this.addLog(1, "  - Breite innen: " + this.computed.innerWidth);
        this.addLog(2, "  - Tiefe innen: " + this.computed.innerDepth);
        this.addLog(3, "  - Höhe innen offen: " + this.computed.innerHeight);

        let result = roundedCuboid({size: [this.width, this.depth, this.height+this.rounded], center: [0, 0, ((this.height+this.rounded)/2)], roundRadius: this.rounded});
        result = subtract(result,  roundedCuboid({size: [this.computed.innerWidth, this.computed.innerDepth, this.height+this.rounded], center: [0, 0, ((this.height+this.rounded)/2)+this.thickness], roundRadius: this.rounded}));
        
        /* GEHT LEIDER NICHT
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

        if (this.click.active) {
            let r = this.click.radius - 0.03;
            let h = this.click.heightCorpus;
            let clickDepth = (this.depth/2) - this.thickness;
            let clickWidth = (this.width/2) - this.thickness;
            let clickHeight = this.height - r - ((this.click.lidThickness -(2*this.click.radius)) / 2);
            clickHeight-=0.3;
            
            let cyl = cylinder( {radius: r, height: h});
            cyl = rotate([0,degToRad(90),0], cyl);

            this.addLog(10, "  - Untere Klick Kante bis Boden: " + (clickHeight-r).toFixed(2));
        
            let c = center({relativeTo: [0, clickDepth, clickHeight]}, cyl);
            result = union(result, c);
            c = center({relativeTo: [0, -clickDepth, clickHeight]}, cyl);
            result = union(result, c);
            cyl = rotate([0,0,degToRad(90)], cyl);
            c = center({relativeTo: [ clickWidth, 0, clickHeight]}, cyl);
            result = union(result, c);
            c = center({relativeTo: [-clickWidth, 0, clickHeight]}, cyl);
            result = union(result, c);
            /*
            let test = cylinder( {radius: 0.5, height: 0.5});
            test = rotate([0,0,degToRad(90)], test);
            test = center({relativeTo: [clickWidth, 0, clickHeight+0.72]}, test);
            result = union(result, test);
            */
        }

        //Sockets
        if (this.socketBreadboard?.active) {
            result = this.addSocketBreadboard(result);
        }
        if (this.socketShelly?.active) {
            result = this.addSocketShelly(result);
        }
        if (this.socketEsp?.active) {
            result = this.addSocketEsp(result);
        }

        if (this.outerScrews) {
            let screw_width = 7;
            let screw_depth = 7;
            let outer_screw = roundedCuboid({size: [screw_width+this.thickness, screw_depth, this.thickness], center: [0, 0, 0], roundRadius: this.rounded});
            outer_screw = center({relativeTo: [0, 0, this.thickness/2]}, outer_screw);

            let outer_screw_hole = cylinder( {radius: 2.3, height: this.thickness*3});
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
            this.holeControl.holes.forEach((hole, idx) => {
                if (hole.active) result = this.addHole(result, hole, idx);
            });
        }

        if (this.socketSingleScrewControl.active && (this.socketSingleScrewControl.screws.length>0)) {
            this.socketSingleScrewControl.screws.forEach((screw, idx) => {
                if (screw.active) result = this.addScrewSocket(result, screw, idx);
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
    
        let extrudeHeight = this.click.active ? this.click.lidThickness : this.thickness;
        let lid = roundedRectangle({size: [this.computed.innerWidth-this.click.lidReduce, this.computed.innerDepth-this.click.lidReduce], roundRadius: 2})
        lid = extrudeLinear({height: extrudeHeight}, lid);
        lid = center({relativeTo: [0, 0, (extrudeHeight/2)+this.thickness-this.rounded]}, lid);
        result = union(result, lid);

        this.computed.heightLidInsideCorpus = extrudeHeight;
        this.addLog(4, "  - Höhe innen geschlossen: " + (this.computed.innerHeight - this.computed.heightLidInsideCorpus));
        this.addLog(5, "  - Höhe Deckel im Korpus: " + this.computed.heightLidInsideCorpus);
    
        if (this.click.active) {
            if ((this.click.lidThickness-0.2) < (this.click.radius*2)) {
                console.log("ERROR!!! lidThicknessk-0.2 ist kleiner als Click Durchmesser!");
            }
            let r = this.click.radius;
            let h = this.click.heightLid;
            let clickWidth = (this.width/2) - this.thickness - this.click.lidReduce;
            let clickDepth = (this.depth/2) - this.thickness - this.click.lidReduce;
            let clickHeight = (this.thickness - this.rounded) + (this.click.lidThickness/2);

            let c;
            let cyl = cylinder( {radius: r, height: h});
            cyl = rotate([0,degToRad(90),0], cyl);

            //Lücken zum Abheben
            let gapRadius = (this.thickness-this.rounded)/2;
            let gapcyl = cylinder( {radius: gapRadius, height: h});
            gapcyl = rotate([0,degToRad(90),0], gapcyl);
            let gapHeight = this.thickness-this.rounded;
            c = center({relativeTo: [0, (this.depth/2), gapHeight]}, gapcyl);
            result = subtract(result, c);
            c = center({relativeTo: [0, -(this.depth/2), gapHeight]}, gapcyl);
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
            /*
            let test = cylinder( {radius: 0.5, height: 0.5});
            test = rotate([0,0,degToRad(90)], test);
            test = center({relativeTo: [0, (this.depth/2), gapHeight+0.25]}, test);
            result = union(result, test);
            */
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
    addHole(result, hole, idx) {
        let logNr = 100 + ((idx-1) * 10);
        let lochHoehe=0;
        let lochBreite=0;
        let holeShape;
        if (hole.shape=="c") {
            holeShape = cylinder( {radius: hole.radius, height: this.thickness*1.1});
            this.addLog(logNr+1, "  - Loch Kreis mit Radius: " + hole.radius);
            lochBreite = (hole.radius*2);
            lochHoehe  = (hole.radius*2);
        }
        if (hole.shape=="r") {
            holeShape = roundedCuboid({size: [hole.width, hole.depth, this.thickness*1.5], roundRadius: 0.1});
            this.addLog(logNr+1, "  - Loch Rechteck: " + hole.width + "x" + hole.depth);
            lochBreite = hole.width;
            lochHoehe  = hole.depth;
        }

        let width=0;
        let depth=0;
        let height=this.computed.innerCenterHeight;
        let rotateX=0;
        let rotateY=0;

        let abstandWandMittig = 0;
        let abstandMitte = 0;

        if (hole.position=="b") {
            rotateX=90;
            width+=hole.shiftWidth;
            depth=-((this.computed.innerDepth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
            abstandMitte = width;
            abstandWandMittig = this.computed.innerWidth - lochBreite;
            this.addLog(logNr+2, "    . Position Hinten");
        }
        if (hole.position=="f") {
            rotateX=90;
            width-=hole.shiftWidth;
            depth=((this.computed.innerDepth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
            abstandMitte = width;
            abstandWandMittig = this.computed.innerWidth - lochBreite;
            this.addLog(logNr+2, "    . Position Vorne");
        }
        if (hole.position=="r") {
            rotateX=90;
            rotateY=90;
            depth-=hole.shiftWidth;
            width=-((this.computed.innerWidth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
            abstandMitte = depth;
            abstandWandMittig = this.computed.innerDepth - lochBreite;
            this.addLog(logNr+2, "    . Position Rechts");
        }
        if (hole.position=="l") {
            rotateX=90;
            rotateY=90;
            depth+=hole.shiftWidth;
            width=((this.computed.innerWidth/2)+(this.thickness/2));
            height+=hole.shiftHeight;
            abstandMitte = depth;
            abstandWandMittig = this.computed.innerDepth - lochBreite;
            this.addLog(logNr+2, "    . Position Links");
        }
        if (hole.position=="g") {
            width=-hole.shiftWidth;
            depth=hole.shiftDepth;
            height=(this.thickness)/2;
            abstandMitte = width;
            abstandWandMittig = this.computed.innerWidth - lochBreite;
            this.addLog(logNr+2, "    . Position Boden");
        }

        holeShape = rotate([degToRad(rotateX), 0, degToRad(rotateY)], holeShape);
        holeShape = center({relativeTo: [width, depth, height]}, holeShape);

        if (hole.position!="g") {
            let abstandHoehe = height - this.thickness;
            this.addLog(logNr+3, "    . Abstand Boden: " + (abstandHoehe - (lochHoehe/2)).toFixed(2));
            this.addLog(logNr+4, "    . Abstand Rand oben: " + (this.computed.innerHeight - (abstandHoehe + (lochHoehe/2))).toFixed(2));
            this.addLog(logNr+5, "    . Abstand Wand 1: " + ((abstandWandMittig/2) - abstandMitte).toFixed(2));
            this.addLog(logNr+6, "    . Abstand Wand 2: " + ((abstandWandMittig/2) + abstandMitte).toFixed(2));
        }
        else {
            this.addLog(logNr+3, "    . Abstand Wand 1: " + ((abstandWandMittig/2) - abstandMitte).toFixed(2));
            this.addLog(logNr+4, "    . Abstand Wand 2: " + ((abstandWandMittig/2) + abstandMitte).toFixed(2));
            abstandMitte = depth;
            abstandWandMittig = this.computed.innerDepth - lochBreite;
            this.addLog(logNr+5, "    . Abstand Wand 3: " + ((abstandWandMittig/2) - abstandMitte));
            this.addLog(logNr+6, "    . Abstand Wand 4: " + ((abstandWandMittig/2) + abstandMitte));
        }

        if (holeShape) {
            //result = union(result, holeShape);
            result = subtract(result, holeShape);
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addScrewSocket(result, screw) {
        let screwSocket = this.getScrewSocket(screw.height);
        let socket_height = this.thickness+(screw.height/2);

        screwSocket = center({relativeTo: [-screw.shiftWidth, screw.shiftDepth, socket_height]}, screwSocket);
        result = union(result, screwSocket);

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    getScrewSocket(height) {
        let socket_r = this.screw.outerRadius;
        let socket = cylinder( {radius: socket_r, height: height});
        let socket_innen_r = this.screw.innerRadius;
        let socket_innen = cylinder( {radius: socket_innen_r, height: height});
        socket = subtract(socket, socket_innen);

        return socket;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addSocketBreadboard(result) {
        //Für generische schneidbare Platinen
        this.socket = this.socketBreadboard;
        let screwSocket = this.getScrewSocket(this.socket.height);
        let socket_height = this.thickness+(this.socket.height/2);
        
        //Min 2mm Abstand vom Rand
        let socketDepth; 
        let socketWidth;
        if (this.socket.maxDepth>0) { socketDepth = this.socket.maxDepth / 2; }
        else { socketDepth = (this.depth/2) - this.thickness - this.screw.outerRadius - 2; }
        if (this.socket.maxWidth>0) { socketWidth = this.socket.maxWidth / 2; }
        else { socketWidth = (this.width/2) - this.thickness - this.screw.outerRadius - 2; }

        //socketDepth und socketWidth auf Lochabstand der Platine normalisieren
        let lochabstand = 2.54;
        socketDepth = (Math.floor( (socketDepth*2) / lochabstand) * lochabstand) / 2;
        socketWidth = (Math.floor( (socketWidth*2) / lochabstand) * lochabstand) / 2;
        let shiftDepth = this.socket.shiftDepth;
        let shiftWidth = this.socket.shiftWidth;

        this.addLog(20, "  - Lochraster Lochabstand Breite " + (socketWidth * 2));
        this.addLog(20, "  - Lochraster Lochabstand Tiefe " + (socketDepth * 2));

        let s = center({relativeTo: [socketWidth+shiftWidth, socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [socketWidth+shiftWidth, -socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth+shiftWidth, -socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth+shiftWidth, socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        
        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addSocketEsp(result) {
        //Für generische schneidbare Platinen
        this.socket = this.socketEsp;
        let screwSocket = this.getScrewSocket(this.socket.height);
        let socket_height = this.thickness+(this.socket.height/2);
        
        let socketDepth; 
        let socketWidth;

        if (this.socket.model=="lolin_nodemcu_v3") {
            socketWidth = 25; 
            socketDepth = 52; 
        }

        socketDepth = socketDepth / 2;
        socketWidth = socketWidth / 2;
        let shiftDepth = this.socket.shiftDepth;
        let shiftWidth = this.socket.shiftWidth;
        
        if (this.socket.rotate) {
            let h=socketDepth; socketDepth=socketWidth; socketWidth=h;
        }

        let s = center({relativeTo: [socketWidth+shiftWidth, socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [socketWidth+shiftWidth, -socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth+shiftWidth, -socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth+shiftWidth, socketDepth+shiftDepth, socket_height]}, screwSocket);
        result = union(result, s);
        
        return result;
    }
    
    //-----------------------------------------------------------------------------------------------------------------
    addSocketShelly(result) {
        this.socket = this.socketShelly;

        let socketWidth = 1;
        let socketDepth = 1;
        let height = 5;
        let socketThickness = 1;

        if (this.socket.model=="rgb") {
            socketWidth = 42.7; //Shelly Maß 42.7; 42.8 locker
            socketDepth = 38; //Shelly Maß 38; 38.1 locker
        }

        let shellybox = cuboid({size: [socketWidth+socketThickness, socketDepth+socketThickness, height], center: [this.socket.shiftWidth, this.socket.shiftDepth, (height/2)+this.thickness]});
        shellybox = subtract(shellybox,  cuboid({size: [socketWidth, socketDepth, height], center: [this.socket.shiftWidth, this.socket.shiftDepth, (height/2)+this.thickness]}));
        result = union(result, shellybox);

        //let dim = measureDimensions(shellybox);
        //let center = measureCenter(shellybox)

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addLog(sortnr, msg) {
        this.logMeasure.push({
            sortnr: sortnr,
            msg: msg
        })
    }

    //-----------------------------------------------------------------------------------------------------------------
    logMeasurements() {
        console.log("---------------------------------------------------------");
        console.log("Box Maße:");
        this.logMeasure.sort(function(a, b) {
            return a.sortnr - b.sortnr;
        });
        this.logMeasure.forEach((el) => {
            console.log(el.msg);
        });
        console.log("---------------------------------------------------------");
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

