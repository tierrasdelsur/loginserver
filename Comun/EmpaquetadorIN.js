/**
 * Este modulo encapusla un buffer para poder trabajar de manera mas comoda con
 * este. La idea es no estar allocando memoria y no hacer corrimientos grandes
 * de datos Para dicho fin utiliza un buffer circular. Se le adicio informacion
 * con el metodo agregar(buffer node.js) y luego brinda una serie de metodos
 * para leer facilamente dicha informacion. El buffer debe ser creado a partir
 * de un EmpaquetadorIN
 */

const
MAX_BUFFER = 253;
const
BUFFER_RESERVADO = 3; // A excepcion de strings, un byte menos que el maximo
// tamaño que se puede guardar

var EmpaquetadorIN = function(size) {

	if (typeof size === "undefined") {
		size = MAX_BUFFER;
	}

	this.sizeBufEntrada = size;

	this.bufEntrada = new Buffer(this.sizeBufEntrada + BUFFER_RESERVADO);
	this.limpiar();
};

EmpaquetadorIN.prototype.limpiar = function() {
	this.posLectura = 0;
	this.posEscritura = 0;
	// Limpiamos los buffers
	this.bufEntrada.fill(0x0);
};

function asegurar(buffer, cantidadBytes, posLectura) {
	// Tengo que calcular cuantos me faltan
	var faltantes = (posLectura + cantidadBytes) - this.sizeBufEntrada;
	if (faltantes > 0) {
		buffer.copy(buffer, this.sizeBufEntrada, 0, faltantes);
	}
};

EmpaquetadorIN.prototype.avanzarPosLectura = function(cantidad) {
	this.posLectura += cantidad;
	this.posLectura %= this.sizeBufEntrada;
};

EmpaquetadorIN.prototype.retrocederPosLectura = function(cantidad) {
	if (this.posLectura == 0) {
		this.posLectura = this.sizeBufEntrada - 1;
	} else {
		this.posLectura -= cantidad;
	}

};

EmpaquetadorIN.prototype.alMenosUnPaquete = function() {
	/*
	 * ¿Como se da cuenta si hay un paquete?. Si lee y encuentra algo distinto
	 * de 0 puede ser basura (no se limpia el array a medida que se vanza) o
	 * realmente la longitud del siguiente paquete. En caso de que sea basura,
	 * la pos de lectura va a coincidir con la de escritura, entonces el else va
	 * a devolver siempre falso ( Algo < 0, es falso)
	 */

	// Leo la longitud del paquete
	var longitudPaquete = this.readUInt8();

	// retrocedo lo que avance en la anterior lectura
	this.retrocederPosLectura(1);

	if (longitudPaquete == 0)
		return false;

	if (this.posLectura > this.posEscritura) {
		return (longitudPaquete < (this.sizeBufEntrada - (this.posEscritura - this.posLectura)));
	} else {
		return (longitudPaquete < (this.posEscritura - this.posLectura));
	}

};

EmpaquetadorIN.prototype.avanzarPosEscritura = function(cantidad) {
	this.posEscritura += cantidad;
	this.posEscritura %= this.sizeBufEntrada;
};

/*
 * Agrega un tipo buffer formado por un EmpaquetadorINOut
 */
EmpaquetadorIN.prototype.agregar = function(buffer) {

	// Me entra antes de dar la vuelta al buffer?
	log.info("Leo " + buffer.length + " en " + this.posEscritura);

	var faltantes = (this.posEscritura + buffer.length) - this.sizeBufEntrada;

	if (faltantes > 0) {
		log.info("Doy la vuelta");
		// Copio hasta llegar al final todos los que pueda
		buffer.copy(this.bufEntrada, this.posEscritura, 0, buffer.length
				- faltantes);

		// Copio desde el principio para completar
		buffer.copy(this.bufEntrada, 0, buffer.length - faltantes);

	} else {
		// Copio todo de una
		buffer.copy(this.bufEntrada, this.posEscritura, 0);
	}
	this.avanzarPosEscritura(buffer.length);
};
/*
 * Funciones de lectura, pasos 1) Aseguramos que tenemos la cantidad de bytes
 * para leer de continuo 2) Leemos 3) Avazamos el puntero
 */
EmpaquetadorIN.prototype.readUInt8 = function() {
	var valor = this.bufEntrada.readUInt8(this.posLectura);
	this.avanzarPosLectura(1);
	return valor;
};

EmpaquetadorIN.prototype.readUInt16 = function() {
	asegurar(this.bufEntrada, 2, this.posLectura);
	var valor = this.bufEntrada.readUInt16LE(this.posLectura);
	this.avanzarPosLectura(2);
	return valor;
};

EmpaquetadorIN.prototype.readUInt32 = function() {
	asegurar(this.bufEntrada, 4, this.posLectura);
	var valor = this.bufEntrada.readUInt32LE(this.posLectura);
	this.avanzarPosLectura(4);
	return valor;
};

EmpaquetadorIN.prototype.readString = function() {
	// Primero leo el tamaño
	var longitudString = this.readUInt8();

	var faltantes = (this.posLectura + longitudString) - this.sizeBufEntrada;

	var string = "";

	if (faltantes > 0) {
		// Copio hasta llegar al final
		var aux = new Buffer(longitudString);

		this.bufEntrada.copy(aux, 0, this.posLectura, this.sizeBufEntrada);

		this.bufEntrada.copy(aux, longitudString - faltantes, 0, faltantes);

		string = aux.toString('utf8');
		// Copio la parte que esta en el principio
		// string += this.bufEntrada.toString('utf8', 0, faltantes - 1);
	} else {
		// Puedo leer todo el string de un saque
		string = this.bufEntrada.toString('utf8', this.posLectura,
				this.posLectura + longitudString);
	}

	this.avanzarPosLectura(longitudString);

	return string;
};

EmpaquetadorIN.prototype.readBool = function() {
	var valor = this.bufEntrada.readUInt8(this.posLectura);
	this.avanzarPosLectura(1);
	return (valor == 1);
};

/* Export */
module.exports = EmpaquetadorIN;
