var MiUtil = require('../Comun/Util');

var EmpaquetadorIN = require('../Comun/EmpaquetadorIN.js');
var EmpaquetadorOUT = require('../Comun/EmpaquetadorOUT.js');

var Cliente = function(server) {
  this.server = server;
  this.socket = null;
  this.bufferEntrada = new EmpaquetadorIN();
  this.bufferSalida = new EmpaquetadorOUT();
  this.ip = 0;
  this.id = 0;
  this.numeroAtendido = 0;
  
  // Analizar performance
  this.fechaAlta = 0;
};

Cliente.prototype.resetear = function() {
  this.bufferEntrada.limpiar();
  this.bufferSalida.limpiar();
  this.socket = null;
  this.numeroAtendido = 0;
  this.ip = 0;
};

Cliente.prototype.setSocket = function(socket) {
  this.socket = socket;
  this.ip = MiUtil.ipv4ToInt(socket.remoteAddress);
};

Cliente.prototype.cerrar = function(error) {
  this.server.cerrarUsuario(this, error);
};

module.exports = Cliente;