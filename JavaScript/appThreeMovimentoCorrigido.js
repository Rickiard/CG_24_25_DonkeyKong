import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { PointerLockControls } from 'PointerLockControls';

// Game state management
window.gameState = {
    isPaused: false,
    isInitialized: false,
    originalPosition: null,
    isGameOver: false,
    isWin: false,
    score: 0
};

// Function to update score display
function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = `Score: ${window.gameState.score}`;
}

// Global functions for menu control
window.startGame = function () {
    if (!window.gameState.isInitialized) {
        Start();
        window.gameState.isInitialized = true;
    }
    window.gameState.isPaused = false;
    window.gameState.isGameOver = false;
    window.gameState.isWin = false;
    window.gameState.score = 0;
    updateScoreDisplay();
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('winMenu').classList.add('hidden');
    loop();
};

window.pauseGame = function () {
    window.gameState.isPaused = true;
    if (objetoImportado) {
        window.gameState.originalPosition = objetoImportado.position.clone();
    }
};

window.resumeGame = function () {
    window.gameState.isPaused = false;
};

window.restartGame = function () {
    // Reset Mario's position and rotation
    if (objetoImportado) {
        objetoImportado.position.set(-10, -9.7, -3.0);
        objetoImportado.rotation.set(0, Math.PI / 2, 0);
    }

    // Reset game state
    window.gameState.isPaused = false;
    window.gameState.isGameOver = false;
    window.gameState.isWin = false;
    window.gameState.score = 0;
    updateScoreDisplay();

    // Reset barrel collisions and remove active barrels
    barrilColisao = false;
    barrisAtivos.forEach(barril => cena.remove(barril));
    barrisAtivos = [];

    // Hide menus
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('winMenu').classList.add('hidden');

    // Restart the game loop
    loop();
};

window.gameOver = function () {
    window.gameState.isGameOver = true;
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('finalScore').textContent = `Score: ${window.gameState.score}`;
};

window.gameWin = function () {
    window.gameState.isWin = true;
    document.getElementById('winMenu').classList.remove('hidden');
    document.getElementById('winScore').textContent = `Score: ${window.gameState.score}`;
};

document.addEventListener('DOMContentLoaded', function () {
    // Don't start the game automatically, wait for the start button
    window.gameState.isInitialized = false;
});

var cena = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
var camaraPerspectiva = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
var camaraOrto = new THREE.OrthographicCamera(
    window.innerWidth / -65, // left
    window.innerWidth / 65,  // right
    window.innerHeight / 65, // top
    window.innerHeight / -65, // bottom
    0.1,                      // near
    100                       // far
);

var cameraAtual = camaraPerspectiva; // Define a câmera inicial como a perspectiva

renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);
renderer.setClearColor(0xaaaaaa);
document.body.appendChild(renderer.domElement);

// Variáveis globais
var objetoImportado;
var mixerAnimacao;
var relogio = new THREE.Clock();
var andando = false;
var pulando = false;
var podePular = true; // New variable to track if Mario can jump
var velocidadeY = 0; // Velocidade vertical
var gravidade = -0.004; // Slightly increased gravity for faster fall
var forcaPulo = 0.12; // Reduced jump force for lower height
var velocidadeMovimento = 0.03; // Reduced movement speed (was 0.10)
var velocidadeMovimentoAr = 0.02; // Slower movement speed while in air
var teclasPressionadas = {}; // Objeto para rastrear teclas pressionadas
var teclasPressionadasAnterior = {}; // Track previous frame's key states
var raycaster = new THREE.Raycaster();
var objetosColisao = []; // Lista de objetos com os quais o personagem pode colidir
var animacaoAtual = null; // Track current animation
var plataformas = []; // Array to store platform information
var ultimoPulo = 0; // Track when the last jump occurred
var puloPendente = false; // Track if a jump is pending
// Variáveis globais para o barril
var barrilImportado;
var velocidadeBarrilY = 0; // Velocidade vertical do barril
var pulandoBarril = false;
var barrilColisao = false; // Flag para verificar se houve colisão com o barril
var barrisAtivos = [];
// Variáveis para os mixers de animação
var mixerPeach, mixerDonkeyKong;

// Configuração das coordenadas z do barril por plataforma
const barrilZPorPlataforma = {
    '-10': -3.3,  // Primeiro plano (base)
    '-7': -4.2,   // Segundo plano
    '-4': -5.0,   // Terceiro plano
    '-1': -5.9,   // Quarto plano
    '2': -6.6,    // Quinto plano
    '5': -8.4,    // Sexto plano
    '8': -3.0     // Sétimo plano (topo)
};

// Função para atualizar a coordenada z do barril
function atualizarZDoBarril(barril) {
    const alturaAtual = Math.round(barril.position.y);
    if (barrilZPorPlataforma[alturaAtual] !== undefined) {
        barril.position.z = barrilZPorPlataforma[alturaAtual];
    }
}

// Add TextureLoader
const textureLoader = new THREE.TextureLoader();
const marioTexture = textureLoader.load('./textures/mario_texture.png');  // Adjust path as needed

// Escadas (pontos onde os barris podem cair)
const posicoesEscadas = [
    { xMin: 9.8, xMax: 10.2, y: -7 },  // Primeiro plano
    { xMin: -7.2, xMax: -6.8, y: -4 }, // Segundo plano
    { xMin: 0.4, xMax: 0.6, y: -4 },   // Segundo plano
    { xMin: 1.8, xMax: 2.2, y: -1 },   // Terceiro plano
    { xMin: 9.8, xMax: 10.2, y: -1 },  // Terceiro plano
    { xMin: -2.2, xMax: -1.8, y: 2 },  // Quarto plano
    { xMin: -7.2, xMax: -6.8, y: 2 },  // Quarto plano
    { xMin: 9.8, xMax: 10.2, y: 5 },   // Quinto plano
    { xMin: 3.8, xMax: 4.2, y: 8 }     // Sexto plano
];



// Carregador FBX
var importer = new FBXLoader();
function carregarObjetoFBX(caminho, escala, posicao, rotacao, callback) {
    importer.load(caminho, function (object) {
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        object.scale.set(escala.x, escala.y, escala.z);
        object.position.set(posicao.x, posicao.y, posicao.z);
        object.rotation.set(rotacao.x, rotacao.y, rotacao.z);
        cena.add(object);

        if (callback) {
            callback(object);
        }
    });
}

carregarObjetoFBX(
    './Objetos/Mario.fbx',
    { x: 0.008, y: 0.008, z: 0.008 },
    { x: -10, y: -9.7, z: -3.0 },
    { x: 0, y: Math.PI / 2, z: 0 },
    function (object) {

        // Contagem de meshes para debug
        let contadorMeshes = 0;

        // Aplicar textura ao Mario
        object.traverse(function (child) {
            if (child.isMesh) {
                contadorMeshes++;

                // Criar material com a textura
                const materialTexturizado = new THREE.MeshPhongMaterial({
                    map: marioTexture,
                    side: THREE.DoubleSide
                });

                // Aplicar o material
                child.material = materialTexturizado;
            }
        });


        // Remover a esfera verde já que agora temos textura
        objetoImportado = object;
        if (object.animations.length > 0) {
            mixerAnimacao = new THREE.AnimationMixer(object);
            // Start with idle animation (assuming it's the first animation)
            animacaoAtual = mixerAnimacao.clipAction(object.animations[3]);
            animacaoAtual.play();
        }
        objetosColisao.push(object);
    }
);

function lançarBarril() {
    if (!barrilImportado) return;

    const novoBarril = barrilImportado.clone();
    novoBarril.position.set(-7, 5.25, barrilZPorPlataforma['8']); // Usar o z correto para a plataforma inicial
    novoBarril.rotation.set(Math.PI / 2, 0, 0);
    novoBarril.userData.velocidade = new THREE.Vector3(0.025, 0, 0);
    novoBarril.userData.plataformaAtual = 0;

    novoBarril.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    cena.add(novoBarril);
    barrisAtivos.push(novoBarril);
}

function carregarBarril(caminho, escala, posicao, rotacao) {
    importer.load(caminho, function (object) {
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        object.scale.set(escala.x, escala.y, escala.z);
        object.position.set(posicao.x, posicao.y, posicao.z);
        object.rotation.set(rotacao.x, rotacao.y, rotacao.z);

        objetosColisao.push(object);
        barrilImportado = object;
        cena.add(object); // Adicionar o barril à cena imediatamente
    });
}

carregarObjetoFBX('./Objetos/tentativa1.fbx', { x: 0.03, y: 0.03, z: 0.03 }, { x: 1.5, y: -0.5, z: -6.0 }, { x: -Math.PI / 2, y: 0, z: 0 });

importer.load('./Objetos/Donkey Kong.fbx', function (object) {
    object.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    object.scale.set(0.015, 0.015, 0.015);
    object.position.set(-6.5, 5.7, -9);

    // Configurar o mixer de animação para o Donkey Kong
    if (object.animations.length > 0) {
        mixerDonkeyKong = new THREE.AnimationMixer(object);
        const animacaoDonkeyKong = mixerDonkeyKong.clipAction(object.animations[0]); // Use a primeira animação
        animacaoDonkeyKong.loop = THREE.LoopRepeat; // Configurar para repetir
        animacaoDonkeyKong.play();
    }

    cena.add(object);

    // Lançar um barril a cada 3 segundos
    setInterval(() => {
        lançarBarril();
    }, 3000); // 3000 ms = 3 segundos
});

carregarObjetoFBX(
    './Objetos/peach.fbx',
    { x: 0.05, y: 0.05, z: 0.05 },
    { x: 0, y: 7.0, z: -9.5 },
    { x: 0, y: 0, z: 0 },
    function (object) {

        // Load textures
        const textureLoader = new THREE.TextureLoader();
        const bodyTexture = textureLoader.load('./textures/peach_body.png');
        const eyeTexture = textureLoader.load('./textures/peach_eye.0.png');

        // Contagem de meshes para debug
        let contadorMeshes = 0;

        // Apply appropriate textures based on mesh names
        object.traverse(function (child) {
            if (child.isMesh) {
                contadorMeshes++;

                // Create materials with textures
                if (child.name.toLowerCase().includes('eye')) {
                    // Eye material
                    child.material = new THREE.MeshPhongMaterial({
                        map: eyeTexture,
                        shininess: 50,
                        side: THREE.DoubleSide
                    });
                } else {
                    // Body material
                    child.material = new THREE.MeshPhongMaterial({
                        map: bodyTexture,
                        shininess: 30,
                        side: THREE.DoubleSide
                    });
                }
            }
        });

        // Configurar o mixer de animação para a Peach
        if (object.animations.length > 0) {
            mixerPeach = new THREE.AnimationMixer(object);
            const animacaoPeach = mixerPeach.clipAction(object.animations[0]); // Use a primeira animação
            animacaoPeach.loop = THREE.LoopRepeat; // Configurar para repetir
            animacaoPeach.play();
        }

        // Adicionar o objeto à cena explicitamente
        cena.add(object);
    }
);

// Skybox
function criarSkybox(caminhoTexturas, tamanho) {
    const loader = new THREE.TextureLoader();
    const materialArray = [
        new THREE.MeshBasicMaterial({ map: loader.load(caminhoTexturas.posx) }),
        new THREE.MeshBasicMaterial({ map: loader.load(caminhoTexturas.negx) }),
        new THREE.MeshBasicMaterial({ map: loader.load(caminhoTexturas.posy) }),
        new THREE.MeshBasicMaterial({ map: loader.load(caminhoTexturas.negy) }),
        new THREE.MeshBasicMaterial({ map: loader.load(caminhoTexturas.posz) }),
        new THREE.MeshBasicMaterial({ map: loader.load(caminhoTexturas.negz) }),
    ];

    materialArray.forEach(material => material.side = THREE.BackSide);

    const skyboxGeo = new THREE.BoxGeometry(tamanho, tamanho, tamanho);
    return new THREE.Mesh(skyboxGeo, materialArray);
}

const skybox = criarSkybox({
    posx: './Skybox/posx.png',
    negx: './Skybox/negx.png',
    posy: './Skybox/posy.jpg',
    negy: './Skybox/negy.jpg',
    posz: './Skybox/posz.png',
    negz: './Skybox/negz.png',
}, 100);
cena.add(skybox);

// Eventos de teclado
document.addEventListener("keydown", function (event) {
    // Don't process game controls if any menu is visible
    if (!document.getElementById('mainMenu').classList.contains('hidden') ||
        !document.getElementById('pauseMenu').classList.contains('hidden') ||
        !document.getElementById('gameOverMenu').classList.contains('hidden')) {
        return;
    }

    teclasPressionadas[event.which] = true;

    // Alternar entre câmeras ao pressionar "C"
    if (event.key === 'c' || event.key === 'C') {
        if (cameraAtual === camaraPerspectiva) {
            cameraAtual = camaraOrto;
        } else {
            cameraAtual = camaraPerspectiva;
        }
    }
});

document.addEventListener("keyup", function (event) {
    teclasPressionadas[event.which] = false;
    pararAnimacao();
    if (objetoImportado.rotation.y === Math.PI)
        objetoImportado.rotation.y = Math.PI / 2;
});

// Funções de animação
function iniciarAnimacao() {
    if (!andando && mixerAnimacao && objetoImportado.animations.length > 1) {
        // Stop current animation
        if (animacaoAtual) {
            animacaoAtual.stop();
        }
        // Start running animation (assuming it's the second animation)
        animacaoAtual = mixerAnimacao.clipAction(objetoImportado.animations[7]);
        animacaoAtual.play();
        andando = true;
    }

    // Adicionar o barril à cena quando a animação do personagem começar
    if (barrilImportado && !cena.children.includes(barrilImportado)) {
        cena.add(barrilImportado);
    }
}

function pararAnimacao() {
    if (andando && mixerAnimacao && objetoImportado.animations.length > 0) {
        // Stop current animation
        if (animacaoAtual) {
            animacaoAtual.stop();
        }
        // Start idle animation (assuming it's the first animation)
        animacaoAtual = mixerAnimacao.clipAction(objetoImportado.animations[3]);
        animacaoAtual.play();
        andando = false;
    }
}

// Atualizar posição do barril no loop
function atualizarBarril() {
    if (barrilImportado) {
        // Raycasting para verificar o chão
        raycaster.set(barrilImportado.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objetosColisao, true);
        const noChao = intersects.length > 0 && intersects[0].distance < 0.6;

        if (!noChao) {
            velocidadeBarrilY += gravidade;
            barrilImportado.position.y += velocidadeBarrilY;
        } else {
            if (pulandoBarril) {
                barrilImportado.position.y = barrilImportado.position.y;
                pulandoBarril = false;
                velocidadeBarrilY = 0;
            }
        }

        // Verificar colisão com o Mario
        if (objetoImportado && !barrilColisao) {
            const distancia = objetoImportado.position.distanceTo(barrilImportado.position);
            
            // Check if Mario is jumping over the barrel
            if (objetoImportado.position.y > barrilImportado.position.y + 1 && 
                Math.abs(objetoImportado.position.x - barrilImportado.position.x) < 1.5 &&
                Math.abs(objetoImportado.position.z - barrilImportado.position.z) < 1.5) {
                window.gameState.score += 100;
                updateScoreDisplay();
            }
            
            // Check for collision
            if (distancia < 1) {
                barrilColisao = true;
                window.gameOver();
            }
        }
    }
}

// Função principal
function Start() {
    // Retornar a câmera à posição original
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

    // Create platforms with specific boundaries
    const plataformasInfo = [
        { y: -10, xMin: -12, xMax: 12 },  // Bottom platform
        { y: -7, xMin: -12, xMax: 12 },   // Second platform
        { y: -4, xMin: -12, xMax: 12 },   // Third platform
        { y: -1, xMin: -12, xMax: 12 },   // Fourth platform
        { y: 2, xMin: -12, xMax: 12 },    // Fifth platform
        { y: 5, xMin: -12, xMax: 12 },    // Sixth platform
        { y: 8, xMin: -12, xMax: 12 }     // Top platform
    ];

    for (let i = 0; i < plataformasInfo.length; i++) {
        const info = plataformasInfo[i];
        const plano = criarChaoInvisivel(7, info.y, -3);
        plano.userData.plataformaInfo = info; // Store platform info
        cena.add(plano);
        objetosColisao.push(plano);
        plataformas.push(plano);
    }

    // Configuração da câmera perspectiva
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

    // Configuração da câmera ortográfica
    camaraOrto.position.set(0, 1, 5);
    camaraOrto.lookAt(0, 0, 0);

    // Luzes
    var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6); // Adjusted ambient light intensity
    cena.add(luzAmbiente);

    // Add multiple directional lights for better scene illumination
    var luzDirecional1 = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDirecional1.position.set(5, 10, 7).normalize();
    cena.add(luzDirecional1);

    var luzDirecional2 = new THREE.DirectionalLight(0xffffff, 0.4);
    luzDirecional2.position.set(-5, 8, -7).normalize();
    cena.add(luzDirecional2);

    // Add a soft hemisphere light for better ambient illumination
    var luzHemisferica = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
    cena.add(luzHemisferica);

    // Add the barrel at coordinates (13, -9, -3)
    carregarBarril('./Objetos/Barril.fbx', { x: 0.35, y: 0.35, z: 0.35 }, { x: -10, y: 5.7, z: -9 }, { x: 0, y: 0, z: 0 });

    requestAnimationFrame(loop);
}

function foraDaPlataforma(barril) {
    return barril.position.x <= -10 || barril.position.x >= 12;
}


// Loop de animação
function loop() {
    // Only update game if game is not paused, game over, or win
    if (window.gameState.isPaused || window.gameState.isGameOver || window.gameState.isWin) {
        requestAnimationFrame(loop);
        renderer.render(cena, cameraAtual);
        return;
    }

    const delta = relogio.getDelta();

    if (mixerAnimacao) {
        mixerAnimacao.update(delta);
    }
    if (mixerPeach) {
        mixerPeach.update(delta);
    }
    if (mixerDonkeyKong) {
        mixerDonkeyKong.update(delta);
    }

    if (objetoImportado) {
        // Raycasting para verificar o chão
        raycaster.set(objetoImportado.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objetosColisao, true);
        const noChao = intersects.length > 0 && intersects[0].distance < 0.1;

        // Get current platform info
        let plataformaAtual = null;
        if (intersects.length > 0) {
            plataformaAtual = intersects[0].object.userData.plataformaInfo;
        }

        if (!noChao) {
            velocidadeY += gravidade; // Aplica gravidade
            podePular = false; // Cannot jump while in the air
        } else {
            if (pulando) {
                pulando = false; // Reseta o estado de pulo ao tocar o chão
            }
            velocidadeY = 0; // Zera a velocidade vertical ao tocar o chão
            podePular = true; // Reset jump ability when on ground
            
            // Snap to platform height
            if (plataformaAtual) {
                objetoImportado.position.y = plataformaAtual.y + 0.1; // Small offset to prevent floating
            }

            // Process pending jump if we just landed
            if (puloPendente) {
                puloPendente = false;
                pulando = true;
                podePular = false;
                velocidadeY = forcaPulo;
                ultimoPulo = relogio.getElapsedTime();
            }
        }

        // Handle jump input in the loop for consistent behavior
        if (teclasPressionadas[32] && !teclasPressionadasAnterior[32]) { // Spacebar just pressed
            const tempoAtual = relogio.getElapsedTime();
            if (tempoAtual - ultimoPulo > 0.1) { // Minimum time between jumps
                if (podePular && !pulando) {
                    pulando = true;
                    podePular = false;
                    velocidadeY = forcaPulo;
                    ultimoPulo = tempoAtual;
                } else if (noChao) {
                    // If we're on the ground but can't jump yet, queue the jump
                    puloPendente = true;
                }
            }
        }

        // Atualiza a posição vertical do personagem
        objetoImportado.position.y += velocidadeY;

        // Prevent falling below platforms
        if (objetoImportado.position.y < -10) {
            objetoImportado.position.y = -10;
            velocidadeY = 0;
            pulando = false;
            podePular = true; // Reset jump ability when hitting bottom
        }

        // Check platform boundaries before horizontal movement
        if (plataformaAtual) {
            const novaPosicaoX = objetoImportado.position.x;
            if (novaPosicaoX < plataformaAtual.xMin) {
                objetoImportado.position.x = plataformaAtual.xMin;
            } else if (novaPosicaoX > plataformaAtual.xMax) {
                objetoImportado.position.x = plataformaAtual.xMax;
            }
        }

        // Movimentação baseada na câmera atual
        if (cameraAtual === camaraPerspectiva) {
            // Use different movement speed based on whether Mario is in the air
            const velocidadeAtual = noChao ? velocidadeMovimento : velocidadeMovimentoAr;

            // Movimentação na câmera perspectiva: W (frente) e S (trás)
            if (objetoImportado.rotation.y === -Math.PI / 2) {
                if (teclasPressionadas[68]) { // D (esquerda)
                    objetoImportado.rotation.y = Math.PI;
                    if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) &&
                        pulando === false) {
                        objetoImportado.position.y += 3.1;
                        objetoImportado.position.z -= 1;
                    }
                    iniciarAnimacao();
                }
            } else if (objetoImportado.rotation.y === Math.PI / 2) {
                if (teclasPressionadas[65]) { // A (esquerda)
                    objetoImportado.rotation.y = Math.PI;
                    if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) &&
                        pulando === false) {
                        objetoImportado.position.y += 3.1;
                        objetoImportado.position.z -= 1;
                    }
                    iniciarAnimacao();
                }
            }

            if (teclasPressionadas[87]) { // W (frente)
                objetoImportado.position.x += velocidadeAtual;
                objetoImportado.rotation.y = Math.PI / 2;
                iniciarAnimacao();
            } else if (teclasPressionadas[83]) { // S (trás)
                objetoImportado.position.x -= velocidadeAtual;
                objetoImportado.rotation.y = -Math.PI / 2;
                iniciarAnimacao();
            }
        } else if (cameraAtual === camaraOrto) {
            // Use different movement speed based on whether Mario is in the air
            const velocidadeAtual = noChao ? velocidadeMovimento : velocidadeMovimentoAr;

            if (teclasPressionadas[87]) { // W (frente)
                objetoImportado.rotation.y = Math.PI;
                if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) &&
                    pulando === false) {
                    objetoImportado.position.y += 3.1;
                    objetoImportado.position.z -= 1;
                }
                iniciarAnimacao();
            } else if (teclasPressionadas[83]) {
                objetoImportado.rotation.y = Math.PI;
                if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 11 && objetoImportado.position.y >= 8)) &&
                    pulando === false) {
                    objetoImportado.position.y -= 3;
                    objetoImportado.position.z += 1;
                }
                iniciarAnimacao();
            } else if (teclasPressionadas[65]) { // A (esquerda)
                objetoImportado.position.x -= velocidadeAtual;
                objetoImportado.rotation.y = -Math.PI / 2;
                iniciarAnimacao();
            } else if (teclasPressionadas[68]) { // D (direita)
                objetoImportado.position.x += velocidadeAtual;
                objetoImportado.rotation.y = Math.PI / 2;
                iniciarAnimacao();
            }
        }

        // Aplicar limites de paredes invisíveis em x = -10 e x = 12
        if (objetoImportado) {
            // Parede invisível em x = -10
            if (objetoImportado.position.x < -10) {
                objetoImportado.position.x = -10;
            }
            
            // Parede invisível em x = 12
            if (objetoImportado.position.x > 12) {
                objetoImportado.position.x = 12;
            }
        }

        // Atualizar posição do barril
        atualizarBarril();

        barrisAtivos.forEach((barril, index) => {
            // Remove o barril se estiver muito abaixo (fora da cena)
            if (barril.position.y < -10) {
                cena.remove(barril);
                barrisAtivos.splice(index, 1);
                return;
            }

            // Inicializa a plataforma atual se não existir
            if (barril.userData.plataformaAtual === undefined) {
                barril.userData.plataformaAtual = 0;
            }

            // Raycasting para verificar o chão
            raycaster.set(barril.position, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObjects(objetosColisao, true);
            const noChao = intersects.length > 0 && intersects[0].distance < 0.6;

            // Verifica se está sobre uma escada para a plataforma atual
            const laddersAtCurrentHeight = posicoesEscadas.filter(escada => {
                const alturaCorreta = Math.abs(barril.position.y - escada.y) < 0.5;
                const dentroDosLimites = barril.position.x >= escada.xMin && barril.position.x <= escada.xMax;
                return alturaCorreta && dentroDosLimites;
            });

            // Se estiver no ar, aplica gravidade
            if (!noChao) {
                barril.userData.velocidade.y += gravidade;
                barril.position.y += barril.userData.velocidade.y;
            } else {
                // Se estiver no chão
                if (laddersAtCurrentHeight.length > 0) {
                    // Randomly decide whether to fall down a ladder or continue moving
                    if (Math.random() < 0.1) { // 10% chance to fall down a ladder
                        // Randomly choose one of the available ladders
                        const chosenLadder = laddersAtCurrentHeight[Math.floor(Math.random() * laddersAtCurrentHeight.length)];

                        // Move to the chosen ladder's position
                        barril.position.x = (chosenLadder.xMin + chosenLadder.xMax) / 2;

                        // Fall down (descida como antes)
                        barril.position.y -= 3;
                        barril.position.z += 1.8;
                        barril.userData.plataformaAtual += 1;

                        // Alternate horizontal movement direction with reduced speed
                        barril.userData.velocidade.x = barril.userData.plataformaAtual % 2 === 0 ? 0.025 : -0.025;
                        console.log("Barril caiu na escada. Nova plataforma:", barril.userData.plataformaAtual, "Nova posição y:", barril.position.y);
                    } else {
                        // Continue moving horizontally
                        barril.position.x += barril.userData.velocidade.x;
                        // Manter barril rente ao plano
                        let alturasPlanos = [-10, -7, -4, -1, 2, 5, 8];
                        let planoMaisProximo = alturasPlanos.reduce((prev, curr) => Math.abs(curr - barril.position.y) < Math.abs(prev - barril.position.y) ? curr : prev);
                        let offset = planoMaisProximo <= 2 ? 0.01 : 0.125;
                        barril.position.y = planoMaisProximo + offset;
                    }
                } else {
                    // No ladders available, continue moving horizontally
                    barril.position.x += barril.userData.velocidade.x;
                    // Manter barril rente ao plano
                    let alturasPlanos = [-10, -7, -4, -1, 2, 5, 8];
                    let planoMaisProximo = alturasPlanos.reduce((prev, curr) => Math.abs(curr - barril.position.y) < Math.abs(prev - barril.position.y) ? curr : prev);
                    let offset = planoMaisProximo <= 2 ? 0.01 : 0.125;
                    barril.position.y = planoMaisProximo + offset;

                    // Verifica se atingiu os limites da plataforma
                    if (barril.position.x <= -10 || barril.position.x >= 12) {
                        // Limitar a posição do barril às paredes invisíveis
                        if (barril.position.x < -10) barril.position.x = -10;
                        if (barril.position.x > 12) barril.position.x = 12;
                        
                        // Fazer o barril descer para a próxima plataforma
                        barril.position.y -= 3;
                        barril.position.z += 1.8;
                        barril.userData.plataformaAtual += 1;
                        barril.userData.velocidade.x = barril.userData.plataformaAtual % 2 === 0 ? 0.025 : -0.025;
                    }
                }
            }
            // Check for collision with Mario using bounding box intersection
            if (objetoImportado && !barrilColisao) {
                // Create bounding boxes for Mario and the barrel
                const marioBox = new THREE.Box3().setFromObject(objetoImportado);
                const barrilBox = new THREE.Box3().setFromObject(barril);

                // Check if the bounding boxes intersect
                if (marioBox.intersectsBox(barrilBox)) {
                    // Check if Mario is jumping over the barrel
                    if (
                        objetoImportado.position.y > barril.position.y + 1 &&
                        Math.abs(objetoImportado.position.x - barril.position.x) < 1.5 &&
                        Math.abs(objetoImportado.position.z - barril.position.z) < 1.5
                    ) {
                        window.gameState.score += 100;
                        updateScoreDisplay();
                    } else {
                        // Collision detected
                        barrilColisao = true;
                        window.gameOver();
                    }
                }
            }

            // Atualizar a coordenada z do barril baseado na altura atual
            atualizarZDoBarril(barril);
        });
        
        // Check if Mario has reached the win position (2, 7, -9.5)
        if (objetoImportado) {
            // Check if Mario is at position (2, 7, -9.5) with some tolerance
            const marioPos = objetoImportado.position;
            if (Math.abs(marioPos.x - 2) < 1.0 && 
                Math.abs(marioPos.y - 7) < 1.0 && 
                Math.abs(marioPos.z - (-9.5)) < 1.0) {
                // Player has reached the win position
                window.gameWin();
            }
            
            // Also check proximity to Princess Peach as an alternative win condition
            const distanceToPeach = objetoImportado.position.distanceTo(new THREE.Vector3(0, 7, -9.5));
            if (distanceToPeach < 2.0) {
                // Player has reached Princess Peach
                window.gameWin();
            }
        }

        if (cameraAtual === camaraPerspectiva && objetoImportado && objetosColisao.length > 0) {
            atualizarCameraParaSeguirPersonagem(camaraPerspectiva, objetoImportado);
        }

        // Update previous key states
        teclasPressionadasAnterior = { ...teclasPressionadas };
    }

    renderer.render(cena, cameraAtual);
    requestAnimationFrame(loop);
}

const offsetCameraPerspectiva = new THREE.Vector3(0, 1, 5); // 1 unidade acima, 5 unidades atrás

function atualizarCameraParaSeguirPersonagem(camera, personagem) {
    const alturaOmbro = 1.6; // altura do ombro
    const distanciaAtras = 10.0; // distância atrás do personagem
    let deslocamentoLateral = 5; // ombro esquerdo por padrão

    // Verificar a direção do personagem com base na rotação
    if (personagem.rotation.y === -Math.PI / 2) { // Mario olhando para trás
        deslocamentoLateral = -5; // Alterar para o ombro direito
    } else {
        deslocamentoLateral = 5; // Voltar para o ombro esquerdo
    }

    // Direção "para trás" na rotação do personagem
    const direcaoAtras = new THREE.Vector3(0, 0, -1).applyQuaternion(personagem.quaternion).normalize();
    const lateralEsquerda = new THREE.Vector3(-1, 0, 0).applyQuaternion(personagem.quaternion).normalize();

    // Posição da câmera: atrás + para o lado (esquerda ou direita) + na altura do ombro
    const posicaoDesejada = personagem.position.clone()
        .add(direcaoAtras.multiplyScalar(distanciaAtras))
        .add(lateralEsquerda.multiplyScalar(deslocamentoLateral))
        .add(new THREE.Vector3(0, alturaOmbro, 0));

    // Define a posição da câmera diretamente
    camera.position.copy(posicaoDesejada);

    // Ponto para onde a câmera deve olhar (à frente do personagem)
    const direcaoFrente = new THREE.Vector3(0, 0, 1).applyQuaternion(personagem.quaternion).normalize();
    const pontoFoco = personagem.position.clone()
        .add(direcaoFrente.multiplyScalar(10))
        .add(new THREE.Vector3(0, alturaOmbro, 0));

    camera.lookAt(pontoFoco);
}

function criarChaoInvisivel(x, y, z) {
    // Usamos uma geometria MUITO grande simulando plano infinito
    const geometry = new THREE.PlaneGeometry(10000, 10000);

    // Material invisível
    const material = new THREE.MeshBasicMaterial({
        color: 0x0000000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const chao = new THREE.Mesh(geometry, material);

    // Posição e rotação como "chão"
    chao.position.set(x, y, z);
    chao.rotation.x = -Math.PI / 2;

    // Visível = true só pra garantir que o raycasting funcione
    chao.visible = true;

    // Extra: metadata útil
    chao.name = 'chaoInvisivel';
    chao.userData.isChao = true;
    chao.userData.interativo = true;

    return chao;
}