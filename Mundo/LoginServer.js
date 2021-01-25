var net = require('net');
var events = require('events');

var EmpaquetadorIN = require('../Comun/EmpaquetadorIN.js');
var EmpaquetadorOUT = require('../Comun/EmpaquetadorOUT.js');
var ProtoSalida = require("../ComunServerMundo/ProtocoloMTL.js");
var ProtoEntrada = require("../ComunServerMundo/ProtocoloLTM.js");

const
INTERVALO_KEEP_ALIVE = 10000; // Cada cuantos ms se chequea que el LoginServer
// responda.

function LoginServer(conf) {

  this.nombre = conf.nombre;
  this.ip = conf.ip;
  this.puerto = conf.puerto;

  this.conectado = false;

  this.bufferEntrada = new EmpaquetadorIN(8189);
  this.bufferSalida = new EmpaquetadorOUT();

  // Para la conexion con el LoginServer
  this.tcp = null;
  // El mundo real
  this.mundo = null;

  // Llamo al super contructor
  events.EventEmitter.call(this);
};

LoginServer.prototype.__proto__ = events.EventEmitter.prototype;

LoginServer.prototype.saludar = function(mundo) {
  // hola
  this.mundo = mundo;
  // Le indico quien soy
  log.info("Me conecto a " + this.tcp.remoteAddress + ":" + this.tcp.remotePort
          + " desde " + this.tcp.localAddress + ":" + this.tcp.localPort);

  log.info("Saludo al LoginServer");

  this.bufferSalida.nuevoPaquete();
  this.bufferSalida.writeUInt16(0);
  this.bufferSalida.writeUInt8(ProtoSalida.IDENTIFICACION);
  this.bufferSalida.writeUInt8(mundo.id);
  this.bufferSalida.writeString(mundo.nombre);
  this.bufferSalida.writeBool(mundo.esPremium);
  this.bufferSalida.writeString(mundo.md5);

  this.bufferSalida.cerrarPaquete();

  this.tcp.write(this.bufferSalida.getBuffer());
};

LoginServer.prototype.procesarMensaje = function(mensaje) {
  this.bufferEntrada.agregar(mensaje);

  // Hay un paquete cargado?
  while (this.bufferEntrada.alMenosUnPaquete()) {
    this.procesarPaquete();
  }
};

LoginServer.prototype.procesarVALIDUSERPASS = function(idsolicitud) {
  var nombrepersonaje = this.bufferEntrada.readString();
  var passwordpersonaje = this.bufferEntrada.readString();

  log.info("Solicitud " + idsolicitud + ":Me piden validar: " + nombrepersonaje
          + " con password " + passwordpersonaje);

  this.mundo.validarDatosAuth(nombrepersonaje, passwordpersonaje, function(err,
          resultado) {

    // Creamos el paquete
    this.bufferSalida.nuevoPaquete();
    // Para contestar esta solicitud...
    this.bufferSalida.writeUInt16(idsolicitud);
    this.bufferSalida.writeUInt8(ProtoSalida.VALIDUSERPASS);

    // Hay error o el personaje no existe
    if (resultado === null || err !== null) {
      this.bufferSalida.writeBool(false);
    } else {
      this.bufferSalida.writeBool(true);
      this.bufferSalida.writeBool(resultado.online);
      this.bufferSalida.writeUInt32(resultado.idcuenta);
      this.bufferSalida.writeUInt32(resultado.id);
    }

    this.bufferSalida.cerrarPaquete();

    // Enviamos
    this.tcp.write(this.bufferSalida.getBuffer());

  }.bind(this));
};

LoginServer.prototype.procesarINFORMARINGRESO = function(idsolicitud) {

  var tipo = this.bufferEntrada.readUInt8();
  var hash = this.bufferEntrada.readString();
  var ip = this.bufferEntrada.readUInt32();
  var macaddress = this.bufferEntrada.readString();
  var nombre_pc = this.bufferEntrada.readString();
  var semilla = this.bufferEntrada.readUInt8();

  log.info("Solicitud " + idsolicitud + ":" + " " + tipo + "-" + hash + "-"
          + ip + "-" + macaddress + "-" + nombre_pc + "-" + semilla + ".");

  var idpersonaje = null;
  var nombrepersonaje = null;
  var password = null;

  if (tipo == 1) {
    idpersonaje = this.bufferEntrada.readUInt32();
    nombrepersonaje = this.bufferEntrada.readString();
    password = this.bufferEntrada.readString();

    log.info("Solicitud " + idsolicitud + ":" + " " + idpersonaje + "-"
            + nombrepersonaje + "-" + password + ".");
  }

  this.mundo.permitirIngreso(hash, ip, macaddress, nombre_pc, semilla,
          idpersonaje, nombrepersonaje, password, function(err, resultado) {

            // Creamos el paquete
            this.bufferSalida.nuevoPaquete();
            // Para contestar esta solicitud...
            this.bufferSalida.writeUInt16(idsolicitud);
            this.bufferSalida.writeUInt8(ProtoSalida.VALIDUSERINGRESO);

            // Hay error o el personaje no existe
            if (resultado === null || err !== null) {
              this.bufferSalida.writeBool(false);
            } else {
              this.bufferSalida.writeBool(resultado);
            }

            this.bufferSalida.cerrarPaquete();

            // Enviamos
            this.tcp.write(this.bufferSalida.getBuffer());

          }.bind(this));
};

LoginServer.prototype.procesarPaquete = function(mensaje) {
  // Descartamos la longitud del paquete
  this.bufferEntrada.readUInt8();

  var idsolicitud = this.bufferEntrada.readUInt16();
  var numeroPaquete = this.bufferEntrada.readUInt8();

  log.info("Solicitud " + idsolicitud + ".");

  switch (numeroPaquete) {

  case ProtoEntrada.VALIDUSERPASS:
    // ¿Es valido el user / password?
    this.procesarVALIDUSERPASS(idsolicitud);
    break;
  case ProtoEntrada.AVISARINGRESO:
    this.procesarINFORMARINGRESO(idsolicitud);
    break;
  default:
    throw new Error("Llego un paquete indefinido. Numero:" + numeroPaquete);
  }
};

LoginServer.prototype.conectar = function(callback) {
  // Creamos el socket
  this.tcp = net.Socket();

  this.tcp.server = this;

  this.tcp.on('connect', function() {
    this.server.conectado = true;
    this.server.emit("close", this.server);
  });

  this.tcp.on("data", function(data) {
    this.server.procesarMensaje(data);
  });

  this.tcp.on("close", function(had_error) {
    this.server.conectado = false;
    this.server.emit("close", this.server);
  });

  this.tcp.on("error", function(error) {
    log.info("Error");
  });

  // Nos conectamos
  this.tcp.connect(this.puerto, this.ip, function() {
    // Keep alive para que mantenga la conexion activa
    // y detecte si se cae el LoginServer
    this.setKeepAlive(true, INTERVALO_KEEP_ALIVE);
    this.server.emit("connect", this.server);
  });
};

LoginServer.prototype.estaConectado = function() {
  return this.conectado;
};

module.exports = LoginServer;