var net = require('net');
var util = require('util');
var async = require('async');

var Cliente = require('./Cliente');
var MiUtil = require('../Comun/Util');
var Mundos = require('./Mundos');
var Nodos = require('./Nodos');
var Solicitud = require('./SolicitudIngresoJuego');

// Razones rechazo:
const
CLAVE_USUARIO_INCORRECTO = 1;
PERSONAJE_ONLINE = 2;
MUNDO_INCORRECTO_OFFLINE = 6;
SIN_NODO_DISPONIBLE = 6;
CUENTA_BLOQUEADA = 5;
ERROR_GENERAL = 6;
// 7 NO TOCAR
JUEGO_DESACTUALIZADO = 8;
ERROR_FATAL = 120; // Genera un RunTimeError en el Cliente

const
INGRESO_NO_HABILITADO = 0;
INGRESO_HABILITADO = 1;

const
MAX_CANTIDAD_CLIENTES = 100;

const
PAQUETE_SOLICITUD_INGRESO = 1;

const
COMUNIDAD_BLOQUEADA = 16777215;

const
eLOGIN_PJ = 1;
eCREAR_PJ = 2;

/** ******************************************************** */
/** ************* METODOS PRIVADOS ************************* */
function makehash() {
    // TODO esto no es asi..
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 20; i++)
	text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function makeSemillaEncriptacion() {
    return Math.floor(Math.random() * 200);
}

function procesarSolicitudIngreso(cliente, server) {

    // Generamos la solicitud
    var solicitud = new Solicitud;
    var ipsExcluidas;
    var arrayIpsExcluidas;

    solicitud.id = cliente.numeroAtendido;
    solicitud.tipo = cliente.bufferEntrada.readUInt8();
    solicitud.idmundo = cliente.bufferEntrada.readUInt8();
    solicitud.ip = cliente.bufferEntrada.readUInt32();

    solicitud.macaddress = cliente.bufferEntrada.readString();
    solicitud.nombrepc = cliente.bufferEntrada.readString();
    solicitud.md5 = cliente.bufferEntrada.readString();

    ipsExcluidas = cliente.bufferEntrada.readString();

    solicitud.ipsExcluidas = [];

    // Convierto las IPS en un array de ints
    if (ipsExcluidas.length > 0) {
	arrayIpsExcluidas = ipsExcluidas.split(',');

	for (var i = 0; i < arrayIpsExcluidas.length; ++i)
	    solicitud.ipsExcluidas.push(MiUtil.ipv4ToInt(arrayIpsExcluidas[i]));
    }

    log.info(solicitud.ipsExcluidas);

    if (solicitud.tipo == eLOGIN_PJ) {
	solicitud.personaje.nick = cliente.bufferEntrada.readString();
	solicitud.personaje.password = cliente.bufferEntrada.readString();

	log.info("Cliente: " + cliente.numeroAtendido + " loguin "
		+ solicitud.personaje.nick + " IP "
		+ MiUtil.intToIpv4(solicitud.ip));
    } else {
	log.info("Cliente: " + cliente.numeroAtendido + " crear personaje. IP "
		+ MiUtil.intToIpv4(solicitud.ip));
    }

    server
	    .obtenerNodo(
		    solicitud,
		    function(err, info) {

			// ¿Que pasa si el cliente desloguea cuando esta
			// esperando
			// al respuesta del
			// login server?
			// Como se re usan los objetos, puede entrar otro
			// usuario en
			// su lugar. Por
			// eso chequeamos
			// el id.
			if (cliente.numeroAtendido === solicitud.id) {

			    cliente.bufferSalida.nuevoPaquete();

			    if (err == null) {
				if (info.habilitado === INGRESO_HABILITADO) {

				    cliente.bufferSalida
					    .writeUInt8(info.habilitado); // Habilitado
				    // para
				    // loguear?
				    cliente.bufferSalida.writeUInt32(info.ip);
				    cliente.bufferSalida
					    .writeUInt16(info.puerto);
				    cliente.bufferSalida.writeString(info.hash);
				    cliente.bufferSalida
					    .writeUInt8(info.semilla);

				} else { // No habilitado

				    if (info.razon === 6) {
					cliente.socket.end();
					console.log("cierro");
					return;
				    }
				    cliente.bufferSalida
					    .writeUInt8(info.habilitado);
				    cliente.bufferSalida.writeUInt8(info.razon);
				}
			    } else {
				// Error!!

				cliente.bufferSalida.writeUInt8(0);
				cliente.bufferSalida.writeUInt8(ERROR_GENERAL);
			    }

			    cliente.bufferSalida.cerrarPaquete();
			    cliente.socket.write(cliente.bufferSalida
				    .getBuffer());
			} else {
			    log
				    .error("Se termino de procesar la solicitud y cliente se fue antes."
					    + " Solicitud:" + solicitud.id);
			}
			solicitud = null;
		    });
}

function procesarPaquete(cliente) {

    var numeroPaquete;
    var server;

    server = cliente.server;

    // Descartamos la longitud del paquete
    cliente.bufferEntrada.readUInt8();

    numeroPaquete = cliente.bufferEntrada.readUInt8();

    switch (numeroPaquete) {

    case PAQUETE_SOLICITUD_INGRESO: // Usuario se quiere conectar al juego
	procesarSolicitudIngreso(cliente, server);
	break;
    default:
	log.error("Llego un paquete indefinido al servidor. Numero:"
		+ numeroPaquete);
    }
}

/**
 * Este metodo les pide al NODO y al MUNDO que dejen ingresar a una persona, la
 * cual va a hacer con un determinado HASH y desde una direccion IP, hacia un
 * Puerto e IP informado por el nodo.
 */
Servidor.prototype.informarIngreso = function(solicitud, callbackOriginal) {

    var mundo = null;
    var nodo = null;
    var idpersonaje = null;
    var nombrepersonaje = null;
    var password = null;

    if (solicitud.tipo === eLOGIN_PJ) {
	idpersonaje = solicitud.personaje.id;
	password = solicitud.personaje.password;
	nombrepersonaje = solicitud.personaje.nick;
    }

    nodo = this.nodos.obtenerNodo(solicitud.nodoatencion.idnodo);
    mundo = this.mundos.obtenerMundo(solicitud.idmundo);

    // ¿Tengo el nodo y el mundo?
    if (nodo === null || mundo === null) {
	var resultado = {
	    habilitado : INGRESO_NO_HABILITADO,
	    razon : ERROR_GENERAL,
	};
	callbackOriginal(null, resultado);
	return;
    }

    solicitud.nodoatencion.hash = makehash();

    solicitud.nodoatencion.semilla_encriptacion = makeSemillaEncriptacion();

    /* Informo al MUNDO/NODO quien se les va a conectar */
    async.parallel({
	aviso_mundo : function(callback) {
	    mundo.informarIngresoPersonaje(idpersonaje, nombrepersonaje,
		    password, solicitud.nodoatencion.hash, solicitud.ip,
		    solicitud.macaddress, solicitud.nombrepc,
		    solicitud.nodoatencion.semilla_encriptacion, callback);
	},

	aviso_nodo : function(callback) {
	    nodo.informarIngresoUsuario(solicitud.nodoatencion.hash,
		    solicitud.ip, solicitud.nodoatencion.ip,
		    solicitud.nodoatencion.puerto, callback);
	},

    }, function(err, results) {

	// Pincho por error?
	if (err !== null) {
	    var resultado = {
		habilitado : INGRESO_NO_HABILITADO,
		razon : ERROR_GENERAL,
	    };
	    callbackOriginal(null, resultado);
	    return;
	}

	// Genero la informacion para el usuario
	var resultado = {
	    habilitado : INGRESO_HABILITADO,
	    ip : solicitud.nodoatencion.ip,
	    puerto : solicitud.nodoatencion.puerto,
	    hash : solicitud.nodoatencion.hash,
	    semilla : solicitud.nodoatencion.semilla_encriptacion,
	};

	callbackOriginal(null, resultado);
	return;
    });
};

Servidor.prototype.asignacionNodo = function(solicitud, callbackOriginal) {

    // Ya le habia asignado un nodo a esta persona para esta ip y mundo?
    // NULL o NODO/IP/PUERTO.
    var anterior = this.nodos.obtenerNodoFlash(solicitud.ip, solicitud.idmundo);

    // Me fijo si la direccion ip no esta en la lista de exclusiones que
    // solicita esta persona

    if (anterior !== null && solicitud.ipsExcluidas.indexOf(anterior.ip) === -1) {

	solicitud.nodoatencion.idnodo = anterior.nodo;
	solicitud.nodoatencion.puerto = anterior.puerto;
	solicitud.nodoatencion.ip = anterior.ip;

	this.informarIngreso(solicitud, callbackOriginal);
    } else {
	// Obtenemos informacion de la Cuenta y de la IP
	async.parallel({
	    ip : function(callback) {
		this.geoip.getInfoIP(solicitud.ip, callback);
	    }.bind(this),
	    cuenta : function(callback) {
		this.cuentas.obtenerTipoCuenta(solicitud.idcuenta, callback);
	    }.bind(this),
	}, function(err, info) {

	    var comunidad;

	    if (info.ip !== null) {
		comunidad = info.ip.comunidad;

		log.info("Solicitud: " + solicitud.id + " Empresa "
			+ info.ip.empresa + " Comunidad " + comunidad);
	    } else {
		comunidad = 0;
		log.info("Solicitud: " + solicitud.id + " Empresa INDEFINIDA");
	    }

	    // ¿La ip pertenece a una comunidad bloqueada?
	    if (comunidad === 0
		    && !this.config.general.permitircomunidadindefinida) {
		var resultado = {
		    habilitado : INGRESO_NO_HABILITADO,
		    razon : SIN_NODO_DISPONIBLE,
		};

		callbackOriginal(null, resultado);
		return;
	    } else if (comunidad === COMUNIDAD_BLOQUEADA) {

		// Si la comunidad esta bloqueada es por algo grabe
		var resultado = {
		    habilitado : INGRESO_NO_HABILITADO,
		    razon : ERROR_FATAL,
		};

		callbackOriginal(null, resultado);
		return;
	    }

	    // Si la comunidad es indefinida (del exterior) y el nombre de la pc
	    // es
	    // KevinKevinHP
	    // entonces es dervet

	    if (comunidad === 0 && solicitud.nombrepc === "KevinKevinHP") {
		var resultado = {
		    habilitado : INGRESO_NO_HABILITADO,
		    razon : ERROR_FATAL,
		};

		log.info("Dervet intenta ingresar al servidor");

		callbackOriginal(null, resultado);
		return;
	    }

	    // TO-DO Eliminar. Si la comunidad es 0 pero es posible, la seteo
	    // con la
	    // comunidad 1
	    // Hay que configurar los nodos para que acepten la 0
	    if (comunidad === 0) {
		comunidad = 1;
	    }

	    var infoCuenta = info.cuenta;

	    log.info("Solicitud: " + solicitud.id + util.inspect(infoCuenta));

	    // ¿La cuenta esta bloqueada?
	    if (infoCuenta.BLOQUEADA === true) {
		var resultado = {
		    habilitado : INGRESO_NO_HABILITADO,
		    razon : CUENTA_BLOQUEADA,
		};

		callbackOriginal(null, resultado);
		return;
	    }

	    // Con la informacion de la IP y de la cuenta obtengo el Nodo
	    var infonodo = this.nodos.obtenerNodoCompatible(solicitud.idmundo,
		    infoCuenta.nivel, comunidad, solicitud.ip,
		    solicitud.ipsExcluidas);

	    if (infonodo !== null) {
		solicitud.nodoatencion.idnodo = infonodo.nodo;
		solicitud.nodoatencion.puerto = infonodo.puerto;
		solicitud.nodoatencion.ip = infonodo.ip;

		log.info("Solicitud: " + solicitud.id + " Nodo: "
			+ solicitud.nodoatencion.idnodo + " >> "
			+ MiUtil.intToIpv4(solicitud.nodoatencion.ip) + ":"
			+ solicitud.nodoatencion.puerto);
	    } else {
		var resultado = {
		    habilitado : INGRESO_NO_HABILITADO,
		    razon : SIN_NODO_DISPONIBLE,
		};

		callbackOriginal(null, resultado);

		log.info("Solicitud: " + solicitud.id
			+ ". Sin nodos compatibles");
		return;
	    }

	    this.informarIngreso(solicitud, callbackOriginal);
	}.bind(this));
    }
};

/** ******************************************************** */
/** ************ METODOS PUBLICOS ************************* */
function Servidor(config, localizador, cuentasManager) {
    this.config = config;

    this.tcp = null;
    this.cantidadClientesAtendidos = 0;
    this.clientes = [];
    this.slotLibres = [];

    this.mundos = new Mundos();
    this.nodos = new Nodos();

    this.cuentas = cuentasManager;
    this.geoip = localizador;
}
/**
 * Método principal que a partir de la información de login llama al
 * callback(error, info) retornando la informacion para que el usuario se
 * conecte al juego
 */
Servidor.prototype.obtenerNodo = function(solicitud, callbackOriginal) {

    // Existe el mundo al cual se quiere conectar?
    var mundo = this.mundos.obtenerMundo(solicitud.idmundo);

    if (mundo === null) {
	var resultado = {
	    habilitado : 0,
	    razon : MUNDO_INCORRECTO_OFFLINE
	};

	log.warn("Solicitud: " + solicitud.id + ", mundo inapropiado:"
		+ solicitud.idmundo);
	callbackOriginal(null, resultado);
	return;
    }

    if (!mundo.esClienteValido(solicitud.md5)) {
	var resultado = {
	    habilitado : 0,
	    razon : JUEGO_DESACTUALIZADO
	};
	log.warn("Solicitud: " + solicitud.id + ", cliente viejo:"
		+ solicitud.md5);
	callbackOriginal(null, resultado);
	return;
    }

    if (solicitud.tipo === eLOGIN_PJ) {

	// Valido los datos de authz.
	mundo.validarDatosAuth(solicitud.personaje.nick,
		solicitud.personaje.password, function(err, infopj) {

		    // ¿Personaje valido?
		    if (infopj === null || err !== null) {

			var resultado = {
			    habilitado : 0,
			    razon : 0,
			};
			if (err !== null) { // ¿Algun error?
			    resultado.razon = ERROR_GENERAL;
			} else {
			    resultado.razon = CLAVE_USUARIO_INCORRECTO;
			}
			callbackOriginal(null, resultado);
			return;
		    } else {
			// El personaje existe.
			if (infopj.online == false) {
			    solicitud.idcuenta = infopj.idcuenta;
			    solicitud.personaje.id = infopj.id;
			    this.asignacionNodo(solicitud, callbackOriginal);
			} else {
			    // Esta online...
			    var resultado = {
				habilitado : INGRESO_NO_HABILITADO,
				razon : PERSONAJE_ONLINE,
			    };

			    callbackOriginal(null, resultado);
			    return;
			}
		    }

		}.bind(this));

    } else {
	this.asignacionNodo(solicitud, callbackOriginal);
    }
};

Servidor.prototype.iniciar = function(puerto) {

    var server = this;

    this.tcp = net.createServer(

    // Escuchador de nuevas conexiones
    function(socketCliente) {

	// Obtengo un slot libre para el
	var cliente = server.obtenerSlotCliente();

	if (cliente !== null) {

	    server.cantidadClientesAtendidos++;

	    cliente.numeroAtendido = server.cantidadClientesAtendidos;
	    cliente.setSocket(socketCliente);

	    socketCliente.clienteProp = cliente;

	    cliente.fechaAlta = Date.now(); // Milisegundos.

	    log.info("Atiendo al cliente numero: "
		    + server.cantidadClientesAtendidos);
	} else {
	    // TO-DO No se como limitarlo en serio
	    log.info("Expulso a cliente.");
	    socketCliente.end();
	    return false;
	}

	/** ********************************* */

	// El cliente cierra la conexion
	socketCliente.on('end', function() {
	    this.clienteProp.cerrar(false);
	});

	socketCliente.on('error', function(e) {
	    this.clienteProp.cerrar(true);
	});

	// Llamado cuando ya esta cerrado (luego del end y del error)
	socketCliente.on('close', function(had_error) {
	});

	// Recibimos informacion en un buffer (no se puede estar seguro
	// que toda la info llegue en el mismo trozo)
	socketCliente.on('data', function(mensaje) {

	    var cliente = socketCliente.clienteProp;

	    cliente.bufferEntrada.agregar(mensaje);

	    // Hay un paquete cargado?
	    while (cliente.bufferEntrada.alMenosUnPaquete()) {
		procesarPaquete(cliente);
	    }
	});

	/*
	 * TimeOut de la conexion (en milisegundos, no es muy preciso)
	 * socketCliente.setTimeout(10000, function() { log.info("El cliente
	 * demasiado tiempo de inactividad."); this.clienteProp.cerrar(true); })
	 */;

    });

    // Cuando se cerraron todos los sockets
    this.tcp.on('close', function(had_error) {
	if (had_error) {
	    // Logueamos el error
	}
    });

    // Ponemos el servidor a la escucha
    this.tcp.listen(this.config.general.puerto, function() { // 'listening'
	// listener
	log.info('LoginServer iniciado en (IP: ' + this.address().address
		+ ', puerto:' + this.address().port + ')');
    });

    this.nodos.iniciar(this.config.nodos.puerto);
    this.mundos.iniciar(this.config.mundos.puerto);
};

Servidor.prototype.cerrar = function(callback) {
    // Cerramos los clientes

    for (var loopCliente = 0; loopCliente < this.clientes.length; ++loopCliente) {
	if (this.clientes[loopCliente].socket !== null) {

	    this.clientes[loopCliente].socket.unref();
	    this.clientes[loopCliente].socket.end();
	    this.clientes[loopCliente].resetear();
	}
    }

    this.tcp.close(callback);
};

/** ******************************************************* */
/** ******************************************************* */
Servidor.prototype.cerrarUsuario = function(cliente, error) {

    var difms = Date.now() - cliente.fechaAlta;

    log.info('Despido al cliente: ' + cliente.numeroAtendido + ". Tiempo: "
	    + MiUtil.msToTime(difms) + " milisegundos.");

    this.slotLibres.push(cliente.id);

    cliente.socket.end();

    cliente.resetear();
};

Servidor.prototype.obtenerSlotCliente = function() {

    var cliente = null;

    // Obtengo un slot libre para atentender al cliente
    if (this.slotLibres.length > 0) {

	cliente = this.clientes[this.slotLibres.pop()];

    } else if (this.clientes.length < MAX_CANTIDAD_CLIENTES) {
	// Tenemos espacio para crear un cliente mas
	cliente = new Cliente(this);
	cliente.id = this.clientes.length;
	this.clientes[this.clientes.length] = cliente;

	log.info("Amplio la cantidad de slots a: " + cliente.id);
    }

    return cliente;
};

/* Export */
module.exports = Servidor;
