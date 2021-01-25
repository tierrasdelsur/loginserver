
function obtenerFirewall() {

	var plataforma = require('os').platform();


	if (plataforma === "linux") {
		var Firewall = require('./FirewallUFW.js');
		log.info("Cargo interface Firewall para Linux UFW.");
		return new Firewall();
	} else if (plataforma.indexOf('win') >= 0) {
		var Firewall = require('./FirewallWINIPFW.js');
		log.info("Cargo interface Firewall para Windows IPFW.");
		return new Firewall();
	}
	return null;
};

/* Exports */
exports.obtenerFirewall = obtenerFirewall;