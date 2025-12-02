const { OPCUAClient, AttributeIds } = require("node-opcua");

var connections = {}


async function conectarAUnServidor(endpointUrl) {
    const client = OPCUAClient.create({ endpointMustExist: false });
    
    try {
        // 1. Conectar
        await client.connect(endpointUrl);
        console.log("Conectado a", endpointUrl);

        // 2. Crear Sesión
        const session = await client.createSession();
        console.log("Sesión creada");

        return { client, session }
        // ... hacer cosas ...

    } catch (err) {
        console.log("Error:", err);
    }
}

async function leerValor(session, nodeId) {
    const dataValue = await session.read({
        nodeId: nodeId,
        attributeId: AttributeIds.Value
    });
    
    // console.log("Valor leído:", dataValue.value.value);
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
    const x = await leerValor(session, "ns=2;i=6022")
    const y = await leerValor(session, "ns=2;i=6023")
    const bateria = await leerValor(session, "ns=2;i=6024")
    return {
        id: id, 
        Posicion_X: mapear(x,960),
        Posicion_Y: mapear(y,640),
        Nivel_Bateria: Math.trunc(bateria),
        Temperatura_Bateria: await leerValor(session, "ns=2;i=6025"),
        
        // Estado_Operativo: await leerValor(session, "ns=1;i=1006"),
        Estado_Carga: await leerValor(session, "ns=2;i=6026"),
    }
}

async function readRobots() {
    const data = []
    var robotName = 1
    for (const url in connections) {

        const session = connections[url].session;
        robot = await AGV(session, robotName)
        data.push(robot)
        robotName++
    }
    return {data}
}

async function chargeStation(session, id) {
    const x = await leerValor(session, "ns=2;i=6022")
    const y = await leerValor(session, "ns=2;i=6023")
    return {
        id: id, 
        Posicion_X: mapear(x,960),
        Posicion_Y: mapear(y,640),
        Temperatura_Bateria: await leerValor(session, "ns=2;i=6024"),
        Estado_Carga: await leerValor(session, "ns=2;i=6025"),

        //cooling
        //powerUsage
        //fast
    }
}



async function init(urls) {
    
    for (var i = 0; i < urls.length; i++){
        try {
            
            var connection = await conectarAUnServidor(urls[i])
            if (connection) {
                connections[urls[i]] = connection;
            } else {
                console.log("Error: No se pudo realizar la conexión con el servidor "+ urls[i])
            }
            
    
        } catch(e) {
            console.log("Error:" + e)
        }
    }
}



module.exports = {init, readRobots}