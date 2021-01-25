/**
 * El cliente atiende al cliente verdadero y tambien auspicia de proxy con el
 * servidor
 */
var net = require('net');
var MiUtil = require('../Comun/Util');
var EmpaquetadorIN = require('../Comun/EmpaquetadorIN.js');
// Paquete que le envia el HASH al cliente.
const
NODO_INFO_HASH = 250; // ID delpaquete para enviarle el hash al server

const
TIME_OUT_CLIENTE = 3000; // Cantidad de ms maximo entre que se conecta un
// cliente y envia el hash

function desencriptarIP(bufferEntrada) {
  var n1 = bufferEntrada.readUInt8();
  var n2 = bufferEntrada.readUInt8();
  var ip = "";
  var leido;

  n2 = (n2 ^ n1) - 36;

  var seg_encriptado = bufferEntrada.readUInt8();

  var segmento = ((seg_encriptado ^ n2) ^ n1);

  ip = segmento;

  for ( var i = 0; i < 3; ++i) {
    leido = bufferEntrada.readUInt8();
    segmento = (seg_encriptado ^ leido);
    ip = segmento + "." + ip;
    seg_encriptado = leido;
  }

  return ip;
}

function genCrc(longitudPaquete) {
  var a = (longitudPaquete + 2);
  var b = (a % 249) + 1;

  return b;
}

function Cliente(id, socketCliente, nodo) {

  this.id = id;
  this.hash = "";

  this.nodo = nodo;
  this.socketCliente = socketCliente;

  this.bufferEntrada = new EmpaquetadorIN();

  this.ip = MiUtil.ipv4ToInt(socketCliente.remoteAddress);

  // Establecemos los eventos
  this.socketCliente.on('data', this.clienteEnviaData.bind(this));
  this.socketCliente.on('close', this.clienteCierra.bind(this));
  this.socketCliente.on('error', this.clienteError.bind(this));
  this.socketCliente.on('timeout', this.clienteNoEnviaHash.bind(this));

  this.socketCliente.setTimeout(TIME_OUT_CLIENTE, function() {
    log.info("Time out para " + this.id);
    this.terminaSesion();
  }.bind(this));

  this.socketServer = null;
  this.conectado = false;
}

Cliente.prototype.procesarPaquete = function() {

  // Descartamos la longitud del paquete
  this.bufferEntrada.readUInt8();

  var numeroPaquete = this.bufferEntrada.readUInt8();

  switch (numeroPaquete) {
  case 1:

    var ip = desencriptarIP(this.bufferEntrada);
    var hash = this.bufferEntrada.readString();

    log.info("El usuario " + this.id + " quiere loguear con el HASH " + hash
            + " hacia la IP " + ip);

    // Chequeo la IP
    // ¿El es HASH valido para esta IP?
    if (this.nodo.esHashValido(hash, ip, this.ip)) {

      this.hash = hash;

      // Desactivamos el timeout por inactividad dado que se valido
      // correctamente.
      if (this.socketCliente === null) {
        log.info("El socket cliente es nulo!. Hash " + hash);
        this.terminaSesion();
        return;
      }

      this.socketCliente.setTimeout(0); // TODO esto deberia ir arriba cuando se
      // recibio info

      var nodo = this.nodo;
      var cliente = this;

      // Creamos la conexion con el server
      this.socketServer = new net.Socket();
      
      this.socketServer.setNoDelay(true);
      this.socketCliente.setNoDelay(true);
      this.socketServer.setKeepAlive(true, 5000);
      this.socketCliente.setKeepAlive(true,5000);


      this.socketServer.connect(this.nodo.obtenerMundoPuerto(), this.nodo
              .obtenerMundoIP(), function() {
        // Le re enviamos el HASH al servidor
        log.info("Me conecto al servidor" + cliente.id);

        // Le enviamos al Servidor cual es el HASH que se le esta conectando

        // Longitud del hash
        // En el juego no puede haber paquete de longitud 0
        // por lo tanto un paquete de longitud 0.. es de longitud 1
        // (por eso el -1). Y en la longitud no se cuenta el espacio que ocupa
        // la longitud
        var longitudPaquete = hash.length + 3 - 1;
        var paquete = new Buffer(longitudPaquete + 2);

        paquete.writeUInt8(longitudPaquete, 0); // 1
        paquete.writeUInt8(genCrc(longitudPaquete + 1), 1); // 1
        paquete.writeUInt8(NODO_INFO_HASH, 2); // 1
        paquete.writeUInt8(hash.length, 3); // 1
        paquete.write(hash, 4); // Hash

        // Enviamos el paquete
        this.write(paquete);

        // Remueve el listener que recibe el hash y lo re envia al server
        cliente.socketCliente.removeAllListeners('data');

        // Lo que escriba el server, se lo mandamos al cliente y viceversa
        this.pipe(cliente.socketCliente, false);
        cliente.socketCliente.pipe(this, false);

        paquete = null;

        cliente.conectado = true;
        nodo.cantidadUsuariosConectados++;

        log.info("+ Usuarios online: " + nodo.cantidadUsuariosConectados);
      });

      // Escuchamos los eventos del socket que nos conecta al server
      this.socketServer.on("close", this.serverCierra.bind(this));
      this.socketServer.on("error", this.serverError.bind(this));
    } else {
      log.warn("HASH INVALIDO");
      // Cerramos la session del usuario.
      this.terminaSesion();
    }

    break;
  default:
    log.info("Llego paquete invalido. Cliente ID:" + this.id);
    this.terminaSesion();
    break;
  }

};

Cliente.prototype.terminaSesion = function() {

  // Si hay una sesion bidireccional, siempre se van a llamar al close
  // de ambos, y por lo tanto se va a llamar a esta metodo.
  // Este if sirve para saber si debo subir o restar el contador de usuarios
  // online
  log.info("termina sesion. ID:" + this.id);
  if (this.conectado) {
    this.nodo.cantidadUsuariosConectados--;
    this.conectado = false;
    log.info("- Usuarios online: " + this.nodo.cantidadUsuariosConectados);
  }

  // Le digo chau al cliente. Si ya no se habia borrado antes.
  if (this.socketCliente != null) {
    this.socketCliente.unpipe();
    this.socketCliente.end();
    this.socketCliente = null;
    this.nodo.cierraCliente(this);
  }

  // Le digo chau tambien al servidor
  if (this.socketServer != null) {
    this.socketServer.unpipe();
    this.socketServer.end();
    this.socketServer = null;
  }

};

Cliente.prototype.serverError = function(error) {
  log.warn("Error en el socket server.");
  log.warn(error);
  // Automaticamente luego de esto se emite el close().
};

Cliente.prototype.clienteError = function(error) {
  log.warn("Error en el socket cliente." + this.id);
  log.warn(error);
  // Automaticamente luego de esto se emite el close().
};

Cliente.prototype.clienteNoEnviaHash = function() {
  // TODO Aviso a auditoria una actividad sospechosa.
  log.error("Cierro conexión que no valido." + this.ip);
  this.clienteCierra(false);
};

Cliente.prototype.clienteEnviaData = function(data) {
  // ¿Ya tiene el hash?.
  if (this.conectado == false) {
    if (this.hash === "") {
      //TODO quitar, para buscar uno de los errores.
      //log.error("Agrego data de " + this.id);
      this.bufferEntrada.agregar(data);
      // Hay un paquete cargado?
      if (this.bufferEntrada.alMenosUnPaquete()) {
        this.procesarPaquete();
      }
    } else {
      // Ya tiene HASH y me llego un paquete por aca!
      // Es bug!
      log.error("Llego paquete cuando no correspondia." + this.id);
      // Terminamos la session para que se desconecte el cliente
      this.terminaSesion();
    }
  } else {
    log.error("Esta conectado y lo toma el Nodo." + this.id);
  }
};

Cliente.prototype.serverCierra = function(porError) {
  log.info("Servidor: cierra.");

  this.terminaSesion();
};

Cliente.prototype.clienteCierra = function(porError) {
  log.info("Cliente: cierra. ID " + this.id);

  this.terminaSesion();
};

/** ******************************************************** */
/** ***************** EXPORTS ****************************** */
module.exports = Cliente;