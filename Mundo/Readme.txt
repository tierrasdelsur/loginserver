Editor json: http://jsonlint.com/
/**********************************************************/
/**************** CONF MUNDO ******************************/
{
    "id": 
    	Entero. Identificador unico del mundo.
    "nombre":
    	 String. Nombre que recibe el mundo,
    "premium": 
		Booleano. Indica si el mundo es solo accesible para usuarios Premium.
    "base": {
        "host": 
       		String. IP donde se encuentra la base de datos.
       	"port":
       		Entero. Puerto en donde se encuentra escuchando la base de datos.
        "user": 
        	String. Usuario para validarse frente a la base de datos.
        "password": 
        	String. Clave para validarse frente a la base de datos.
        "database": 
        	String. Base de datos en donde se encuentran las tablas a utilizar
        "queueLimit": ,
        	Entero. Cantidad de conexiones que pueden estar en la cola 
        	a la espera de ser atendidas por el motor del node-mysql.
        "connectionLimit": 
        	Entero. Cantidad de conexiones que pueden ser atendidas al mismo tiempo 
        	por el motor del node-mysql.
    }
}
**************************************************************
**************************************************************
**************************************************************
La base de datos debe tener permisos:
- Tabla de usuarios: 
--- Lectura sobre "usuarios" ID, IDCUENTA, ONLINE, NICKB, PASSWORD.
--- Insercion sobre "loginservers_permisos"

GRANT SELECT (ID, IDCUENTA, ONLINE, NICKB, PASSWORDB),
ON TABLE tds_principal.usuarios
TO usr_mundo IDENTIFIED BY '';

GRANT INSERT, DELECT, SELECT (FECHA) 
ON TABLE tds_principal.loginserver_permisos
TO usr_mundo IDENTIFIED BY '';
**************************************************************
************** Archivo de configuracion de login servers* ****
**************************************************************
[
    {
        "nombre": 
        			String. Nombre indicativo del login server 
        "ip": 
        			String. Direccion IP donde se encuentra escuchando el login server
        "puerto": 
        			Entero. Puerto donde se encuentra escuchando Nodos el login server.
        			
    }
]