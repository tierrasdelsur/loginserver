var GUI = require('../Comun/GUI');
var Cargador = require('../Comun/CargadorConfiguraciones.js');

var Nodo = require('./Nodo');
var LS = require('./LoginServer');
var MiUtil = require('../Comun/Util');

/* Exepciones no capturadas */
process.on('uncaughtException', function(exception) {
  // Logueamos la excepcion y cerramos el sistema.
  var fs = require('fs');

  fs.appendFileSync('./logs/errores.log', MiUtil.obtenerFechaString() + ": "
          + exception + "\n" + exception.stack + '\n');
  //TODO re activar
  //process.exit(1);
});

// Log
var Log = require('../Comun/LogSincronico');
Log.iniciar('eventos', 'INFO');
log.info(" >>>>>>>>>>>>>>>> INICIADO");

/* Configuracion del Nodo */
var nombreArchivoConfiguracion = process.cwd() + '/conf/config.conf';
var nombreArchivoLogins = process.cwd() + '/conf/loginservers.conf';

// ¿Puso parametros?
if (process.argv.length == 4) {
  nombreArchivoConfiguracion = process.argv[2];
  nombreArchivoLogins = process.argv[3];
}

try {
  // Configuracion general
  var config = Cargador.cargarConfiguracion(nombreArchivoConfiguracion);
  // Configuracion del administrador de cuentas
  var logins = Cargador.cargarConfiguracion(nombreArchivoLogins);
} catch (error) {
  console.error(error);
  console.log("ERROR: Imposible iniciar el Nodo."
          + " Por favor, revise el archivo de eventos para más informacion.");
  process.exit(1);
}

/** ********************** */
var nodo = new Nodo(config);

nodo.iniciar();

// Conectamos a los logins servers
for ( var loopLogin = 0; loopLogin < logins.length; ++loopLogin) {

  // Creamos el login server con la configuracion
  var server = new LS(logins[loopLogin]);

  nodo.agregarLoginServer(server);
};

logins = null;
config = null;
/** *********************** */
// Inteface de usuario
GUI.iniciar();
