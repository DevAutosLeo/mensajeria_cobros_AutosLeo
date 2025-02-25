let personasNoPagado = [];
// let tiempoLimiteQR = 20000;
let contadorTiempoQR;
let intervaloVerificacion;

function verificarArchivo() {
    // Limpiar la lista de personas no pagadas
    personasNoPagado = [];

    const inputArchivo = document.getElementById('inputArchivo');
    const archivo = inputArchivo.files[0];

    if (!archivo) {
        alert("No se ha seleccionado ningún archivo.");
        return;
    }

    // Leer el archivo de Excel
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const libro = XLSX.read(data, { type: 'array' });

            // Seleccionamos la primera hoja del archivo
            const hoja = libro.Sheets[libro.SheetNames[0]];

            // Convertimos la hoja a un formato legible
            const datos = XLSX.utils.sheet_to_json(hoja, { header: 1 });

            document.getElementById('verificarPagosBtn').style.display = 'inline-block';

            // Variable para almacenar las personas que no han pagado
            // let personasNoPagado = [];

            // Iteramos sobre las filas de datos (saltamos la fila de encabezado)
            for (let i = 1; i < datos.length; i++) {
                const fila = datos[i];

                // Obtener los valores de las columnas relevantes
                const columnaJ = fila[9]; // Columna J (índice 9)
                const columnaK = fila[10]; // Columna K (índice 10)
                const columnaL = fila[11]; // Columna L (índice 11)
                const columnaM = fila[12]; // Columna M (índice 12)
                const columnaN = fila[13]; // Columna N (índice 13)
                const columnaP = fila[15]; // Columna P (índice 15)
                const columnaQ = fila[16]; // Columna Q (índice 16)
                const columnaI = fila[8]; // Columna I (índice 8) - Fecha de creación

                // Verificar si hay alguna cuenta pendiente
                if (columnaJ > 0 || columnaK > 0 || columnaL > 0 || columnaM > 0 || columnaN > 0 || columnaP > 0) {
                    // Si la persona ya pagó, la omitimos
                    if (columnaQ === columnaJ || columnaQ === columnaK || columnaQ === columnaL || columnaQ === columnaM || columnaQ === columnaN || columnaQ === columnaP) {
                        continue; // Omite esta fila si la persona ha pagado
                    }
                } else {
                    // Si no hay pagos, se verifica la fecha
                    if (columnaI) {
                        // Convertimos la fecha de la columna I a un objeto Date
                        const fechaCreacion = new Date(columnaI);
                        const fechaActual = new Date();

                        // Calculamos la diferencia en días entre la fecha actual y la fecha de creación
                        const diferenciaTiempo = Math.floor((fechaActual - fechaCreacion) / (1000 * 60 * 60 * 24));

                        // Si la diferencia es positiva, la persona tiene retraso
                        if (diferenciaTiempo > 0) {
                            personasNoPagado.push({
                                nombre: fila[4], // Nombre de la persona
                                telefono: fila[5], // Teléfono de la persona
                                factura: fila[16], // Número de la factura
                                fechaCreacion: columnaI,
                                diasRetraso: diferenciaTiempo
                            });
                        }
                    }
                }
            }

            // Mostrar las personas que no han pagado en el modal
            if (personasNoPagado.length > 0) {
                mostrarEnModal(personasNoPagado);
                // Después de mostrar en el modal, habilitar el botón de Enviar Mensajes
                // document.getElementById('botonEnviarMensajes').style.display = 'inline-block';

                // Evento para enviar mensajes cuando el usuario haga clic en el botón
                document.getElementById('botonEnviarMensajes').addEventListener('click', function () {
                    enviarMensajes(personasNoPagado);
                });
            } else {
                // alert("No hay personas con facturas pendientes.");
                Swal.fire({
                    icon: 'info',
                    title: 'Sin resultados',
                    text: 'No hay personas con facturas pendientes.'
                });   
            }

        } catch (error) {
            // alert("Hubo un problema al procesar el archivo: " + error.message);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Hubo un problema al procesar el archivo.'
            });     
        }
    };

    reader.readAsArrayBuffer(archivo);
}

function mostrarEnModal(personasNoPagado) {
    let modalContenido = '';

    personasNoPagado.forEach(persona => {
        modalContenido += `
            <tr>
                <td>${persona.nombre}</td>
                <td>${persona.telefono}</td>
                <td>${persona.factura}</td>
                <td>${persona.fechaCreacion}</td>
                <td>${persona.diasRetraso} días de retraso</td>
            </tr>
        `;
    });

    document.getElementById('tablaModal').innerHTML = modalContenido;
    document.getElementById('modalPersonas').style.display = 'block';
    document.getElementById('botonLeerQR').style.display = 'inline-block';
    // Ocultar el botón "Enviar Mensajes"
    document.getElementById('botonEnviarMensajes').style.display = 'none';
}

function cerrarModal() {
    document.getElementById('modalPersonas').style.display = 'none';
}

// Función para manejar el clic en el botón "Leer QR"
document.getElementById('botonLeerQR').addEventListener('click', function() {

    // Limpiar la URL del QR anterior
    document.getElementById('codigoQR').src = '';
    document.getElementById('tooltipQR').style.display = 'none';
    // Limpiar cualquier verificación o temporizador anterior
    clearTimeout(contadorTiempoQR);
    clearInterval(intervaloVerificacion);
    // Ocultar el botón de enviar mensajes y el spinner mientras obtenemos el QR
    // document.getElementById('botonEnviarMensajes').style.display = 'none';
    document.getElementById('cargando').style.display = 'block';


    // Hacer la solicitud al servidor para obtener el código QR
    console.log("Haciendo solicitud para obtener el QR");

    // Agregar un parámetro único a la URL para evitar cache
    const timestamp = new Date().getTime();

    fetch(`https://mensajeria-cobros-autosleo.onrender.com/get-qrcode?timestamp=${timestamp}`)
        .then(response => response.json())
        .then(data => {
            console.log("Respuesta del servidor:", data);
            if (data.qrUrl) {
                console.log("URL del QR:", data.qrUrl);
                // Si recibimos la URL del QR, la mostramos en el contenedor
                document.getElementById('codigoQR').src = data.qrUrl;
                document.getElementById('tooltipQR').style.display = 'block'; // Mostrar el contenedor
                
                // Iniciar el temporizador para verificar si el QR se escane
                verificarWhatsappListo();
                // if (!whatsappListo) {
                //     iniciarTemporizadorQR();
                // }
            } else {
                console.error('No se recibió la URL del QR');
                Swal.fire({
                    icon: 'error',
                    title: 'QR no disponible',
                    text: 'No se recibió correctamente el QR. Por favor, genera un nuevo código QR.'
                });
                document.getElementById('cargando').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error al obtener el QR:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Hubo un problema al obtener el código QR. Verifica tu conexión y vuelve a intentarlo.'
            });
            document.getElementById('cargando').style.display = 'none';
        });
});


let whatsappListo = false;

// Función para verificar que WhatsApp este listo
// async function verificarWhatsappListo() {
//     // Mostrar el "spinner" cuando comience la verificación
//     document.getElementById('cargando').style.display = 'block';

//     intervaloVerificacion = setInterval(async () => {
//         try {
//             const response = await fetch('http://localhost:3000/whatsapp-ready');
//             const data = await response.json();
//             if (data.ready) {
//                 console.log('WhatsApp Web está listo');
//                 whatsappListo = true;

//                 // Detener el temporizador si WhatsApp está listo
//                 clearTimeout(contadorTiempoQR);
//                 clearInterval(intervaloVerificacion);

//                 document.getElementById('cargando').style.display = 'none';
//                 // Habilitar el botón "Enviar Mensajes" solo cuando WhatsApp esté listo
//                 document.getElementById('botonEnviarMensajes').style.display = 'inline-block';
//                 // Cerrar el tooltip QR una vez que WhatsApp esté listo
//                 cerrarTooltipQR();

//                 // clearTimeout(contadorTiempoQR);
//                 // Detener la verificación periódica
//                 // clearInterval(interval); // Detener la verificación cuando WhatsApp esté listo
//             } else {
//                 console.log('WhatsApp Web no está listo');
//             }
//         } catch (error) {
//             console.error('Error al verificar estado de WhatsApp:', error);
//         }
//     }, 10000); // Verificar cada 10 segundos
// }

// function iniciarTemporizadorQR() {
//     // Si WhatsApp ya está listo, no ejecutar el temporizador de caducidad
//     if (whatsappListo) {
//         console.log('WhatsApp ya está listo, no se inicia el temporizador de caducidad.');
//         return;
//     }

//     clearTimeout(contadorTiempoQR); // Limpiamos cualquier temporizador anterior

//     // Iniciar el temporizador para caducidad del QR
//     contadorTiempoQR = setTimeout(() => {
//         // Solo mostrar el mensaje de caducidad si WhatsApp no está listo
//         if (!whatsappListo) {
//             // alert("El tiempo para escanear el código QR ha caducado. Por favor, genera un nuevo código QR y escanéalo lo más pronto posible.");
//             Swal.fire({
//                 icon: 'warning',
//                 title: 'Tiempo caducado',
//                 text: 'El tiempo para escanear el código QR ha caducado. Por favor, genera un nuevo código QR y escanéalo lo más pronto posible.'
//             });

//             document.getElementById('cargando').style.display = 'none'; 
//             cerrarTooltipQR();
//             document.getElementById('botonEnviarMensajes').style.display = 'none';
//             document.getElementById('codigoQR').src = '';
//             // clearInterval(intervaloVerificacion); // Detener la verificación de WhatsApp si el QR caduca
//         }
//     }, 74000); // 74 segundos
// }

async function verificarWhatsappListo() {
    // Mostrar el "spinner" cuando comience la verificación
    document.getElementById('cargando').style.display = 'block';

    intervaloVerificacion = setInterval(async () => {
        try {
            const response = await fetch('https://mensajeria-cobros-autosleo.onrender.com/whatsapp-ready');
            const data = await response.json();
            if (data.ready) {
                console.log('WhatsApp Web está listo');
                whatsappListo = true;

                // Detener el temporizador si WhatsApp está listo
                clearTimeout(contadorTiempoQR);
                clearInterval(intervaloVerificacion);

                document.getElementById('cargando').style.display = 'none';
                // Habilitar el botón "Enviar Mensajes" solo cuando WhatsApp esté listo
                document.getElementById('botonEnviarMensajes').style.display = 'inline-block';
                // Cerrar el tooltip QR una vez que WhatsApp esté listo
                cerrarTooltipQR();

            } else {
                console.log('WhatsApp Web no está listo');
            }
        } catch (error) {
            console.error('Error al verificar estado de WhatsApp:', error);
        }
    }, 10000); // Verificar cada 10 segundos

    // Iniciar el temporizador para caducidad del QR si WhatsApp no está listo
    contadorTiempoQR = setTimeout(() => {
        // Solo mostrar el mensaje de caducidad si WhatsApp no está listo
        if (!whatsappListo) {
            // Mostrar el mensaje de caducidad
            Swal.fire({
                icon: 'warning',
                title: 'Tiempo caducado',
                text: 'El tiempo para escanear el código QR ha caducado. Por favor, genera un nuevo código QR y escanéalo lo más pronto posible.'
            });

            document.getElementById('cargando').style.display = 'none'; 
            cerrarTooltipQR();
            document.getElementById('botonEnviarMensajes').style.display = 'none';
            document.getElementById('codigoQR').src = '';
            // Detener la verificación de WhatsApp si el QR caduca
            clearInterval(intervaloVerificacion);
        }
    }, 120000); // 2 minutos
}


function cerrarTooltipQR() {
    document.getElementById('tooltipQR').style.display = 'none';

}

// Función para enviar los mensajes a las personas no pagadas
// function enviarMensajes(personasNoPagado) {
//     // Mostrar el "loading" mientras se envían los mensajes
//     const loading = document.getElementById('cargando');
//     const mensajeElement = loading.querySelector('p');
//     if (loading && mensajeElement) {
//         loading.style.display = 'block';  // Mostrar el spinner
//         mensajeElement.textContent = 'Enviando mensajes...';
//     }

//     // Deshabilitar los botones para evitar envíos múltiples
//     document.getElementById('botonLeerQR').disabled = true;
//     document.getElementById('botonEnviarMensajes').disabled = true;

//     let mensajesEnviados = 0;
//     let mensajesError = 0;

//     // Iteramos sobre cada persona que tiene pagos pendientes
//     personasNoPagado.forEach(persona => {

//         const mensaje = "Estimado(a) *" + persona.nombre + "*.\n\n" +
//         "Se le informa que tiene un retraso de *" + persona.diasRetraso + "* días en el pago de su compra en *AUTOSLEO*.\n\n" +
//         "Su saldo pendiente es: $ *" + persona.factura + "*.\n\n" +
//         "Le solicitamos amablemente que realice el pago lo antes posible.\n\n" +
//         "Gracias por su atención.";


//         fetch('https://mensajeria-cobros-autosleo.onrender.com/enviar-mensaje', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ telefono: persona.telefono, mensaje: mensaje })
//         })
//         .then(response => response.json())
//         .then(data => {
//             mensajesEnviados++;
//             console.log('Mensaje enviado a:', persona.telefono);
//             // Si todos los mensajes han sido enviados, ocultamos el spinner y habilitamos los botones
//             if (mensajesEnviados === personasNoPagado.length) {
//                 ocultarSpinnerYDeshabilitarBotones(true);

//                 setTimeout(cerrarSesionWhatsapp, 5000);
//             }
//         })
//         .catch(error => {
//             mensajesError++;
//             console.error('Error al enviar el mensaje:', error);
//             // Si hubo un error al enviar todos los mensajes, ocultamos el spinner y habilitamos los botones
//             if (mensajesError === personasNoPagado.length) {
//                 ocultarSpinnerYDeshabilitarBotones(false);
//             }
//         });
//     });
// }

// Función para enviar los mensajes a las personas no pagadas dos veces
function enviarMensajes(personasNoPagado) {
    // Mostrar el "loading" mientras se envían los mensajes
    const loading = document.getElementById('cargando');
    const mensajeElement = loading.querySelector('p');
    if (loading && mensajeElement) {
        loading.style.display = 'block';  // Mostrar el spinner
        mensajeElement.textContent = 'Enviando mensajes...';
    }

    // Deshabilitar los botones para evitar envíos múltiples
    document.getElementById('botonLeerQR').disabled = true;
    document.getElementById('botonEnviarMensajes').disabled = true;

    let mensajesEnviados = 0;
    let mensajesError = 0;

    // Iteramos sobre cada persona que tiene pagos pendientes
    personasNoPagado.forEach(persona => {

        const mensaje = "Estimado(a) *" + persona.nombre + "*.\n\n" +
        "Se le informa que tiene un retraso de *" + persona.diasRetraso + "* días en el pago de su compra en *AUTOSLEO*.\n\n" +
        "Su saldo pendiente es: $ *" + persona.factura + "*.\n\n" +
        "Le solicitamos amablemente que realice el pago lo antes posible.\n\n" +
        "Gracias por su atención.";

        // Enviar el mensaje dos veces
        [1, 2].forEach(() => {
            fetch('https://mensajeria-cobros-autosleo.onrender.com/enviar-mensaje', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telefono: persona.telefono, mensaje: mensaje })
            })
            .then(response => response.json())
            .then(data => {
                mensajesEnviados++;
                console.log('Mensaje enviado a:', persona.telefono);
                // Si todos los mensajes han sido enviados, ocultamos el spinner y habilitamos los botones
                if (mensajesEnviados === personasNoPagado.length * 2) {
                    ocultarSpinnerYDeshabilitarBotones(true);

                    setTimeout(cerrarSesionWhatsapp, 5000);
                }
            })
            .catch(error => {
                mensajesError++;
                console.error('Error al enviar el mensaje:', error);
                // Si hubo un error al enviar todos los mensajes, ocultamos el spinner y habilitamos los botones
                if (mensajesError === personasNoPagado.length * 2) {
                    ocultarSpinnerYDeshabilitarBotones(false);
                }
            });
        });
    });
}

function ocultarSpinnerYDeshabilitarBotones(exito) {
    const loading = document.getElementById('cargando');
    if (loading) {
        loading.style.display = 'none';  // Ocultar el spinner
    }

    // Los botones deben se ocultan después de enviar los mensajes
    document.getElementById('botonLeerQR').style.display = 'none';
    document.getElementById('botonEnviarMensajes').style.display = 'none';

    // Mostrar mensaje de éxito o error al usuario
    if (exito) {
        // alert('Los mensajes fueron enviados exitosamente.');
        Swal.fire({
            icon: 'success',
            title: 'Éxito',
            text: 'Los mensajes fueron enviados exitosamente.'
        });
          
    } else {
        // alert('Hubo un error al enviar los mensajes.');
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un error al enviar los mensajes.'
        });
          
    }
}

function cerrarSesionWhatsapp() {
    // Aquí haces la llamada a tu ruta para cerrar sesión
    fetch('https://mensajeria-cobros-autosleo.onrender.com/cerrar-sesion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Sesión cerrada correctamente:", data.message);

        Swal.fire({
            icon: 'success',
            title: 'Sesión cerrada',
            text: 'La sesión de WhatsApp se cerró correctamente. Si no se desvincula automáticamente en tu teléfono, ve a WhatsApp y desvincula la sesión manualmente.',
        }).then(() => {
            // Limpiar la URL del QR y refrescar la página
            document.getElementById('codigoQR').src = '';
            document.getElementById('tooltipQR').style.display = 'none';
            // Recargar la página
            location.reload();
        })
    })
    .catch(error => {
        console.error("Error al cerrar sesión:", error);

        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Hubo un problema al cerrar la sesión de WhatsApp.',
        });
    });
}