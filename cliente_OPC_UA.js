const { OPCUAClient, AttributeIds } = require("node-opcua");

var robot_connections = {}

var station_connections = {}

var connections = {}
async function conectarAUnServidor(endpointUrl) {
    const client = OPCUAClient.create({
        connectionStrategy: {
            maxRetry: 3,
            initialDelay: 1000,
            maxDelay: 30000
        },
        requestedSessionTimeout: 60000, // 60 segundos
        operationTimeout: 10000 // 10 segundos por operación
    });
    
    try {
        // 1. Conectar
        console.log("Conectando a", endpointUrl);
        await client.connect(endpointUrl);
        console.log("Conectado a", endpointUrl);

        // 2. Crear Sesión
        const session = await client.createSession();
        console.log("Sesión creada");

        return { client, session }
        // ... hacer cosas ...

    } catch (err) {
        console.log("Error: no se pudo conectar a: ", endpointUrl);
    }
}

async function leerValor(session, nodeId) {
    const dataValue = await session.read({
        nodeId: nodeId,
        attributeId: AttributeIds.Value
    });
    
    return dataValue.value.value;
}

async function leerNombre(session, nodeId) {
    const dataValue = await session.read({
        nodeId: nodeId,
        attributeId: AttributeIds.BrowseName  // En lugar de .Value
    });
    return dataValue.value.value.name;  // El browseName tiene una propiedad .name
}

function mapear(valor, max) {
    const minOriginal = -3;
    const maxOriginal = 3;
    const minNuevo = 0;
    const maxNuevo = max;
    
    return (Math.trunc(Math.abs(((valor - minOriginal) / (maxOriginal - minOriginal)) * (maxNuevo - minNuevo) + minNuevo)));
}

async function browseChild(session, nodeId) {
    const browseResult = await session.browse(nodeId);
    
    const variables = [];
    for (const reference of browseResult.references) {
        variables.push({
            nombre: reference.browseName.name,
            nodeId: reference.nodeId.toString(),
            tipo: reference.nodeClass  // 1=Object, 2=Variable, etc.
        });
    }
    return variables;
}


async function AGV(session, id){
    const x = await leerValor(session, "ns=2;i=6025")
    const y = await leerValor(session, "ns=2;i=6026")
    const bateria = await leerValor(session, "ns=2;i=6027")
    return {
        id: id, 
        Posicion_X: mapear(x,960),
        Posicion_Y: mapear(y,640),
        Nivel_Bateria: Math.trunc(bateria),
        Temperatura_Bateria: await leerValor(session, "ns=2;i=6028"),
        Estado_Carga: await leerValor(session, "ns=2;i=6029"),
        
        Estado_Operativo: await leerValor(session, "ns=2;i=6030"),
        Temperatura_Motor: await leerValor(session, "ns=2;i=6031"),
    }
}

async function readData(type) {
    if (type === "robots") connections = robot_connections
    else if (type === "stations") connections = station_connections
    else return null

    const data = []
    var robotName = 1
    for (const url in connections) {

        const session = connections[url].session;

        if (type === "stations") {
            const station = await chargeStation(session, robotName)
            data.push(station)
            robotName++
            continue
        }
        else if (type === "robots") {
            robot = await AGV(session, robotName)
            data.push(robot)
            robotName++
        }
    }
    return {data}
}

async function chargeStation(session, id) {
    const x = await leerValor(session, "ns=2;i=6025")
    const y = await leerValor(session, "ns=2;i=6026")
    return {
        id: id, 
        Posicion_X: x,
        Posicion_Y: y,
        Uso_Energia: await leerValor(session, "ns=2;i=6031"),
        Temperatura: await leerValor(session, "ns=2;i=6027"),
        Estado: await leerValor(session, "ns=2;i=6028"),
        Carga_Rapida: await leerValor(session, "ns=2;i=6029"),
        //cooling
        //powerUsage
        //fast
    }
}



async function init(urls) {
    // desde el 1 porque el 0 es el LDS
    for (var i = 1; i < urls.length; i++){
        try {
            
            var connection = await conectarAUnServidor(urls[i])
            if (connection) {
                if (urls[i].toLowerCase().includes("robot")) {
                    robot_connections[urls[i]] = connection;
                }
                if (urls[i].toLowerCase().includes("estacion")) {
                    station_connections[urls[i]] = connection;
                }
            } else {
                console.log("Error: No se pudo realizar la conexión con el servidor "+ urls[i])
            }
            
    
        } catch(e) {
            console.log("Error:" + e)
        }
    }
}

module.exports = {init, readData}