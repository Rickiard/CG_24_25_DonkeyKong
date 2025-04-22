import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { PointerLockControls } from 'PointerLockControls';

document.addEventListener('DOMContentLoaded', Start);

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
var velocidadeY = 0; // Velocidade vertical
var gravidade = -0.01; // Gravidade aplicada ao objeto
var teclasPressionadas = {}; // Objeto para rastrear teclas pressionadas
var raycaster = new THREE.Raycaster();
var objetosColisao = []; // Lista de objetos com os quais o personagem pode colidir
// Variáveis globais para o barril
var barrilImportado;
var velocidadeBarrilY = 0; // Velocidade vertical do barril
var pulandoBarril = false;

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
    './Objetos/mario/Mario.fbx',
    { x: 0.01, y: 0.01, z: 0.01 },
    { x: -10, y: -9.7, z: -3.0 },
    { x: 0, y: Math.PI / 2, z: 0 },
    function (object) {
        console.log("Callback do Mario executado!");

        // Contagem de meshes para debug
        let contadorMeshes = 0;

        // Aplicar material roxo wireframe ao Mario
        object.traverse(function (child) {
            if (child.isMesh) {
                contadorMeshes++;

                // Criar um material roxo brilhante com wireframe
                const materialRoxo = new THREE.MeshBasicMaterial({
                    color: 0x8800FF,     // Roxo brilhante
                    side: THREE.DoubleSide,
                    wireframe: true       // Mostrar como wireframe igual à Peach
                });

                // Aplicar o material
                child.material = materialRoxo;
                console.log(`Material roxo wireframe aplicado à mesh ${contadorMeshes} do Mario`);
            }
        });

        console.log(`Total de meshes encontradas no Mario: ${contadorMeshes}`);

        // Adicionar uma esfera como marcador no centro do objeto
        const geometria = new THREE.SphereGeometry(0.5, 32, 32); // Tamanho proporcional ao Mario
        const material = new THREE.MeshBasicMaterial({
            color: 0x00FF00  // Verde brilhante (diferente da Peach que é vermelha)
        });
        const esfera = new THREE.Mesh(geometria, material);
        object.add(esfera);
        console.log("Esfera verde adicionada ao centro do Mario");

        // Adicionar luz pontual para destacar o Mario
        const luzMario = new THREE.PointLight(0xFFFFFF, 3, 10);
        luzMario.position.set(0, 2, 2);
        object.add(luzMario);

        objetoImportado = object;
        if (object.animations.length > 0) {
            mixerAnimacao = new THREE.AnimationMixer(object);
        }
        objetosColisao.push(object);

        // Adicionar uma caixa de bounding box
        const bbox = new THREE.Box3().setFromObject(object);
        const helper = new THREE.Box3Helper(bbox, 0x00FF00); // Verde para o Mario
        cena.add(helper);
        console.log("Mario visualizado com wireframe e bounding box");
    }
);

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
    });
}

carregarObjetoFBX('./Objetos/tentativa1.fbx', { x: 0.03, y: 0.03, z: 0.03 }, { x: 1.5, y: -0.5, z: -6.0 }, { x: -Math.PI / 2, y: 0, z: 0 });

importer.load('./Objetos/donkey/Donkey Kong.fbx', function (object) {
    object.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    object.scale.set(0.01, 0.01, 0.01);
    object.position.set(-7, 6, -6.0);
    cena.add(object);
});

console.log("Iniciando carregamento da Peach...");
carregarObjetoFBX(
    './Objetos/peach/peach.fbx',
    { x: 0.05, y: 0.05, z: 0.05 },
    { x: 0, y: 7, z: -9.0 },
    { x: 0, y: Math.PI / 2, z: 0 },   // Rotação de 90 graus para a direita (π/2 radianos no eixo Y)
    function (object) {
        console.log("Callback da Peach executado!");

        // Contagem de meshes para debug
        let contadorMeshes = 0;

        // Aplicar material azul ainda mais visível à Peach
        object.traverse(function (child) {
            if (child.isMesh) {
                contadorMeshes++;

                // Criar um material azul super brilhante
                const materialAzulBrilhante = new THREE.MeshBasicMaterial({
                    color: 0x00FFFF,       // Ciano vivo
                    side: THREE.DoubleSide,
                    wireframe: true         // Mostrar como wireframe para visualizar a estrutura
                });

                // Aplicar o material
                child.material = materialAzulBrilhante;
                console.log(`Material azul wireframe aplicado à mesh ${contadorMeshes} da Peach`);
            }
        });

        console.log(`Total de meshes encontradas na Peach: ${contadorMeshes}`);

        // Adicionar uma esfera como marcador no centro do objeto - também 10x maior
        const geometria = new THREE.SphereGeometry(5, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFF0000  // Vermelho brilhante
        });
        const esfera = new THREE.Mesh(geometria, material);
        object.add(esfera);
        console.log("Esfera vermelha grande adicionada ao centro da Peach");

        // Adicionar luz pontual para destacar a Peach - range maior
        const luzPeach = new THREE.PointLight(0xFFFFFF, 3, 50);
        luzPeach.position.set(0, 20, 20);
        object.add(luzPeach);

        cena.add(object);
        console.log("Peach rotacionada 90 graus para a direita");

        // Adicionar uma caixa de bounding box
        const bbox = new THREE.Box3().setFromObject(object);
        const helper = new THREE.Box3Helper(bbox, 0xFF00FF);
        cena.add(helper);
        console.log("Bounding box adicionada para visualizar tamanho e posição");
    }
);
carregarBarril('./Objetos/Barril.fbx', { x: 0.25, y: 0.25, z: 0.25 }, { x: 0, y: 0, z: -5.0 }, { x: 0, y: 0, z: 0 });


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
    teclasPressionadas[event.which] = true;

    // Alternar entre câmeras ao pressionar "C"
    if (event.key === 'c' || event.key === 'C') {
        if (cameraAtual === camaraPerspectiva) {
            cameraAtual = camaraOrto;
            console.log("Câmera alterada para ortográfica.");
        } else {
            cameraAtual = camaraPerspectiva;
            console.log("Câmera alterada para perspectiva.");
        }
    }

    if (teclasPressionadas[32] && !pulando) { // Barra de espaço
        pulando = true;
        velocidadeY = 0.2;
    }
});

document.addEventListener("keyup", function (event) {
    delete teclasPressionadas[event.which];
    pararAnimacao();
    if (objetoImportado.rotation.y === Math.PI)
        objetoImportado.rotation.y = Math.PI / 2;
});

// Funções de animação
function iniciarAnimacao() {
    if (!andando && mixerAnimacao) {
        var action = mixerAnimacao.clipAction(objetoImportado.animations[0]);
        action.play();
        andando = true;
    }

    // Adicionar o barril à cena quando a animação do personagem começar
    if (barrilImportado && !cena.children.includes(barrilImportado)) {
        console.log("Barril adicionado à cena.");
        cena.add(barrilImportado);
    }
}

function pararAnimacao() {
    if (andando && mixerAnimacao) {
        var action = mixerAnimacao.clipAction(objetoImportado.animations[0]);
        action.stop();
        andando = false;
    }

    // Remover o barril da cena quando a animação do personagem parar
    if (barrilImportado && cena.children.includes(barrilImportado)) {
        console.log("Barril removido da cena.");
        cena.remove(barrilImportado);
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
    }
}

// Função principal
function Start() {
    // Retornar a câmera à posição original
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const y = -10 + i * 3;
        const plano = criarChaoInvisivel(7, y, -3);

        cena.add(plano);
        objetosColisao.push(plano);
    }

    // Configuração da câmera perspectiva
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

    // Configuração da câmera ortográfica
    camaraOrto.position.set(0, 1, 5);
    camaraOrto.lookAt(0, 0, 0);

    // Luzes
    var luzAmbiente = new THREE.AmbientLight(0xffffff);
    cena.add(luzAmbiente);

    var luzDirecional = new THREE.DirectionalLight(0xffffff, 1);
    luzDirecional.position.set(5, 10, 7).normalize();
    cena.add(luzDirecional);

    requestAnimationFrame(loop);
}

// Loop de animação
function loop() {
    if (mixerAnimacao) {
        mixerAnimacao.update(relogio.getDelta());
    }

    if (objetoImportado) {
        // Raycasting para verificar o chão
        raycaster.set(objetoImportado.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objetosColisao, true);
        const noChao = intersects.length > 0 && intersects[0].distance < 0.1;

        console.log(objetoImportado.position.x);

        if (!noChao) {
            velocidadeY += gravidade; // Aplica gravidade
        } else {
            if (pulando) {
                pulando = false; // Reseta o estado de pulo ao tocar o chão
            }
            velocidadeY = 0; // Zera a velocidade vertical ao tocar o chão
        }

        if (teclasPressionadas[32] && !pulando && noChao) { // Barra de espaço (pulo)
            pulando = true;
            velocidadeY = 0.17; // Define a força inicial do pulo
        }

        // Atualiza a posição vertical do personagem
        objetoImportado.position.y += velocidadeY;

        // Movimentação baseada na câmera atual
        if (cameraAtual === camaraPerspectiva) {
            // Movimentação na câmera perspectiva: W (frente) e S (trás)
            if (objetoImportado.rotation.y === -Math.PI / 2) {
                if (teclasPressionadas[68]) { // D (esquerda)
                    objetoImportado.rotation.y = Math.PI;
                    if ((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) {
                        objetoImportado.position.y += 3.1;
                        objetoImportado.position.z -= 1;
                    }
                    iniciarAnimacao();
                }
            } else if (objetoImportado.rotation.y === Math.PI / 2) {
                if (teclasPressionadas[65]) { // A (esquerda)
                    objetoImportado.rotation.y = Math.PI;
                    if ((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) {
                        objetoImportado.position.y += 3.1;
                        objetoImportado.position.z -= 1;
                    }
                    iniciarAnimacao();
                }
            }

            if (teclasPressionadas[17]) { // tecla CTRL
                if ((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 11 && objetoImportado.position.y >= 8)) {
                    objetoImportado.position.y -= 3;
                    objetoImportado.position.z += 1;
                }
                iniciarAnimacao();
            }

            if (teclasPressionadas[87]) { // W (frente)
                objetoImportado.position.x += 0.10; // Move para a direita
                objetoImportado.rotation.y = Math.PI / 2;
                iniciarAnimacao();
            } else if (teclasPressionadas[83]) { // S (trás)
                objetoImportado.position.x -= 0.10; // Move para a esquerda
                objetoImportado.rotation.y = -Math.PI / 2;
                iniciarAnimacao();
            }
        } else if (cameraAtual === camaraOrto) {
            // Movimentação na câmara ortográfica: A (esquerda) e D (direita)
            if (teclasPressionadas[87]) { // W (frente)
                objetoImportado.rotation.y = Math.PI;
                if ((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) {
                    objetoImportado.position.y += 3.1;
                    objetoImportado.position.z -= 1;
                }
                iniciarAnimacao();
            } else if (teclasPressionadas[83]) {
                objetoImportado.rotation.y = Math.PI;
                if ((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 11 && objetoImportado.position.y >= 8)) {
                    objetoImportado.position.y -= 3;
                    objetoImportado.position.z += 1;
                }
                iniciarAnimacao();
            } else if (teclasPressionadas[65]) { // A (esquerda)
                objetoImportado.position.x -= 0.10; // Move para a esquerda
                objetoImportado.rotation.y = -Math.PI / 2;
                iniciarAnimacao();
            } else if (teclasPressionadas[68]) { // D (direita)
                objetoImportado.position.x += 0.10; // Move para a direita
                objetoImportado.rotation.y = Math.PI / 2;
                iniciarAnimacao();
            }
        }


        // Atualizar posição do barril
        atualizarBarril();

        if (cameraAtual === camaraPerspectiva && objetoImportado && objetosColisao.length > 0) {
            atualizarCameraParaSeguirPersonagem(camaraPerspectiva, objetoImportado);
        }
    }

    renderer.render(cena, cameraAtual); // Renderiza com a câmera atual
    requestAnimationFrame(loop);
}

const offsetCameraPerspectiva = new THREE.Vector3(0, 1, 5); // 1 unidade acima, 5 unidades atrás

function atualizarCameraParaSeguirPersonagem(camera, personagem) {
    const alturaOmbro = 1.6; // altura do ombro
    const distanciaAtras = 10.0; // distância atrás do personagem
    const deslocamentoLateral = 5; // ombro esquerdo

    // Direção "para trás" na rotação do personagem
    const direcaoAtras = new THREE.Vector3(0, 0, -1).applyQuaternion(personagem.quaternion).normalize();
    const lateralEsquerda = new THREE.Vector3(-1, 0, 0).applyQuaternion(personagem.quaternion).normalize();

    // Posição da câmera: atrás + para o lado (esquerda) + na altura do ombro
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