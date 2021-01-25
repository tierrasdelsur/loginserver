var Util = require('../Comun/Util.js');
var os = require('os');

function procesarEntrada(dato) {

  // Quitamos el \n
  dato = dato.replace(/(\n|\r|\r\n)$/, '');

  switch (dato) {
  case 'est':
    var memoria = process.memoryUsage();

    console.log("Corriendo hace " + Util.secondToTime(process.uptime()) + ".");

    console.log("Memoria disponible: " + Util.bytesToSize(os.freemem()));

    console.log("Version de Node.js: " + process.version + " corriendo en "
            + process.platform + ".");
    console.log("Memoria real del proceso: " + Util.bytesToSize(memoria.rss)
            + ".");
    console
            .log("Heal total (V8): " + Util.bytesToSize(memoria.heapTotal)
                    + ".");
    console.log("Heal Usado (V8): " + Util.bytesToSize(memoria.heapUsed) + ".");
    break;
  default:
    console.log("Opción '" + dato + "' inexistente");
    break;
  }

}

function GUI() {
};

GUI.prototype.iniciar = function() { 
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  /* Ingreso de datos */
  process.stdin.on('data', procesarEntrada);

  // Se llama cuando se le da al control + d. [End-of-File]
  process.stdin.on('end', function() {
  });
};

module.exports = new GUI;