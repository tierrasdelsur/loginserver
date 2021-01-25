solicitudIngresoJuego = function() {
  this.id = 0;
  // De la solicitud
  this.tip = 0;
  this.idmundo = 0;

  // Del cliente
  this.ip = 0;
  this.nombrepc = "";
  this.macaddress = "";
  this.md5 = "";
  this.idcuenta = 0;

  // Exclusiones
  this.ipsExcluidas = null;
  
  // Del personaje
  this.personaje = {
    nick: "",
    id: 0,
  },
  
  // De conexion
  this.nodoatencion = {
    idnodo: 0,
    puerto: 0,
    hash: "",
    ip: 0,
    semilla_encriptacion : '',
  };
};
/* Export */
module.exports = solicitudIngresoJuego;