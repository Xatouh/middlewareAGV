const WebSocket = require('ws');

let wss;  // Variable para guardar el servidor

function iniciarWebSocket(puerto) {
    wss = new WebSocket.Server({ 
        port: puerto,
        host: '0.0.0.0'
    });
    
    wss.on('connection', function(ws) {
        console.log('Cliente conectado');
    });
    
    console.log('Servidor WebSocket en puerto', puerto);
}

function enviarATodos(datos) {
    const clients = wss.clients
    for (const client of clients){
        if (client.readyState === WebSocket.OPEN){
            client.send(JSON.stringify(datos))
        }
    }
}

module.exports = { iniciarWebSocket, enviarATodos };