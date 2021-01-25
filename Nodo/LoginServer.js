var net = require('net');
var events = require('events');

var MiUtil = require('../Comun/Util.js');
var EmpaquetadorIN = require('../Comun/EmpaquetadorIN.js');
var EmpaquetadorOUT = require('../Comun/EmpaquetadorOUT.js');
var ProtoSalida = require("../ComunServerNodo/ProtocoloNTL.js");
var ProtoEntrada = require("../ComunServerNodo/ProtocoloLTN.js");

const
INTERVALO_KEEP_ALIVE = 10000; // Cada cuantos ms se chequea que el LoginServer
// responda.

function LoginServer(config) {

  this.nombre = config.nombre;
  this.ip = config.ip;
  this.puerto = config.puerto;

  this.conectado = false;

  this.bufferEntrada = new EmpaquetadorIN(4093);
  this.bufferSalida = new EmpaquetadorOUT();

  // Para la conexion con el LoginServer
  this.tcp = null;

  this.nodo = null;

  events.EventEmitter.call(this);
};

LoginServer.prototype.__proto__ = events.EventEmitter.prototype;

LoginServer.prototype.saludar = function(nodo) {

  this.nodo = nodo;
  // Le indico quien soy
  log.info("Me conecto a " + this.tcp.remoteAddress + ":" + this.tcp.remotePort
          + " desde " + this.tcp.localAddress + ":" + this.tcp.localPort);

  log.info("Saludo al LoginServer");

  this.bufferSalida.nuevoPaquete();
  this.bufferSalida.writeUInt16(0);

  this.bufferSalida.writeUInt8(ProtoSalida.IDENTIFICACION);
  this.bufferSalida.writeUInt8(nodo.id);
  this.bufferSalida.writeString(nodo.nombre);
  this.bufferSalida.writeUInt8(nodo.mundoTransmision);
  this.bufferSalida.writeUInt8(nodo.nivelrequerido);
  this.bufferSalida.writeUInt8(nodo.prioridad);
  this.bufferSalida.writeUInt16(nodo.maximaCantidadUsuarios);
  // Carga actual
  this.bufferSalida.writeUInt16(nodo.cantidadUsuariosConectados);

  // Comunidades
  this.bufferSalida.writeUInt8(nodo.comunidades.length);

  for ( var i = 0; i < nodo.comunidades.length; ++i) {
    this.bufferSalida.writeUInt8(nodo.comunidades[i]);
  }

  /*****************************************************************************
   * Escucha en multiples puerto // Almaceno la cantidad de directivas de rangos
   * this.bufferSalida.writeUInt8(nodo.puerto.length); // Recorro la lista de
   * puertos for ( var i = 0; i < nodo.puerto.length; ++i) { // ¿Es un solo
   * puerto o un rango? if (typeof nodo.puerto[i] === 'object') { // Es un rango
   * this.bufferSalida.writeUInt16(puerto.base);
   * this.bufferSalida.writeUInt16(puerto.techo); } else { // Es solo un puerto
   * this.bufferSalida.writeUInt16(nodo.puerto);
   * this.bufferSalida.writeUInt16(nodo.puerto); } }
   */

  this.bufferSalida.writeUInt16(nodo.puerto);
  this.bufferSalida.writeUInt32(nodo.ip);

  this.bufferSalida.cerrarPaquete();

  this.tcp.write(this.bufferSalida.getBuffer());
};

LoginServer.prototype.estaConectado = function() {
  return this.conectado;
};

LoginServer.prototype.obtenerIP = function() {
  return this.ip;
};

LoginServer.prototype.obtenerPuerto = function() {
  return this.puerto;
};
/**
 * Le avisa al usuario cuantos jugadores estan conectados al Nodo.
 * 
 * @param carga:
 *          cantidad de usuarios conectados
 */
LoginServer.prototype.informarCarga = function(carga) {

  this.bufferSalida.nuevoPaquete();
  this.bufferSalida.writeUInt16(0);

  this.bufferSalida.writeUInt8(ProtoSalida.INFORMARCARGA);

  // Carga actual
  this.bufferSalida.writeUInt16(carga);

  this.bufferSalida.cerrarPaquete();

  this.tcp.write(this.bufferSalida.getBuffer());

  log.info("Informo a " + this.nombre + " una carga de " + carga);
};

LoginServer.prototype.procesarMensaje = function(mensaje) {
  this.bufferEntrada.agregar(mensaje);

  var proceso = false;
  // Hay un paquete cargado?
  while (this.bufferEntrada.alMenosUnPaquete()) {
    log.info("Proceso paquete");
    this.procesarPaquete();
    proceso = true;
  }

  if (!proceso) log.info("No procese ningun paquete.");
};

LoginServer.prototype.procesarINFORMARINGRESO = function(idsolicitud) {
  var hash = this.bufferEntrada.readString();
  var desdeIP = this.bufferEntrada.readUInt32();
  var haciaIP = this.bufferEntrada.readUInt32();
  var haciaPuerto = this.bufferEntrada.readUInt16();

  this.nodo.permitirIngresoPersona(hash, desdeIP, haciaIP, haciaPuerto,
          function(err, info) {
            log.info("Se permite el acceso desde la IP "
                    + MiUtil.intToIpv4(desdeIP) + " hacia la ip "
                    + MiUtil.intToIpv4(haciaIP) + ":" + haciaPuerto
                    + " utilizando el hash " + hash);

            // Le contestamos
            this.bufferSalida.nuevoPaquete();
            this.bufferSalida.writeUInt16(idsolicitud);
            this.bufferSalida.writeUInt8(ProtoSalida.AVISARINGRESO);
            this.bufferSalida.writeBool(info);
            this.bufferSalida.cerrarPaquete();

            this.tcp.write(this.bufferSalida.getBuffer());

          }.bind(this));
};

LoginServer.prototype.procesarPaquete = function(mensaje) {
  // Descartamos la longitud del paquete
  this.bufferEntrada.readUInt8();

  var idsolicitud = this.bufferEntrada.readUInt16();
  var numeroPaquete = this.bufferEntrada.readUInt8();

  switch (numeroPaquete) {
  case ProtoEntrada.AVISARINGRESO:
    this.procesarINFORMARINGRESO(idsolicitud);
    break;
  default:
    log.error("Llego un paquete indefinido. Numero:" + numeroPaquete);
  }
};

LoginServer.prototype.conectar = function() {
  // Limpiamos los buffers
  this.bufferEntrada.limpiar();
  this.bufferSalida.limpiar();

  // ¿Es conectar o re conectar?
  // Si ya tenemos un socket creado no lo volvemos a crear
  // ni a asignarle todos los eventos
  // Creamos el socket
  if (this.tcp !== null) {
    /*
     * this.tcp.unref(); this.tcp.destroy(); log.info("eliminado");
     */
  }

  this.tcp = net.Socket();

  this.tcp.server = this;

  this.tcp.on('connect', function() {
    this.server.conectado = true;
  });

  this.tcp.on("data", function(data) {
    this.server.procesarMensaje(data);
  });

  this.tcp.on("close", function(had_error) {
    this.server.conectado = false;
    this.server.emit("close", this.server);
  });

  this.tcp.on("error", function(error) {
    log.info("Error en el Socket conector al Login real" + error);
  });

  // Nos conectamos
  this.tcp.connect(this.puerto, this.ip, function() {
    // Keep alive para que mantenga la conexion activa
    // y detecte si se cae el LoginServer
    this.setKeepAlive(true, INTERVALO_KEEP_ALIVE);
    this.server.emit("connect", this.server);
  });

};

module.exports = LoginServer;