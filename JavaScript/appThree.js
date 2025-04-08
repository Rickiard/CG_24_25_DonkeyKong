import * as THREE from 'three';

import { FBXLoader } from 'FBXLoader';

import { PointerLockControls } from 'PointerLockControls';

document.addEventListener('DOMContentLoaded', Start);

var cena = new THREE.Scene();
var camara = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 10);
var renderer = new THREE.WebGLRenderer();

var camaraPerspectiva = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 100);

renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);
renderer.setClearColor(0xaaaaaa);

document.body.appendChild(renderer.domElement);

var geometriaCubo = new THREE.BoxGeometry(1, 1, 1);

var textura = new THREE.TextureLoader().load('./Images/boxImage.jpg');
var materialTextura = new THREE.MeshStandardMaterial({ map: textura });

var meshCubo = new THREE.Mesh(geometriaCubo, materialTextura);
meshCubo.translateZ(-6.0);

// Variável que guardará o objeto importado
var objetoImportado;

// Variável que irá guardar o controlador de animações do objeto importado
var mixerAnimacao;

// Variável que é responsável por controlar o tempo da aplicação
var relogio = new THREE.Clock();

// Variável com o objeto responsável por importar arquivos FBX
var importer = new FBXLoader(); // Alterado em comparação com o tutorial original

importer.load('./Objetos/Samba Dancing.fbx', function (object) {
    // O mixerAnimacao é inicializado tendo em conta o objeto importado
    mixerAnimacao = new THREE.AnimationMixer(object);

    // object.animations é um array com todas as animações que o objeto trás quando é importado.
    // O que nós fazemos, é criar uma ação de animação tendo em conta a animação que é pretendida
    // De seguida é iniciada a reprodução da animação.
    var action = mixerAnimacao.clipAction(object.animations[0]);
    action.play();

    // object.traverse é uma função que percorre todos os filhos desse mesmo objeto.
    // O primeiro e único parâmetro da função é uma nova função que deve ser chamada para cada
    // filho. Neste caso, o que nós fazemos é ver se o filho tem uma mesh e, no caso de ter,
    // é indicado a esse objeto que deve permitir projetar e receber sombras, respetivamente.
    object.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Adiciona o objeto importado à cena
    cena.add(object);

    // Quando o objeto é importado, este tem uma escala de 1 nos três eixos (XYZ). Uma vez que
    // este é demasiado grande, mudamos a escala deste objeto para 0.01 em todos os eixos.
    object.scale.x = 0.01;
    object.scale.z = 0.01;
    object.scale.y = 0.01;

    // Mudamos a posição do objeto importado para que este não fique na mesma posição que o cubo.
    object.position.x = 1.5;
    object.position.y = -0.5;
    object.position.z = -6.0;

    // Guardamos o objeto importado na variável objetoImportado.
    objetoImportado = object;
});

// Definição da câmera e do renderizador a serem associados ao PointerLockControls
const controls = new PointerLockControls(camaraPerspectiva, renderer.domElement);

controls.addEventListener('lock', function () {
    // Possibilidade de programar comportamentos (ThreeJS ou mesmo HTML) quando
    // o PointerLockControls é ativado
});

controls.addEventListener('unlock', function () {
    // Possibilidade de programar comportamentos (ThreeJS ou mesmo HTML) quando
    // o PointerLockControls é desativado
});

// Ativação do PointerLockControls através do clique na cena
// Para desativar o PointerLockControls, basta pressionar a tecla Enter
document.addEventListener(
    'click',
    function () {
        controls.lock();
    },
    false
);

// Adiciona o listener que permite detectar quando uma tecla é premida
document.addEventListener("keydown", onDocumentKeyDown, false);

// Função que permite processar o evento de premir teclas e definir
// o seu respectivo comportamento
function onDocumentKeyDown(event) {
    var keyCode = event.which;

    // Comportamento para a tecla W
    if (keyCode === 87) {
        controls.moveForward(0.25);
    }

    // Comportamento para a tecla S
    else if (keyCode === 83) {
        controls.moveForward(-0.25);
    }

    // Comportamento para a tecla A
    else if (keyCode === 65) {
        controls.moveRight(-0.25);
    }

    // Comportamento para a tecla D
    else if (keyCode === 68) {
        controls.moveRight(0.25);
    }

    // Comportamento para a tecla Barra de Espaço
    else if (keyCode === 32) {
        // Verificar se o cubo está presente na cena.
        // Caso esteja, removemos. Caso contrário, adicionamos.
        if (meshCubo.parent === cena) {
            cena.remove(meshCubo);
        } else {
            cena.add(meshCubo);
        }
    }
}

// Carregamento das texturas para variáveis
var texture_dir = new THREE.TextureLoader().load('./Skybox/posx.png'); // Imagem da direita
var texture_esq = new THREE.TextureLoader().load('./Skybox/negx.png'); // Imagem da esquerda
var texture_up = new THREE.TextureLoader().load('./Skybox/posy.jpg');  // Imagem de cima
var texture_dn = new THREE.TextureLoader().load('./Skybox/negy.jpg');  // Imagem de baixo
var texture_bk = new THREE.TextureLoader().load('./Skybox/posz.jpg');  // Imagem da trás
var texture_ft = new THREE.TextureLoader().load('./Skybox/negz.png');  // Imagem de frente

// Array que vai armazenar as texturas
var materialArray = [];

// Associar as texturas carregadas ao array
materialArray.push(new THREE.MeshBasicMaterial({ map: texture_dir }));
materialArray.push(new THREE.MeshBasicMaterial({ map: texture_esq }));
materialArray.push(new THREE.MeshBasicMaterial({ map: texture_up }));
materialArray.push(new THREE.MeshBasicMaterial({ map: texture_dn }));
materialArray.push(new THREE.MeshBasicMaterial({ map: texture_bk }));
materialArray.push(new THREE.MeshBasicMaterial({ map: texture_ft }));

// Ciclo para fazer com que todas as texturas do array sejam aplicadas na parte interior do cubo
for (var i = 0; i < 6; i++) {
    materialArray[i].side = THREE.BackSide;
}

// Criação da geometria da skybox
var skyboxGeo = new THREE.BoxGeometry(100, 100, 100);

// Criação da mesh que vai conter a geometria e as texturas
var skybox = new THREE.Mesh(skyboxGeo, materialArray);

// Adicionar a Skybox à cena
cena.add(skybox);

function Start() {
    cena.add(meshCubo);

    // Criação de luz ambiente com tom branco
    var luzAmbiente = new THREE.AmbientLight(0xffffff);
    cena.add(luzAmbiente);

    // Criar uma luz direcional branca com intensidade 1
    var luzDirecional = new THREE.DirectionalLight(0xffffff, 1);
    // Define a posição da luz no espaço 3D e normaliza a direção da luz
    luzDirecional.position.set(1, 1, 1).normalize();
    // Adicionamos a luz à cena
    cena.add(luzDirecional);

    renderer.render(cena, camaraPerspectiva);

    requestAnimationFrame(loop);
}

function loop() {
    meshCubo.rotateY(Math.PI / 180 * 1);

    // Necessário atualizar o mixerAnimacao tendo em conta o tempo que passou desde o último update.
    // relogio.getDelta() indica quanto tempo passou desde o último frame renderizado.
    if (mixerAnimacao) {
        mixerAnimacao.update(relogio.getDelta());
    }

    renderer.render(cena, camaraPerspectiva);

    requestAnimationFrame(loop);
}