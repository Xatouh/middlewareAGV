const { init, readRobots } = require("./cliente_OPC_UA")
const { iniciarWebSocket, enviarATodos } = require("./websocket")

const urls = ["opc.tcp://127.0.0.1:4840/robot1/","opc.tcp://127.0.0.1:4841/robot2/"]

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    await init(urls)
    iniciarWebSocket(7777)
    while (true){
        try {
                
            const data = await readRobots();
            console.log(data)
            enviarATodos(data)
            await sleep(1000)
        }
        catch(e) {
            console.log(e)
        }
    }

}


main().catch(console.error);