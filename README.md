# Box Creator für 3D Druck

In VSCode sollte die Extension jscad installiert werden.  
Öffnet man die exportierten JSON Dateien im Export Verzeichnis, dann werden diese grafisch angezeigt und folgende Funktionen können genutzt werden: Zoom, Verschieben, Drehen

```
git clone https://github.com/rogerknop/boxprint
npm install
```

In config/configfilename.json die entsprechenden Einstellungen vornehmen
node src/index.js [configfilename without .json]

npm run start -> Nodemon mit Watch über Änderungen in src oder config.  
Es geht auch mit einer anderen Konfiguration: npm run start -- test   
=> Es wird dann die Konfiguration ./config/test.json verwendet

Viele Objekte innerhalb der Konfiguration lassen sich durch das *active* Attribut ausblenden (=false). Dies ist für Tests recht hilfreich.

Um weitere Objekte hinzuzufügen, kann man eine Extension anlegen im Verzeichnis extension.  
Der Name entspricht dem techName der Konfiguration.  
Ein Beispiel ist: extension/defaultbox.js

Die obj Dateien im Export Verzeichnis können direkt in einen Slicer (z.B. Cura) geladen werden für die 3D Print Weiterverarbeitung.

## Installation & Doku

### Doku
* https://openjscad.xyz/docs/
* https://openjscad.xyz/dokuwiki/doku.php
* https://github.com/jscad/OpenJSCAD.org

npm install -D @jscad/cli

### JSCAD direkt ausführen
* npx jscad src/index.js -o export/result.jscad.json
* Über nodemon: npx nodemon -w ./src --exec npx jscad src/index.js -o export/result.jscad.json
