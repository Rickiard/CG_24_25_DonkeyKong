// Plataforma Level 2 - criada com base na imagem e integrada no jogo
import * as THREE from 'three';

export function adicionarPlataformasELadders(cena, objetosColisao) {
    const platformMaterial = new THREE.MeshPhongMaterial({ color: 0x552222 });
    const ladderMaterial = new THREE.MeshPhongMaterial({ color: 0x66ccff });

    function criarPlataforma(x, y, largura = 12, altura = 0.4) {
        const geometry = new THREE.BoxGeometry(largura, altura, 1);
        const mesh = new THREE.Mesh(geometry, platformMaterial);
        mesh.position.set(x, y, -3); // Ajustado para ficar mais à frente (z = -3 em vez de -6)
        cena.add(mesh);
        objetosColisao.push(mesh);
    }

    function criarEscada(x, y, altura = 3.0) {
        const geometry = new THREE.BoxGeometry(0.3, altura, 0.5);
        const mesh = new THREE.Mesh(geometry, ladderMaterial);
        mesh.position.set(x, y, -2.9); // Ajustado para ficar mais à frente (z = -2.9 em vez de -5.9)
        cena.add(mesh);
    }

    // Plataformas (zig-zag) - padrão do level 2
    const yValues = [-10, -7, -4, -1, 2, 5, 8];
    yValues.forEach((y, i) => {
        // Ajustamos o offset para a primeira plataforma ficar exatamente onde o Mario está
        // para que ele não fique no ar
        let offset;
        if (i === 0) {
            // Primeira plataforma ajustada para ficar sob o Mario
            offset = -2.5; // Posicionada em x=-2.5 para ficar corretamente sob o Mario
        } else {
            // Demais plataformas seguem o padrão zig-zag
            offset = (i % 2 === 0) ? -1 : 1;
        }
        criarPlataforma(offset, y);
    });

    // Escadas baseadas na imagem, ajustadas para a nova posição da primeira plataforma
    const escadas = [
        { x: -2, y: -8.5 }, { x: 0, y: -5.5 }, { x: -2, y: -2.5 },
        { x: 0, y: 0.5 }, { x: -2, y: 3.5 }, { x: -3, y: 6.5 }, { x: -1, y: 6.5 }
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