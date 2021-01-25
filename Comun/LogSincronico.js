var fs = require('fs');
var MiUtil = require('../Comun/Util');

function iniciar(nombre, nivel, consola) {

	consola || (consola = false); // No implementado

	var logger = new LogSincronico();

	global.log = logger;
};

var LogSincronico = function () {

};

LogSincronico.prototype.escribir = function (tipo, mensaje) {
	if (tipo === "ERROR") {
		fs.appendFile('./logs/eventos.log', MiUtil.obtenerFechaString() + " ["
			+ tipo + "]: " + mensaje + '\n', function (err) {
			});
	}
};

LogSincronico.prototype.info = function (mensaje) {
	this.escribir("INFO", mensaje);
};

LogSincronico.prototype.error = function (mensaje) {
	this.escribir("ERROR", mensaje);
};

LogSincronico.prototype.warn = function (mensaje) {
	this.escribir("WARN", mensaje);
};

LogSincronico.prototype.fatal = function (mensaje) {
	this.escribir("FATAL", mensaje);
};

exports.iniciar = iniciar;
