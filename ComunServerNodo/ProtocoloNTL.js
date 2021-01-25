function define(name, value) {
	Object.defineProperty(exports, name, {
		value : value,
		enumerable : true
	});
}

/**
 * Este modulo contiene la definicion de los paquetes que el NODO le envia al
 * LOGINSERVER.
 */
// El nodo saluda al login server
define("IDENTIFICACION", 1);
// Le devuelve el ok de que una persona ya se encuentra habilitado para ingresar
// al nodo
define("AVISARINGRESO", 2);
// El nodo le avisa cuantos usuarios tiene conectados al momento
define("INFORMARCARGA", 3);