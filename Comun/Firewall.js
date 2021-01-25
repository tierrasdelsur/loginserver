/**
 * Esta clase es una interfaz para interactuar con el firewall de la red
 */
var ReglaFirewall = require('./ReglaFirewall.js');
var MiUtil = require('./Util');

const
// de bloqueo de users
MIN_PORT_CLIENTE = 12000; // Puerto minimo de origen de la conexion por parte
// del usuario.
MAX_PORT_CLIENTE = 12100; // Puerto maximo de origen de la conexion por parte
// del usuario.
INTERVALO_LIMPIEZA = 360; // Cada cuantos minutos se buscan reglas vencidas
TIEMPO_VENCIMIENTO_REGLA = 360; // Cuantos minutos de validez tienen las reglas

/** **** Metodos abstractos ************ */

/*
 * Obtiene un identificador unico para la regla. En un momento puntual no puede
 * haber dos reglas con el mismo identificador.
 */
Firewall.prototype.obtenerIDRegla = function() {
};

/*
 * Agrega efectivamente una regla al firewall.
 */
Firewall.prototype.agregarRegla = function(regla, callback) {
};

/*
 * Elimina una regla existente en el firewall.
 */
Firewall.prototype.eliminarRegla = function(regla, callback) {
};

/** Metodos publicos concretos */
function Firewall() {

	this.reglas = {};

	// this.idTimerCaducidad = setInterval(this.limpiarReglasVencidas,
	// TIEMPO_VENCIMIENTO_REGLA * 60000); // 1.000 ms/seg * 60 seg/min
};

Firewall.prototype.limpiarReglasVencidas = function() {

	log.info("Por limpiar reglas vencidas del firewall.");

	var ahora = MiUtil.obtenerTimeStamp();

	for ( var key in this.reglas) {
		if (this.reglas.hasOwnProperty(key)) {
			var regla = this.reglas[key];
			if (true) {
			//if (ahora > regla.fechaVencimiento) {
				this.eliminarRegla(regla, function() {
				});
				delete (this.reglas.key);
			}
		}
	}

	// Leo el archivo del firewall para cargar las reglas viejas?

	log.info("Reglas del firewall limpiadas.");
};

Firewall.prototype.iniciar = function() {
	// Leo el archivo del firewall para cargar las reglas viejas?
};

Firewall.prototype.bloquearIP = function(ip) {
	// ufw deny from MiUtil. (ip)
};

/*
 * Esta funcion habilita el acceso de una direccion IP a un puerto e IP
 */
Firewall.prototype.permitirIngreso = function(ipOrigen, ipDestino, puerto,
		callback) {
	
	// Ya tengo una regla para esta IP que se coincide con ipDestino y puerto?
	if (ipOrigen in this.reglas) {
		var reglaActual = this.reglas[ipOrigen];

		if (reglaActual.destinoIP === ipDestino
				&& reglaActual.destinoPuerto == puerto) {
			// Si ya esta la regla.. solo actualizamos la fecha para tenerla en
			// cuenta en el vencimiento
			reglaActual.fechaVencimiento = MiUtil.obtenerTimeStamp()
					+ TIEMPO_VENCIMIENTO_REGLA * 60; // (minutos por
														// segundos)

			log.info("Regla ya añadida.");

			// Si no hace falta agregarla directamente llamamos al cabllback
			process.nextTick(function() {
				callback(null, true);
			});
			return;
		}
	}

	// Sino la tengo creo la regla
	var regla = new ReglaFirewall();

	regla.numero = this.obtenerIDRegla();
	regla.origenIP = ipOrigen;
	regla.destinoIP = ipDestino;
	regla.destinoPuerto = puerto;
	regla.fechaVencimiento = MiUtil.obtenerTimeStamp()
	+ TIEMPO_VENCIMIENTO_REGLA * 60; // (minutos por
										// segundos)

	// La agrego
	this.reglas[ipOrigen] = regla;

	this.agregarRegla(regla, callback);
};

module.exports = Firewall;