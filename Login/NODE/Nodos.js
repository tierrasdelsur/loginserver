/**
 * Este clase maneja los nodos conectados al Login Server. Ante cualquier
 * inconveniete los nodos le avisan a esta clase.
 */
var net = require('net');
var util = require('util');

var Nodo = require('./Nodo');
var MiUtil = require('../Comun/Util');

const
MAX_CANTIDAD_NODOS = 20;
SEGUNDOS_VENCIMIENTO = 1080; // Esta cantidad de minutos es multiplicada por la
// prioridad del nodo

function Nodos() {
  this.nodos = [];

  this.slotLibres = [];

  // Nodos por mundo
  this.nodosXmundo = {};

  this.historialAsignaciones = {};
}

/**
 * Utilizando un algoritmo rapido intenta obtener un nodo para la direccion IP
 * que le permite conectarse al nodo interesado
 * 
 * @param ip
 *          direccion IP del usuario que se desea conectar
 * @param mundo
 *          mundo al cual se quiere acceder
 * @returns NULL: no es posible obtener el nodo. IDNODO, PUERTO, IP.
 */
Nodos.prototype.obtenerNodoFlash = function(ip, mundo) {

  // ¿Tiene alguna accion la direccion IP?
  if (ip in this.historialAsignaciones) {
    var asignaciones = this.historialAsignaciones[ip];

    // Busco la asignacion en la lista de asignaciones
    for ( var i = 0; i < asignaciones.length; ++i) {
      var asignacion = asignaciones[i];

      // Chequeo si tengo una accion y si esta no esta vencida.
      if (asignacion.mundo == mundo) {

        if (asignacion.vencimiento >= MiUtil.obtenerTimeStamp()) {

          log.info("Falta para vencerce"
                  + MiUtil.secondToTime(asignacion.vencimiento
                          - MiUtil.obtenerTimeStamp()));

          var nodoActual = this.obtenerNodo(asignacion.idnodo);

          // Esta el nodo activo y no esta lleno de gente?
          if (nodoActual !== undefined && nodoActual.estaConectado()
                  && !nodoActual.estaSaturado()) {

            // Retorno la asignacion previa
            var resultado = {
              nodo: nodoActual.id,
              ip: nodoActual.obtenerIP(),
              puerto: nodoActual.obtenerPuerto(),
            };

            log.info("Historial para " + MiUtil.intToIpv4(ip) + " mundo "
                    + mundo + "." + util.inspect(resultado));

            return resultado;
          } else {
            log.info("Nodo de historia para " + MiUtil.intToIpv4(ip) + "("
                    + asignacion.idnodo + ") caido.");
          }
        }
        // Si llegue hasta aca es porque el cache ya vencio o el nodo murio.
        // Elimino el elemento del array.
        asignaciones.splice(i, 1);
        log.info("Elimino registro del historial vencido.");
        break;// Salgo del for.
      }
    }
  } else {
    log.info("Sin historial para " + MiUtil.intToIpv4(ip) + " mundo " + mundo);
  }

  return null;

};

/**
 * Intenta obtener un nodo para un mundo compatible con la comunidad y el nivel
 * 
 * @param mundo
 *          identificador del mundo
 * @param nivel
 *          nivel
 * @param comunidad
 *          identificador de la comunidad BGP
 * @returns
 */
Nodos.prototype.obtenerNodoCompatible = function(mundo, nivel, comunidad, ip, ipsExcluidas) {

  // Hay nodos para este mundo?
  if (mundo in this.nodosXmundo && this.nodosXmundo[mundo].length > 0) {

    var nodos = this.nodosXmundo[mundo];
    var nodoActual = null;

    var loop = 0;

    /* Obtengo el primer nodo compatible */
    while (loop < nodos.length) {

      if (nodos[loop].estaSaturado() === false
              && nodos[loop].esNivelSuficiente(nivel)
              && nodos[loop].esComunidadCompatible(comunidad)
              && nodos[loop].tieneIPDistintas(ipsExcluidas)) {
        // Encontre un nodo compatible
        nodoActual = nodos[loop];
        break;
      }
      ++loop;
    }

    // ¿Encontre alguno?
    if (nodoActual === null) return null;

    ++loop;

    /*
     * Me fijo si no puedo encontrar uno mejor que este ( (la variable no es
     * reseteada ya que empiezo a partir de la proxima posicion del encontrado)
     */
    while (loop < nodos.length) {

      // ¿Tiene peor prioridad que el encontrado?
      // Los nodos estan ordenados por prioridad en la lista, asique el
      // sigueinte va a ser de igual prioridad o menor.
      if (nodoActual.compararPrioridad(nodos[loop]) === 0) {
        // ¿NO esta saturado?
        // ¿Me puedo conectar al nodo?
        // ¿Esta mas libre que el otro?. Balanceamos la carga.
        if (nodos[loop].estaSaturado() === false
                && nodos[loop].esNivelSuficiente(nivel)
                && nodos[loop].esComunidadCompatible(comunidad)
                && nodos[loop].tieneIPDistintas(ipsExcluidas)
                && nodoActual.compararCarga(nodos[loop]) > 0) {
          // Encontre uno mejor!
          nodoActual = nodos[loop];
        }
      } else { // Ya tenia al mejor.

        break;
      }
      ++loop;
    }

    // Agreamos la asignacion al historial de asignaciones.
    // Dependiendo la prioridad del nodo es el tiempo que lo mantiene en el
    // cache.
    var historia = {
      mundo: mundo,
      idnodo: nodoActual.id,
      ip: nodoActual.obtenerIP(ipsExcluidas),
      puerto: nodoActual.obtenerPuerto(),
      vencimiento: MiUtil.obtenerTimeStamp() + SEGUNDOS_VENCIMIENTO
              * nodoActual.obtenerPrioridad(),
    };

    if (!(ip in this.historialAsignaciones))
      this.historialAsignaciones[ip] = [];

    this.historialAsignaciones[ip].push(historia);

    // Devolvemos la informacion solicitada.
    var resultado = {
      nodo: historia.idnodo,
      ip: historia.ip,
      puerto: historia.puerto,
    };

    return resultado;
  }

  return null;
};
/** ************************************ */
/** **** METODOS NODOS CON NODO. ******* */

/**
 * Compara dos nodos ordenadolos por Prioridad (descendente) y Carga
 * (descendenente)
 */
function compararNodos(nodoA, nodoB) {

  log.info("Comparo dos nodos: " + nodoA.id + ";" + nodoB.id);

  var r = nodoA.compararPrioridad(nodoB);

  if (r == 0) { return (nodoA.compararCarga(nodoB)); }
  return (r * -1);
}

Nodos.prototype.obtenerOrdenNodos = function(idmundo) {
  var orden = " ";
  for ( var i = 0; i < this.nodosXmundo[idmundo].length; ++i) {
    orden += this.nodosXmundo[idmundo][i].id + " ";
  }
  return orden;
};
Nodos.prototype.altaNodo = function(nodo) {

  log.info("Doy de alta un nodo.");

  var idmundo = nodo.mundoTransmision;

  // Agregamos el nodo a la lista de nodos por Mundo

  if (idmundo in this.nodosXmundo) {
    this.nodosXmundo[idmundo].push(nodo);
    // Los ordeno segun la prioridad y la cantidad de usuarios que aguantan
    this.nodosXmundo[idmundo].sort(compararNodos);
  } else {
    this.nodosXmundo[idmundo] = [];
    this.nodosXmundo[idmundo].push(nodo);
  }
  log.info("Orden de prioridades: " + this.obtenerOrdenNodos(idmundo));
  log.info("Nodos totales para el mundo " + idmundo + ": "
          + this.nodosXmundo[idmundo].length);
};

Nodos.prototype.bajaNodo = function(nodo, estabaIniciado) {
  // Quitamos el nodo de nuestra lista de nodos activos del mundo
  log.info("Se desconecta un nodo");

  // Elimino su referencia de la lista de nodos
  for ( var i = 0; i < this.nodos.length; ++i) {
    if (this.nodos[i] === nodo) {
      this.nodos[i] = null;
      this.slotLibres.push(i);
      break;
    }
  }

  // Dejo de escuchar sus eventos
  nodo.removeAllListeners();

  log.info("Se elimina el nodo desconectado");

  // Estaba iniciado o murio antes de iniciarse? (Algun error raro)
  if (estabaIniciado) {
    var idmundo = nodo.mundoTransmision;

    if (idmundo in this.nodosXmundo) {
      var index = this.nodosXmundo[idmundo].indexOf(nodo);

      if (index > -1) {
        // Lo quito de la lista de nodos por mundo
        this.nodosXmundo[idmundo].splice(index, 1);

        log.info("Nodos totales para el mundo" + idmundo + " "
                + this.nodosXmundo[idmundo].length);
      } else {
        console.error("Se quiere eliminar un nodo que no existe.");
      }
    }
    log.info("Orden de prioridades: " + this.obtenerOrdenNodos(idmundo));
  }
  ;
};

/** ************************************ */
/** ***** METODOS ADMINISTRATIVOS ******** */
Nodos.prototype.obtenerSlotNodo = function() {

  var nodo = null;
  var nslot = -1;

  // Obtengo un slot libre para atentender al cliente
  if (this.slotLibres.length > 0) {
    nslot = this.slotLibres.pop();
  } else if (this.nodos.length < MAX_CANTIDAD_NODOS) {
    // Tenemos espacio para crear un cliente mas
    nslot = this.nodos.length;
  }

  if (nslot !== -1) {
    nodo = new Nodo(this);
    this.nodos[nslot] = nodo;

    log.info("Nuevo nodo en el slot:" + nslot);

    return nodo;
  } else {
    log.info("No se pudo encontrar un slot libre para un nuevo nodo.");
    return null;
  }
};

Nodos.prototype.iniciar = function(puerto) {

  var Nodos = this;

  this.tcp = net.createServer(

  // Escuchador de nuevas conexiones
  function(socketNodo) {

    log.info('Nuevo nodo conectado desde la IP:'
            + MiUtil.intToIpv4(MiUtil.ipv4ToInt(socketNodo.remoteAddress)));

    // Obtengo un slot libre para el
    var nodo = Nodos.obtenerSlotNodo();

    if (nodo !== null) {
      nodo.setSocket(socketNodo);

      // Enganchamos los eventos
      nodo.on('conectado', Nodos.altaNodo.bind(Nodos));
      nodo.on('desconecta', Nodos.bajaNodo.bind(Nodos));

    } else {
      // TODO No se como limitarlo en serio
      socketNodo.end();
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
    log.info('Escuchando Nodos en (IP: ' + this.address().address + ', puerto:'
            + this.address().port + ')');
  });

};

Nodos.prototype.obtenerNodo = function(id) {
  for ( var loop = 0; loop < this.nodos.length; ++loop) {
    if (this.nodos[loop] !== null) {
      if (this.nodos[loop].id == id) {
        log.info("Encontre al Nodo");
        return this.nodos[loop];
      }
    }
  }
  return null;
};

module.exports = Nodos;