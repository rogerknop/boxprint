const jscad = require('@jscad/modeling');

const { writeFile } = require('node:fs/promises');
const fs = require('fs');
const jsonSerializer = require('@jscad/json-serializer');
const objSerializer = require('@jscad/obj-serializer');

const { roundedCuboid, cuboid, rectangle, roundedRectangle, square, polygon, cylinder } = jscad.primitives;
const { subtract, union } = jscad.booleans;
const { center, rotate } = jscad.transforms;
const { degToRad } = jscad.utils;
const { extrudeLinear, extrudeRectangular } = jscad.extrusions;
const { vectorText } = jscad.text;
const { path2 } = jscad.geometries;
const { measureDimensions, measureCenter, measureBoundingBox } = jscad.measurements;

const segmentToPath = (segment) => { return path2.fromPoints({close: false}, segment) };

const clear = require('console-clear');

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

    // Der innere Teil vom Deckel im Korpus ist minimal kleiner in Width und Depth
    lidReduce = 0.2;

    computed = {};
    logMeasure = [];

    //-----------------------------------------------------------------------------------------------------------------
    constructor(core, params) {
        this.core = core;
        Object.assign(this, params);

        this.computeClickValues();

        this.computed.corpus = this.corpus();
        this.computed.lid    = this.lid();
    }
    
    //-----------------------------------------------------------------------------------------------------------------
    corpus() {
        this.computed.innerWidth = this.width-(this.thickness*2);
        this.computed.innerDepth = this.depth-(this.thickness*2);
        this.computed.innerHeight = this.height-this.thickness;
        this.computed.innerCenterHeight = (this.computed.innerHeight/2)+this.thickness;

        this.addLog(1, "  - Breite innen: " + this.computed.innerWidth.toFixed(2));
        this.addLog(2, "  - Tiefe innen: " + this.computed.innerDepth.toFixed(2));
        this.addLog(3, "  - Höhe innen offen: " + this.computed.innerHeight.toFixed(2));

        let result = roundedCuboid({size: [this.width, this.depth, this.height+this.rounded], center: [0, 0, ((this.height+this.rounded)/2)], roundRadius: this.rounded});
        result = subtract(result,  roundedCuboid({size: [this.computed.innerWidth, this.computed.innerDepth, this.height+this.rounded], center: [0, 0, ((this.height+this.rounded)/2)+this.thickness], roundRadius: this.rounded}));
                
        let notround = cuboid({size: [this.width, this.depth, this.rounded]});
        notround = center({relativeTo: [0, 0, this.height+(this.rounded/2)]}, notround);
        result = subtract(result, notround);

        if (this.click?.active) {
            let r = this.click.radius - 0.02;
            let h = this.click.heightCorpus;
            let clickDepth = (this.depth/2) - this.thickness;
            let clickWidth = (this.width/2) - this.thickness;
            let clickHeight = this.height - r - ((this.click.lidThickness -(2*this.click.radius)) / 2);
            clickHeight+=0.2;
            
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
        if (this.socketLid?.active) {
            result = this.addSocketLid(result);
        }
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
            let screw_width = 10;
            let screw_depth = 10;
            let screw_height = this.thickness*1.5;
            let outer_screw = roundedCuboid({size: [screw_width+this.thickness, screw_depth, screw_height], center: [0, 0, 0], roundRadius: this.rounded});
            outer_screw = center({relativeTo: [0, 0, screw_height/2]}, outer_screw);

            let outer_screw_hole = cylinder( {radius: 2.3, height: this.thickness*3});
            outer_screw = subtract(outer_screw, outer_screw_hole);

            let osHeight = (screw_height/2);
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

        if (this.holeControl?.active && (this.holeControl?.holes?.length>0)) {
            this.holeControl.holes.forEach((hole, idx) => {
                if (hole.active && (hole.position!="t")) result = this.addHole(result, hole, idx);
            });
        }

        if (this.textControl?.active && (this.textControl?.texts?.length>0)) {
            this.textControl.texts.forEach((text, idx) => {
                if (text.active && (text.position!="t")) result = this.addText(result, text, idx);
            });
        }

        if (this.socketSingleScrewControl?.active && (this.socketSingleScrewControl?.screws?.length>0)) {
            this.socketSingleScrewControl.screws.forEach((screw, idx) => {
                if (screw.active && !screw.positionLid) result = this.addScrewSocket(result, screw, idx);
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
        this.computed.lid_thickness_complete = extrudeHeight + this.thickness - this.rounded;
        let lid = roundedRectangle({size: [this.computed.innerWidth-this.lidReduce, this.computed.innerDepth-this.lidReduce], roundRadius: 2})
        this.addLog(4, "  - Deckel Kulanz (lidReduce): " + (this.lidReduce).toFixed(2));
        lid = extrudeLinear({height: extrudeHeight}, lid);
        lid = center({relativeTo: [0, 0, (extrudeHeight/2)+this.thickness-this.rounded]}, lid);
        result = union(result, lid);

        this.computed.heightLidInsideCorpus = extrudeHeight;
        this.addLog(4, "  - Höhe innen geschlossen: " + (this.computed.innerHeight - this.computed.heightLidInsideCorpus).toFixed(2));
        this.addLog(5, "  - Höhe Deckel gesamt: " + this.computed.lid_thickness_complete.toFixed(2));
        //this.addLog(6, "  - Höhe Deckel im Korpus: " + this.computed.heightLidInsideCorpus.toFixed(2));
    
        if (this.click?.active) {
            if ((this.click.lidThickness-0.2) < (this.click.radius*2)) {
                console.log("ERROR!!! lidThicknessk-0.2 ist kleiner als Click Durchmesser!");
            }
            let r = this.click.radius;
            let h = this.click.heightLid;
            let clickWidth = (this.width/2) - this.thickness - this.lidReduce;
            let clickDepth = (this.depth/2) - this.thickness - this.lidReduce;
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

        if (this.socketLid?.active) {
            result = this.addSocketLidHoles(result);
        }

        if (this.ventilation?.active && (this.ventilation?.count>0)) {
            let ventilationWidth = this.ventilation.width;
            let ventilationShift = this.ventilation.shift || 0;
            let availDepth = this.computed.innerDepth-(this.lidReduce*2);
            let availWidth = this.computed.innerWidth-(this.lidReduce*2);
            let ventilationLength = availDepth * this.ventilation.lengthPercent;
            let gap = (availWidth / (this.ventilation.count + 1));
            let currPos = -(availWidth / 2) ;
            let gapHeight = this.computed.lid_thickness_complete;
            let gapCuboid = cuboid({size: [ventilationWidth, ventilationLength, gapHeight+1]});
            for (let i = 1; i<=this.ventilation.count; i++) {
                currPos += gap;
                gapCuboid = center({relativeTo: [currPos, ventilationShift, gapHeight/2]}, gapCuboid);
                result = subtract(result, gapCuboid);
            }
        }
    
        if (this.holeControl?.active && (this.holeControl?.holes?.length>0)) {
            this.holeControl.holes.forEach((hole, idx) => {
                if (hole.active && (hole.position=="t")) result = this.addHole(result, hole, idx);
            });
        }

        if (this.textControl?.active && (this.textControl?.texts?.length>0)) {
            this.textControl.texts.forEach((text, idx) => {
                if (text.active && (text.position=="t")) result = this.addText(result, text, idx);
            });
        }

        if (this.socketSingleScrewControl?.active && (this.socketSingleScrewControl?.screws?.length>0)) {
            this.socketSingleScrewControl.screws.forEach((screw, idx) => {
                if (screw.active && screw.positionLid) result = this.addScrewSocket(result, screw, idx);
            });
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addHole(result, hole, idx) {
        let logNr = 100 + ((idx-1) * 10);
        let lochHoehe=0;
        let lochBreite=0;
        let holeShape;
        let cylinderheight = this.thickness*1.1;

        if (hole.position=="t") {
            cylinderheight = this.computed.lid_thickness_complete + 0.1;
        }
        
        if (hole.shape=="c") {
            holeShape = cylinder( {radius: hole.radius, height: cylinderheight});
            this.addLog(logNr+1, "  - Loch Kreis mit Radius: " + hole.radius);
            lochBreite = (hole.radius*2);
            lochHoehe  = (hole.radius*2);
        }
        if (hole.shape=="r") {
            holeShape = roundedCuboid({size: [hole.width, hole.depth, cylinderheight], roundRadius: 0.1});
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
        if ((hole.position=="g") || (hole.position=="t")) {
            width=-hole.shiftWidth;
            depth=hole.shiftDepth;
            height=cylinderheight/2;
            abstandMitte = width;
            abstandWandMittig = this.computed.innerWidth - lochBreite;
            if (hole.position=="g") this.addLog(logNr+2, "    . Position Boden")
            else this.addLog(logNr+2, "    . Position Deckel")
        }

        holeShape = rotate([degToRad(rotateX), 0, degToRad(rotateY)], holeShape);
        holeShape = center({relativeTo: [width, depth, height]}, holeShape);

        if ((hole.position!="g") && (hole.position!="t")) {
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
            this.addLog(logNr+5, "    . Abstand Wand 3: " + ((abstandWandMittig/2) - abstandMitte).toFixed(2));
            this.addLog(logNr+6, "    . Abstand Wand 4: " + ((abstandWandMittig/2) + abstandMitte).toFixed(2));
        }

        if (holeShape) {
            //result = union(result, holeShape);
            result = subtract(result, holeShape);
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addScrewSocket(result, screw, idx) {
        let logNr = 1000 + ((idx-1) * 10);
        let screwSocket = this.getScrewSocket(screw.height);
        let socket_height = this.thickness+(screw.height/2);

        if (screw.positionLid) {
            this.addLog(logNr+1, "  - Single Schraubsockel Deckel:");
            socket_height = this.computed.lid_thickness_complete+(screw.height/2);
        }
        else {
            this.addLog(logNr+1, "  - Single Schraubsockel Boden:");
        }

        screwSocket = center({relativeTo: [-screw.shiftWidth, screw.shiftDepth, socket_height]}, screwSocket);
        result = union(result, screwSocket);

        let lochBreite = this.screw.outerRadius * 2;
        let abstandMitte = screw.shiftWidth;
        let abstandWandMittig = this.computed.innerWidth - lochBreite;

        this.addLog(logNr+3, "    . Abstand Wand 1: " + ((abstandWandMittig/2) - abstandMitte).toFixed(2));
        this.addLog(logNr+4, "    . Abstand Wand 2: " + ((abstandWandMittig/2) + abstandMitte).toFixed(2));
        abstandMitte = screw.shiftDepth;
        abstandWandMittig = this.computed.innerDepth - lochBreite;
        this.addLog(logNr+5, "    . Abstand Wand 3: " + ((abstandWandMittig/2) - abstandMitte).toFixed(2));
        this.addLog(logNr+6, "    . Abstand Wand 4: " + ((abstandWandMittig/2) + abstandMitte).toFixed(2));

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
    addSocketLid(result) {
        this.socket = this.socketLid;
        let socket_height = (this.computed.innerHeight / 2) + this.thickness;
        let screwSocket = this.getScrewSocket(this.computed.innerHeight);
        let socketDepth = (this.depth / 2) - this.screw.outerRadius - this.screw.innerRadius + (this.thickness/2);
        let socketWidth = (this.width / 2) - this.screw.outerRadius - this.screw.innerRadius + (this.thickness/2);
        this.computed.socketLid = {
            width : socketWidth,
            depth : socketDepth
        };

        let s = center({relativeTo: [socketWidth, socketDepth, socket_height]}, screwSocket);
        result = union(result, s);
        s = center({relativeTo: [-socketWidth, -socketDepth, socket_height]}, screwSocket);
        result = union(result, s);
        if (!this.socket.only2) {
            s = center({relativeTo: [socketWidth, -socketDepth, socket_height]}, screwSocket);
            result = union(result, s);
            s = center({relativeTo: [-socketWidth, socketDepth, socket_height]}, screwSocket);
            result = union(result, s);
        }
        
        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    addSocketLidHoles(result) {
        this.socket = this.socketLid;
        let socket_height = this.computed.lid_thickness_complete / 2;
        let socketDepth = this.computed.socketLid.depth;
        let socketWidth = this.computed.socketLid.width;
        let radius = this.screw.innerRadius + ((this.screw.outerRadius - this.screw.innerRadius) / 2);

        let holeShape = cylinder( {radius: radius, height: this.computed.lid_thickness_complete + 1});

        let s = center({relativeTo: [socketWidth, -socketDepth, socket_height]}, holeShape);
        result = subtract(result, s);
        s = center({relativeTo: [-socketWidth, socketDepth, socket_height]}, holeShape);
        result = subtract(result, s);
        if (!this.socket.only2) {
            s = center({relativeTo: [socketWidth, socketDepth, socket_height]}, holeShape);
            result = subtract(result, s);
            s = center({relativeTo: [-socketWidth, -socketDepth, socket_height]}, holeShape);
            result = subtract(result, s);
        }

        socket_height = this.computed.lid_thickness_complete - (this.computed.heightLidInsideCorpus / 2);
        radius = this.screw.outerRadius + 1;
        holeShape = cylinder( {radius: radius, height: this.computed.heightLidInsideCorpus});

        s = center({relativeTo: [socketWidth, -socketDepth, socket_height]}, holeShape);
        result = subtract(result, s);
        s = center({relativeTo: [-socketWidth, socketDepth, socket_height]}, holeShape);
        result = subtract(result, s);
        if (!this.socket.only2) {
            s = center({relativeTo: [socketWidth, socketDepth, socket_height]}, holeShape);
            result = subtract(result, s);
            s = center({relativeTo: [-socketWidth, -socketDepth, socket_height]}, holeShape);
            result = subtract(result, s);
        }


        return result;
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
        else { socketDepth = (this.depth/2) - this.thickness - this.screw.outerRadius - 4; }
        if (this.socket.maxWidth>0) { socketWidth = this.socket.maxWidth / 2; }
        else { socketWidth = (this.width/2) - this.thickness - this.screw.outerRadius - 4; }
        //socketDepth und socketWidth auf Lochabstand der Platine normalisieren
        let lochabstand = 2.542372881355932; //Lochabstand 2.54cm mit Rundungsdifferenzen
        socketDepth = (Math.floor( (socketDepth*2) / lochabstand) * lochabstand) / 2;
        socketWidth = (Math.floor( (socketWidth*2) / lochabstand) * lochabstand) / 2;
        let shiftDepth = this.socket.shiftDepth;
        let shiftWidth = this.socket.shiftWidth;

        this.addLog(30, "  - Lochraster Lochabstand Breite " + (socketWidth * 2).toFixed(2));
        this.addLog(30, "  - Lochraster Lochabstand Tiefe " + (socketDepth * 2).toFixed(2));

        //Druck Korrektur wegen Drucker Ungenauigkeiten
        socketDepth -= 0.5;
        socketWidth -= 0.5;

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
    computeClickValues() {
        this.addLog(20, "  - Klick Werte: automatisch = " + this.click.compute);

        if (this.click && this.click.hasOwnProperty('compute') && !this.click.compute) {
            this.addLog(21, "    . Radius (radius): " + this.click.radius);
            this.addLog(22, "    . Höhe innerer Teil vom Deckel im Korpus (lidThickness):  " + this.click.lidThickness);
            this.addLog(23, "    . Zylinderlänge im Korpus (heightCorpus): " + this.click.heightCorpus);
            this.addLog(24, "    . Zylinderlänge im Deckel (heightLid): " + this.click.heightLid);
            return;
        }
        
        if (!this.click || (typeof(this.click)!=="object")) { this.click = {active: true}; }
        
        this.click.compute = true;

        // Der innere Teil vom Deckel im Korpus muss gross genug für die Clicks sein
        this.click.lidThickness = 2;
        
        // Radius des Click Cylinders        
        this.click.radius = 0.5;

        // Länge des Click Cylinders am Korpus
        this.click.heightCorpus = 9;

        // Länge der Click Cylinder Einbuchtung im Deckel
        this.click.heightLid = 10;

        // Click Radius sollte mit Größe der Box größer werden
        // - Die länger Seite ist relvant. Je größer die Box je größer muss der Click sein, da die Seiten nicht starr sind
        // - Testreihe:
        //   . Max Seite 50 => Radius 0.5 (Minimum)
        //   . Max Seite 90 => Radius 0.68 usw.
        //   => radius = longSide / 110
        let longSide = Math.max(this.width, this.depth);
        if (longSide > 50) {
            this.click.radius = 
              0.5 + // Minimum
              ((longSide - 50) * 0.0045);
              if (this.click.radius < 0.5) { this.click.radius = 0.5; }
              this.click.radius = this.click.radius.toFixed(2)*1;
        }

        // lidThickness kann man berechnen anhand des Click Radius + Fester Rand obendrüber und drunter
        this.click.lidThickness = (this.click.radius * 2) + (0.4 * 2);
        this.click.lidThickness = this.click.lidThickness.toFixed(2)*1;

        this.addLog(21, "    . Radius (radius): " + this.click.radius.toFixed(2));
        this.addLog(22, "    . Höhe innerer Teil vom Deckel im Korpus (lidThickness):  " + this.click.lidThickness.toFixed(2));
        this.addLog(23, "    . Zylinderlänge im Korpus (heightCorpus): " + this.click.heightCorpus.toFixed(2));
        this.addLog(24, "    . Zylinderlänge im Deckel (heightLid): " + this.click.heightLid.toFixed(2));
    }
    
    //-----------------------------------------------------------------------------------------------------------------
    addText(result, text, idx) {
        let logNr = 800 + ((idx-1) * 10);
        
        this.addLog(logNr+1, "  - Text: " + text.text);
        
        let textShape = this.getTextObject({
            text: text.text,
            fontSize: text.fontSize || 10,
            extrudeHeight: text.extrudeHeight || 5,
            xOffset: 0,
            yOffset: 0,
            extrudeOffset: 0,
            lineThickness: text.lineThickness,
            alignMultiline: text.alignMultiline || "left"
        });
        
        let bounds = measureBoundingBox(textShape);
        let centerPoint = measureCenter(textShape); 

        let width=0;
        let depth=0;
        let height=0;
        let rotateX=0;
        let rotateY=0;
        let rotateZ=0;

        let textWidth  = bounds[1][0] - bounds[0][0];
        let textHeight = bounds[1][1] - bounds[0][1];

        if (text.alignAnkerX == "left")   {  text.shiftWidth = text.shiftWidth + (textWidth / 2);  } 
        if (text.alignAnkerX == "right")  {  text.shiftWidth = text.shiftWidth - (textWidth / 2);  } 

        if (text.alignAnkerY == "top")    {  text.shiftDepth = text.shiftDepth + (textHeight / 2);  } 
        if (text.alignAnkerY == "bottom") {  text.shiftDepth = text.shiftDepth - (textHeight / 2);  } 

        if (text.position=="f") {
            this.addLog(logNr+2, "    . Position Vorne - NOT WORKING!!!");
            return result;
            rotateX=90;
            rotateY=0+text.rotate;
            rotateZ=0;
            width-=text.shiftWidth;
            depth=(this.computed.innerDepth/2);//+(text.extrudeHeight/2)-this.thickness;
            height=this.computed.innerCenterHeight + text.shiftHeight;
            if (text.inside) { 
                depth = depth - (text.extrudeHeight/2);  
            }
            else { 
                depth = depth + (text.extrudeHeight/2) + this.thickness;  
                height -= (this.thickness/2);
            }
        }
        if (text.position=="b") {
            this.addLog(logNr+2, "    . Position Hinten - NOT WORKING!!!");
            return result;
        }
        if (text.position=="r") {
            this.addLog(logNr+2, "    . Position Rechts - NOT WORKING!!!");
            return result;
        }
        if (text.position=="l") {
            this.addLog(logNr+2, "    . Position Links - NOT WORKING!!!");
            return result;
        }
        if (text.position=="g") {
            text.inside=true;
            rotateX=0;
            rotateY=0;
            rotateZ=0 + text.rotate;
            width=text.shiftWidth;
            depth=text.shiftDepth;
            height=text.extrudeHeight/2 + this.thickness;
            if (!text.union) { height-=text.extrudeHeight/2; }
            this.addLog(logNr+2, "    . Position Boden");
        }
        if (text.position=="t") {
            text.inside=true;
            rotateX=0;
            rotateY=0;
            rotateZ=0 + text.rotate;
            width=text.shiftWidth;
            depth=text.shiftDepth;
            height=text.extrudeHeight/2 + this.computed.lid_thickness_complete;
            if (!text.union) { height-=text.extrudeHeight/2; }
            this.addLog(logNr+2, "    . Position Deckel");
        }

        textShape = rotate([degToRad(rotateX), degToRad(rotateY), degToRad(rotateZ)], textShape);
        textShape = center({relativeTo: [width,depth,height]}, textShape);

        if (text.union) {
            result = union(result, textShape);
        }
        else {
            result = subtract(result, textShape);
        }

        return result;
    }

    //-----------------------------------------------------------------------------------------------------------------
    getTextObject(control) {
       let vectorTextObj = vectorText({ align: control.alignMultiline, height: control.fontSize, 
                                        xOffset: control.xOffset, yOffset: control.yOffset,
                                        extrudeOffset: control.extrudeOffset, input: control.text });
       const { path2 } = require('@jscad/modeling').geometries
       const segmentToPath = (segment) => {  return path2.fromPoints({close: false}, segment)  }        
       const paths = vectorTextObj.map((segment) => segmentToPath(segment));
       let text3d = null;
       paths.forEach((part) => {
        const texttmp = extrudeRectangular({corners: 'round', size: control.lineThickness, height: control.extrudeHeight }, part);
        if (!text3d) { text3d = texttmp; }
        else { text3d = union(text3d, texttmp); }    
       })
       return text3d;
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
        clear();
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

