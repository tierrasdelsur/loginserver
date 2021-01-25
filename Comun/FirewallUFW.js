/**
 * 
 * Implementación de control del firewall UFW para sistemas operativos LINUX
 * 
 */
var Firewall = require('./Firewall');
var ExecSerial = require('./ExecSerial');
var MiUtil = require('./Util');

function FirewallUFW() {
	this.ultimoIDRegla = 0;
	this.restriccionPuertoOrigen = " to ";
	this.ejecutadorComandos = new ExecSerial();
};

FirewallUFW.prototype.__proto__ = new Firewall();

FirewallUFW.prototype.obtenerIDRegla = function() {
	this.ultimoIDRegla++;
	return (this.ultimoIDRegla);
};

FirewallUFW.prototype.eliminarRegla = function(regla, callback) {
	// Tenemos que armar el string nuevamente de la regla
	// el ID no marca la posicion ni un id real de la regla
	var reglaString = "sudo ufw --force delete allow proto tcp from "
			+ MiUtil.intToIpv4(regla.origenIP) + this.restriccionPuertoOrigen
			+ MiUtil.intToIpv4(regla.destinoIP) + " port "
			+ regla.destinoPuerto;

	log.info("Eliminada " + reglaString);

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

/*
 * Esta funcion habilita el acceso de una direccion IP a un puerto e IP
 */
FirewallUFW.prototype.agregarRegla = function(regla, callback) {
	// Armamos el string de la regla
	var reglaString = "sudo ufw allow proto tcp from "
			+ MiUtil.intToIpv4(regla.origenIP) + this.restriccionPuertoOrigen
			+ MiUtil.intToIpv4(regla.destinoIP) + " port "
			+ regla.destinoPuerto;

	log.info("Agregada" + reglaString);

	// Agrego efectivamente la regla al firewall
	/*this.ejecutadorComandos.ejecutar(reglaString, function(error, stdout, stderr) {
		log.info(stdout);
		log.info(stderr);
		if (error !== null) {
			log.error('Error al agregar una regla: ' + stderr);
			callback(true, null);
		} else {*/
			callback(null, true);
		/*}
	});*/
};

module.exports = FirewallUFW;