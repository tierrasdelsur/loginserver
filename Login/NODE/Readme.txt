
****************************************************************
****************************************************************
Localizador tiene que tener LECTURA sobre la tabla de 190.104.222.189

GRANT  SELECT
ON TABLE web.geolocalizacion_ip
TO usr_localizador IDENTIFIED BY '4554dajhyaaqAAD';


*****************************************************************
*****************************************************************
CuentasManager debe tener permisos de LECTURA sobre las columnas:
MESESCARGADOS, FECHAVENCIMIENTO, ID. Y ademas a la tabla cuentas_bloqueadas, 
con acceso de lectura a su ID.

GRANT SELECT (MESESCARGADOS, FECHAVENCIMIENTO, ID)
ON TABLE web.cuentas
TO usr_cuentaman IDENTIFIED BY '%';

GRANT SELECT (IDCUENTA)
ON TABLE web.cuentas_bloqueadas
TO usr_cuentaman;