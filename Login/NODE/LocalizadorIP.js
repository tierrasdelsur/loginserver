/**
 * A partir de uan direccion IP este modulo retorna su informacion como ser
 * pais, proveedor, comunidad a la que pertenece el proveedor, etc
 */
var mysql = require('mysql');

function LocalizadorIP(config) {

  this.config = config;

}

LocalizadorIP.prototype.iniciar = function(callback) {

  this.mysql = mysql.createPool({
    host: this.config.host,
    port: this.config.port,
    user: this.config.user,
    password: this.config.password,
    database: this.config.database,
    queueLimit: this.config.queueLimit, // limite de conexiones en espera
    connectionLimit: this.config.connectionLimit, // Maxima cantidad de
                                                  // conexiones
  // al mismo tiempo
  });

  // ¿Como probamos que se inicio correctamente?
  this.mysql
          .getConnection(function(err, connection) {

            if (err === null) {
              connection.release();
              callback(null);
            } else {
              log
                      .fatal("No se pudo conectar a la base de datos en el LocalizadorIPS.");
              log.fatal(err.message);

              callback(true);
            }
          });
};

LocalizadorIP.prototype.getInfoIP = function(ip, callback) {

  this.mysql
          .getConnection(function(err, connection) {

            var resultado = {
              comunidad: 0,
              empresa: "INDEFINIDA"
            };

            // ¿Error al tomar la conexion?"
            if (err !== null) {
              log
                      .error("No se pudo obtener una conexión del pool en getInfoIP.");
              log.error(err);
              callback(null, resultado);
              return;
            }

            // Intentamos obtener el registro correspondiente a esta IP
            // Ojo, para optimizar la consulta es importante que primero se
            // consulte por el techo y luego por la base.
            var consulta = 'SELECT COMUNIDAD, EMPRESA FROM geolocalizacion_ip WHERE TECHO >='
                    + connection.escape(ip)
                    + ' AND BASE <= '
                    + connection.escape(ip) + ' ORDER BY PRIORIDAD DESC LIMIT 1';

            connection.query(consulta, function(err, rows) {

              // Liberamos la conexion
              connection.release();

              if (err === null) {
                // ¿Lo localizamos?
                if (rows.length === 1) {

                  resultado.comunidad = rows[0].COMUNIDAD;
                  resultado.empresa = rows[0].EMPRESA;

                  callback(null, resultado);
                } else {// No lo encontramos en la base de datos
                  callback(null, resultado);
                }
              } else {
                // TODO Deberia devolver un error...
                log.warn("Error al ejecutar la query: " + consulta);
                log.warn(err);
                callback(null, resultado);
              }
            });
          });

};

module.exports = LocalizadorIP;
