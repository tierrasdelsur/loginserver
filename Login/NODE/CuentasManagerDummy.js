
function CuentasManagerDummy(config) {
};

CuentasManagerDummy.prototype.iniciar = function(callback) {
  callback(null);
};
/*
 * Niveles de cuenta: 1: Nunca premium. 2: Fue Premium hasta 6 meses o es
 * Premium. 3: Fue premium mas de 6 meses o es Premium mas de 2 meses. 4: Es
 * Premium y durante mas de 6 meses. 5: Es Premium y durante mas de un año
 */
function calcularNivel(infoCuenta) {
  var nivel = 1;
  return nivel;
}

function calcularNivelBasico(infoCuenta) {
  var nivel = 1;
  return nivel;
}

CuentasManagerDummy.prototype.obtenerTipoCuenta = function(idcuenta, callback) {
  var infoCuenta = {
    nivel: 0,
    espremium: true,
    bloqueada: false
  };

  callback(null, infoCuenta);
};

module.exports = CuentasManagerDummy;