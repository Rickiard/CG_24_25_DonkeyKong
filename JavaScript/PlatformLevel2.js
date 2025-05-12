
import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';

export function adicionarPlataformasELadders(cena, objetosColisao) {
    const textureLoader = new THREE.TextureLoader();

    // TEXTURA PARA CHÃO (vermelho metálico)
    const texturaChao = textureLoader.load('./objetos/textures/platform_red.png');
    texturaChao.wrapS = THREE.RepeatWrapping;
    texturaChao.wrapT = THREE.RepeatWrapping;
    texturaChao.repeat.set(4, 1);

    const platformMaterial = new THREE.MeshPhongMaterial({
        map: texturaChao,
        side: THREE.DoubleSide
    });

    // TEXTURA PARA ESCADAS (azul com ranhuras)
    const texturaEscada = textureLoader.load('./objetos/textures/ladder_blue.png');
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
        mesh.position.set(x, y, -3); // Ajustado para ficar ainda mais para trás
        cena.add(mesh);
        objetosColisao.push(mesh);
    }

    function criarEscada(x, y, altura = 3.0) {
        const geometry = new THREE.BoxGeometry(0.3, altura, 0.5);
        const mesh = new THREE.Mesh(geometry, ladderMaterial);
        mesh.position.set(x, y, -3); // Ajustado para ficar no mesmo plano Z que as plataformas
        cena.add(mesh);
    }

    // Configuração das plataformas com posições e tamanhos variados
    const plataformasConfig = [
        { y: -10, x: 0, largura: 24 },      // Base (mantida grande)
        { y: -7, x: -3, largura: 18 },      // Um pouco para a esquerda
        { y: -4, x: 3, largura: 18 },       // Um pouco para a direita
        { y: -1, x: -2, largura: 20 },      // Um pouco para a esquerda
        { y: 2, x: 2, largura: 20 },        // Um pouco para a direita
        { y: 5, x: -1, largura: 22 },       // Um pouco para a esquerda
        { y: 8, x: 1, largura: 22 }         // Um pouco para a direita
    ];
    
    // Criar plataformas com configurações variadas
    plataformasConfig.forEach(config => {
        criarPlataforma(config.x, config.y, config.largura, 0.4);
    });

    // Posições das escadas mais aleatórias
    criarEscada(-9, -8.5);  // Mais à esquerda
    criarEscada(-2, -5.5);  // Mais à direita
    criarEscada(5, -2.5);   // Mais à direita
    criarEscada(-7, 0.5);   // Mais à esquerda
    criarEscada(7, 3.5);    // Mais à direita
    criarEscada(-4, 6.5);   // Mais ao centro-esquerda
}

export function getPlataformasInfo() {
    return [
        { y: -10, xMin: -12, xMax: 12 },        // Base (mantida grande)
        { y: -7, xMin: -12, xMax: 6 },          // Um pouco para a esquerda
        { y: -4, xMin: -6, xMax: 12 },          // Um pouco para a direita
        { y: -1, xMin: -12, xMax: 8 },          // Um pouco para a esquerda
        { y: 2, xMin: -8, xMax: 12 },           // Um pouco para a direita
        { y: 5, xMin: -12, xMax: 10 },          // Um pouco para a esquerda
        { y: 8, xMin: -10, xMax: 12 }           // Um pouco para a direita
    ];
}