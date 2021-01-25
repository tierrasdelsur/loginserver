/**
 * Paquetes que el Login Server le envia al usuario
 */
function define(name, value) {
	Object.defineProperty(exports, name, {
		value : value,
		enumerable : true
	});
}

// Validar un usuario y un password
define("VALIDUSERPASS", 1);
// Se informa quien va a intentar loguear
define("AVISARINGRESO", 2);