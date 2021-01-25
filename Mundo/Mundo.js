var mysql = require('mysql');
var util = require('util');

const
INTERVALO_RECONEXION = 30000; // En milisegundos (30 segundos)
VALIDEZ_HASH = 9; // En segundos (9 segundos)
LIMPIEZA_HASH = 3600; // Cada cuantos segunods se eliminan los hashs no usados viejos de la DB

function Mundo(conf) {

  this.id = conf.id;
  this.nombre = conf.nombre;
  this.soloPremium = conf.premium;
  this.mysqlconf = conf.base;
  this.md5 = conf.md5;
  this.ip = conf.ip;

  this.logins = [];
  // Para la conexion con el LoginServer
  this.mysql = null;
  // Reconexion automatica.
  this.idTimerReConectarLogins = 0;
};


Mundo.prototype.permitirIngreso = function(hash, ip, macaddress, nombrepc,
        semilla, idpersonaje, nombrepersonaje, clave, callback) {

  this.mysql
          .getConnection(function(err, connection) {

            // Intentamos obtener un personaje con ese usuario y clave.
            var consulta = 'INSERT INTO loginserver_permisos(HASH, IP, MACADDRESS, NOMBREPC, SEMILLA, IDPERSONAJE, NOMBREPERSONAJE, CLAVE) '
                    + 'VALUES ('
                    + connection.escape(hash)
                    + ','
                    + connection.escape(ip)
                    + ','
                    + connection.escape(macaddress)
                    + ','
                    + connection.escape(nombrepc)
                    + ','
                    + connection.escape(semilla)
                    + ','
                    + connection.escape(idpersonaje)
                    + ','
                    + connection.escape(nombrepersonaje)
                    + ','
                    + connection.escape(clave) + ')';

            connection.query(consulta, function(err, rows) {

              connection.release(); // Liberamos la conexion

              if (err !== null) {
                log.info("Error al ejecutar la query: " + consulta);
                callback(null, false);
              } else {
                callback(null, true);
              }
            });
          });

};

/**
 * Elimina los permisos de ingreso (hashes) que por algun motivo no fueron
 * utilizados por los usuarios Por ejemplo porque el firewall del usuario le
 * esta bloqueando la IP del servidor.
 */
Mundo.prototype.eliminarPersmisosViejos = function() {

  this.mysql
          .getConnection(function(err, connection) {

            // Intentamos obtener un personaje con ese usuario y clave.
            var consulta = 'DELETE FROM loginserver_permisos WHERE FECHA < (NOW() - INTERVAL '
                    + VALIDEZ_HASH + ' SECOND)';

            connection.query(consulta, function(err, rows) {

              connection.release(); // Liberamos la conexion

              if (err !== null) {
                log.warn("Error al ejecutar la query: " + consulta);
                log.info(err);
              } else {
                log.info("Borrados permisos viejos.");
              }
            });
          });

};

Mundo.prototype.validarDatosAuth = function(nombre, password, callback) {

  this.mysql.getConnection(function(err, connection) {

    if (err !== null) {
      log.info("Error al solicitar una slot en mysql");
      callback(null, null);
    }
    
    // Intentamos obtener un personaje con ese usuario y clave.
    var consulta = 'SELECT ID, IDCUENTA, ONLINE FROM usuarios WHERE NickB='
            + connection.escape(nombre) + ' AND PasswordB='
            + connection.escape(password);

    connection.query(consulta, function(err, rows) {

      // Liberamos la conexion
      connection.release();

      if (err === null) {
        // Existe el personaje?
        if (rows.length === 1) {
          // 
          var resultado = {
            online: (rows[0].ONLINE == 1 ? true : false),
            idcuenta: rows[0].IDCUENTA,
            id: rows[0].ID,
          };

          callback(null, resultado);
        } else {
          callback(null, null);
        }
      } else {
        log.info("Error al ejecutar la query: " + consulta);
        callback(null, null);
      }
    });
  });

};

Mundo.prototype.inicar = function(callback) {
  // Nos conectamos a la base de datos
  this.mysql = mysql.createPool(this.mysqlconf);

  var mundo = this;
  // ¿Como probamos que se inicio correctamente?
  this.mysql.getConnection(function(err, connection) {
    if (err === null) {

      connection.query("SET SQL_SAFE_UPDATES=0", function(err, rows) {
        connection.release();
        setInterval(mundo.eliminarPersmisosViejos.bind(mundo), LIMPIEZA_HASH * 1000);
      });

      callback(null);
    } else {
      log.fatal("No se pudo conectar a la base de datos del Mundo.");
      log.fatal(err.message);

      callback(true);
    }
  });
};

Mundo.prototype.agregarLoginServer = function(loginServer) {
  // Nos conectamos a la base de datos
  // Engancho los eventos
  loginServer.on("connect", this.conectadoLogin.bind(this));
  loginServer.on("close", this.desconectaLogin.bind(this));

  this.logins.push(loginServer);

  this.conectarALoginServer(loginServer);
};

/** ************************************************* */
/** ************************************************* */
/** ************************************************* */
Mundo.prototype.conectadoLogin = function(loginServer) {
  loginServer.saludar(this);
};

Mundo.prototype.desconectaLogin = function(loginServer) {
  log.info("Se desconecta login server...");
  // Si ya tengo activado el timer, no lo vuelvo a activar
  if (this.idTimerReConectarLogins == 0)
    this.idTimerReConectarLogins = setInterval(
            this.reConectarLogins.bind(this), INTERVALO_RECONEXION);
};

Mundo.prototype.conectarALoginServer = function(loginServer) {
  log.info("Intentando conectar...");
  loginServer.conectar();
};

Mundo.prototype.reConectarLogins = function() {
  var algunoDesconectado = false;

  // Recorremos los logins buscando los desconectados
  for ( var i = 0; i < this.logins.length; ++i) {
    algunoDesconectado = true;
    if (!this.logins[i].estaConectado())
      this.conectarALoginServer(this.logins[i]);
  }

  // Si todos los logins servers estan conectados, cancelo el timer
  if (!algunoDesconectado) {
    clearInterval(this.idTimerReConectarLogins);
    this.idTimerReConectarLogins = 0;
  }

};
module.exports = Mundo;
