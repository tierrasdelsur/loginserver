/*
 * Este modulo es una interface de comunicacion con el Mundo real del juego.
 */
var events = require('events');

var EmpaquetadorIN = require('../Comun/EmpaquetadorIN.js');
var EmpaquetadorOUT = require('../Comun/EmpaquetadorOUT.js');
var SolicitudesSocket = require('../Comun/SolicitudesManager.js');

var ProtoEntrada = require('../ComunServerMundo/ProtocoloMTL.js');
var ProtoSalida = require('../ComunServerMundo/ProtocoloLTM.js');

const INTERVALO_KEEP_ALIVE = 2000; // Cada cuantos ms se chequea que el NODO responda.

function Mundo() {
  this.id = 0;
  this.socket = null;
  this.bufferEntrada = new EmpaquetadorIN(1021);
  this.bufferSalida = new EmpaquetadorOUT(4096);
  this.solicitudesPendiente = new SolicitudesSocket();
  this.soloPremium = false; // ¿Solo pueden acceder usuarios premium al mundo?
  this.md5 = "";
  
  events.EventEmitter.call(this);
}

// Destructor (?)
function cerrar() {
  this.solicitudesPendiente.cerrar();
  this.socket = null;
  this.bufferEntrada = null;
  this.bufferSalida = null;
  this.solicitudesPendiente = null;
}

Mundo.prototype.__proto__ = events.EventEmitter.prototype;

function esValidoNombrePersonaje(nombre) {
  // Caracteres permitidos. Aa..Zz y espacios excepto al principio y al final

  return (/^[A-Za-z ]*$/.test(nombre));
  // TODO, faltaria chequear los personajes que tienen doble espacio
  // pero todavia hay personajes que tienen dos espacios, aunque no se puedan
  // crear nuevos. Maximo y minimo de caracteres
  // TODO no permitir espacio adelante ni al final,
}

function esValidoPasswordPersonaje(password) {
  return (/^[a-z0-9]*$/.test(password));
}




function procesarPaquete(mundo) {

  var numeroPaquete;
  var idsolicitud;
  var callback = null;

  // Descartamos la longitud del paquete
  mundo.bufferEntrada.readUInt8();

  idsolicitud = mundo.bufferEntrada.readUInt16();
  numeroPaquete = mundo.bufferEntrada.readUInt8();

  // Si el paquete viene a responder una solicitud, obtengo el callback
  // correspondientes
  if (idsolicitud > 0)
    callback = mundo.solicitudesPendiente.obtenerFuncion(idsolicitud);

  switch (numeroPaquete) {
  /** *********************** */
  case ProtoEntrada.IDENTIFICACION:
    mundo.id = mundo.bufferEntrada.readUInt8();
    mundo.nombre = mundo.bufferEntrada.readString();
    mundo.soloPremium = mundo.bufferEntrada.readBool();
    mundo.md5 = mundo.bufferEntrada.readString();

    log.info("Soy un Mundo y me inicio con (" + mundo.id + ") " + mundo.nombre);

    mundo.emit('conecta', mundo);
    break;
  /** *********************** */
  case ProtoEntrada.VALIDUSERPASS:

    var existe = mundo.bufferEntrada.readBool();

    if (existe) {
      var info = {
        online: mundo.bufferEntrada.readBool(),
        idcuenta: mundo.bufferEntrada.readUInt32(),
        id: mundo.bufferEntrada.readUInt32()
      };

      callback(null, info);

    } else {
      callback(null, null);
    }

    break;
  /** *********************** */
  case ProtoEntrada.VALIDUSERINGRESO:
    // La persona que le avisamos, puede loguear ¿no?
    var ok = mundo.bufferEntrada.readBool();

    callback(null, ok);

    break;
  default:
    log.error("Llego un paquete del Mundo indefinido:" + numeroPaquete);
    break;
  }

};

Mundo.prototype.procesarInformacion = function(mensaje) {
  this.bufferEntrada.agregar(mensaje);

  // Hay un paquete cargado?
  while (this.bufferEntrada.alMenosUnPaquete()) {
    procesarPaquete(this);
  }
};

/** ******************************************************** */
/** ************ METODOS PUBLICOS ************************** */
Mundo.prototype.esClienteValido = function(hashEjecutable) {
  return (this.md5 === hashEjecutable);
};

Mundo.prototype.setSocket = function(socket) {
  this.socket = socket;
  this.socket.setKeepAlive(true, INTERVALO_KEEP_ALIVE);
  
  this.socket.mundo = this;

  // Enganchamos los eventos
  this.socket.on('close', function() {
    this.end(); // Chau...
    /*
     * Todas las solicitudes que estaban esperando ser respondidas.. perdieron.
     * Las devuelvo con parametor de error activado en true
     */
    this.mundo.solicitudesPendiente.cancelar([true, null]);
    // Emitimos que nos desconectamos
    this.mundo.emit('desconecta', this.mundo);
  });

  this.socket.on('error', function(e) {
    log.warn("Error en socket del mundo " + this.mundo.id);
  });

  // Recibimos informacion en un buffer (no se puede estar seguro
  // que toda la info llegue en el mismo trozo)
  this.socket.on('data', function(mensaje) {
    var mundo = this.mundo;

    mundo.procesarInformacion(mensaje);
  });
};

Mundo.prototype.informarIngresoPersonaje = function(idpersonaje,
        nombrepersonaje, password, hash, ip, macaddress, nombre_pc, semilla, callback) {

  // Obtenemos una solicitud
  var idsolicitud = this.solicitudesPendiente.almacenarFuncion(callback);

  var tipo = 0;

  if (idpersonaje !== null && nombrepersonaje !== null && password !== null) {
    tipo = 1;
  } else {
    tipo = 2;
  }

  // Creamos el paquete correspondiente
  this.bufferSalida.nuevoPaquete();
  this.bufferSalida.writeUInt16(idsolicitud); // ID de solicitud
  this.bufferSalida.writeUInt8(ProtoSalida.AVISARINGRESO);
  this.bufferSalida.writeUInt8(tipo); // Ingreso PJ
  this.bufferSalida.writeString(hash);
  this.bufferSalida.writeUInt32(ip);
  this.bufferSalida.writeString(macaddress);
  this.bufferSalida.writeString(nombre_pc);
  this.bufferSalida.writeUInt8(semilla);

  if (tipo === 1) {
    this.bufferSalida.writeUInt32(idpersonaje);
    this.bufferSalida.writeString(nombrepersonaje);
    this.bufferSalida.writeString(password);
  }

  this.bufferSalida.cerrarPaquete();
  // Enviamos
  this.socket.write(this.bufferSalida.getBuffer());

  return;
};

/*
 * Hago la consulta al mundo para saber si el usuario y password son correctos,
 * ya no esta online y obtener el ID de la cuenta callback(err, info)
 */
Mundo.prototype.validarDatosAuth = function(nombre, password, callback) {

  // Validamos la estructura del nick y del password
  if (!esValidoNombrePersonaje(nombre)) {
    callback(null, null);
    return;
  }

  if (!esValidoPasswordPersonaje(password)) {
    callback(null, null);
    return;
  }

  // Obtenemos una solicitud
  var idsolicitud = this.solicitudesPendiente.almacenarFuncion(callback);

  // Creamos el paquete correspondiente
  this.bufferSalida.nuevoPaquete();
  this.bufferSalida.writeUInt16(idsolicitud); // ID de solicitud
  this.bufferSalida.writeUInt8(ProtoSalida.VALIDUSERPASS);
  this.bufferSalida.writeString(nombre);
  this.bufferSalida.writeString(password);
  this.bufferSalida.cerrarPaquete();
  // Enviamos
  this.socket.write(this.bufferSalida.getBuffer());

  return;
};

module.exports = Mundo;