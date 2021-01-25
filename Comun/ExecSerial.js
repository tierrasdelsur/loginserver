var exec = require('child_process').exec;

/*
 * Esta clase permite ejecutar una serie de comandos en serie
 * 
 * 
 */

ExecSerial.prototype.ejecutarComando = function(comando) {
	this.procesando = true;
	exec(comando.comando, function(error, stdout, stderr) {
		this.procesando = false;
		// Termine de procesar esta llamada

		// Tengo mas comandos para ejecutar?
		if (this.comandosPendientes.length > 0) {
			// Lo ejecuto
			this.ejecutarComando(this.comandosPendientes.shift());
		}

		// Retorno el callback original.
		comando.callback(error, stdout, stderr);
		return;
	}.bind(this));
};
/** ************************************* */
/** ********* METODOS PUBLICAS ******* */
function ExecSerial() {

	this.comandosPendientes = [];
	this.procesando = false;

};
/**
 * 
 * @param comando
 * @param callback
 *            (error, stdout, stderr)
 * @returns sin retorno
 */
ExecSerial.prototype.ejecutar = function(comando, callback) {

	var solicitud = {
		comando : comando,
		callback : callback
	};

	// Hay alguien en la cola? No tengo nada procesando actualmente?
	if (this.comandosPendientes.length > 0 || this.procesando) {
		// Agregeo a la cola
		log.info("Encolo: " + comando);
		this.comandosPendientes.push(solicitud);
	} else {
		log.info("Ejecuto directo: " + comando);
		// Ejecuto el comando directamente
		this.ejecutarComando(solicitud);
	}

	return;
};

module.exports = ExecSerial;