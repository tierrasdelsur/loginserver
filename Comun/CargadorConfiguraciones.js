/**
 * Indicado un archivo de configuracion retorna un objeto que representa
 * al contenido del archivo en formato json
 * @param archivoConfiguracion
 * @returns objeto
 */
function cargarConfiguracion(archivoConfiguracion) {
	var fs = require('fs');
	var archivo = null;
	var config = null;

	try {
		archivo = fs.readFileSync(archivoConfiguracion, 'utf8');

		config = JSON.parse(archivo);

		archivo = null;

		return config;
	} catch (err) {

		var error = "Parece que el archivo '" + archivoConfiguracion
				+ "' no existe o está mal configurado.";

		throw new Error(error);
	} finally {
		archivo = null;
		config = null;
		fs = null;
	}
}

exports.cargarConfiguracion = cargarConfiguracion;