var mysql = require('mysql');
var util = require('util');

function CuentasManager(config) {
  this.basedatos = null;
  this.config = config;
};

CuentasManager.prototype.iniciar = function(callback) {

  this.basedatos = mysql.createPool({
    host: this.config.host,
    port: this.config.port,
    user: this.config.user,
    password: this.config.password,
    database: this.config.database, // DB donde se encuentran las tablas de las
    // cuentas
    queueLimit: this.config.queueLimit, // limite de conexiones en espera
    connectionLimit: this.config.connectionLimit
  // Maxima cantidad de conexiones al mismo tiempo
  });

  // ¿Como probamos que se inicio correctamente?
  this.basedatos.getConnection(function(err, connection) {

    if (err === null) {
      connection.release();
      callback(null);
    } else {
      log.fatal("No se pudo conectar a la base de datos en el CuentasManager");
      log.fatal(err.message);

      callback(true);
    }
  });
};
/*
 * Niveles de cuenta: 1: Nunca premium. 2: Fue Premium hasta 6 meses o es
 * Premium. 3: Fue premium mas de 6 meses o es Premium mas de 2 meses. 4: Es
 * Premium y durante mas de 6 meses. 5: Es Premium y durante mas de un año
 */
function calcularNivel(infoCuenta) {
  var nivel = 1;

  log.info(util.inspect(infoCuenta));
  if (infoCuenta.ESPREMIUM == true) {
    nivel++;

    if (infoCuenta.MESESCARGADOS > 2) nivel++;

    if (infoCuenta.MESESCARGADOS > 6) nivel++;

    if (infoCuenta.MESESCARGADOS > 12) nivel++;

  } else {
    if (infoCuenta.MESESCARGADOS > 0) nivel++; // ¿Fue premium?

    if (infoCuenta.MESESCARGADOS > 6) nivel++;
  }

  return nivel;
}

CuentasManager.prototype.obtenerTipoCuenta = function(idcuenta, callback) {

  var infoCuenta = {
    nivel: 0,
    espremium: false,
    bloqueada: false
  };

  // La cuenta ID 0 segur no existe
  if (idcuenta == 0) {
    // Lo agregamos a la cola de eventos
    process.nextTick(function() {
      callback(null, infoCuenta);
    });
    return;
  }

  // Obtenemos informacion de la cuenta
  this.basedatos
          .getConnection(function(err, connection) {

            // ¿Error al tomar la conexion?"
            if (err !== null) {
              log.error("No se pudo obtener una conexión del pool.");
              log.error(err);
              callback(null, infoCuenta);
              return;
            }

            var consulta = 'SELECT cuenta.MESESCARGADOS'
                    + ', IF (cuenta.FECHAVENCIMIENTO > UNIX_TIMESTAMP(), true, false) AS ESPREMIUM'
                    + ', IF (bloq.IDCUENTA IS NULL, false, true) AS BLOQUEADA'
                    + ' FROM cuentas AS cuenta'
                    + ' LEFT JOIN cuentas_bloqueadas AS bloq ON bloq.IDCUENTA=cuenta.ID'
                    + ' WHERE CUENTA.ID = ' + connection.escape(idcuenta);

            connection.query(consulta,

            function(err, rows) {

              connection.release();// Se retorna la conexion al pool
              // Existe la cuenta?
              if (err === null && rows.length === 1) {
                // Guardamos los datos
                infoCuenta.nivel = calcularNivel(rows[0]);
                infoCuenta.espremium = rows[0].ESPREMIUM;
                infoCuenta.bloqueada = rows[0].BLOQUEADA;
                
                callback(null, infoCuenta);
              } else {
                // Se produjo un error?
                if (err != null) {
                  log.warn("Error:" + err.code);
                }
                // Se produjo un error o la cuenta que se buscaba no existe.
                log.warn("La cuenta buscada no existe o se produho un error.");

                // TODO Deberia devolver ERROR el callback
                callback(null, infoCuenta);
              }

            });
          });
};

module.exports = CuentasManager;