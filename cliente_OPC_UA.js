const { OPCUAClient, AttributeIds } = require("node-opcua");

var robot_connections = {}
var robot_id = {}

var station_connections = {}
var station_id = {}

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

        console.log("Conectando a", endpointUrl);
        await client.connect(endpointUrl);
        console.log("Conectado a", endpointUrl);

        const session = await client.createSession();
        console.log("Sesión creada");

        return { client, session }

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
    const minOriginal = -10;
    const maxOriginal = 10;
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
        Posicion_X: x,
        Posicion_Y: y,
        Nivel_Bateria: Math.trunc(bateria),
        Temperatura_Bateria: await leerValor(session, "ns=2;i=6028"),
        Estado_Carga: await leerValor(session, "ns=2;i=6030"),
        
        // Cararceteristicas extras (Robot 2)
        Estado_Operativo: !(await leerValor(session, "ns=2;i=6029")),
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
            robotName = parseInt(station_id[url].slice(-1)) // obtener el id del robot desde el applicationUri

            const station = await chargeStation(session, robotName)
            data.push(station)
            
            continue
        }
        else if (type === "robots") {
            robotName = parseInt(robot_id[url].slice(-1)) // obtener el id del robot desde el applicationUri

            robot = await AGV(session, robotName)
            data.push(robot)
            continue
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



async function init(urls, uris) {
    // desde el 1 porque el 0 es el LDS
    for (var i = 1; i < urls.length; i++){
        try {
            
            var connection = await conectarAUnServidor(urls[i])
            if (connection) {
                if (urls[i].toLowerCase().includes("robot")) {
                    robot_connections[urls[i]] = connection;
                    robot_id[urls[i]] = uris[i];
                }
                if (urls[i].toLowerCase().includes("estacion")) {
                    station_connections[urls[i]] = connection;
                    station_id[urls[i]] = uris[i];
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