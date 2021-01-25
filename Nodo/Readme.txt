**************************************************************
************** config.conf: Archivo general de configuracion *
**************************************************************

{ 
	"id":
		 Entero. Identiicador unico del nodo.
	"nombre": 
		String: nombre descriptivo del Nodo.
	"mundo": {
				id:
					Entero: identrificador del mundo con el cual proxea.
				ip: 
					String: direccion IP donde esta el servidor del juego
				puerto:
					Entero. Puerto donde esta el servidor del juego
		}
 	"nivelrequerido": 
 		Entero. nivel minimo que debe tener una persona para acceder al nodo.
 	"comunidades": 
 		Lista de enteros. Identificador de comunidades que pueden utilizar este nodo.
 						Comunidad ID 0: Acepta conexiones desde comunidades no indentificadas.
 		Vacio: Acepta todo tipo de comunidades o conexiones desde comunidades desconocidas.
 	"maximaCantidadUsuarios": 
 		Entero. Maxima cantidad de usuarios que puede soportar este nodo.
 	"prioridad": 
 		Entero. Prioridad que debe tener en cuenta el Login para asignar usuarios.
 	"ip_publica": 
 		String. Direccion IP que se entrega a los usuariospara conectarse al juego
 	"ip_privada"
 		String. Direccion IP en la cual escucha el nodo.
 	"puerto": 
 		Entero. Puerto en el cual atiende a los usuarios.
}
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