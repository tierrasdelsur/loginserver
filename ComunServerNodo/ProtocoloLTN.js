/**
 * Este modulo contiene la definicion de los paquetes
 * que el LOGIN SERVER le envia al NODO. 
 */
function define(name, value) {
	Object.defineProperty(exports, name, {
		value : value,
		enumerable : true
	});
}

//Se informa quien va a intentar loguear
define("AVISARINGRESO", 1);