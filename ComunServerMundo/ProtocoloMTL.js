/** Paquetes que el MUNDO le envia al LOGIN * */

function define(name, value) {
	Object.defineProperty(exports, name, {
		value : value,
		enumerable : true
	});
}

// El mundo saluda al login server
define("IDENTIFICACION", 1);
// Le envia el resultado de una autentificacion de user y password
define("VALIDUSERPASS", 2);
// Le envia el resultado del pedido para dejar entrar a un usuario al juego
define("VALIDUSERINGRESO", 3);
