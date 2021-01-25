<?php
class PaqueteOUT {
	private $paquete;
	function PaqueteOUT() {
		// Longitud del paquete
		$this->paquete = pack ( "C", 0 );
		$posPaqueteLectura = 0;
	}
	function __destruct() {
		unset ( $paquete );
		$paquete = NULL;
	}
	function cerrar() {
		$this->paquete [0] = pack ( "C", $this->obtenerLongitud () - 1 );
	}
	function obtenerLongitud() {
		return strlen ( $this->paquete );
	}
	function writeString($string) {
		$len = strlen ( $string );
		$this->paquete .= pack ( "Ca{$len}", $len, $string );
	}
	function writeUInt8($valor) {
		$this->paquete .= pack ( "C", $valor );
	}
	function writeUInt16($valor) {
		$this->paquete .= pack ( "S", $valor );
	}
	function writeUInt32($valor) {
		$this->paquete .= pack ( "L", $valor );
	}
	function toString() {
		$representacion = 'Longitud ' . $this->obtenerLongitud () . ' bytes.<br/>';
		
		for($i = 0; $i < strlen ( $this->paquete ); $i ++) {
			$representacion .= "[$i]" . ord ( $this->paquete [$i] ) . '<br/>';
		}
		
		return $representacion;
	}
	function getBuffer() {
		return $this->paquete;
	}
}

?>