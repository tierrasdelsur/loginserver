const
MAX_CANT_SIMIL_FUN = 65536;

/*
 * Almacena una relacion entre una Callback y un ID
 */
function SolicitudesManager() {
	this.funciones = [ null ];
	this.slotLibres = []; // El 0 no se usa
};

/**
 * Llama a todos las funciones alamcenadas pasandole los parametros contenidos
 * en la parametrosCancelacion
 * 
 * @param parametroCancelacion
 *            Array de parametros
 */
SolicitudesManager.prototype.cancelar = function(parametrosCancelacion) {

	log.warn("Se cancelan todas las silicitudes pendientes.");

	for ( var i = 1; i < this.funciones.length; ++i) {
		// Llamamos a la funcion con el parametro.
		if (this.funciones[i] !== null) {
			var funcion = this.funciones[i];
			funcion.apply(null, parametrosCancelacion);
		}
	}

	// Creamos un nuevo array
	this.funciones = [ null ];
	return;

};

SolicitudesManager.prototype.cerrar = function() {

	this.cancelar(null);

	this.funciones = null;
	this.slotLibres = null;
};

SolicitudesManager.prototype.almacenarFuncion = function(funcion) {

	var slot = 0;

	// Obtengo un slot libre
	if (this.slotLibres.length > 0) {
		slot = this.slotLibres.pop();
	} else if (this.funciones.length < MAX_CANT_SIMIL_FUN) {
		slot = this.funciones.length;
	} else {
		// TODO se pudrio todo.
	}

	this.funciones[slot] = funcion;

	return slot;

};

SolicitudesManager.prototype.obtenerFuncion = function(idsolicitud) {
	var funcion = this.funciones[idsolicitud];

	this.funciones[idsolicitud] = null;

	this.slotLibres.push(idsolicitud);

	return funcion;
};

module.exports = SolicitudesManager;