/**
 * Este modulo encapusla un buffer para poder trabajar de manera mas comoda con
 * este. La funcion getBuffer devuelge un buffer estandar de node.js que debe
 * ser pasado a un EmpaquetadorOUT para poder ser leido correctamente.
 */

const
MAX_BUFFER = 256;

var EmpaquetadorOUT = function(size) {
	if(typeof size === "undefined") {
		size = MAX_BUFFER;
	}
	
	this.bufSalida = new Buffer(size);
	this.posLectura = 0;
	this.posEscritura = 0;
	this.limpiar();
};

EmpaquetadorOUT.prototype.limpiar = function() {
	this.posLectura = 0;
	this.posEscritura = 0;
	// Limpiamos los buffers
	this.bufSalida.fill(0x0);
};

EmpaquetadorOUT.prototype.nuevoPaquete = function() {
	this.posNuevoPaquete = this.posEscritura;
	this.posEscritura++;
};

EmpaquetadorOUT.prototype.cerrarPaquete = function() {
	// Escribo la cantidad de bytes que ocupa el paquete en la posicion que
	// reserve
	this.bufSalida.writeUInt8((this.posEscritura - this.posNuevoPaquete - 1),
			this.posNuevoPaquete);
};

EmpaquetadorOUT.prototype.writeBool = function(bool) {
	// True = 1
	// False = 0
	this.bufSalida.writeUInt8((bool === true) ? 1 : 0, this.posEscritura);
	this.posEscritura++;
};

EmpaquetadorOUT.prototype.writeUInt8 = function(valor) {
	  this.bufSalida.writeUInt8(valor, this.posEscritura);
	  this.posEscritura++;
	};

EmpaquetadorOUT.prototype.writeUInt16 = function(valor) {
	this.bufSalida.writeUInt16LE(valor, this.posEscritura);
	this.posEscritura += 2;
};

EmpaquetadorOUT.prototype.writeUInt32 = function(valor) {
	this.bufSalida.writeUInt32LE(valor, this.posEscritura);
	this.posEscritura += 4;
};

EmpaquetadorOUT.prototype.writeString = function(string) {
	var longitud = Buffer.byteLength(string);

	this.writeUInt8(longitud);

	this.bufSalida.write(string, this.posEscritura, 'ascii');
	this.posEscritura += longitud;
};

EmpaquetadorOUT.prototype.getBuffer = function() {
	var aux = this.posEscritura;
	this.posEscritura = 0;

	return this.bufSalida.slice(0, aux);
};

/* Export */
module.exports = EmpaquetadorOUT;