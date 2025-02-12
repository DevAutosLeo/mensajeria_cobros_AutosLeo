require('dotenv').config(); // Cargar variables de entorno desde .env

const express = require('express');
const cors = require('cors'); // Importa CORS
const { Client } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
const qrcode = require('qrcode');
const app = express();

// Usar CORS para permitir solicitudes del frontend
const corsOptions = {
    origin: 'https://mensajeria-cobros-autosleo.onrender.com',
    methods: 'GET,POST',
    allowedHeaders: 'Content-Type',
};

app.use(cors(corsOptions));

app.use(express.json());
// Archivos estáticos
app.use(express.static(__dirname));

// Inicializamos el cliente de WhatsApp
const client = new Client();

let whatsappListo = false;


// Solo generamos el QR cuando el cliente haga clic en el boton de WhatsApp
client.on('qr', (qr) => {
    console.log('QR generado:', qr);  // Este es el QR crudo de WhatsApp Web.
    
    // Convertimos el QR crudo a una URL base64
    qrcode.toDataURL(qr, (err, url) => {
        if (err) {
            console.error('Error al generar el QR:', err);  // Si hay algún error
            return;
        }
        // Almacenamos la URL del QR para enviarlo cuando el frontend lo solicite
        global.qrUrl = url;
        console.log('QR convertido a URL:', url);  // Esta es la URL base64
    });
});

client.on('ready', () => {
    console.log('WhatsApp Web está listo');
    whatsappListo = true; // Marcar que WhatsApp Web está listo
});

client.initialize();


// Ruta para obtener el QR generado
app.get('/get-qrcode', (req, res) => {
    console.log('Solicitud recibida para generar el QR');
    
    // Enviamos la URL del QR ya generado
    if (global.qrUrl) {
        res.json({ qrUrl: global.qrUrl });
    } else {
        res.status(500).json({ error: 'QR no disponible' });
    }
});

// app.get('/whatsapp-ready', (req, res) => {
//     // Verificar si WhatsApp Web está listo
//     if (client.pupPage && client.pupPage.isClosed() === false) {
//         res.json({ ready: true });
//     } else {
//         res.json({ ready: false });
//     }
// });

// Ruta para verificar si WhatsApp Web está listo
app.get('/whatsapp-ready', (req, res) => {
    // Responder si WhatsApp Web está listo o no
    res.json({ ready: whatsappListo });
});

// Función para formatear el número de teléfono
function formatearTelefono(telefono) {

    const telefonoString = telefono.toString();

    // Elimina cualquier caracter no numérico (como guiones o espacios)
    const telefonoFormateado = telefonoString.replace(/[^\d]/g, '');

    // Verifica si ya tiene el código de país +57 al inicio
    if (!telefonoFormateado.startsWith('57')) {
        // Si no lo tiene, añade el código de país (+57)
        return '57' + telefonoFormateado;  // Para Colombia
    }

    return telefonoFormateado;  // Ya tiene el código de país, lo dejamos como está
}

// Recibe los datos del frontend
app.post('/enviar-mensaje', async (req, res) => {
    const { telefono, mensaje } = req.body;

    // Formatear el número de teléfono
    const telefonoFormateado = formatearTelefono(telefono);

    console.log(`Enviando mensaje a ${telefonoFormateado}: ${mensaje}`);

    try {
        // Enviar el mensaje al chat correspondiente
        const chat = await client.getChatById(`${telefonoFormateado}@c.us`);
        await chat.sendMessage(mensaje);
        console.log('Mensaje enviado:', mensaje);
        res.status(200).json({ message: 'Mensaje enviado' });
    } catch (error) {
        console.error('Error al enviar el mensaje:', error);
        res.status(500).json({ error: 'Error al enviar el mensaje' });
    }
});

// Ruta para cerrar sesión
app.post('/cerrar-sesion', (req, res) => {
    if (client) {
        client.logout().then(() => {
            console.log("Sesión cerrada exitosamente.");
            res.status(200).json({ message: 'Sesión cerrada' });
        }).catch(err => {
            console.error("Error al cerrar sesión:", err);
            res.status(500).json({ error: 'Error al cerrar sesión' });
        });
    } else {
        res.status(400).json({ error: 'No se ha iniciado sesión' });
    }
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});


// app.listen(3000, () => {
//     console.log('Servidor corriendo en http://localhost:3000');
// });

