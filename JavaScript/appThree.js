import * as THREE from 'three';

import { FBXLoader } from 'FBXLoader';

import { PointerLockControls } from 'PointerLockControls';

document.addEventListener('DOMContentLoaded', Start);

var cena = new THREE.Scene();
var camara = new THREE.OrthographicCamera(-1, 1, 1, -1, -10, 1000);
var renderer = new THREE.WebGLRenderer();

var camaraPerspectiva = new THREE.PerspectiveCamera(45, 4 / 3, 0.1, 2000);

renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);
renderer.setClearColor(0xaaaaaa);

document.body.appendChild(renderer.domElement);

// Variável que guardará o objeto importado
var objetoImportado;

// Variável que irá guardar o controlador de animações do objeto importado
var mixerAnimacao;

// Variável que é responsável por controlar o tempo da aplicação
var relogio = new THREE.Clock();

// Variável com o objeto responsável por importar arquivos FBX
var importer = new FBXLoader();

importer.load('./Objetos/tentativa1.fbx', function (object) {

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
    object.scale.x = 0.03;
    object.scale.z = 0.03;
    object.scale.y = 0.03;

    // Mudamos a posição do objeto importado para que este não fique na mesma posição que o cubo.
    object.position.x = 1.5;
    object.position.y = -0.5;
    object.position.z = -6.0;
    object.rotation.x = -Math.PI / 2;


    // Guardamos o objeto importado na variável objetoImportado.
    objetoImportado = object;
});

importer.load('./Objetos/Samba Dancing.fbx', function (object) {
    object.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Adiciona o objeto importado à cena
    cena.add(object);

    // Ajusta escala e posição do objeto
    object.scale.set(0.01, 0.01, 0.01);
    object.position.set(1.5, -0.5, -6.0);
    object.rotation.y = Math.PI / 2;

    // Inicializa o mixer de animação
    mixerAnimacao = new THREE.AnimationMixer(object);

    // Obtém a primeira animação do modelo e a ativa
    if (object.animations.length > 0) {
        var action = mixerAnimacao.clipAction(object.animations[0]);
    }

    // Guarda o objeto importado
    objetoImportado = object;
});

// Carregamento das texturas para variáveis
var texture_dir = new THREE.TextureLoader().load('./Skybox/posx.jpg'); // Imagem da direita
var texture_esq = new THREE.TextureLoader().load('./Skybox/negx.jpg'); // Imagem da esquerda
var texture_up = new THREE.TextureLoader().load('./Skybox/posy.jpg');  // Imagem de cima
var texture_dn = new THREE.TextureLoader().load('./Skybox/negy.jpg');  // Imagem de baixo
var texture_bk = new THREE.TextureLoader().load('./Skybox/posz.jpg');  // Imagem da trás
var texture_ft = new THREE.TextureLoader().load('./Skybox/negz.jpg');  // Imagem de frente

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

var andando = false;

var pulando = false;
var velocidadeY = 0; // Velocidade vertical
var gravidade = -0.01; // Gravidade aplicada ao objeto
var direcaoPuloX = 0; // Direção no eixo X
var teclasPressionadas = {}; // Objeto para rastrear teclas pressionadas

document.addEventListener("keydown", function (event) {
    teclasPressionadas[event.which] = true; // Marca a tecla como pressionada

    // Inicia o pulo ao pressionar a barra de espaço
    if (teclasPressionadas[32] && !pulando) {
        pulando = true;
        velocidadeY = 0.2; // Define a velocidade inicial do pulo

        // Define a direção do pulo com base na posição atual
        if (teclasPressionadas[65]) { // Se estiver virado para a esquerda
            direcaoPuloX = -0.02; // Pulo para a esquerda
        } else if (teclasPressionadas[68]) { // Se estiver virado para a direita
            direcaoPuloX = 0.02; // Pulo para a direita
        } else {
            direcaoPuloX = 0; // Pulo vertical
        }
    }
});

document.addEventListener("keyup", function (event) {
    delete teclasPressionadas[event.which]; // Remove a tecla do rastreamento
    pararAnimacao();
});

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

function Start() {
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

    camaraPerspectiva.lookAt(camaraPerspectiva.position);

    requestAnimationFrame(loop);
}

function loop() {
    meshCubo.rotateY(Math.PI / 180 * 1);

    // Necessário atualizar o mixerAnimacao tendo em conta o tempo que passou desde o último update.
    if (mixerAnimacao) {
        mixerAnimacao.update(relogio.getDelta());
    }

    // Aplica a gravidade e atualiza a posição vertical e horizontal durante o pulo
    if (pulando) {
        velocidadeY += gravidade; // Aplica a gravidade
        objetoImportado.position.y += velocidadeY; // Atualiza a posição vertical
        objetoImportado.position.x += direcaoPuloX; // Atualiza a posição no eixo X

        // Verifica se o objeto atingiu o chão
        if (objetoImportado.position.y <= -0.5) {
            objetoImportado.position.y = -0.5; // Garante que o objeto não passe do chão
            pulando = false; // Reseta o estado de pulo
            velocidadeY = 0; // Reseta a velocidade vertical
            direcaoPuloX = 0; // Reseta a direção no eixo X
        }
    }

    // Permite que o personagem ande enquanto as teclas de direção estão pressionadas
    if (teclasPressionadas[65]) { // A (esquerda)
        objetoImportado.rotation.y = -Math.PI / 2; // Gira para a esquerda
        objetoImportado.position.x -= 0.01;
        iniciarAnimacao();
    }
    else if (teclasPressionadas[68]) { // D (direita)
        objetoImportado.rotation.y = Math.PI / 2; // Gira para a direita
        objetoImportado.position.x += 0.01;
        iniciarAnimacao();
    }
    else if (teclasPressionadas[87]) { // W (cima)
        objetoImportado.rotation.y = Math.PI; // Olhando para trás
        iniciarAnimacao();
    }

    renderer.render(cena, camaraPerspectiva);

    requestAnimationFrame(loop);
}