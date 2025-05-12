
import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

export function adicionarPlataformasELadders(cena, objetosColisao) {
    const textureLoader = new THREE.TextureLoader();

    // TEXTURA PARA CHÃO (vermelho metálico)
    const texturaChao = textureLoader.load('./textures/platform_red.png');
    texturaChao.wrapS = THREE.RepeatWrapping;
    texturaChao.wrapT = THREE.RepeatWrapping;
    texturaChao.repeat.set(4, 1);

    const platformMaterial = new THREE.MeshPhongMaterial({
        map: texturaChao,
        side: THREE.DoubleSide
    });

    // TEXTURA PARA ESCADAS (azul com ranhuras)
    const texturaEscada = textureLoader.load('./textures/ladder_blue.png');
    texturaEscada.wrapS = THREE.RepeatWrapping;
    texturaEscada.wrapT = THREE.RepeatWrapping;
    texturaEscada.repeat.set(1, 2);

    const ladderMaterial = new THREE.MeshPhongMaterial({
        map: texturaEscada,
        side: THREE.DoubleSide
    });

    function criarPlataforma(x, y, largura = 12, altura = 0.4) {
        const geometry = new THREE.BoxGeometry(largura, altura, 1);
        const mesh = new THREE.Mesh(geometry, platformMaterial);
        mesh.position.set(x, y, -6);
        cena.add(mesh);
        objetosColisao.push(mesh);
    }

    function criarEscada(x, y, altura = 3.0) {
        const geometry = new THREE.BoxGeometry(0.3, altura, 0.5);
        const mesh = new THREE.Mesh(geometry, ladderMaterial);
        mesh.position.set(x, y, -5.9);
        cena.add(mesh);
    }

    const plataformas = [-10, -7, -4, -1, 2, 5, 8];
    plataformas.forEach(y => criarPlataforma(0, y, 24, 0.4));

    criarEscada(-8, -8.5);
    criarEscada(-4, -5.5);
    criarEscada(0, -2.5);
    criarEscada(4, 0.5);
    criarEscada(8, 3.5);
    criarEscada(-6, 6.5);

    const importer = new FBXLoader();
    importer.load('./Objetos/tentativa1.fbx', function (object) {
        object.scale.set(0.03, 0.03, 0.03);
        object.position.set(1.5, -0.5, -6.0);
        object.rotation.set(-Math.PI / 2, 0, 0);
        cena.add(object);
    });
}

export function getPlataformasInfo() {
    return [
        { y: -10, xMin: -12, xMax: 12 },
        { y: -7, xMin: -12, xMax: 12 },
        { y: -4, xMin: -12, xMax: 12 },
        { y: -1, xMin: -12, xMax: 12 },
        { y: 2, xMin: -12, xMax: 12 },
        { y: 5, xMin: -12, xMax: 12 },
        { y: 8, xMin: -12, xMax: 12 }
    ];
}
