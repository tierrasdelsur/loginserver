/**
 * 
 * Implementación de control del firewall UFW para sistemas operativos LINUX
 * 
 */
var Firewall = require('./Firewall');
var MiUtil = require('./Util');
var ExecSerial = require('./ExecSerial');

function FirewallWINIPFW() {
	this.ultimoIDRegla = 15000;
	this.restriccionPuertoOrigen = " to ";
	this.ejecutadorComandos = new ExecSerial();
};

FirewallWINIPFW.prototype.__proto__ = new Firewall();

FirewallWINIPFW.prototype.obtenerIDRegla = function() {
	this.ultimoIDRegla++;
	return (this.ultimoIDRegla);
};

FirewallWINIPFW.prototype.eliminarRegla = function(regla, callback) {

	var reglaString = "echo ipfw delete " + regla.numero;

	log.info("Eliminada " + reglaString);

	// Agrego efectivamente la regla al firewall
	this.ejecutadorComandos.ejecutar(reglaString, function(error, stdout, stderr) {
		log.info(stdout);
		log.info(stderr);

		if (error !== null) {
			log.error('Error al eliminar una regla: ' + stderr);
			callback(true, null);
		} else {
			callback(null, true);
		}
	});
};

/*
 * Esta funcion habilita el acceso de una direccion IP a un puerto e IP
 */
FirewallWINIPFW.prototype.agregarRegla = function(regla, callback) {
	// Armamos el string de la regla
	var reglaString = "echo ipfw add " + regla.numero
			+ " allow tcp from "
			+ MiUtil.intToIpv4(regla.origenIP) + this.restriccionPuertoOrigen
			+ MiUtil.intToIpv4(regla.destinoIP) + " dst-port "
			+ regla.destinoPuerto + " setup limit src-addr 4";

	log.info("Agregada" + reglaString);

	// Agrego efectivamente la regla al firewall
	this.ejecutadorComandos.ejecutar(reglaString, function(error, stdout, stderr) {
		log.info(stdout);
		log.info(stderr);
		if (error !== null) {
			log.error('Error al agregar una regla: ' + stderr);
			callback(true, null);
		} else {
			callback(null, true);
		}
	});
};

module.exports = FirewallWINIPFW;