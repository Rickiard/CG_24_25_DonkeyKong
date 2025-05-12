// Plataforma Level 2 - criada com base na imagem e integrada no jogo
import * as THREE from 'three';

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

    // Plataformas (zig-zag)
    const yValues = [-10, -7, -4, -1, 2, 5, 8];
    yValues.forEach((y, i) => {
        const offset = (i % 2 === 0) ? -1 : 1;
        criarPlataforma(offset, y);
    });

    // Escadas baseadas na imagem
    const escadas = [
        { x: 0, y: -8.5 }, { x: 2, y: -5.5 }, { x: 0, y: -2.5 },
        { x: 2, y: 0.5 }, { x: 0, y: 3.5 }, { x: -1, y: 6.5 }, { x: 1, y: 6.5 }
    ];
    escadas.forEach(({ x, y }) => criarEscada(x, y));
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