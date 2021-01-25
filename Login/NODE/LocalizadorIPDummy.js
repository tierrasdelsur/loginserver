/**
 * A partir de uan direccion IP este modulo retorna su informacion como ser
 * pais, proveedor, comunidad a la que pertenece el proveedor, etc
 */

function LocalizadorIPDummy(config) {
}

LocalizadorIPDummy.prototype.iniciar = function(callback) {
  callback(null);
};

LocalizadorIPDummy.prototype.getInfoIP = function(ip, callback) {
  var resultado = {
    comunidad: 1,
    empresa: "DUMMY"
  };

  callback(null, resultado);
};

module.exports = LocalizadorIPDummy;
