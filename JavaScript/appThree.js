import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { PointerLockControls } from 'PointerLockControls';

document.addEventListener('DOMContentLoaded', Start);

var cena = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
var camaraPerspectiva = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);

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
var direcaoPuloX = 0; // Direção no eixo X
var teclasPressionadas = {}; // Objeto para rastrear teclas pressionadas

// Carregador FBX
var importer = new FBXLoader();

// Função para carregar objetos FBX
function carregarObjetoFBX(caminho, escala, posicao, rotacao) {
    importer.load(caminho, function (object) {
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        cena.add(object);
        object.scale.set(escala.x, escala.y, escala.z);
        object.position.set(posicao.x, posicao.y, posicao.z);
        object.rotation.set(rotacao.x, rotacao.y, rotacao.z);

        if (object.animations.length > 0) {
            mixerAnimacao = new THREE.AnimationMixer(object);
            var action = mixerAnimacao.clipAction(object.animations[0]);
            action.play();
        }

        objetoImportado = object;
    });
}

// Carregar objetos
carregarObjetoFBX('./Objetos/tentativa1.fbx', { x: 0.03, y: 0.03, z: 0.03 }, { x: 1.5, y: -0.5, z: -6.0 }, { x: -Math.PI / 2, y: 0, z: 0 });
carregarObjetoFBX('./Objetos/Samba Dancing.fbx', { x: 0.01, y: 0.01, z: 0.01 }, { x: 1.5, y: -0.5, z: -6.0 }, { x: 0, y: Math.PI / 2, z: 0 });

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
    posx: './Skybox/posx.jpg',
    negx: './Skybox/negx.jpg',
    posy: './Skybox/posy.jpg',
    negy: './Skybox/negy.jpg',
    posz: './Skybox/posz.jpg',
    negz: './Skybox/negz.jpg',
}, 100);
cena.add(skybox);

// Eventos de teclado
document.addEventListener("keydown", function (event) {
    teclasPressionadas[event.which] = true;

    if (teclasPressionadas[32] && !pulando) { // Barra de espaço
        pulando = true;
        velocidadeY = 0.2;

        if (teclasPressionadas[65]) { // A (esquerda)
            direcaoPuloX = -0.02;
        } else if (teclasPressionadas[68]) { // D (direita)
            direcaoPuloX = 0.02;
        } else {
            direcaoPuloX = 0;
        }
    }
});

document.addEventListener("keyup", function (event) {
    delete teclasPressionadas[event.which];
    pararAnimacao();
});

// Funções de animação
function iniciarAnimacao() {
    if (!andando && mixerAnimacao) {
        var action = mixerAnimacao.clipAction(objetoImportado.animations[0]);
        action.play();
        andando = true;
    }
}

function pararAnimacao() {
    if (andando && mixerAnimacao) {
        var action = mixerAnimacao.clipAction(objetoImportado.animations[0]);
        action.stop();
        andando = false;
    }
}

// Função principal
function Start() {
    // Configuração da câmera
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

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

    if (pulando) {
        velocidadeY += gravidade;
        objetoImportado.position.y += velocidadeY;
        objetoImportado.position.x += direcaoPuloX;

        if (objetoImportado.position.y <= -0.5) {
            objetoImportado.position.y = -0.5;
            pulando = false;
            velocidadeY = 0;
            direcaoPuloX = 0;
        }
    }

    if (teclasPressionadas[65]) { // A (esquerda)
        objetoImportado.rotation.y = -Math.PI / 2;
        objetoImportado.position.x -= 0.01;
        iniciarAnimacao();
    } else if (teclasPressionadas[68]) { // D (direita)
        objetoImportado.rotation.y = Math.PI / 2;
        objetoImportado.position.x += 0.01;
        iniciarAnimacao();
    } else if (teclasPressionadas[87]) { // W (cima)
        objetoImportado.rotation.y = Math.PI;
        iniciarAnimacao();
    }

    renderer.render(cena, camaraPerspectiva);
    requestAnimationFrame(loop);
}