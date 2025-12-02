const { OPCUAServer, Variant, DataType, StatusCodes } = require("node-opcua");

const PORT = 4840;
const ROBOTNAME = "RobotMovil_AGV01";

// Robot state
const robotState = {
    posicionX: 400,
    posicionY: 400,
    nivelBateria: 100.0,
    temperaturaBateria: 25.0,
    estadoOperativo: false,  // false=Cargando, true=Movimiento
    estadoCarga: false       // false=Sin Carga, true=Llevando Objeto
};

// Simulation parameters
const GRID_SIZE = 640;
const BATTERY_DRAIN_RATE = 0.5;      // % per second while moving
const BATTERY_CHARGE_RATE = 2.0;     // % per second while charging
const LOW_BATTERY_THRESHOLD = 20;
const FULL_BATTERY_THRESHOLD = 95;

async function main() {
    const server = new OPCUAServer({
        port: PORT,
        resourcePath: "/UA/RobotServer",
        buildInfo: {
            productName: "RobotMovil OPC UA Server",
            buildNumber: "1.0.0",
            buildDate: new Date()
        }
    });

    await server.initialize();
    console.log("Servidor OPC UA inicializado");

    const addressSpace = server.engine.addressSpace;
    const namespace = addressSpace.getOwnNamespace();

    // Create DispositivoDePlanta folder
    const dispositivoFolder = namespace.addFolder(addressSpace.rootFolder.objects, {
        browseName: "DispositivoDePlanta"
    });

    // Create RobotMovil object
    const robotMovil = namespace.addObject({
        organizedBy: dispositivoFolder,
        browseName: ROBOTNAME
    });

    // ===== Variables heredadas de DispositivoDePlanta_Type =====
    namespace.addVariable({
        componentOf: robotMovil,
        browseName: "Posicion_X",
        dataType: "Int32",
        value: {
            get: () => new Variant({ dataType: DataType.Int32, value: robotState.posicionX })
        }
    });

    namespace.addVariable({
        componentOf: robotMovil,
        browseName: "Posicion_Y",
        dataType: "Int32",
        value: {
            get: () => new Variant({ dataType: DataType.Int32, value: robotState.posicionY })
        }
    });

    // ===== Variables específicas de RobotMovil_Type =====
    namespace.addVariable({
        componentOf: robotMovil,
        browseName: "Nivel_Bateria",
        dataType: "Double",
        value: {
            get: () => new Variant({ dataType: DataType.Double, value: robotState.nivelBateria })
        }
    });

    namespace.addVariable({
        componentOf: robotMovil,
        browseName: "Temperatura_Bateria",
        dataType: "Double",
        value: {
            get: () => new Variant({ dataType: DataType.Double, value: robotState.temperaturaBateria })
        }
    });

    namespace.addVariable({
        componentOf: robotMovil,
        browseName: "Estado_Operativo",
        dataType: "Boolean",
        value: {
            get: () => new Variant({ dataType: DataType.Boolean, value: robotState.estadoOperativo })
        }
    });

    namespace.addVariable({
        componentOf: robotMovil,
        browseName: "Estado_Carga",
        dataType: "Boolean",
        value: {
            get: () => new Variant({ dataType: DataType.Boolean, value: robotState.estadoCarga })
        }
    });

    // Start simulation
    startSimulation();

    await server.start();
    console.log(`Servidor OPC UA corriendo en: opc.tcp://localhost:${PORT}`);
    console.log("Presiona Ctrl+C para detener el servidor");
}

function startSimulation() {
    setInterval(() => {
        // Check battery level to determine operation mode
        if (robotState.nivelBateria <= LOW_BATTERY_THRESHOLD) {
            robotState.estadoOperativo = false; // Start charging
            robotState.estadoCarga = false;     // Drop cargo when charging
        } else if (robotState.nivelBateria >= FULL_BATTERY_THRESHOLD && !robotState.estadoOperativo) {
            robotState.estadoOperativo = true;  // Resume movement
        }

        if (robotState.estadoOperativo) {
            // Moving mode
            simulateMovement();
            robotState.nivelBateria = Math.max(0, robotState.nivelBateria - BATTERY_DRAIN_RATE);
            
            // Simulate picking up/dropping cargo randomly
            if (Math.random() < 0.02) {
                robotState.estadoCarga = !robotState.estadoCarga;
            }
            
            // Temperature increases while moving
            robotState.temperaturaBateria = Math.min(45, robotState.temperaturaBateria + 0.1);
        } else {
            // Charging mode
            robotState.nivelBateria = Math.min(100, robotState.nivelBateria + BATTERY_CHARGE_RATE);
            
            // Temperature decreases while charging
            robotState.temperaturaBateria = Math.max(20, robotState.temperaturaBateria - 0.2);
        }

        // Log current state
        console.log(`[Robot AGV01] Pos:(${robotState.posicionX},${robotState.posicionY}) | ` +
                    `Batería:${robotState.nivelBateria.toFixed(1)}% | ` +
                    `Temp:${robotState.temperaturaBateria.toFixed(1)}°C | ` +
                    `Estado:${robotState.estadoOperativo ? 'Movimiento' : 'Cargando'} | ` +
                    `Carga:${robotState.estadoCarga ? 'Sí' : 'No'}`);
    }, 1000);
}

function simulateMovement() {
    // Random movement within grid
    const direction = Math.floor(Math.random() * 4);
    switch (direction) {
        case 0: // Up
            robotState.posicionY = Math.min(GRID_SIZE, robotState.posicionY + 10);
            break;
        case 1: // Down
            robotState.posicionY = Math.max(0, robotState.posicionY - 10);
            break;
        case 2: // Right
            robotState.posicionX = Math.min(GRID_SIZE, robotState.posicionX + 10);
            break;
        case 3: // Left
            robotState.posicionX = Math.max(0, robotState.posicionX - 10);
            break;
    }
}

main().catch(console.error);
