// Plataforma Level 1 - usando o modelo "tentativa1.fbx"
import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

export function adicionarPlataformasELadders(cena, objetosColisao) {
    const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x552222 });
    const ladderMaterial = new THREE.MeshPhongMaterial({ color: 0x66ccff });

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

    // No Level 1, não criamos as plataformas do Level 2
    // Apenas mantemos as informações para colisão no getPlataformasInfo()
    
    // Removidas as escadas correspondentes ao PlataformLevel2

    // Carregar o modelo 3D "tentativa1.fbx"
    const importer = new FBXLoader();
    importer.load('./Objetos/tentativa1.fbx', function (object) {
        object.scale.set(0.03, 0.03, 0.03);
        object.position.set(1.5, -0.5, -6.0);
        object.rotation.set(-Math.PI / 2, 0, 0);
        // Adicionar uma propriedade para identificar este objeto como pertencente ao Level 1
        object.userData.levelId = 1;
        object.name = "level1_fbx_model";
        cena.add(object);
    });
}

// Função para definir as informações das plataformas para colisão e movimento
export function getPlataformasInfo() {
    return [
        { y: -10, xMin: -12, xMax: 12 },  // Bottom platform
        { y: -7, xMin: -12, xMax: 12 },   // Second platform
        { y: -4, xMin: -12, xMax: 12 },   // Third platform
        { y: -1, xMin: -12, xMax: 12 },   // Fourth platform
        { y: 2, xMin: -12, xMax: 12 },    // Fifth platform
        { y: 5, xMin: -12, xMax: 12 },    // Sixth platform
        { y: 8, xMin: -12, xMax: 12 }     // Top platform
    ];
}