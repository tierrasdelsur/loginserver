function bytesToSize(bytes) {
	var sizes = [ "Bytes", "KB", "MB", "GB", "TB" ];
	if (bytes == 0)
		return 'n/a';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	if (i == 0)
		return bytes + ' ' + sizes[i];
	return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
};

function plurar(sustantivo, cantidad) {
	if (cantidad > 1) {
		sustantivo += "s";
	}
	return sustantivo;
}

function secondToTime(segundos) {
	var expresion = "";

	var unidadesTiempo = {
		dia : 86400,
		hora : 3600,
		minuto : 60,
		segundo : 1,
	};

	Object.keys(unidadesTiempo).forEach(function(unidad) {
		var i = Math.floor(segundos / unidadesTiempo[unidad]);
		var resto = segundos % unidadesTiempo[unidad];

		if (i > 0)
			expresion += i + ' ' + plurar(unidad, i) + ' ';

		segundos = resto;
	});

	return expresion;
};

// Integer de 32 bits
function ipv4ToInt(stringIP) {
	var ipParte = stringIP.split('.');
	return ((((((+ipParte[0]) * 256) + (+ipParte[1])) * 256) + (+ipParte[2])) * 256)
			+ (+ipParte[3]);
};

function intToIpv4(ipl) {
	// Re menduz!
	return ((ipl >>> 24) + '.' + (ipl >> 16 & 255) + '.' + (ipl >> 8 & 255)
			+ '.' + (ipl & 255));
};

function msToTime(milisegundos) {

	var tiempo = secondToTime((milisegundos / 1000 >> 0));

	return tiempo + (milisegundos % 1000) + " milisegundos";
}

function obtenerFechaString() {

	var ts_hms = new Date();

	var fecha = ts_hms.getDate() + "/" + (ts_hms.getMonth() + 1) + ' '
			+ ("0" + ts_hms.getHours()).substr(-2) + ':'
			+ ("0" + ts_hms.getMinutes()).substr(-2) + ':'
			+ ("0" + ts_hms.getSeconds()).substr(-2) + "."
			+ (Date.now() % 1000);

	return fecha;
}
/**
 * 
 * @returns La cantidad de segundos desde 1/1/1970.
 */
function obtenerTimeStamp() {
	return Math.round(Date.now() / 1000);
};

/* Exports */
exports.bytesToSize = bytesToSize;
exports.secondToTime = secondToTime;
exports.ipv4ToInt = ipv4ToInt;
exports.intToIpv4 = intToIpv4;
exports.obtenerTimeStamp = obtenerTimeStamp;
exports.msToTime = msToTime;
exports.obtenerFechaString = obtenerFechaString;
