/**
 * Este modulo es una interface de comunicacion con el Mundo real del juego.
 */
var events = require('events');

var EmpaquetadorIN = require('../Comun/EmpaquetadorIN.js');
var EmpaquetadorOUT = require('../Comun/EmpaquetadorOUT.js');
var SolicitudesSocket = require('../Comun/SolicitudesManager.js');

var ProtoEntrada = require('../ComunServerNodo/ProtocoloNTL.js');
var ProtoSalida = require('../ComunServerNodo/ProtocoloLTN.js');

const
INTERVALO_KEEP_ALIVE = 2000; // Cada cuantos ms se chequea que el NODO
// responda.

function Nodo() {
    this.socket = null;
    this.bufferEntrada = new EmpaquetadorIN(1021);
    this.bufferSalida = new EmpaquetadorOUT(1024);
    this.solicitudesPendiente = new SolicitudesSocket();
    // Caracteristicas de NODO
    this.id = 0;
    this.usuariosConectados = 0;
    this.usuariosMaximo = 0;
    this.prioridadAsignacion = 0;

    this.mundoTransmision = 0;
    this.nivelcuentaminimo = 0; // Para acceder al NODO
    this.comunidadesAceptadas = []; // Comunidades BGP que pueden conectarse al

    // Lista de ips y puertos en donde le nodo atiende a los usuarios
    this.ip = 0;
    this.puerto = 0;

    this.conectado = false;

    events.EventEmitter.call(this);
};

Nodo.prototype.__proto__ = events.EventEmitter.prototype;

/**
 * Devuelve una dirección ip que no se encuentre en ipsExcluidas
 */
Nodo.prototype.obtenerIP = function(ipsExcluidas) {
    // Obtengo una direccion IP al azar de las disponibles
    return this.ip;
};

Nodo.prototype.estaConectado = function() {
    return this.conectado;
};

/**
 * @param ips
 *                Array con direcciones ips
 * @return Bool Devuelve TRUE si el Nodo tiene alguna direccion IP distinta a
 *         las que recibe por parametro
 */
Nodo.prototype.tieneIPDistintas = function(ips) {
    // TODO Obtengo una direccion IP al azar de las disponibles
    return (ips.indexOf(this.ip) === -1);
};

Nodo.prototype.obtenerPuerto = function() {
    // TODO Esto deberia devolverse junto a la ip
    // Obtengo un puerto al azar de las disponibles
    // var puerto = Math.floor((Math.random() * this.puerto.length));
    // return this.puerto[puerto];
    return this.puerto;
};

Nodo.prototype.esNivelSuficiente = function(nivel) {

    return (this.nivelcuentaminimo <= nivel);
};

/**
 * Indica si una comunidad BGP puede acceder o no al nodo.
 * 
 * @param idcomunidad:
 *                comunidad a verificar.
 * @returns {Boolean}: True si la comunidad puede acceder, False de lo
 *          contrario.
 */
Nodo.prototype.esComunidadCompatible = function(idcomunidad) {

    // Sino especifica ninguna comunidad, es permitida para todas.
    if (this.comunidadesAceptadas.length === 0)
	return true;

    // ¿Esta la comunidad solicitada?
    if (this.comunidadesAceptadas.indexOf(idcomunidad) >= 0)
	return true;

    // Ups.. Este nodo no acepta esta comunidad
    return false;
};

/**
 * Indica si el nodo alcanzo su capacidad maxima y no puede seguir atendiendo
 * clientes.
 * 
 * @returns {Boolean} True si lo esta, false de lo contrario
 */
Nodo.prototype.estaSaturado = function() {
    return (this.usuariosConectados >= this.usuariosMaximo);
};

Nodo.prototype.obtenerPrioridad = function() {
    return this.prioridadAsignacion;
};

/**
 * Compara la carga entre dos nodos.
 * 
 * @param otroNodo
 *                El nodo con el que se quiere comparar el actual.
 * @returns {Number} Devuelve -1, 0 o 1 dependiendo si el nodo actual tiene una
 *          menor, igual o mayor carga que otroNodo.
 */
Nodo.prototype.compararCarga = function(otroNodo) {

    // Le sumo 1 para el caso del 0%. Se pone adelante el que mas capacidad
    // tiene
    var carga1 = (this.usuariosConectados + 1) / this.usuariosMaximo;
    var carga2 = (otroNodo.usuariosConectados + 1) / otroNodo.usuariosMaximo;

    if (carga1 === carga2)
	return 0;

    return ((carga1 > carga2) ? 1 : -1);
};

Nodo.prototype.compararPrioridad = function(otroNodo) {

    if (this.prioridadAsignacion == otroNodo.prioridadAsignacion)
	return 0;

    return ((this.prioridadAsignacion > otroNodo.prioridadAsignacion) ? 1 : -1);
};

Nodo.prototype.informarIngresoUsuario = function(hash, desdeIP, haciaIP,
	haciaPuerto, callback) {

    // Obtenemos una solicitud
    var idsolicitud = this.solicitudesPendiente.almacenarFuncion(callback);

    log.info("Informo ingreso bajo la solictud de nodo:" + idsolicitud);
    // Creamos el paquete correspondiente
    this.bufferSalida.nuevoPaquete();
    this.bufferSalida.writeUInt16(idsolicitud); // ID de solicitud
    this.bufferSalida.writeUInt8(ProtoSalida.AVISARINGRESO);
    this.bufferSalida.writeString(hash);
    this.bufferSalida.writeUInt32(desdeIP);
    this.bufferSalida.writeUInt32(haciaIP);
    this.bufferSalida.writeUInt16(haciaPuerto);

    this.bufferSalida.cerrarPaquete();
    // Enviamos
    this.socket.write(this.bufferSalida.getBuffer());

    log.info("Informe ingreso bajo la solictud de nodo:" + idsolicitud);
    return;
};

/** ****************************************************** */
/* FUNCIONES PARA PROCESAR LAS ACCIONES */

function procesarPaquete(nodo) {

    var numeroPaquete;
    var idsolicitud;
    var callback = null;

    // Descartamos la longitud del paquete
    nodo.bufferEntrada.readUInt8();

    idsolicitud = nodo.bufferEntrada.readUInt16();
    numeroPaquete = nodo.bufferEntrada.readUInt8();

    // Si el paquete viene a responder una solicitud, obtengo el callback
    // correspondientes
    if (idsolicitud > 0)
	callback = nodo.solicitudesPendiente.obtenerFuncion(idsolicitud);

    switch (numeroPaquete) {
    /** *********************** */
    case ProtoEntrada.IDENTIFICACION:
	nodo.id = nodo.bufferEntrada.readUInt8();
	nodo.nombre = nodo.bufferEntrada.readString();
	nodo.mundoTransmision = nodo.bufferEntrada.readUInt8();
	nodo.nivelcuentaminimo = nodo.bufferEntrada.readUInt8();
	nodo.prioridadAsignacion = nodo.bufferEntrada.readUInt8();
	nodo.usuariosMaximo = nodo.bufferEntrada.readUInt16();
	nodo.usuariosConectados = nodo.bufferEntrada.readUInt16();

	var cantidadComunidades = nodo.bufferEntrada.readUInt8();

	for (var i = 0; i < cantidadComunidades; ++i) {
	    var idComunidad = nodo.bufferEntrada.readUInt8();

	    nodo.comunidadesAceptadas.push(idComunidad);
	}

	// Lee los puertos en los cuales esta atendiendo usuario el nodo.
	/*
	 * var cantidadDirectivas = nodo.bufferEntrada.readUInt8();
	 * 
	 * var i = 0; var piso = 0; var techo = 0; var puerto = 0; do { // Leo
	 * el rango de puertos piso = nodo.bufferEntrada.readUInt16(); techo =
	 * nodo.bufferEntrada.readUInt16(); i = i + 2; for (puerto = piso;
	 * puerto <= techo; ++puerto) nodo.puerto.push(puerto); } while (i <
	 * cantidadDirectivas);
	 */

	nodo.puerto = nodo.bufferEntrada.readUInt16();
	nodo.ip = nodo.bufferEntrada.readUInt32();

	log.info("Soy un Nodo  y me inicio con (" + nodo.id + ") "
		+ nodo.nombre);

	nodo.conectado = true;
	nodo.emit('conectado', nodo);
	break;
    case ProtoEntrada.AVISARINGRESO:
	var ok = nodo.bufferEntrada.readBool();

	log.info("Nodo me respondio para solicitud:" + idsolicitud);
	callback(null, ok);
	break;
    case ProtoEntrada.INFORMARCARGA:
	var carga = nodo.bufferEntrada.readUInt16();

	nodo.usuariosConectados = carga;

	log.info("Carga actual del nodo " + nodo.nombre + ": " + carga);
	break;
    default:
	log.error("Llego un paquete del Nodo indefinido:" + numeroPaquete);
	break;
    }
    ;

};

Nodo.prototype.setSocket = function(socket) {
    this.socket = socket;
    this.socket.setKeepAlive(true, INTERVALO_KEEP_ALIVE);

    socket.nodo = this;
    // Enganchamos los eventos
    this.socket.on('close', function() {

	var estabaConectado = this.nodo.conectado;

	this.conectado = false;
	// lo saludo yo tb
	socket.end();
	/*
	 * Todas las solicitudes que estaban esperando ser respondidas..
	 * perdieron. Las devuelvo con parametor de error activado en true
	 */
	socket.nodo.solicitudesPendiente.cancelar([ true, null ]);

	// Si no se llego a conectar no avisamos que se desconecto
	socket.nodo.emit('desconecta', this.nodo, estabaConectado);
    });

    this.socket.on('error', function(e) {
	log.warn("Error en socket del nodo " + this.nodo.id);
    });

    // Recibimos informacion en un buffer (no se puede estar seguro
    // que toda la info llegue en el mismo trozo)
    this.socket.on('data', function(mensaje) {

	var nodo = socket.nodo;

	nodo.procesarInformacion(mensaje);
    });
};

Nodo.prototype.procesarInformacion = function(mensaje) {
    this.bufferEntrada.agregar(mensaje);

    // Hay un paquete cargado?
    while (this.bufferEntrada.alMenosUnPaquete()) {
	procesarPaquete(this);
    }
};

module.exports = Nodo;