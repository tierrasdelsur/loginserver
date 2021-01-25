var util = require('util');
var net = require('net');

var MiUtil = require('../Comun/Util');
var Firewall = require('../Comun/Firewall');
var Cliente = require('./Cliente');

const
INTERVALO_RECONEXION = 60000; // En milisegundos (60 segundos)
VENCIMIENTO_HASH = 4; // En segundos.
INTERVALO_AVISO_CARGA = 120; // En segundos. Cada cuanto se le avisa a los
// logins servers la carga del nodo
INTERVALO_BORRAR_HASHES = 600; // En segundos, cada cuanto se limpia la tabla
// de hashes hailitados

function Nodo(config) {
  this.logins = [];
  this.idTimerReConectarLogins = 0;
  this.idTimerAvisarCarga = 0;

  this.hashesHabilitados = {}; // HASH, IP

  var fabrica = require('../Comun/FabricaFirewall');
  this.firewall = fabrica.obtenerFirewall();

  this.id = config.id;
  this.nombre = config.nombre;
  this.mundoTransmision = config.mundo.id;
  this.mundoTransmisionIP = config.mundo.ip;
  this.mundoTransmisionPuerto = config.mundo.puerto;

  this.nivelrequerido = config.nivelrequerido;
  // Comunidades que pueden conectarse
  this.comunidades = config.comunidades;
  //
  this.maximaCantidadUsuarios = config.maximaCantidadUsuarios;
  this.prioridad = config.prioridad;
  //
  this.ip = MiUtil.ipv4ToInt(config.ip_publica);
  this.ip_privada = MiUtil.ipv4ToInt(config.ip_privada);

  this.puerto = config.puerto;
  // Variables de estado
  this.cantidadUsuariosConectados = 0;

  //
  this.clientes = [];
  this.slotLibres = [];

  this.tcp = null;
};

Nodo.prototype.obtenerSlotCliente = function(socketCliente, nodo) {

  var cliente = null;
  var nslot = -1;

  // Atencion. Doy un 20% mas de users por las dudas de que no se actualice
  // rapido la cantidad de users en el loginserver

  // Obtengo un slot libre para atentender al cliente
  if (this.slotLibres.length > 0) {
    nslot = this.slotLibres.pop();
  } else if (this.clientes.length < (this.maximaCantidadUsuarios * 1.10)) {
    // Tenemos espacio para crear un cliente mas
    nslot = this.clientes.length;
  } else {
    // Avisamos YA que estamos recargados para que no nos mande más gente el
    // login
    this.informarCarga();
  }

  if (nslot !== -1) {
    cliente = new Cliente(nslot, socketCliente, nodo);
    this.clientes[nslot] = cliente;
  } else {
    log.warn("No hay más espacio para usuarios.");
    // TODO, Sino hay que le hago?
  }
};

Nodo.prototype.cierraCliente = function(cliente) {

  log.info("Libero el Slot: " + cliente.id);

  this.clientes[cliente.id] = null;
  this.slotLibres.push(cliente.id);
};

Nodo.prototype.obtenerMundoIP = function() {
  return this.mundoTransmisionIP;
};

Nodo.prototype.obtenerMundoPuerto = function() {
  return this.mundoTransmisionPuerto;
};

Nodo.prototype.permitirIngresoPersona = function(hash, desdeIP, haciaIP,
        haciaPuerto, callback) {

  // Agrego el HASH a la lista de Hashes habilitados
  var registro = {
    ip: desdeIP,
    fecha: MiUtil.obtenerTimeStamp()
  };

  this.hashesHabilitados[hash] = registro;

  // Le doy de alta en el firewall
  this.firewall
          .permitirIngreso(desdeIP, this.ip_privada, haciaPuerto, callback);
};

Nodo.prototype.agregarLoginServer = function(loginServer) {

  // Engancho los eventos
  loginServer.on("connect", this.conectadoLogin.bind(this));
  loginServer.on("close", this.desconectaLogin.bind(this));

  this.logins.push(loginServer);

  this.conectarALoginServer(loginServer);
};

Nodo.prototype.cerrar = function() {
};

Nodo.prototype.esHashValido = function(hash, ip_nodo, ip_usuario) {

  // / Verifico que el hash exista, sea para esta IP y no este vencido.
  var registro = this.hashesHabilitados[hash];

  if (typeof registro != 'undefined') {

    // TODO. Momentaneamente sacamos la comprobacion de la IP
    // hasta solucionar el problema de deteccion de IP
    // en los usuarios que tienen un proveedor de internet que los proxea.
    /*
     * if (registro.ip == ip_usuario && (MiUtil.obtenerTimeStamp() -
     * registro.fecha <= VENCIMIENTO_HASH)) {
     */

    if (MiUtil.obtenerTimeStamp() - registro.fecha <= VENCIMIENTO_HASH) {

      this.hashesHabilitados[hash] = null;

      return true;
    }
  }
  return false;

};

Nodo.prototype.eliminarHashesVencidos = function() {

  // El ultimo momento en donde el hash pudo ser generado para ser valido
  // todavia
  var tiempo = MiUtil.obtenerTimeStamp() - VENCIMIENTO_HASH;

  for ( var key in this.hashesHabilitados) {

    if (this.hashesHabilitados[key] === null) {
      delete (this.hashesHabilitados[key]);
    } else if (this.hashesHabilitados[key].fecha < tiempo) {
      this.hashesHabilitados[key] = null;
      delete (this.hashesHabilitados[key]);
    }
  }

  log.info("Borre hashes viejos.");
};

Nodo.prototype.iniciar = function() {

  var nodo = this;

  this.tcp = net.createServer(

  // Escuchador de nuevas conexiones
  function(socketCliente) {

    if (socketCliente != null) {
      if (socketCliente.remoteAddress == null) {
        log.info('Cliente conecta desde ip nula');
        // Salta el evento LISTEN cuando el socket ya esta muerto, CUACK!
        // socketCliente.end();
        socketCliente.unref(); //TODO probando si esto evita el error del onread
      } else {
        log.info('Nuevo cliente IP:'
                + socketCliente.remoteAddress);

        nodo.obtenerSlotCliente(socketCliente, nodo);
      }
    } else {
      log.info("Socket ciente es nulo o undefined ni bien se conecta!");
    }
  });

  /** ********************************* */
  // Ponemos el servidor a la escucha
  this.tcp.listen(this.puerto, MiUtil.intToIpv4(this.ip_privada), function() { // 'listening'
    // listener
    log.info('Escuchando Clientes en (IP: ' + this.address().address
            + ', puerto:' + this.address().port + ')');
  });

  // Activamos el timer que informa la carga
  this.idTimerAvisarCarga = setInterval(this.informarCarga.bind(this),
          INTERVALO_AVISO_CARGA * 1000);

  // Cron que borra los hashes viejos.
  this.idTimerHashes = setInterval(this.eliminarHashesVencidos.bind(this),
          INTERVALO_BORRAR_HASHES * 1000);
};

/** ******************************************************** */
/** *********** METODOS PRIVADO **************************** */

/** LoginServer */
Nodo.prototype.conectadoLogin = function(loginServer) {
  loginServer.saludar(this);
};

Nodo.prototype.informarCarga = function() {

  // Recorremos todos los logins servers avisando
  for ( var loopLogin = 0; loopLogin < this.logins.length; ++loopLogin) {
    // Si esta conectado...
    if (this.logins[loopLogin].estaConectado())
      this.logins[loopLogin].informarCarga(this.cantidadUsuariosConectados);
  }

};

Nodo.prototype.desconectaLogin = function(loginServer) {
  log.info("Se desconecta login server...");
  // Si ya tengo activado el timer, no lo vuelvo a activar
  if (this.idTimerReConectarLogins == 0)
    this.idTimerReConectarLogins = setInterval(
            this.reConectarLogins.bind(this), INTERVALO_RECONEXION);
};

Nodo.prototype.conectarALoginServer = function(loginServer) {
  log.info("Intentando conectar al LS " + loginServer.obtenerIP() + ":"
          + loginServer.obtenerPuerto() + "...");

  loginServer.conectar();
};

Nodo.prototype.reConectarLogins = function() {
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

/** ******************************************************** */
/** ***************** EXPORTS ****************************** */
module.exports = Nodo;
