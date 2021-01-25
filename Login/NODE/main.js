/*
 * Tips V8:
 * http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml
 * CLosures: http://jibbering.com/faq/notes/closures/
 */
var async = require('async');

var Cargador = require('../Comun/CargadorConfiguraciones.js');
var GUI = require('../Comun/GUI');
var MiUtil = require('../Comun/Util');

/* Exepciones no capturadas */
process.on('uncaughtException', function(exception) {
  // Logueamos la excepcion y cerramos el sistema.
  var fs = require('fs');

  fs.appendFileSync('./logs/errores.log', MiUtil.obtenerFechaString() + ": "
          + exception + "\n" + exception.stack + '\n');

  process.exit(1);
});

// Log
var Log = require('../Comun/Log');
Log.iniciar('eventos', 'INFO');
log.info(" >>>>>>>>>>>>>>>> INICIADO");

/* Archivos por defrecto */
var archivoConfiguracion = process.cwd() + '/conf/config.conf';
var archivoCuentasManager = process.cwd() + '/conf/cuentas_manager.conf';
var archivoLocalizadorIP = process.cwd() + '/conf/localizador.conf';

// ¿Puso parametros?
if (process.argv.length == 5) {
  archivoConfiguracion = process.argv[2];
  archivoCuentasManager = process.argv[3];
  archivoLocalizadorIP = process.argv[4];
}

try {
  // Configuracion general
  var configGeneral = Cargador.cargarConfiguracion(archivoConfiguracion);
  // Configuracion del administrador de cuentas
  var configCuentas = Cargador.cargarConfiguracion(archivoCuentasManager);
  // Configuracion del administrador de cuentas
  var configLocalizador = Cargador.cargarConfiguracion(archivoLocalizadorIP);
} catch (error) {
  console.error(error);
  process.exit(1);
}

// Creamos lo objetos
var Servidor = require('./Servidor.js');
var Localizador = require('./LocalizadorIP');
var CuentasManager = require('./CuentasManager');

var localizador = new Localizador(configLocalizador);
var cuentasManager = new CuentasManager(configCuentas);

// Iniciamos el localziador y el cuentas manager
async
        .series(
                [localizador.iniciar.bind(localizador),
                    cuentasManager.iniciar.bind(cuentasManager)],
                function(err) {
                  if (err == true) {
                    console
                            .log("No es posible iniciar el Login Server. Consulte el registro de eventos.");
                    process.exit(1);
                  }

                  var servidor = new Servidor(configGeneral, localizador,
                          cuentasManager);

                  // Iniciamos el servidor
                  servidor.iniciar();

                  // Quitamos estas referencias de los objetos
                  configGeneral = null;
                  configCuentas = null;
                  configLocalizador = null;

                  // Interface de usuario
                  GUI.iniciar();

                  console.log("Login Server iniciado con exito.");
                });
