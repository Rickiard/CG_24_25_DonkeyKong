import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { PointerLockControls } from 'PointerLockControls';

document.addEventListener('DOMContentLoaded', Start);

var cena = new THREE.Scene();

// Tamanhos e proporção
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 10;

// Câmera ortográfica lateral
var camaraOrto = new THREE.OrthographicCamera(
    (frustumSize * aspect) / -2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,
    100
);
camaraOrto.position.set(10, 0, 0);
camaraOrto.lookAt(0, 0, 0);

// Câmera perspectiva
var camaraPerspectiva = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
camaraPerspectiva.position.set(0, 0, 0);

// Câmera ativa
let cameraAtual = camaraPerspectiva;

var renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);
renderer.setClearColor(0xaaaaaa);
document.body.appendChild(renderer.domElement);

var geometriaCubo = new THREE.BoxGeometry(1, 1, 1);
var textura = new THREE.TextureLoader().load('./Images/boxImage.jpg');
var materialTextura = new THREE.MeshStandardMaterial({ map: textura });
var meshCubo = new THREE.Mesh(geometriaCubo, materialTextura);
meshCubo.translateZ(-6.0);

var objetoImportado;
var mixerAnimacao;
var relogio = new THREE.Clock();
var importer = new FBXLoader();

importer.load('./Objetos/Samba Dancing.fbx', function (object) {
    mixerAnimacao = new THREE.AnimationMixer(object);
    var action = mixerAnimacao.clipAction(object.animations[0]);
    action.play();

    object.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    object.scale.set(0.01, 0.01, 0.01);
    object.position.set(1.5, -0.5, -6.0);
    cena.add(object);
    objetoImportado = object;
});

// Controles para câmera perspectiva
const controls = new PointerLockControls(camaraPerspectiva, renderer.domElement);

controls.addEventListener('lock', function () {});
controls.addEventListener('unlock', function () {});

document.addEventListener(
    'click',
    function () {
        if (cameraAtual === camaraPerspectiva) {
            controls.lock();
        }
    },
    false
);

document.addEventListener("keydown", onDocumentKeyDown, false);

function onDocumentKeyDown(event) {
    var keyCode = event.which;

    if (keyCode === 87) {
        controls.moveForward(0.25);
    } else if (keyCode === 83) {
        controls.moveForward(-0.25);
    } else if (keyCode === 65) {
        controls.moveRight(-0.25);
    } else if (keyCode === 68) {
        controls.moveRight(0.25);
    } else if (keyCode === 32) {
        if (meshCubo.parent === cena) {
            cena.remove(meshCubo);
        } else {
            cena.add(meshCubo);
        }
    } else if (keyCode === 67) { // Tecla C para alternar câmeras
        if (cameraAtual === camaraPerspectiva) {
            cameraAtual = camaraOrto;
        } else {
            cameraAtual = camaraPerspectiva;
        }
    }
}

// Skybox
var texture_dir = new THREE.TextureLoader().load('./Skybox/posx.jpg');
var texture_esq = new THREE.TextureLoader().load('./Skybox/negx.jpg');
var texture_up = new THREE.TextureLoader().load('./Skybox/posy.jpg');
var texture_dn = new THREE.TextureLoader().load('./Skybox/negy.jpg');
var texture_bk = new THREE.TextureLoader().load('./Skybox/posz.jpg');
var texture_ft = new THREE.TextureLoader().load('./Skybox/negz.jpg');

var materialArray = [
    new THREE.MeshBasicMaterial({ map: texture_dir }),
    new THREE.MeshBasicMaterial({ map: texture_esq }),
    new THREE.MeshBasicMaterial({ map: texture_up }),
    new THREE.MeshBasicMaterial({ map: texture_dn }),
    new THREE.MeshBasicMaterial({ map: texture_bk }),
    new THREE.MeshBasicMaterial({ map: texture_ft })
];

materialArray.forEach(mat => mat.side = THREE.BackSide);

var skyboxGeo = new THREE.BoxGeometry(100, 100, 100);
var skybox = new THREE.Mesh(skyboxGeo, materialArray);
cena.add(skybox);

// Redimensionamento
window.addEventListener('resize', function () {
    const aspect = window.innerWidth / window.innerHeight;

    renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);

    camaraPerspectiva.aspect = aspect;
    camaraPerspectiva.updateProjectionMatrix();

    camaraOrto.left = (frustumSize * aspect) / -2;
    camaraOrto.right = (frustumSize * aspect) / 2;
    camaraOrto.top = frustumSize / 2;
    camaraOrto.bottom = frustumSize / -2;
    camaraOrto.updateProjectionMatrix();
});

function Start() {
    cena.add(meshCubo);

    var luzAmbiente = new THREE.AmbientLight(0xffffff);
    cena.add(luzAmbiente);

    var luzDirecional = new THREE.DirectionalLight(0xffffff, 1);
    luzDirecional.position.set(1, 1, 1).normalize();
    cena.add(luzDirecional);

    requestAnimationFrame(loop);
}

function cameraLookAtPersonagem(camera, alvo, offset = new THREE.Vector3(0, 2, 4)) {
    if (!alvo) return;

    // Posição desejada da câmera com base no offset
    const posAlvo = alvo.position.clone();
    const posCamera = posAlvo.clone().add(offset);

    // Posiciona a câmera (pode suavizar com .lerp se quiser)
    camera.position.copy(posCamera);

    // Faz a câmera olhar para o personagem
    camera.lookAt(posAlvo);
}


function loop() {
    meshCubo.rotateY(Math.PI / 180 * 1);        

    if (mixerAnimacao) {
        mixerAnimacao.update(relogio.getDelta());
    }

    if (cameraAtual === camaraPerspectiva && objetoImportado) {
        cameraLookAtPersonagem(camaraPerspectiva, objetoImportado);
    }    

    renderer.render(cena, cameraAtual);

    requestAnimationFrame(loop);
}
