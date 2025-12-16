const { init, readData } = require("./cliente_OPC_UA")
const { iniciarWebSocket, enviarATodos } = require("./websocket")
const axios = require("axios")

const opcua = require("node-opcua");

async function discoverServers(ldsUrl) {
    try {
        const servers = await opcua.findServers(ldsUrl);
        return servers;
    } catch(e) {
        console.error("Error descubriendo servidores:", e);
        return [];
    }
}


async function sendToBDD(data) {
    try {
        const response = await axios.post("http://3.238.250.34:3000/api/registrarDatos", data);
        console.log("Datos enviados a la base de datos:", response.data);
    } catch (error) {
        console.error("Error enviando datos a la base de datos:", error);
    }
}


const urls = ["opc.tcp://127.0.0.1:4840/robot1/","opc.tcp://127.0.0.1:4841/robot2/"]

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {

    const servers = await discoverServers("opc.tcp://localhost:4840");
    console.log("Discovered servers:", servers);
    console.log(typeof(servers.servers))
    const uris = servers.servers.map(server => server.applicationUri).flat();
    const urls = servers.servers.map(server => server.discoveryUrls).flat();
    console.log("Application URIs:", uris);
    console.log("Discovery URLs:", urls);

    await init(urls,uris)
    iniciarWebSocket(7777)
    while (true){
        try {
                
            const dataRobots = await readData("robots");
            const dataStations = await readData("stations");
            const data = {robots: dataRobots, stations: dataStations, };
            //un log bonito para mostrar los valores de los robots y estaciones en consola
            console.log("Robots:", data.robots);
            console.log("Stations:", data.stations);
            
            enviarATodos(data)
            await sendToBDD(data)
            await sleep(1000)
        }
        catch(e) {
            console.log(e)
        }
    }

}


main().catch(console.error);