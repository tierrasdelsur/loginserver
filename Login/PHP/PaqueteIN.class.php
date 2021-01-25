<?php
class PaqueteIN {
	private $paquete;
	private $posPaqueteLectura;
	function PaqueteIN() {
		// Longitud del paquete
		$this->paquete = '';
		$this->posPaqueteLectura = 1;
	}
	function __destruct() {
		unset ( $paquete );
		$paquete = NULL;
	}
	function agregarDatos($binary) {
		$this->paquete .= $binary;
	}
	function isPaqueteCompleto() {
		$longitud = intval(unpack ( 'C', $this->paquete [0])[1]);
		return ($longitud < strlen ( $this->paquete ));
	}
	function readString() {
		$longitud = $this->readUInt8 ();
		
		$aux = $this->posPaqueteLectura;
		$this->posPaqueteLectura += $longitud;
		
		return substr ( $this->paquete, $aux, $longitud );
	}
	function readUInt8() {
		$valor = unpack ( "C", $this->paquete [$this->posPaqueteLectura] )[1];
		$this->posPaqueteLectura ++;
		return $valor;
	}
	function readUInt16() {
		$valor = unpack ( "S", substr($this->paquete, $this->posPaqueteLectura, 2))[1];
		$this->posPaqueteLectura += 2;
		return $valor;
	}
	function readUInt32() {
		$valor = unpack ( "L", substr($this->paquete, $this->posPaqueteLectura, 4))[1];

		$this->posPaqueteLectura += 4;
		return $valor;
	}
}

?>