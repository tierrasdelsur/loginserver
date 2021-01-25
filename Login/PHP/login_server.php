<?php
ignore_user_abort ( true ); // Para que el script si o si se termine de ejecutar
                            
// Evitamos que se almacene en cache de proxy
header ( "Cache-Control: no-cache, must-revalidate" ); // HTTP/1.1
header ( "Expires: Sat, 26 Jul 1997 05:00:00 GMT" ); // Date in the past

require ('./config/config.php');
require ('./PaqueteIN.class.php');
require ('./PaqueteOUT.class.php');
require ('./encriptacion/pc1.php');

define ( 'SOLICITUD_INGRESO', 1 );

define ( 'LOGUEAR_PERSONAJE', 1 );
define ( 'CREAR_PERSONAJE', 2 );
function existenVariables($fuente, $buscadas) {
	foreach ( $buscadas as $buscada ) {
		if (! isset ( $fuente [$buscada] )) {
			return false;
		}
	}
	
	return true;
}
Function esInformacionSuficiente($ingresado, $necesario) {
	// Se fija si se definio una accion
	// Se fija si la accion existe dentro de este manejador
	// Se fija si se recibieron todas los parametros para determinada accion
	if (isset ( $ingresado ['accion'] ) && array_key_exists ( $ingresado ['accion'], $necesario ) && existenVariables ( $ingresado, $necesario [$ingresado ['accion']] )) {
		return true;
	} else {
		return false;
	}
}
/*
 * Retorna el socket si se pudo entablar una comunicacion NULL caso contrario
 */
function conectarLoginServer() {
	global $config;
	// Datos loginserver
	$ip = $config ['ip'];
	$puerto = $config ['puerto'];
	
	// Creamos el socket
	$socket = socket_create ( AF_INET, SOCK_STREAM, SOL_TCP );
	
	if ($socket === false)
		return NULL;
		
		// Tratatamos de conectarnos
	$conectado = socket_connect ( $socket, $ip, $puerto );
	
	if (! $conectado)
		return NULL;
	
	return $socket;
}
function privGenerarPaqueteCrearLogin($tipo, $mundo, $ip, $macaddress, $nombrepc, $md5, $ipse, $nick = null, $password = null) {
	$paquete = new PaqueteOUT ();
	
	$paquete->writeUInt8 ( SOLICITUD_INGRESO ); // IDENTIFICADOR DEL PAQUETE
	
	$paquete->writeUInt8 ( $tipo ); // TIPO DE SOLICITUD
	
	$paquete->writeUInt8 ( $mundo );
	
	$paquete->writeUInt32 ( $ip );
	$paquete->writeString ( $macaddress );
	$paquete->writeString ( $nombrepc );
	$paquete->writeString ( $md5 );
	$paquete->writeString ( $ipse ); // Direcciones IP excluidas;
	
	if ($tipo == LOGUEAR_PERSONAJE) {
		$paquete->writeString ( $nick );
		$paquete->writeString ( $password );
	}
	
	$paquete->cerrar ();
	
	return $paquete;
}
function generarPaqueteCrearPersonaje($mundo, $ip, $macaddress, $nombrepc, $md5, $ipse) {
	return privGenerarPaqueteCrearLogin ( CREAR_PERSONAJE, $mundo, $ip, $macaddress, utf8_decode ( $nombrepc ), $md5, $ipse );
}
function generarPaqueteLoguearPersonaje($mundo, $ip, $macaddress, $nombrepc, $md5, $nick, $password, $ipse) {
	return privGenerarPaqueteCrearLogin ( LOGUEAR_PERSONAJE, $mundo, $ip, $macaddress, utf8_decode ( $nombrepc ), $md5, $ipse, $nick, $password );
}
function obtenerIPSinCloudFlare() {
	// check ip from share internet
	if (! empty ( $_SERVER ['HTTP_CLIENT_IP'] )) {
		$ip = $_SERVER ['HTTP_CLIENT_IP'];
	} elseif (! empty ( $_SERVER ['HTTP_X_FORWARDED_FOR'] )) {
		$ip = $_SERVER ['HTTP_X_FORWARDED_FOR'];
	} else {
		$ip = $_SERVER ['REMOTE_ADDR'];
	}
	
	return $ip;
}
function obtenerIPUsuario() {
	if (isset ( $_SERVER ["HTTP_CF_CONNECTING_IP"] )) {
		return $_SERVER ["HTTP_CF_CONNECTING_IP"];
	} else {
		return obtenerIPSinCloudFlare ();
	}
}

/*
 * Script que re envia la información al login server real $resultado->error_tecnico=false; $resultado->habilitado=true; $resultado->ip = $ip; $resultado->puerto = $puerto; $resultado->hash = 'ABXHQDUKJAHGDQUSXKJGA';
 */
$accionesParametros = array (
		'CREAR' => array (
				'r',
				'm',
				'pc',
				'md' 
		),
		'INGRESAR' => array (
				'r',
				's',
				'u',
				'm',
				'pc',
				'md' 
		) 
);

// Leemos asi el $_POST ya que no viene con una clave.
$cadena = file_get_contents ( 'php://input' );
$clave = file_get_contents ( './config/clave.key' );
$claveHASH = file_get_contents ( './config/md5.key' );

$error = false;

if ($cadena !== '') {
	
	// Chequeamos que sea el cliente el que esta enviando la informacion y no otro software o un usuario
	
	$checksum = strtoupper ( substr ( md5 ( $cadena . $claveHASH ), 4, 11 ) );
	
	if ($_SERVER ['HTTP_USER_AGENT'] != $checksum) {
		$error = true;
	} else {
		
		$pc = new PC1 ();
		// Desencriptamos los datos
		$cadena = $pc->decrypt ( $cadena, $clave );
		unset ( $pc );
		$pc = null;
		
		// Parseamos los datos
		$datos = json_decode ( utf8_encode ( $cadena ), true );
		
		$datos ['pc'] = utf8_decode ( $datos ['pc'] );
		
		/*
		 * $fecha = date("d/m/Y H:i:s"); $archivo = fopen($_SERVER['DOCUMENT_ROOT'].'/eventos.log',"a+"); fwrite($archivo,$fecha.' '.obtenerIPUsuario ().':'.var_export ($datos, true).'\n'); fclose($archivo);
		 */
		
		if ($datos === null || ! esInformacionSuficiente ( $datos, $accionesParametros )) {
			$error = true;
		}
	}
} else {
	$error = true;
}

if ($error) {
	header ( 'HTTP/1.0 404 Not Found' );
	echo $config_ErrorPage;
	exit ();
}

/**
 * ****************************************
 * Estan los parametros OK
 */
$resultado = new stdClass ();
$error = false;

$paquete = null;

$accion = $datos ['accion'];

switch ($accion) {
	
	case 'INGRESAR' :
		
		$nick = $datos ['u'];
		$password = $datos ['p'];
		$mundo = intval ( $datos ['s'] );
		
		$macaddress = $datos ['m'];
		$nombrepc = $datos ['pc'];
		$md5 = $datos ['md'];
		
		if (isset ( $datos ['ipse'] )) {
			$ipse = $datos ['ipse'];
		} else {
			$ipse = "";
		}
		
		$ip = ip2long ( obtenerIPUsuario () );
		
		$paquete = generarPaqueteLoguearPersonaje ( $mundo, $ip, $macaddress, $nombrepc, $md5, $nick, $password, $ipse );
		
		break;
	
	case 'CREAR' :
		
		$mundo = intval ( $datos ['s'] );
		
		$macaddress = $datos ['m'];
		$nombrepc = $datos ['pc'];
		$md5 = $datos ['md'];
		
		if (isset ( $datos ['ipse'] )) {
			$ipse = $datos ['ipse'];
		} else {
			$ipse = "";
		}
		
		$ip = ip2long ( obtenerIPUsuario () );
		
		$paquete = generarPaqueteCrearPersonaje ( $mundo, $ip, $macaddress, $nombrepc, $md5, $ipse );
		break;
	
	default :
		$resultado->error_tecnico = true;
		echo json_encode ( $resultado );
		return 1;
}

// Obtenemos una conexion con el server
$socket = conectarLoginServer ();

// Nos conectamos
if ($socket !== NULL) {
	
	socket_write ( $socket, $paquete->getBuffer (), $paquete->obtenerLongitud () );
	
	unset ( $paquete ); // Marcamos que puede liberarlo ya mismo
	
	/**
	 * ******** RECIBIMOS LOS DATOS
	 */
	
	// Leemos la respuesta
	$paqueteRecibido = new PaqueteIN ();
	
	$error = false;
	do {
		
		$leido = socket_read ( $socket, 128 );
		
		// NOTA: $leido es vacio cuando ya no hay nada que leer,
		// lo que pasa en algunas ocaciones cuando se cierra el server, en vez de tirar error
		if ($leido === false || strlen ( $leido ) == 0) {
			$error = true;
		} else {
			$paqueteRecibido->agregarDatos ( $leido );
		}
	} while ( $error == false && ! $paqueteRecibido->isPaqueteCompleto () );
	
	if ($error === false) {
		$resultado->error_tecnico = false;
		$resultado->habilitado = $paqueteRecibido->readUInt8 ();
		
		if ($resultado->habilitado == 1) {
			$resultado->ip = long2ip ( $paqueteRecibido->readUInt32 () );
			$resultado->puerto = $paqueteRecibido->readUInt16 ();
			$resultado->hash = $paqueteRecibido->readString ();
			$resultado->semilla = $paqueteRecibido->readUInt8 ();
		} else {
			$resultado->razon = $paqueteRecibido->readUInt8 ();
		}
	} else {
		$resultado->error_tecnico = true;
	}
	
	unset ( $paqueteRecibido );
	// Cerramos
	socket_close ( $socket );
} else {
	$resultado->error_tecnico = true;
}

// Devolvemos el resultado en formato json que puede ser intepretado por el cliente
echo json_encode ( $resultado );

?>