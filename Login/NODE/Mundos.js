var net = require('net');
var MiUtil = require('../Comun/Util');
var Mundo = require('./Mundo');

const
MAX_CANTIDAD_MUNDOS = 2;

function Mundos() {
  this.mundos = [];
  this.slotLibres = [];
}

Mundos.prototype.obtenerSlotMundo = function() {

  var mundo = null;
  var nslot = -1;

  // Obtengo un slot libre para atentender al cliente
  if (this.slotLibres.length > 0) {
    nslot = this.slotLibres.pop();
  } else if (this.mundos.length < MAX_CANTIDAD_MUNDOS) {
    // Tenemos espacio para crear un cliente mas
    nslot = this.mundos.length;
  }

  mundo = new Mundo(this);
  this.mundos[nslot] = mundo;

  return mundo;
};

Mundos.prototype.altaMundo = function(mundo) {
  log.info("Se da de alta un nuevo mundo.");
};

Mundos.prototype.bajaMundo = function(mundo) {
  log.info("Se da de baja un mundo.");

  // Elimino su referencia de la lista de mundos
  for ( var i = 0; i < this.mundos.length; ++i) {
    if (this.mundos[i] === mundo) {
      this.mundos[i] = undefined;
      this.slotLibres.push(i);
      break;
    }
  }
};

Mundos.prototype.iniciar = function(puerto) {

  var mundos = this;

  this.tcp = net.createServer(

  // Escuchador de nuevas conexiones
  function(socketMundo) {

    log.info('Nuevo mundo conectado desde la IP:'
            + MiUtil.intToIpv4(MiUtil.ipv4ToInt(socketMundo.remoteAddress)));

    // Obtengo un slot libre para el
    var mundo = mundos.obtenerSlotMundo();

    if (mundo !== null) {
      mundo.setSocket(socketMundo);

      // Enganchamos los eventos
      mundo.on('conecta', mundos.altaMundo.bind(mundos));
      mundo.on('desconecta', mundos.bajaMundo.bind(mundos));
    } else {
      // TO-DO No se como limitarlo en serio
      socketMundo.end();
      return false;
    }
  });

  // Cuando se cerraron todos los sockets
  this.tcp.on('close', function(had_error) {
    if (had_error) {
      // Logueamos el error
    }
  });

  // Ponemos el servidor a la escucha
  this.tcp.listen(puerto, function() { // 'listening' listener
    log.info('Escuchando mundos en (IP: ' + this.address().address
            + ', puerto:' + this.address().port + ')');
  });

};

Mundos.prototype.obtenerMundo = function(id) {
  for ( var loop = 0; loop < this.mundos.length; ++loop) {
    if (typeof this.mundos[loop] !== 'undefined') {
      if (this.mundos[loop].id === id) {
        log.info("Encontre al mundo");
        return this.mundos[loop];
      }
    }
  }
  ;
  return null;
};

module.exports = Mundos;