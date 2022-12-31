# Box Creator für 3D Druck

In VSCode sollte die Extension jscad installiert werden.  
Öffnet man die exportierten JSON Dateien im Export Verzeichnis, dann werden diese grafisch angezeigt und folgende Funktionen können genutzt werden: Zoom, Verschieben, Drehen

```
git clone https://github.com/rogerknop/boxprint
npm install
```

In config/configfilename.json die entsprechenden Einstellungen vornehmen
node src/index.js [configfilename without .json]

```
npm run start 
  => Nodemon mit Watch über Änderungen in src oder config.  

npm run start -- test
  => Wie oben nur mit anderer Konfiguration: ./config/test.json verwendet

Für Debugging muss entsprechend in der launch.json der Parameter "arg" angepasst werden. 
```

Viele Objekte innerhalb der Konfiguration lassen sich durch das *active* Attribut ausblenden (=false). Dies ist für Tests recht hilfreich.

Um weitere Objekte hinzuzufügen, kann man eine Extension anlegen im Verzeichnis extension.  
Der Name entspricht dem techName der Konfiguration.  
Ein Beispiel ist: extension/defaultbox.js

Die obj Dateien im Export Verzeichnis können direkt in einen Slicer (z.B. Cura) geladen werden für die 3D Print Weiterverarbeitung.

Die Schraublöcher sind getestet mit 2,9er Blechschrauben.

Für den Typ ***box*** werden folgende Features unterstützt:
* Höhe, Breite, Tiefe mit Klick Mechanismus
* Sockets zum Schrauben für:
  * ESP Lolin NodeMcu V3
  * Shelly RGB
  * Lochraster 2,54mm
* Array mit Einzel Schraubsockets
* Array mit Löchern

Weiterhin gibt es den Typ ***clamp***.  
Es geht darum, dass gewisse Objekte nicht auf einem Lochraster befestigt werden können.  
Daher gibt es eine Klemme für z.B. 1-fach Relais.

## Installation & Doku

### Doku
* https://openjscad.xyz/docs/
* https://openjscad.xyz/dokuwiki/doku.php
* https://github.com/jscad/OpenJSCAD.org

npm install -D @jscad/cli

### JSCAD direkt ausführen
* npx jscad src/index.js -o export/result.jscad.json
* Über nodemon: npx nodemon -w ./src --exec npx jscad src/index.js -o export/result.jscad.json
