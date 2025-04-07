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
        action.play();
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

document.addEventListener("keydown", function (event) {
    var keyCode = event.which;

    if (objetoImportado) {
        if (keyCode === 87) { // W
            objetoImportado.position.z -= 0.1;
            iniciarAnimacao();
        } else if (keyCode === 83) { // S
            objetoImportado.position.z += 0.1;
            iniciarAnimacao();
        } else if (keyCode === 65) { // A
            objetoImportado.position.x -= 0.1;
            iniciarAnimacao();
        } else if (keyCode === 68) { // D
            objetoImportado.position.x += 0.1;
            iniciarAnimacao();
        }
    }

    if (keyCode === 32) {
        objetoImportado.position.y += 1;
        for (var i = 0; i < 10; i++) 
        {
            objetoImportado.position.y = -0.1;
            sleep(1000); // Espera 1 segundo antes de continuar
        }
    }
});

document.addEventListener("keyup", function (event) {
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
    // relogio.getDelta() indica quanto tempo passou desde o último frame renderizado.
    if (mixerAnimacao) {
        mixerAnimacao.update(relogio.getDelta());
    }

    renderer.render(cena, camaraPerspectiva);

    requestAnimationFrame(loop);
}