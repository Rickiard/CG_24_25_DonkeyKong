import * as THREE from 'three';
import { FBXLoader } from 'FBXLoader';
import { PointerLockControls } from 'PointerLockControls';
import * as PlatformLevel1 from './PlatformLevel1.js';
import * as PlatformLevel2 from './PlatformLevel2.js';

// Game state management
window.gameState = {
    isPaused: false,
    isInitialized: false,
    isInMainMenu: true, // Começa no menu principal
    originalPosition: null,
    isGameOver: false,
    isWin: false,
    score: 0,
    // Light states
    lights: {
        ambient: true,
        directional: true,
        point: true
    },
    score: 0,
    currentLevel: null // Armazena o nível atual (1 ou 2)
};

// Audio setup
let audioListener = null;
let jumpSound = null;
let endingTheme = null;
let deadMarioSound = null; // Novo áudio para game over
window.stageTheme = null;
window.titleTheme = null;
window.audioInitialized = false;
window.audioContextStarted = false;
window.isMuted = false; // Flag para controlar o estado de mute

// Function to ensure audio context is started
async function ensureAudioContext() {
    if (!window.audioContextStarted && audioListener && audioListener.context.state === 'suspended') {
        try {
            await audioListener.context.resume();
            window.audioContextStarted = true;
            return true;
        } catch (error) {
            console.error('Error resuming audio context:', error);
            return false;
        }
    }
    return window.audioContextStarted;
}

// Function to safely play audio
async function safePlayAudio(audio, name) {
    if (!audio) return;

    try {
        await ensureAudioContext();
        if (!audio.isPlaying) {
            // Se o áudio estiver mutado, definir o volume para 0 antes de tocar
            if (window.isMuted) {
                const originalVolume = audio.getVolume();
                audio.setVolume(0);
                audio.play();
            } else {
                audio.play();
            }
        }
    } catch (error) {
        console.error(`Error playing ${name}:`, error);
    }
}

// Function to stop all music - make it globally accessible
window.stopAllMusic = function () {
    try {
        if (endingTheme && endingTheme.isPlaying) {
            endingTheme.stop();
        }
        if (window.stageTheme && window.stageTheme.isPlaying) {
            window.stageTheme.stop();
        }
        if (window.titleTheme && window.titleTheme.isPlaying) {
            window.titleTheme.stop();
        }
    } catch (error) {
        console.error('Error stopping music:', error);
    }
};

// Variáveis para armazenar o estado do áudio quando pausado
let audioState = {
    stageTheme: { wasPaused: false, time: 0 },
    titleTheme: { wasPaused: false, time: 0 },
    endingTheme: { wasPaused: false, time: 0 }
};

// Função para pausar o áudio atual
window.pauseAudio = function () {
    try {
        // Pausar Stage Theme
        if (window.stageTheme && window.stageTheme.isPlaying) {
            audioState.stageTheme.wasPaused = true;
            // Forçar a parada do áudio para garantir que ele pare
            window.stageTheme.stop();
        } else {
            audioState.stageTheme.wasPaused = false;
        }

        // Pausar Title Theme
        if (window.titleTheme && window.titleTheme.isPlaying) {
            audioState.titleTheme.wasPaused = true;
            // Forçar a parada do áudio para garantir que ele pare
            window.titleTheme.stop();
        } else {
            audioState.titleTheme.wasPaused = false;
        }

        // Pausar Ending Theme
        if (endingTheme && endingTheme.isPlaying) {
            audioState.endingTheme.wasPaused = true;
            // Forçar a parada do áudio para garantir que ele pare
            endingTheme.stop();
        } else {
            audioState.endingTheme.wasPaused = false;
        }
    } catch (error) {
        console.error('Erro ao pausar áudio:', error);
    }
};

// Função para retomar o áudio pausado
window.resumeAudio = function () {
    try {
        // Retomar Stage Theme
        if (audioState.stageTheme.wasPaused && window.stageTheme) {
            // Garantir que o áudio seja tocado novamente
            window.stageTheme.play();
            audioState.stageTheme.wasPaused = false;
        }

        // Retomar Title Theme
        if (audioState.titleTheme.wasPaused && window.titleTheme) {
            // Garantir que o áudio seja tocado novamente
            window.titleTheme.play();
            audioState.titleTheme.wasPaused = false;
        }

        // Retomar Ending Theme
        if (audioState.endingTheme.wasPaused && endingTheme) {
            // Garantir que o áudio seja tocado novamente
            endingTheme.play();
            audioState.endingTheme.wasPaused = false;
        }

    } catch (error) {
        console.error('Erro ao retomar áudio:', error);
    }
};

// Function to mute all audio
window.muteAudio = function () {
    if (!window.isMuted) {
        try {
            // Mutar todos os sons diretamente
            if (jumpSound) jumpSound.setVolume(0);
            if (endingTheme) endingTheme.setVolume(0);
            if (deadMarioSound) deadMarioSound.setVolume(0);
            if (window.stageTheme) window.stageTheme.setVolume(0);
            if (window.titleTheme) window.titleTheme.setVolume(0);

            window.isMuted = true;
            // Atualizar o ícone e a classe do botão
            const soundButton = document.getElementById('soundButton');
            if (soundButton) {
                soundButton.innerHTML = '🔇';
                soundButton.classList.add('muted');
            }
        } catch (error) {
            console.error('Error muting audio:', error);
        }
    }
};

// Function to unmute all audio
window.unmuteAudio = function () {
    if (window.isMuted) {
        try {
            // Restaurar volumes originais
            if (jumpSound) jumpSound.setVolume(0.5);
            if (endingTheme) endingTheme.setVolume(0.3);
            if (deadMarioSound) deadMarioSound.setVolume(0.5);
            if (window.stageTheme) window.stageTheme.setVolume(1.0);
            if (window.titleTheme) window.titleTheme.setVolume(1.0);

            window.isMuted = false;
            // Atualizar o ícone e a classe do botão
            const soundButton = document.getElementById('soundButton');
            if (soundButton) {
                soundButton.innerHTML = '🔊';
                soundButton.classList.remove('muted');
            }
        } catch (error) {
            console.error('Error unmuting audio:', error);
        }
    }
};

// Function to load a single audio file asynchronously
function loadAudioAsync(audioLoader, audioPath, audioObject, volume, loop = false, name) {
    return new Promise((resolve, reject) => {
        // Atualizar a mensagem de progresso
        if (document.getElementById('loadingProgress')) {
            document.getElementById('loadingProgress').textContent = `Carregando ${name}...`;
        }

        audioLoader.load(
            audioPath,
            function (buffer) {
                audioObject.setBuffer(buffer);
                audioObject.setVolume(volume);
                if (loop) {
                    audioObject.setLoop(true);
                }
                resolve(true);
            },
            // Função de progresso (opcional)
            function (xhr) {
                if (xhr.lengthComputable && document.getElementById('loadingProgress')) {
                    const percentComplete = Math.round((xhr.loaded / xhr.total) * 100);
                    document.getElementById('loadingProgress').textContent =
                        `Carregando ${name}... ${percentComplete}%`;
                }
            },
            function (error) {
                console.error(`Error loading ${name}:`, error);
                reject(error);
            }
        );
    });
}

// Function to initialize audio context asynchronously
async function initializeAudio() {
    if (!window.audioInitialized) {
        try {
            // Atualizar a mensagem de progresso
            if (document.getElementById('loadingProgress')) {
                document.getElementById('loadingProgress').textContent = "Inicializando sistema de áudio...";
            }

            // Create new audio context
            audioListener = new THREE.AudioListener();

            // Criar objetos de áudio com controle de reprodução
            jumpSound = new THREE.Audio(audioListener);
            jumpSound.hasPlaybackControl = true;

            endingTheme = new THREE.Audio(audioListener);
            endingTheme.hasPlaybackControl = true;

            deadMarioSound = new THREE.Audio(audioListener);
            deadMarioSound.hasPlaybackControl = true;

            window.stageTheme = new THREE.Audio(audioListener);
            window.stageTheme.hasPlaybackControl = true;

            window.titleTheme = new THREE.Audio(audioListener);
            window.titleTheme.hasPlaybackControl = true;

            // Load audio files
            const audioLoader = new THREE.AudioLoader();

            // Load all audio files asynchronously
            const audioFiles = [
                { path: './audio/Mario Jump Sound.mp3', audio: jumpSound, volume: 0.5, loop: false, name: 'Jump Sound' },
                { path: './audio/Dead Mario.mp3', audio: deadMarioSound, volume: 0.5, loop: false, name: 'Dead Mario Sound' },
                { path: './audio/Ending Theme.mp3', audio: endingTheme, volume: 0.3, loop: true, name: 'Ending Theme' },
                { path: './audio/Stage Theme.mp3', audio: window.stageTheme, volume: 1.0, loop: true, name: 'Stage Theme' },
                { path: './audio/Title Theme.mp3', audio: window.titleTheme, volume: 1.0, loop: true, name: 'Title Theme' }
            ];

            // Carregar cada arquivo de áudio sequencialmente para melhor feedback visual
            for (let i = 0; i < audioFiles.length; i++) {
                const file = audioFiles[i];
                await loadAudioAsync(audioLoader, file.path, file.audio, file.volume, file.loop, file.name);

                // Atualizar o progresso geral
                if (document.getElementById('loadingProgress')) {
                    const percentComplete = Math.round(((i + 1) / audioFiles.length) * 100);
                    document.getElementById('loadingProgress').textContent =
                        `Carregando áudios... ${percentComplete}%`;
                }
            }

            // Atualizar a mensagem final
            if (document.getElementById('loadingProgress')) {
                document.getElementById('loadingProgress').textContent = "Todos os áudios carregados com sucesso!";
            }

            window.audioInitialized = true;
            // Pequena pausa para mostrar a mensagem de conclusão
            await new Promise(resolve => setTimeout(resolve, 500));

            return true;
        } catch (error) {
            console.error('Error initializing audio system:', error);

            // Mostrar mensagem de erro
            if (document.getElementById('loadingProgress')) {
                document.getElementById('loadingProgress').textContent =
                    "Erro ao carregar áudios. Tente novamente.";
            }

            return false;
        }
    }
    return window.audioInitialized;
}

// Add event listeners for user interaction
document.addEventListener('click', async function () {
    await ensureAudioContext();
}, { once: true });

document.addEventListener('keydown', async function () {
    await ensureAudioContext();
}, { once: true });

document.addEventListener('touchstart', async function () {
    await ensureAudioContext();
}, { once: true });

// Add event listener for the start button
document.addEventListener('DOMContentLoaded', async function () {
    // Inicializar áudio primeiro
    await initializeAudio();
    const soundButton = document.getElementById('soundButton');

    soundButton.addEventListener('click', async function () {
        try {
            await ensureAudioContext(); // Garante que o AudioContext seja iniciado

            // Toggle mute/unmute
            if (window.isMuted) {
                window.unmuteAudio();
            } else {
                window.muteAudio();
            }
        } catch (error) {
            console.error('Error toggling audio:', error);
        }
    });

    // Iniciar a música do menu principal automaticamente após inicialização
    try {
        await ensureAudioContext();
        // Tocar a música do menu principal
        if (window.titleTheme && !window.titleTheme.isPlaying) {
            window.titleTheme.play();
        }
    } catch (error) {
        console.error('Error starting title theme on page load:', error);
    }
});

// Function to update score display
function updateScoreDisplay() {
    document.getElementById('scoreDisplay').textContent = `Score: ${window.gameState.score}`;
}

// Global functions for menu control
// Função para iniciar o Level 1
window.startGameLevel1 = async function () {
    window.gameState.currentLevel = 1;
    await startGameCommon();
};

// Função para iniciar o Level 2
window.startGameLevel2 = async function () {
    window.gameState.currentLevel = 2;
    await startGameCommon();
};

// Função comum para iniciar o jogo (usada por ambos os níveis)
async function startGameCommon() {
    // Mostrar tela de loading
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('loadingScreen').classList.remove('hidden');
    document.getElementById('loadingProgress').textContent = "Carregando recursos de áudio...";

    // Pequeno atraso para garantir que a tela de loading seja exibida
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // Limpar barris existentes
        if (barrisAtivos && barrisAtivos.length > 0) {
            barrisAtivos.forEach(barril => cena.remove(barril));
            barrisAtivos = [];
        }
        barrilColisao = false;
        
        // Limpar objetos específicos do nível anterior
        // Isso garante que não haja objetos duplicados ao mudar de nível
        for (let i = cena.children.length - 1; i >= 0; i--) {
            const obj = cena.children[i];
            
            // Verificar se é a skybox (que deve ser preservada)
            const isSkybox = obj.geometry && 
                            obj.geometry.type === 'BoxGeometry' && 
                            obj.geometry.parameters.width === 100 &&
                            obj.geometry.parameters.height === 100 &&
                            obj.geometry.parameters.depth === 100;
            
            // Pular a skybox
            if (isSkybox) {
                continue;
            }
            
            // Remover objetos com userData.levelId que não correspondem ao nível atual
            if (obj.userData && obj.userData.levelId !== undefined && 
                obj.userData.levelId !== window.gameState.currentLevel) {
                cena.remove(obj);
            }
            
            // Remover modelos FBX e outros objetos específicos de nível
            if (obj.type === 'Group' && obj.name && 
                (obj.name.includes('fbx') || obj.name === "level1_fbx_model")) {
                cena.remove(obj);
            }
        }

        // Forçar reinicialização completa do jogo
        window.gameState.isInitialized = false;

        // Aguardar a inicialização assíncrona
        await Start();
        window.gameState.isInitialized = true;
        
        // Carregar o Donkey Kong e a Peach com as posições corretas para o nível atual
        loadDonkeyKong();
        loadPeach();
        
        // Garantir que o Mario esteja na posição correta
        if (objetoImportado) {
            // Posicionar o Mario com base no nível atual
            if (window.gameState.currentLevel === 1) {
                objetoImportado.position.set(-10, -9.7, -3.0);
            } else if (window.gameState.currentLevel === 2) {
                // Posição ajustada para ficar mais à esquerda, próximo à ponta inferior da plataforma
                objetoImportado.position.set(-8, -9.7, -3.0);
            }
            objetoImportado.rotation.set(0, Math.PI / 2, 0);

            // Reset Mario's texture back to normal
            const marioTexture = textureLoader.load('./textures/mario_texture.png');
            objetoImportado.traverse(function (child) {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        map: marioTexture,
                        side: THREE.DoubleSide
                    });
                }
            });
        }
    } catch (error) {
        console.error("Erro ao inicializar o jogo:", error);
    } finally {
        // Aplicar o estado das luzes imediatamente
        console.log("Aplicando estado das luzes imediatamente após carregamento:", window.gameState.lights);
        applyLightStates();
        
        // Esconder a tela de loading
        document.getElementById('loadingScreen').classList.add('hidden');
    }

    window.gameState.isPaused = false;
    window.gameState.isInMainMenu = false;
    window.gameState.isGameOver = false;
    window.gameState.isWin = false;
    window.gameState.score = 0;
    updateScoreDisplay();
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('winMenu').classList.add('hidden');

    // Stop all music first
    window.stopAllMusic();

    // Wait a brief moment to ensure all music has stopped
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now play the stage theme
    await safePlayAudio(window.stageTheme, 'Stage Theme');

    // Garantir que o loop de animação esteja ativo
    animationLoopActive = true;
    requestAnimationFrame(loop);
};

// Variáveis para armazenar o estado das animações e luzes
let animationStates = {
    donkeyKong: { wasPaused: false },
    peach: { wasPaused: false },
    barris: [],
    luzes: []
};

window.pauseMenu = function () {
    if (!window.gameState.isPaused) {
        window.gameState.isPaused = true;
        window.pauseAudio();
        document.getElementById('pauseMenu').classList.remove('hidden');
        
        // Update light toggle buttons to reflect current state
        updateLightToggleButtons();
    }
};

// Function to update in-game light buttons based on current state
function updateLightToggleButtons() {
    const ingameAmbientLight = document.getElementById('ingameAmbientLight');
    const ingameDirectionalLight = document.getElementById('ingameDirectionalLight');
    const ingamePointLight = document.getElementById('ingamePointLight');
    
    if (ingameAmbientLight) {
        ingameAmbientLight.className = window.gameState.lights.ambient ? 'light-button' : 'light-button off';
    }
    
    if (ingameDirectionalLight) {
        ingameDirectionalLight.className = window.gameState.lights.directional ? 'light-button' : 'light-button off';
    }
    
    if (ingamePointLight) {
        ingamePointLight.className = window.gameState.lights.point ? 'light-button' : 'light-button off';
    }
};

// Function to apply light states to all lights in the scene
function applyLightStates() {
    console.log("Applying light states:", window.gameState.lights);
    
    // Apply ambient light state
    if (luzAmbiente) {
        luzAmbiente.visible = window.gameState.lights.ambient;
    }
    
    // Apply directional lights state
    if (luzDirecional1) luzDirecional1.visible = window.gameState.lights.directional;
    if (luzDirecional2) luzDirecional2.visible = window.gameState.lights.directional;
    if (luzDirecional3) luzDirecional3.visible = window.gameState.lights.directional;
    
    // Collect all point lights first
    let pointLights = [];
    cena.traverse(function(object) {
        if (object.isLight && object.type === 'PointLight') {
            pointLights.push(object);
        }
    });
    
    // Apply point lights state
    console.log(`Aplicando estado ${window.gameState.lights.point ? 'ON' : 'OFF'} para ${pointLights.length} point lights`);
    pointLights.forEach(light => {
        light.visible = window.gameState.lights.point;
    });
    
    // Update UI buttons
    updateLightToggleButtons();
    
    // Dispatch custom event for light state change
    window.dispatchEvent(new CustomEvent('lightStateChanged'));
}

window.resumeGame = function () {
    // Esconder o menu de pausa
    document.getElementById('pauseMenu').classList.add('hidden');

    // Mostrar o contador de despause
    const countdownTimer = document.getElementById('countdownTimer');
    countdownTimer.textContent = "3";
    countdownTimer.classList.remove('hidden');

    // Iniciar a contagem regressiva
    let countdown = 3;

    const countdownInterval = setInterval(function () {
        countdown--;

        if (countdown > 0) {
            // Atualizar o texto do contador
            countdownTimer.textContent = countdown.toString();
        } else if (countdown === 0) {
            // Mostrar "GO!"
            countdownTimer.textContent = "GO!";
            countdownTimer.style.color = "#4CAF50"; // Verde
        } else {
            // Limpar o intervalo e esconder o contador
            clearInterval(countdownInterval);
            countdownTimer.classList.add('hidden');
            countdownTimer.style.color = "#FFD700"; // Restaurar cor original

            // RETOMAR TODAS AS ANIMAÇÕES

            // Retomar a animação do Mario
            if (mixerAnimacao) {
                mixerAnimacao.timeScale = 1;
                if (animacaoAtual) {
                    animacaoAtual.paused = false;
                }
            }

            // Retomar a animação do Donkey Kong
            if (mixerDonkeyKong) {
                mixerDonkeyKong.timeScale = 1;
            }

            // Retomar a animação da Peach
            if (mixerPeach) {
                mixerPeach.timeScale = 1;
            }

            // Retomar todos os barris
            if (barrisAtivos && barrisAtivos.length > 0) {
                barrisAtivos.forEach(barril => {
                    if (barril.userData.velocidadeOriginal) {
                        // Restaurar a velocidade original
                        barril.userData.velocidade = { ...barril.userData.velocidadeOriginal };
                        delete barril.userData.velocidadeOriginal;
                    }
                });
            }

            // Restaurar a intensidade das luzes
            if (animationStates.luzes.length > 0) {
                animationStates.luzes.forEach(estado => {
                    if (estado.luz && estado.luz.userData.intensidadeOriginal !== undefined) {
                        // Restaurar a intensidade original
                        estado.luz.intensity = estado.luz.userData.intensidadeOriginal;
                        delete estado.luz.userData.intensidadeOriginal;
                    }
                });
                animationStates.luzes = [];
            }

            // Retomar o áudio
            window.resumeAudio();

            // Retomar o relógio do jogo
            relogio.start();

            // Definir o estado do jogo como não pausado (deve ser o último para garantir que tudo esteja pronto)
            window.gameState.isPaused = false;
        }
    }, 1000);
};

// Variável para controlar o intervalo de lançamento de barris
var barrelSpawnInterval = null;

window.restartGame = async function () {
    console.log("Iniciando restart do jogo...");
    
    // Manter o nível atual e o estado das luzes
    const currentLevel = window.gameState.currentLevel || 1; // Default to level 1 if not set
    const lightStates = {
        ambient: window.gameState.lights.ambient,
        directional: window.gameState.lights.directional,
        point: window.gameState.lights.point
    };
    
    // Parar o loop de animação temporariamente para evitar problemas durante a limpeza
    animationLoopActive = false;
    
    // Parar o intervalo de lançamento de barris para evitar múltiplos intervalos
    if (barrelSpawnInterval) {
        console.log("Limpando intervalo de barris existente");
        clearInterval(barrelSpawnInterval);
        barrelSpawnInterval = null;
    }
    
    // Limpar barris ativos
    console.log("Limpando barris ativos: " + (barrisAtivos ? barrisAtivos.length : 0));
    if (barrisAtivos && barrisAtivos.length > 0) {
        barrisAtivos.forEach(barril => {
            if (barril && barril.parent) {
                barril.parent.remove(barril);
            }
        });
        barrisAtivos = [];
    }
    barrilColisao = false;
    
    // Limpar a cena completamente (exceto skybox e luzes)
    console.log("Limpando a cena...");
    for (let i = cena.children.length - 1; i >= 0; i--) {
        const obj = cena.children[i];
        
        // Verificar se é a skybox (que deve ser preservada)
        const isSkybox = obj.geometry && 
                        obj.geometry.type === 'BoxGeometry' && 
                        obj.geometry.parameters.width === 100 &&
                        obj.geometry.parameters.height === 100 &&
                        obj.geometry.parameters.depth === 100;
        
        // Pular a skybox e as luzes
        if (isSkybox || obj.type === 'PerspectiveCamera' || obj.type === 'AmbientLight' || 
            obj.type === 'DirectionalLight' || obj.type === 'PointLight') {
            continue;
        }
        
        // Remover o objeto da cena
        cena.remove(obj);
    }
    
    // Limpar variáveis importantes
    objetoImportado = null; // Limpar referência ao Mario para que seja recarregado
    mixerAnimacao = null;
    barrilImportado = null; // Limpar referência ao barril para que seja recarregado
    
    // Limpar arrays de objetos
    plataformas = [];
    objetosColisao = [];
    if (window.planosInvisiveis) {
        window.planosInvisiveis = [];
    }
    
    // Forçar reinicialização completa do jogo
    window.gameState.isInitialized = false;
    
    console.log("Reiniciando o jogo para o nível: " + currentLevel);
    
    try {
        // Recarregar o Mario
        carregarObjetoFBX(
            './Objetos/Mario.fbx',
            { x: 0.008, y: 0.008, z: 0.008 },
            { x: -10, y: -9.7, z: -3.0 },
            { x: 0, y: Math.PI / 2, z: 0 },
            function (object) {
                // Aplicar textura ao Mario
                object.traverse(function (child) {
                    if (child.isMesh) {
                        const materialTexturizado = new THREE.MeshPhongMaterial({
                            map: marioTexture,
                            side: THREE.DoubleSide
                        });
                        child.material = materialTexturizado;
                    }
                });

                objetoImportado = object;
                if (object.animations && object.animations.length > 0) {
                    mixerAnimacao = new THREE.AnimationMixer(object);
                    
                    // Encontrar animações idle e running
                    let idleAnim = object.animations.find(a => a.name && a.name.toLowerCase().includes('idle')) || object.animations[3];
                    let runningAnim = object.animations.find(a => a.name && a.name.toLowerCase().includes('run')) || object.animations[7];
                    
                    // Armazenar referências às animações para uso posterior
                    object.userData.idleAnimation = idleAnim;
                    object.userData.runningAnimation = runningAnim;
                    
                    // Iniciar com a animação idle
                    animacaoAtual = mixerAnimacao.clipAction(idleAnim);
                    animacaoAtual.play();
                }
                
                // Adicionar propriedade para identificar como Mario
                object.userData.isMario = true;
            }
        );
        
        // Recarregar o barril
        carregarBarril('./Objetos/Barril.fbx', { x: 0.35, y: 0.35, z: 0.35 }, { x: -11, y: 5.7, z: -3 }, { x: 0, y: 0, z: 0 });
        
        // Reiniciar o jogo com o mesmo nível
        if (currentLevel === 1) {
            await window.startGameLevel1();
        } else if (currentLevel === 2) {
            await window.startGameLevel2();
        } else {
            // Fallback para o nível 1 se o nível atual não for válido
            console.warn("Nível inválido, reiniciando para o nível 1");
            await window.startGameLevel1();
        }
    
        // Reset game state
        window.gameState.isPaused = false;
        window.gameState.isInMainMenu = false;
        window.gameState.isGameOver = false;
        window.gameState.isWin = false;
        
        // Restaurar o estado das luzes e aplicar imediatamente
        console.log("Restaurando estado das luzes após restart");
        window.gameState.lights.ambient = lightStates.ambient;
        window.gameState.lights.directional = lightStates.directional;
        window.gameState.lights.point = lightStates.point;
        
        // Aplicar o estado das luzes imediatamente
        applyLightStates();
        window.gameState.score = 0;
        updateScoreDisplay();
    
        // Stop all music first
        window.stopAllMusic();
    
        // Wait a brief moment to ensure all music has stopped
        await new Promise(resolve => setTimeout(resolve, 100));
    
        // Now play the stage theme
        await safePlayAudio(window.stageTheme, 'Stage Theme');
    
        // Hide menus
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('winMenu').classList.add('hidden');
    
        // Garantir que o loop de animação esteja ativo
        animationLoopActive = true;
        requestAnimationFrame(loop);
        
        // Reiniciar o intervalo de lançamento de barris
        if (barrelSpawnInterval === null) {
            barrelSpawnInterval = setInterval(() => {
                lançarBarril();
            }, 3000); // 3000 ms = 3 segundos
        }
        
        console.log("Restart completo!");
    } catch (error) {
        console.error("Erro durante o restart do jogo:", error);
        // Tentar recuperar de alguma forma
        animationLoopActive = true;
        requestAnimationFrame(loop);
    }
};

window.gameOver = async function () {
    window.gameState.isGameOver = true;
    document.getElementById('gameOverMenu').classList.remove('hidden');
    document.getElementById('finalScore').textContent = `Score: ${window.gameState.score}`;

    // Stop all music first
    window.stopAllMusic();

    // Wait a brief moment to ensure all music has stopped
    await new Promise(resolve => setTimeout(resolve, 100));

    // Play Dead Mario sound instead of ending theme
    await safePlayAudio(deadMarioSound, 'Dead Mario Sound');
};

window.gameWin = async function () {
    window.gameState.isWin = true;
    document.getElementById('winMenu').classList.remove('hidden');
    document.getElementById('winScore').textContent = `Score: ${window.gameState.score}`;

    // Stop all music first
    window.stopAllMusic();

    // Wait a brief moment to ensure all music has stopped
    await new Promise(resolve => setTimeout(resolve, 100));

    // Play ending theme
    await safePlayAudio(endingTheme, 'Ending Theme');
};

// Add function to return to main menu
window.returnToMainMenu = async function () {
    // Stop any playing music first
    window.stopAllMusic();

    // Parar o loop de animação atual
    animationLoopActive = false;

    // Definir flags de estado
    window.gameState.isPaused = true;
    window.gameState.isInMainMenu = true;
    window.gameState.isGameOver = false;
    window.gameState.isWin = false;
    window.gameState.score = 0;
    // Forçar reinicialização do jogo na próxima vez que START GAME for clicado
    window.gameState.isInitialized = false;
    updateScoreDisplay();

    // Hide all menus except main menu
    document.getElementById('pauseMenu').classList.add('hidden');
    document.getElementById('gameOverMenu').classList.add('hidden');
    document.getElementById('winMenu').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');

    // Play title theme instead of stage theme
    await safePlayAudio(window.titleTheme, 'Title Theme');

    // Reiniciar o loop de animação para o menu
    animationLoopActive = true;
    requestAnimationFrame(loop);
};

document.addEventListener('DOMContentLoaded', function () {
    // Don't start the game automatically, wait for the start button
    window.gameState.isInitialized = false;
});

var cena = new THREE.Scene();
var renderer = new THREE.WebGLRenderer();
var camaraPerspectiva = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
var camaraOrto = new THREE.OrthographicCamera(
    window.innerWidth / -65, // left
    window.innerWidth / 65,  // right
    window.innerHeight / 65, // top
    window.innerHeight / -65, // bottom
    0.1,                      // near
    100                       // far
);

var cameraAtual = camaraPerspectiva; // Define a câmera inicial como a perspectiva

// ATIVAR sombras de forma segura
renderer.shadowMap.enabled = true;

// TROCAR tipo de sombra para mais leve, evitando bugs em hardwares mais limitados
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(window.innerWidth - 15, window.innerHeight - 80);
renderer.setClearColor(0xaaaaaa);
document.body.appendChild(renderer.domElement);

// Variáveis globais
var objetoImportado;
var mixerAnimacao;
var relogio = new THREE.Clock();
var andando = false;
var pulando = false;
var podePular = true; // New variable to track if Mario can jump
var velocidadeY = 0; // Velocidade vertical
var gravidade = -0.01; // Voltando para o valor original
var forcaPuloLevel1 = 0.15; // Força do pulo para o nível 1
var forcaPuloLevel2 = 0.13; // Força do pulo para o nível 2
var velocidadeMovimento = 0.02;
var velocidadeMovimentoAr = 0.01;

// Função para obter a força do pulo com base no nível atual
function getForcaPulo() {
    if (window.gameState.currentLevel === 1) {
        return forcaPuloLevel1;
    } else if (window.gameState.currentLevel === 2) {
        return forcaPuloLevel2;
    }
    return forcaPuloLevel1; // Valor padrão caso não esteja em nenhum nível específico
}
var teclasPressionadas = {}; // Objeto para rastrear teclas pressionadas
var teclasPressionadasAnterior = {}; // Track previous frame's key states
var raycaster = new THREE.Raycaster();
var objetosColisao = []; // Lista de objetos com os quais o personagem pode colidir
var animacaoAtual = null; // Track current animation
var plataformas = []; // Array to store platform information
var ultimoPulo = 0; // Track when the last jump occurred
var puloPendente = false; // Track if a jump is pending
var tentandoSubirEscada = false; // Nova variável para rastrear tentativa de subir escada
// Variáveis globais para o barril
var barrilImportado;
var velocidadeBarrilY = 0; // Velocidade vertical do barril
var pulandoBarril = false;
var barrilColisao = false; // Flag para verificar se houve colisão com o barril
var barrisAtivos = [];
// Variáveis para os mixers de animação
var mixerPeach, mixerDonkeyKong;

// Configuração das coordenadas z do barril por plataforma
const barrilZPorPlataforma = {
    '-10': -3.3,  // Primeiro plano (base)
    '-7': -4.2,   // Segundo plano
    '-4': -5.0,   // Terceiro plano
    '-1': -5.9,   // Quarto plano
    '2': -6.6,    // Quinto plano
    '5': -8.4,    // Sexto plano
    '8': -3.0     // Sétimo plano (topo)
};

// Função para atualizar a coordenada z do barril
function atualizarZDoBarril(barril) {
    const alturaAtual = Math.round(barril.position.y);
    if (barrilZPorPlataforma[alturaAtual] !== undefined) {
        barril.position.z = barrilZPorPlataforma[alturaAtual];
    }
}

// Add TextureLoader
const textureLoader = new THREE.TextureLoader();
const marioTexture = textureLoader.load('./textures/mario_texture.png');  // Adjust path as needed
// Cor castanha para os barris
const barrelColor = new THREE.Color(0x8B4513); // Cor castanha (SaddleBrown)

// Escadas (pontos onde os barris podem cair)
const posicoesEscadas = [
    { xMin: 9.8, xMax: 10.2, y: -7 },  // Primeiro plano
    { xMin: -7.2, xMax: -6.8, y: -4 }, // Segundo plano
    { xMin: 0.4, xMax: 0.6, y: -4 },   // Segundo plano
    { xMin: 1.8, xMax: 2.2, y: -1 },   // Terceiro plano
    { xMin: 9.8, xMax: 10.2, y: -1 },  // Terceiro plano
    { xMin: -2.2, xMax: -1.8, y: 2 },  // Quarto plano
    { xMin: -7.2, xMax: -6.8, y: 2 },  // Quarto plano
    { xMin: 9.8, xMax: 10.2, y: 5 },   // Quinto plano
    { xMin: 3.8, xMax: 4.2, y: 8 }     // Sexto plano
];

// Carregador FBX
var importer = new FBXLoader();
function carregarObjetoFBX(caminho, escala, posicao, rotacao, callback) {
    importer.load(caminho, function (object) {
        // Procurar e remover luzes do modelo FBX
        let lightsFound = [];

        // Função recursiva para encontrar todas as luzes, mesmo em grupos aninhados
        function findLightsRecursively(obj) {
            if (obj.isLight) {
                console.log(`Luz encontrada no modelo ${caminho}:`, obj);
                lightsFound.push(obj);
            }

            // Se for um grupo ou objeto com filhos, procurar recursivamente
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => findLightsRecursively(child));
            }
        }

        // Iniciar busca recursiva
        findLightsRecursively(object);

        // Aplicar propriedades às meshes
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = false;
                child.visible = true; // Garantir que cada mesh seja visível
            }
        });

        // Remover as luzes encontradas
        lightsFound.forEach(light => {
            console.log(`Removendo luz: ${light.name} (${light.type})`);
            if (light.parent) {
                light.parent.remove(light);
            }
        });

        object.castShadow = true;
        object.receiveShadow = true;
        object.scale.set(escala.x, escala.y, escala.z);
        object.position.set(posicao.x, posicao.y, posicao.z);
        object.rotation.set(rotacao.x, rotacao.y, rotacao.z);
        object.visible = true; // Garantir que o objeto principal seja visível
        
        // Inicializar userData se não existir
        object.userData = object.userData || {};
        
        cena.add(object);
        
        console.log(`Objeto FBX carregado com sucesso: ${caminho}`);

        if (callback) {
            callback(object);
        }
    });
}

carregarObjetoFBX(
    './Objetos/Mario.fbx',
    { x: 0.008, y: 0.008, z: 0.008 },
    { x: -10, y: -9.7, z: -3.0 },
    { x: 0, y: Math.PI / 2, z: 0 },
    function (object) {
        // Contagem de meshes para debug
        let contadorMeshes = 0;

        // Aplicar textura ao Mario
        object.traverse(function (child) {
            if (child.isMesh) {
                contadorMeshes++;
                const materialTexturizado = new THREE.MeshPhongMaterial({
                    map: marioTexture,
                    side: THREE.DoubleSide
                });
                child.material = materialTexturizado;
            }
        });

        objetoImportado = object;
        if (object.animations && object.animations.length > 0) {
            mixerAnimacao = new THREE.AnimationMixer(object);

            // Log available animations for debugging
            console.log('Available animations:', object.animations.length);
            object.animations.forEach((anim, index) => {
                console.log(`Animation ${index}:`, anim.name || 'Unnamed');
            });

            try {
                // Find idle and running animations by name or fallback to indices
                let idleAnim = object.animations.find(a => a.name && a.name.toLowerCase().includes('idle')) || object.animations[3];
                let runningAnim = object.animations.find(a => a.name && a.name.toLowerCase().includes('run')) || object.animations[7];

                if (idleAnim) {
                    animacaoAtual = mixerAnimacao.clipAction(idleAnim);
                    animacaoAtual.play();
                } else {
                    console.warn('No idle animation found, using first available animation');
                    animacaoAtual = mixerAnimacao.clipAction(object.animations[0]);
                    animacaoAtual.play();
                }

                // Store running animation for later use
                object.userData.runningAnimation = runningAnim;
            } catch (error) {
                console.error('Error setting up animations:', error);
            }
        } else {
            console.warn('No animations found in the model');
        }
        objetosColisao.push(object);
    }
);

function lançarBarril() {
    if (!barrilImportado) {
        console.warn("Modelo de barril não carregado ainda!");
        return;
    }

    console.log("Lançando novo barril...");
    
    const novoBarril = barrilImportado.clone();
    novoBarril.visible = true; // Torna o barril visível    
    novoBarril.castShadow = true;
    novoBarril.receiveShadow = false;
    novoBarril.position.set(-7, 5.25, barrilZPorPlataforma['8']); // Usar o z correto para a plataforma inicial
    novoBarril.rotation.set(Math.PI / 2, 0, 0);
    
    // Garantir que o userData seja inicializado corretamente
    novoBarril.userData = {
        velocidade: new THREE.Vector3(0.025, 0, 0), // Velocidade horizontal inicial
        plataformaAtual: 0,
        isBarrel: true, // Marcar como barril para usar detecção de colisão original
        scored: false
    };

    novoBarril.traverse(child => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.visible = true; // Garantir que cada mesh seja visível

            // Aplicar cor castanha aos barris
            child.material = new THREE.MeshPhongMaterial({
                color: barrelColor,
                shininess: 30,
                side: THREE.DoubleSide
            });
        }
    });

    cena.add(novoBarril);
    barrisAtivos.push(novoBarril);
    
    console.log("Barril lançado com sucesso! Velocidade:", novoBarril.userData.velocidade);
}

function carregarBarril(caminho, escala, posicao, rotacao) {
    importer.load(caminho, function (object) {
        // Procurar e remover luzes do modelo FBX
        let lightsFound = [];

        // Função recursiva para encontrar todas as luzes, mesmo em grupos aninhados
        function findLightsRecursively(obj) {
            if (obj.isLight) {
                console.log(`Luz encontrada no barril ${caminho}:`, obj);
                lightsFound.push(obj);
            }

            // Se for um grupo ou objeto com filhos, procurar recursivamente
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => findLightsRecursively(child));
            }
        }

        // Iniciar busca recursiva
        findLightsRecursively(object);

        // Aplicar propriedades às meshes
        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                child.material = new THREE.MeshPhongMaterial({
                    color: barrelColor,
                    shininess: 30,
                    side: THREE.DoubleSide
                });
                child.visible = true; // Garantir que cada mesh seja visível
            }
        });

        // Remover luzes
        lightsFound.forEach(light => {
            if (light.parent) {
                light.parent.remove(light);
            }
        });

        object.scale.set(escala.x, escala.y, escala.z);
        object.position.set(posicao.x, posicao.y, posicao.z);
        object.rotation.set(rotacao.x, rotacao.y, rotacao.z);

        // O barril original deve ser invisível, mas garantimos que ele seja clonado corretamente
        object.visible = false;
        
        // Garantir que o objeto tenha a propriedade userData inicializada
        object.userData = object.userData || {};
        object.userData.velocidade = new THREE.Vector3(0.025, 0, 0);
        object.userData.isBarrel = true;

        objetosColisao.push(object);
        barrilImportado = object;
        cena.add(object);
        
        console.log("Barril carregado com sucesso!");
    });
}

// O modelo tentativa1.fbx será carregado pelo módulo platformLevel1.js

// Variável para armazenar o modelo do Donkey Kong
let donkeyKongModel = null;

// Função para carregar o Donkey Kong
function loadDonkeyKong() {
    // Se já temos o modelo carregado, remova-o da cena primeiro
    if (donkeyKongModel && donkeyKongModel.parent) {
        donkeyKongModel.parent.remove(donkeyKongModel);
    }
    
    importer.load('./Objetos/Donkey Kong.fbx', function (object) {
        // Procurar e remover luzes do modelo FBX
        let lightsFound = [];

        // Função recursiva para encontrar todas as luzes, mesmo em grupos aninhados
        function findLightsRecursively(obj) {
            if (obj.isLight) {
                console.log(`Luz encontrada no modelo Donkey Kong:`, obj);
                lightsFound.push(obj);
            }

            // Se for um grupo ou objeto com filhos, procurar recursivamente
            if (obj.children && obj.children.length > 0) {
                obj.children.forEach(child => findLightsRecursively(child));
            }
        }

        // Iniciar busca recursiva
        findLightsRecursively(object);

        // Aplicar propriedades às meshes
        object.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Remover as luzes encontradas
        lightsFound.forEach(light => {
            console.log(`Removendo luz do Donkey Kong: ${light.name} (${light.type})`);
            if (light.parent) {
                light.parent.remove(light);
            }
        });
        
        object.castShadow = true;
        object.receiveShadow = false;
        // Definir escala padrão
        object.scale.set(0.015, 0.015, 0.015);
        
        // Posicionar o Donkey Kong com base no nível atual
        console.log("Posicionando Donkey Kong para o nível:", window.gameState.currentLevel);
        if (window.gameState.currentLevel === 1) {
            object.position.set(-6.5, 5.7, -9);
        } else if (window.gameState.currentLevel === 2) {
            object.position.set(-8.2, 6, -3.0);
            object.scale.set(0.01, 0.01, 0.01); 
            PlatformLevel2.createBarrelsAndCrates(cena);
        } 

        // Configurar o mixer de animação para o Donkey Kong
        if (object.animations.length > 0) {
            mixerDonkeyKong = new THREE.AnimationMixer(object);
            const animacaoDonkeyKong = mixerDonkeyKong.clipAction(object.animations[0]); // Use a primeira animação
            animacaoDonkeyKong.loop = THREE.LoopRepeat; // Configurar para repetir
            animacaoDonkeyKong.play();
        }
        
        // Armazenar referência ao modelo
        donkeyKongModel = object;
        
        // Adicionar à cena
        cena.add(object);
        
        // Adicionar userData para identificar o nível
        object.userData.levelId = window.gameState.currentLevel;
    });

    // Limpar qualquer intervalo existente de lançamento de barris
    if (barrelSpawnInterval) {
        clearInterval(barrelSpawnInterval);
    }
    
    // Lançar um barril a cada 3 segundos
    barrelSpawnInterval = setInterval(() => {
        lançarBarril();
    }, 3000); // 3000 ms = 3 segundos
};

// Função para carregar a Peach
function loadPeach() {
    carregarObjetoFBX(
        './Objetos/peach.fbx',
        { x: 0.05, y: 0.05, z: 0.05 },
        { x: 0, y: 7.0, z: -9.5 },
        { x: 0, y: 0, z: 0 },
        function (object) {
            // Load textures
            const textureLoader = new THREE.TextureLoader();
            const bodyTexture = textureLoader.load('./textures/peach_body.png');
            const eyeTexture = textureLoader.load('./textures/peach_eye.0.png');

            // Contagem de meshes para debug
            let contadorMeshes = 0;

            // Apply appropriate textures based on mesh names
            object.traverse(function (child) {
                if (child.isMesh) {
                    contadorMeshes++;

                    // Create materials with textures
                    if (child.name.toLowerCase().includes('eye')) {
                        // Eye material
                        child.material = new THREE.MeshPhongMaterial({
                            map: eyeTexture,
                            shininess: 50,
                            side: THREE.DoubleSide
                        });
                    } else {
                        // Body material
                        child.material = new THREE.MeshPhongMaterial({
                            map: bodyTexture,
                            shininess: 30,
                            side: THREE.DoubleSide
                        });
                    }
                }
            });
            object.scale.set(0.05, 0.05, 0.05);
            // Posicionar a Peach com base no nível atual
            console.log("Posicionando Peach para o nível:", window.gameState.currentLevel);
            if (window.gameState.currentLevel === 1) {
                object.position.set(0, 7.0, -9.5);
            } else if (window.gameState.currentLevel === 2) {
                object.position.set(0, 8.2, -3.0);
            }

            // Configurar o mixer de animação para a Peach
            if (object.animations.length > 0) {
                mixerPeach = new THREE.AnimationMixer(object);
                const animacaoPeach = mixerPeach.clipAction(object.animations[0]); // Use a primeira animação
                animacaoPeach.loop = THREE.LoopRepeat; // Configurar para repetir
                animacaoPeach.play();
            }

            // Adicionar userData para identificar o nível
            object.userData.levelId = window.gameState.currentLevel;
            
            // Adicionar o objeto à cena explicitamente
            cena.add(object);
            
            console.log("Peach carregada com sucesso para o nível:", window.gameState.currentLevel);
        }
    );
};
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
    posx: './Skybox/posx.png',
    negx: './Skybox/negx.png',
    posy: './Skybox/posy.jpg',
    negy: './Skybox/negy.jpg',
    posz: './Skybox/posz.png',
    negz: './Skybox/negz.png',
}, 100);
cena.add(skybox);

// Eventos de teclado
document.addEventListener("keydown", function (event) {
    // Verificar se a tecla ESC foi pressionada para pausar/retomar o jogo
    if (event.key === 'Escape') {
        // Não pausar se estiver no menu principal, game over ou vitória
        if (window.gameState.isInMainMenu || window.gameState.isGameOver || window.gameState.isWin) {
            return;
        }

        // Alternar entre pausado e não pausado
        if (window.gameState.isPaused) {
            window.resumeGame();
        } else {
            window.pauseMenu();
        }
        return;
    }

    // Don't process game controls if any menu is visible
    if (!document.getElementById('mainMenu').classList.contains('hidden') ||
        !document.getElementById('pauseMenu').classList.contains('hidden') ||
        !document.getElementById('gameOverMenu').classList.contains('hidden') ||
        !document.getElementById('winMenu').classList.contains('hidden')) {
        return;
    }

    teclasPressionadas[event.which] = true;

    // Alternar entre câmeras ao pressionar "C"
    if (event.key === 'c' || event.key === 'C') {
        if (cameraAtual === camaraPerspectiva) {
            cameraAtual = camaraOrto;
        } else {
            cameraAtual = camaraPerspectiva;
        }
    }
});

document.addEventListener("keyup", function (event) {
    teclasPressionadas[event.which] = false;
    pararAnimacao();
    if (objetoImportado.rotation.y === Math.PI)
        objetoImportado.rotation.y = Math.PI / 2;
});

// Funções de animação
function iniciarAnimacao() {
    if (!andando && mixerAnimacao && objetoImportado) {
        try {
            // Stop current animation
            if (animacaoAtual) {
                animacaoAtual.stop();
            }

            // Get running animation from stored animations or fall back to index 7
            let runningAnim = objetoImportado.userData.runningAnimation || objetoImportado.animations[7];
            if (runningAnim) {
                animacaoAtual = mixerAnimacao.clipAction(runningAnim);
                animacaoAtual.play();
                andando = true;
            } else {
                console.warn('No running animation found');
            }
        } catch (error) {
            console.error('Error switching to running animation:', error);
        }
    }

    // Adicionar o barril à cena quando a animação do personagem começar
    if (barrilImportado && !cena.children.includes(barrilImportado)) {
        cena.add(barrilImportado);
    }
}

function pararAnimacao() {
    if (andando && mixerAnimacao && objetoImportado) {
        try {
            // Stop current animation
            if (animacaoAtual) {
                animacaoAtual.stop();
            }

            // Find idle animation by name or fall back to index 3
            let idleAnim = objetoImportado.animations.find(a => a.name && a.name.toLowerCase().includes('idle')) || objetoImportado.animations[3];
            if (idleAnim) {
                animacaoAtual = mixerAnimacao.clipAction(idleAnim);
                animacaoAtual.play();
                andando = false;
            } else {
                console.warn('No idle animation found');
            }
        } catch (error) {
            console.error('Error switching to idle animation:', error);
        }
    }
}

// Atualizar posição do barril no loop
function atualizarBarril() {
    if (barrilImportado) {
        // Raycasting para verificar o chão
        raycaster.set(barrilImportado.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objetosColisao, true);
        const noChao = intersects.length > 0 && intersects[0].distance < 0.6;

        if (!noChao) {
            velocidadeBarrilY += gravidade;
            barrilImportado.position.y += velocidadeBarrilY;
        } else {
            if (pulandoBarril) {
                barrilImportado.position.y = barrilImportado.position.y;
                pulandoBarril = false;
                velocidadeBarrilY = 0;
            }
        }

        // Check for collision with Mario using bounding box intersection
        if (objetoImportado && !barrilColisao) {
            // Create bounding boxes for Mario and the barrel
            const marioBox = new THREE.Box3().setFromObject(objetoImportado);
            const barrilBox = new THREE.Box3().setFromObject(barrilImportado);

            // Check if the bounding boxes intersect
            if (marioBox.intersectsBox(barrilBox)) {
                // Check if Mario is above the barrel (only vertical check)
                if (objetoImportado.position.y > barrilImportado.position.y + 100) { // Mario is above the barrel with a large range
                    window.gameState.score += 100;
                    updateScoreDisplay();
                    barrilImportado.userData.scored = true;
                }
            }
        }
    }
}

// Luzes

var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.5);
// Main directional light from front-right
var luzDirecional1 = new THREE.DirectionalLight(0xffffff, 0.7);
// Secondary directional light from top-left
var luzDirecional2 = new THREE.DirectionalLight(0xffffff, 0.4);
// Soft fill light from behind
var luzDirecional3 = new THREE.DirectionalLight(0xffffee, 0.2);

// Light toggle functions
window.toggleAmbientLight = function() {
    window.gameState.lights.ambient = !window.gameState.lights.ambient;
    
    // Apply all light states to ensure consistency
    applyLightStates();
};

window.toggleDirectionalLights = function() {
    window.gameState.lights.directional = !window.gameState.lights.directional;
    
    // Apply all light states to ensure consistency
    applyLightStates();
};

window.togglePointLights = function() {
    window.gameState.lights.point = !window.gameState.lights.point;
    
    // Apply all light states to ensure consistency
    applyLightStates();
};

// Função principal - agora assíncrona
async function Start() {
    // Add audio listener to the camera
    camaraPerspectiva.add(audioListener);

    // Initialize audio context asynchronously and wait for it to complete
    await initializeAudio();
    // Retornar a câmera à posição original
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

    // Reposicionar Mario se ele já existir
    if (objetoImportado) {
        // Posicionar o Mario com base no nível atual
        if (window.gameState.currentLevel === 1) {
            objetoImportado.position.set(-10, -9.7, -3.0);
        } else if (window.gameState.currentLevel === 2) {
            // Posição ajustada para ficar mais à esquerda, próximo à ponta inferior da plataforma
            objetoImportado.position.set(-8, -9.7, -3.0);
        }
        objetoImportado.rotation.set(0, Math.PI / 2, 0);
    }

    // Plataformas serão carregadas de acordo com o nível selecionado
    let plataformasInfo = [];

    // Limpar plataformas existentes
    // Remover plataformas e escadas da cena e da lista de colisão
    for (let i = plataformas.length - 1; i >= 0; i--) {
        cena.remove(plataformas[i]);
        const index = objetosColisao.indexOf(plataformas[i]);
        if (index > -1) {
            objetosColisao.splice(index, 1);
        }
    }
    plataformas = [];
    
    // Limpar completamente objetosColisao para evitar duplicação
    objetosColisao.length = 0;
    
    // Remover todos os objetos que possam ser plataformas, escadas, planos invisíveis ou modelos FBX
    for (let i = cena.children.length - 1; i >= 0; i--) {
        const obj = cena.children[i];
        
        // Verificar se é a skybox (que deve ser preservada)
        const isSkybox = obj.geometry && 
                        obj.geometry.type === 'BoxGeometry' && 
                        obj.geometry.parameters.width === 100 &&
                        obj.geometry.parameters.height === 100 &&
                        obj.geometry.parameters.depth === 100;
        
        // Pular a skybox
        if (isSkybox) {
            continue;
        }
        
        // Remover objetos de geometria (plataformas/escadas)
        if (obj.geometry) {
            // Remover BoxGeometry (plataformas/escadas)
            if (obj.geometry.type === 'BoxGeometry') {
                // Verificar se é uma plataforma/escada (tamanho menor que a skybox)
                if (obj.geometry.parameters.width < 50) {
                    cena.remove(obj);
                }
            }
            // Remover PlaneGeometry (planos invisíveis)
            else if (obj.geometry.type === 'PlaneGeometry') {
                // Se for um plano invisível (usado para colisão) ou uma plataforma pequena
                if (obj.material && obj.material.transparent === true) {
                    cena.remove(obj);
                }
            }
        }
        
        // Remover também modelos FBX e outros grupos
        else if (obj.type === 'Group') {
            // Remover modelos FBX pelo nome
            if (obj.name && (obj.name.includes('fbx') || obj.name === "level1_fbx_model")) {
                cena.remove(obj);
            }
            // Remover modelos pelo userData.levelId
            else if (obj.userData && obj.userData.levelId !== undefined && 
                    obj.userData.levelId !== window.gameState.currentLevel) {
                cena.remove(obj);
            }
        }
    }
    
    // Carregar plataformas de acordo com o nível atual
    if (window.gameState.currentLevel === 1) {
        plataformasInfo = PlatformLevel1.getPlataformasInfo();
        PlatformLevel1.adicionarPlataformasELadders(cena, objetosColisao);
    } else if (window.gameState.currentLevel === 2) {
        plataformasInfo = PlatformLevel2.getPlataformasInfo();
        PlatformLevel2.adicionarPlataformasELadders(cena, objetosColisao);
    }

    // Criar planos invisíveis para colisão com base nas informações das plataformas
    // Limpar qualquer array existente de planos invisíveis
    if (window.planosInvisiveis) {
        for (let i = 0; i < window.planosInvisiveis.length; i++) {
            cena.remove(window.planosInvisiveis[i]);
        }
    }
    
    // Inicializar ou limpar o array de planos invisíveis
    window.planosInvisiveis = [];
    
    // Criar novos planos invisíveis para o nível atual
    // Inicializar array de luzes essenciais se não existir
    if (!window.luzesEssenciais) {
        window.luzesEssenciais = [];
    }
    
    // Configuração personalizada das luzes pontuais por plataforma
    // Formato: [índice da plataforma, posição X esquerda, posição X direita, altura Y esquerda, altura Y direita, cor, intensidade, alcance]
    const configLuzes = [
        // Plataforma 0 (Bottom platform, y = -10)
        [0, -11, 14.1, 1.0, 1.35, 0xffaa00, 6, 45],
        // Plataforma 1 (Second platform, y = -7)
        [1, -10.2, 12, 1.5, 0.8, 0xffaa00, 6, 45],
        // Plataforma 2 (Third platform, y = -4)
        [2, -8.5, 14.1, 1.0, 1.68, 0xffaa00, 6, 45],
        // Plataforma 3 (Fourth platform, y = -1)
        [3, -10.2, 12.35, 1.8, 1.0, 0xffaa00, 6, 45],
        // Plataforma 4 (Fifth platform, y = 2)
        [4, -8.5, 13.7, 1.0, 1.8, 0xffaa00, 6, 45],
        // Plataforma 5 (Sixth platform, y = 5)
        [5, -11, 12.3, 1.0, 1.5, 0xffaa00, 6, 45]
        // Plataforma 6 (Top platform, y = 8) - não tem luzes
    ];
    
    // Função para ajustar a altura de uma luz específica
    // Parâmetros: índice da plataforma, 'esquerda' ou 'direita', nova altura
    window.ajustarAlturaLuz = function(plataformaIndex, lado, novaAltura) {
        // Verificar se a plataforma existe na configuração
        const configIndex = configLuzes.findIndex(config => config[0] === plataformaIndex);
        if (configIndex === -1) {
            console.error(`Plataforma ${plataformaIndex} não encontrada na configuração de luzes.`);
            return false;
        }
        
        // Atualizar a altura na configuração
        if (lado.toLowerCase() === 'esquerda') {
            configLuzes[configIndex][3] = novaAltura;
        } else if (lado.toLowerCase() === 'direita') {
            configLuzes[configIndex][4] = novaAltura;
        } else {
            console.error(`Lado inválido: ${lado}. Use 'esquerda' ou 'direita'.`);
            return false;
        }
        
        // Remover as luzes existentes
        atualizarLuzes();
        
        return true;
    };
    
    // Variável global para controlar o número de luzes adicionais por plataforma
    window.numLuzesAdicionaisPorPlataforma = 3;
    
    // Função para ajustar o número de luzes adicionais em todas as plataformas
    window.ajustarNumeroLuzes = function(novoNumero) {
        if (novoNumero < 0) {
            console.error("O número de luzes adicionais não pode ser negativo.");
            return false;
        }
        
        window.numLuzesAdicionaisPorPlataforma = novoNumero;
        atualizarLuzes();
        return true;
    };
    
    // Função para atualizar todas as luzes com base na configuração atual
    function atualizarLuzes() {
        // Remover todas as luzes pontuais existentes
        const luzesParaRemover = [];
        cena.traverse(function(object) {
            if (object.isLight && object.type === 'PointLight') {
                luzesParaRemover.push(object);
            }
        });
        
        luzesParaRemover.forEach(luz => {
            if (luz.parent) {
                luz.parent.remove(luz);
            }
        });
        
        // Limpar o array de luzes essenciais
        window.luzesEssenciais = [];
        
        // Recriar as luzes com base na configuração atual
        configLuzes.forEach(config => {
            const [plataformaIndex, xEsquerda, xDireita, alturaEsquerda, alturaDireita, cor, intensidade, alcance] = config;
            const plataforma = plataformasInfo[plataformaIndex];
            
            // Obter o valor Z correto para a plataforma atual, usando o mesmo que está definido para o barril
            // ou usar -3 como fallback se não estiver definido
            const plataformaY = plataforma.y.toString();
            const zValue = barrilZPorPlataforma[plataformaY] !== undefined ? barrilZPorPlataforma[plataformaY] : -3;
            
            // Criar luz na extremidade esquerda
            // Não criar a luz da extremidade esquerda para a plataforma 5
            if (plataformaIndex !== 5) {
                criarLuzPontual(xEsquerda, plataforma.y + alturaEsquerda, zValue, cor, intensidade, alcance);
            }
            
            // Criar luzes adicionais ao longo da plataforma
            const numLuzesAdicionais = window.numLuzesAdicionaisPorPlataforma || 3; // Usar a variável global ou o valor padrão
            if (numLuzesAdicionais > 0) {
                if (plataformaIndex === 5) {
                    // Para a plataforma 5, começar as luzes a partir de uma posição mais à direita
                    // já que não temos a luz da extremidade esquerda
                    const startX = xEsquerda + 3; // Começar 3 unidades à direita da posição onde estaria a luz esquerda
                    const distanciaTotal = xDireita - startX;
                    const intervalo = distanciaTotal / (numLuzesAdicionais + 1);
                    
                    // Reduzir a altura das luzes na plataforma 5
                    const alturaReduzida = 0.5; // Reduzir para 0.5 unidades acima da plataforma
                    
                    for (let i = 1; i <= numLuzesAdicionais; i++) {
                        const posX = startX + (intervalo * i);
                        
                        // Criar luz com intensidade ligeiramente reduzida para as luzes intermediárias
                        const intensidadeAjustada = intensidade * 0.8;
                        criarLuzPontual(posX, plataforma.y + alturaReduzida, zValue, cor, intensidadeAjustada, alcance);
                    }
                } else {
                    // Para as outras plataformas, manter o comportamento normal
                    const distanciaTotal = xDireita - xEsquerda;
                    const intervalo = distanciaTotal / (numLuzesAdicionais + 1);
                    
                    for (let i = 1; i <= numLuzesAdicionais; i++) {
                        const posX = xEsquerda + (intervalo * i);
                        // Calcular altura interpolada entre as extremidades
                        const progress = i / (numLuzesAdicionais + 1);
                        const alturaInterpolada = alturaEsquerda + (alturaDireita - alturaEsquerda) * progress;
                        
                        // Criar luz com intensidade ligeiramente reduzida para as luzes intermediárias
                        const intensidadeAjustada = intensidade * 0.8;
                        criarLuzPontual(posX, plataforma.y + alturaInterpolada, zValue, cor, intensidadeAjustada, alcance);
                    }
                }
            }
            
            // Criar luz na extremidade direita
            criarLuzPontual(xDireita, plataforma.y + alturaDireita, zValue, cor, intensidade, alcance);
        });
        
        // Após criar todas as luzes pontuais para o nível 2, alinhar o z de todas
        if (window.gameState.currentLevel === 2) {
            // Filtrar todas as luzes pontuais criadas neste momento
            const pointLights = [];
            cena.traverse(function(obj) {
                if (obj.isLight && obj.type === 'PointLight') {
                    pointLights.push(obj);
                }
            });
            if (pointLights.length > 0) {
                // Encontrar o menor z
                let menorZ = pointLights[0].position.z;
                pointLights.forEach(luz => {
                    if (luz.position.z < menorZ) menorZ = luz.position.z;
                });
                // Alinhar todas as luzes para esse z
                pointLights.forEach(luz => {
                    luz.position.z = menorZ;
                });
            }
        }
    }
    
    // Função para criar uma luz pontual (sem esfera visível)
    function criarLuzPontual(x, y, z, cor, intensidade, alcance) {
        const luz = new THREE.PointLight(cor, intensidade, alcance);
        luz.position.set(x, y, z);
        luz.castShadow = false;
        
        // Removida a criação da esfera visível - apenas o efeito de luz permanece
        
        cena.add(luz);
        
        // Adicionar ao array de luzes essenciais
        window.luzesEssenciais.push(luz.uuid);
        
        return luz;
    }
    
    // Criar as plataformas
    for (let i = 0; i < plataformasInfo.length; i++) {
        const info = plataformasInfo[i];
        const plano = criarChaoInvisivel(7, info.y, -3);
        plano.userData.plataformaInfo = info; // Store platform info
        plano.userData.levelId = window.gameState.currentLevel; // Marcar com o ID do nível
        cena.add(plano);
        objetosColisao.push(plano);
        plataformas.push(plano);
        window.planosInvisiveis.push(plano); // Armazenar referência para limpeza futura
    }
    
    // Adicionar luzes pontuais conforme configuração
    configLuzes.forEach(config => {
        const [plataformaIndex, xEsquerda, xDireita, alturaEsquerda, alturaDireita, cor, intensidade, alcance] = config;
        const plataforma = plataformasInfo[plataformaIndex];
        
        // Obter o valor Z correto para a plataforma atual, usando o mesmo que está definido para o barril
        // ou usar -3 como fallback se não estiver definido
        const plataformaY = plataforma.y.toString();
        const zValue = barrilZPorPlataforma[plataformaY] !== undefined ? barrilZPorPlataforma[plataformaY] : -3;
        
        // Criar luz na extremidade esquerda
        // Não criar a luz da extremidade esquerda para a plataforma 5
        if (plataformaIndex !== 5) {
            criarLuzPontual(xEsquerda, plataforma.y + alturaEsquerda, zValue, cor, intensidade, alcance);
        }
        
        // Criar luzes adicionais ao longo da plataforma
        const numLuzesAdicionais = window.numLuzesAdicionaisPorPlataforma || 3; // Usar a variável global ou o valor padrão
        if (numLuzesAdicionais > 0) {
            if (plataformaIndex === 5) {
                // Para a plataforma 5, começar as luzes a partir de uma posição mais à direita
                // já que não temos a luz da extremidade esquerda
                const startX = xEsquerda + 3; // Começar 3 unidades à direita da posição onde estaria a luz esquerda
                const distanciaTotal = xDireita - startX;
                const intervalo = distanciaTotal / (numLuzesAdicionais + 1);
                
                // Reduzir a altura das luzes na plataforma 5
                const alturaReduzida = 0.5; // Reduzir para 0.5 unidades acima da plataforma
                
                for (let i = 1; i <= numLuzesAdicionais; i++) {
                    const posX = startX + (intervalo * i);
                    
                    // Criar luz com intensidade ligeiramente reduzida para as luzes intermediárias
                    const intensidadeAjustada = intensidade * 0.8;
                    criarLuzPontual(posX, plataforma.y + alturaReduzida, zValue, cor, intensidadeAjustada, alcance);
                }
          } else {
                // Para as outras plataformas, manter o comportamento normal
                  const distanciaTotal = xDireita - xEsquerda;
                const intervalo = distanciaTotal / (numLuzesAdicionais + 1);
                
                for (let i = 1; i <= numLuzesAdicionais; i++) {
                    const posX = xEsquerda + (intervalo * i);
                    // Calcular altura interpolada entre as extremidades
                    const progress = i / (numLuzesAdicionais + 1);
                    const alturaInterpolada = alturaEsquerda + (alturaDireita - alturaEsquerda) * progress;
                    
                    // Criar luz com intensidade ligeiramente reduzida para as luzes intermediárias
                    const intensidadeAjustada = intensidade * 0.8;
                    criarLuzPontual(posX, plataforma.y + alturaInterpolada, zValue, cor, intensidadeAjustada, alcance);
                }
            }
        }
        
        // Criar luz na extremidade direita
        // Para a plataforma 5, usar altura reduzida
        if (plataformaIndex === 5) {
            const alturaReduzida = 0.5; // Mesma altura reduzida usada para as luzes intermediárias
            criarLuzPontual(xDireita, plataforma.y + alturaReduzida, zValue, cor, intensidade, alcance);
        } else {
            criarLuzPontual(xDireita, plataforma.y + alturaDireita, zValue, cor, intensidade, alcance);
        }
    });

    // Configuração da câmara perspectiva
    camaraPerspectiva.position.set(0, 1, 5);
    camaraPerspectiva.lookAt(0, 0, 0);

    // Configuração da câmara ortográfica
    camaraOrto.position.set(0, 1, 5);
    camaraOrto.lookAt(0, 0, 0);

    cena.add(luzAmbiente);

    // === LUZ DIRECIONAL 1 – principal: de frente para o Mario ===
    luzDirecional1.color = new THREE.Color(0xffffff);
    luzDirecional1.intensity = 1.8;
    luzDirecional1.position.set(0, 15, 12); // Luz elevada e vindo da frente
    luzDirecional1.target.position.set(0, 0, 0); // Foco no Mario
    luzDirecional1.castShadow = true;

    // Sombra poderosa
    luzDirecional1.shadow.mapSize.width = 2048;
    luzDirecional1.shadow.mapSize.height = 2048;
    luzDirecional1.shadow.bias = -0.0005; // Corrige artefatos (shadow acne)

    // Shadow camera – cobre bem a área onde Mario se move
    luzDirecional1.shadow.camera.near = 1;
    luzDirecional1.shadow.camera.far = 50;
    luzDirecional1.shadow.camera.left = -15;
    luzDirecional1.shadow.camera.right = 15;
    luzDirecional1.shadow.camera.top = 15;
    luzDirecional1.shadow.camera.bottom = -15;

    cena.add(luzDirecional1);
    cena.add(luzDirecional1.target);

    // === LUZ DIRECIONAL 2 – lateral preenchimento (suaviza sombras fortes) ===
    luzDirecional2.color = new THREE.Color(0xfff6cc); // luz mais quente
    luzDirecional2.intensity = 0.6;
    luzDirecional2.position.set(8, 10, 4); // lateral direita e acima
    luzDirecional2.target.position.set(0, 0, 0);
    luzDirecional2.castShadow = false;

    cena.add(luzDirecional2);
    cena.add(luzDirecional2.target);

    // === LUZ DIRECIONAL 3 – contraluz para destacar silhueta ===
    luzDirecional3.color = new THREE.Color(0xddddff); // luz fria
    luzDirecional3.intensity = 0.5;
    luzDirecional3.position.set(-6, 8, -10); // vindo de trás e da esquerda
    luzDirecional3.target = new THREE.Object3D();
    luzDirecional3.target.position.set(0, 0, 0);
    luzDirecional3.castShadow = false;

    cena.add(luzDirecional3);
    cena.add(luzDirecional3.target);

    carregarBarril('./Objetos/Barril.fbx', { x: 0.35, y: 0.35, z: 0.35 }, { x: -11, y: 5.7, z: -3 }, { x: 0, y: 0, z: 0 });

    // Aplicar o estado das luzes imediatamente
    console.log("Aplicando estado das luzes imediatamente após carregamento do nível:", window.gameState.lights);
    applyLightStates();
    
    // Aguardar um pouco para garantir que todos os modelos foram carregados
    setTimeout(() => {
        // Verificar e remover luzes indesejadas
        console.log("Verificando e removendo luzes indesejadas...");
        window.findAllLights(); // Listar todas as luzes para debug
        window.cleanupUnwantedLights(); // Remover luzes não essenciais
        
        // O cleanupUnwantedLights já aplica o estado das luzes
    }, 1000); // Reduzido para 1 segundo para ser mais responsivo

    requestAnimationFrame(loop);
}

function foraDaPlataforma(barril) {
    return barril.position.x <= -10 || barril.position.x >= 12;
}


// Loop de animação
// Variável para controlar se o loop de animação está ativo
let animationLoopActive = true;

// Variável para controlar a frequência dos logs de luzes
let lightLogCounter = 0;

// Função para encontrar e listar todas as luzes na cena
window.findAllLights = function () {
    console.log("Procurando todas as luzes na cena...");
    let lightsFound = [];

    cena.traverse(function (object) {
        if (object.isLight) {
            lightsFound.push({
                name: object.name,
                type: object.type,
                uuid: object.uuid,
                parent: object.parent ? object.parent.name || object.parent.uuid : "none",
                object: object // Guardar referência ao objeto para possível remoção
            });
        }
    });

    console.log("Luzes encontradas:", lightsFound);
    return lightsFound;
};

// Função para remover uma luz específica pelo UUID
window.removeLightByUUID = function (uuid) {
    let lightRemoved = false;

    cena.traverse(function (object) {
        if (object.isLight && object.uuid === uuid) {
            console.log(`Removendo luz: ${object.name} (${object.type})`);
            if (object.parent) {
                object.parent.remove(object);
                lightRemoved = true;
            }
        }
    });

    return lightRemoved;
};

// Função para limpar todas as luzes não essenciais
window.cleanupUnwantedLights = function () {
    // Lista de UUIDs das luzes essenciais que não devem ser removidas
    // Você pode adicionar os UUIDs das luzes que você criou explicitamente
    const essentialLights = [
        luzAmbiente.uuid,
        luzDirecional1.uuid,
        luzDirecional2.uuid,
        luzDirecional3.uuid
    ];
    
    // Adicionar as luzes das plataformas à lista de luzes essenciais
    if (window.luzesEssenciais && window.luzesEssenciais.length > 0) {
        essentialLights.push(...window.luzesEssenciais);
    }
    
    // Salvar referências a todas as point lights antes da limpeza
    let pointLights = [];
    cena.traverse(function(object) {
        if (object.isLight && object.type === 'PointLight') {
            pointLights.push(object);
        }
    });

    let lightsRemoved = 0;

    // Remover apenas as point lights não essenciais
    pointLights.forEach(light => {
        if (!essentialLights.includes(light.uuid)) {
            console.log(`Removendo luz não essencial: ${light.name} (${light.type})`);
            if (light.parent) {
                light.parent.remove(light);
                lightsRemoved++;
            }
        }
    });

    console.log(`${lightsRemoved} luzes não essenciais foram removidas.`);
    
    // Aplicar o estado das luzes imediatamente após a limpeza
    console.log("Aplicando estado das luzes após limpeza:", window.gameState.lights);
    applyLightStates();
    
    return lightsRemoved;
};

function loop() {
    // Log de luzes apenas a cada 100 frames para não sobrecarregar o console
    if (lightLogCounter % 100 === 0) {
        console.log("Número de luzes na cena:", renderer.info.lights);
    }
    lightLogCounter++;

    // Se não estiver ativo, não continua o loop
    if (!animationLoopActive) {
        return;
    }

    // Se estiver no menu principal, não atualiza o jogo, mas continua renderizando
    if (window.gameState.isInMainMenu) {
        renderer.render(cena, cameraAtual);
        requestAnimationFrame(loop);
        return;
    }

    // Se o jogo estiver pausado, game over ou vitória, apenas renderiza a cena sem atualizações
    if (window.gameState.isPaused || window.gameState.isGameOver || window.gameState.isWin) {
        // Não atualiza nada, apenas renderiza o estado atual
        renderer.render(cena, cameraAtual);
        requestAnimationFrame(loop);
        return;
    }

    const delta = relogio.getDelta();

    if (mixerAnimacao) {
        mixerAnimacao.update(delta);
    }
    if (mixerPeach) {
        mixerPeach.update(delta);
    }
    if (mixerDonkeyKong) {
        mixerDonkeyKong.update(delta);
    }

    if (objetoImportado) {
        // Raycasting para verificar o chão - melhorado para detectar apenas plataformas válidas para Mario
        raycaster.set(objetoImportado.position, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObjects(objetosColisao, true);
        
        // Verificar se a colisão é com uma plataforma válida
        let noChao = false;
        if (intersects.length > 0 && intersects[0].distance < 0.2) {
            // Verificar se a plataforma está em uma das alturas válidas
            const alturasValidas = [-10, -7, -4, -1, 2, 5, 8];
            const alturaAtual = Math.round(objetoImportado.position.y);
            
            // Verificar se estamos próximos de uma altura válida (com margem de erro)
            for (let i = 0; i < alturasValidas.length; i++) {
                if (Math.abs(alturaAtual - alturasValidas[i]) <= 0.5) {
                    noChao = true;
                    break;
                }
            }
        }
        
        // Adicionar uma propriedade ao objeto para indicar que é o Mario
        // Isso será usado para diferenciar a detecção de colisão entre Mario e barris
        objetoImportado.userData.isMario = true;

        // Get current platform info
        let plataformaAtual = null;
        if (intersects.length > 0) {
            plataformaAtual = intersects[0].object.userData.plataformaInfo;
        }

        // Abordagem melhorada para evitar que o Mario bata a cabeça
        // Verificar apenas plataformas válidas em alturas específicas
        
        // Se o Mario está pulando e está subindo, verificar se ele está próximo de uma plataforma
        if (pulando && velocidadeY > 0) {
            // Lista de alturas válidas para plataformas
            const alturasValidas = [-10, -7, -4, -1, 2, 5, 8];
            
            // Encontrar a próxima plataforma acima
            let proximaPlataformaAcima = null;
            let distanciaMinima = Infinity;
            
            for (let i = 0; i < alturasValidas.length; i++) {
                const alturaPlataforma = alturasValidas[i];
                
                // Verificar se a plataforma está acima do Mario
                if (alturaPlataforma > objetoImportado.position.y) {
                    const distancia = alturaPlataforma - objetoImportado.position.y;
                    
                    // Se esta plataforma está mais próxima que a anterior
                    if (distancia < distanciaMinima) {
                        distanciaMinima = distancia;
                        proximaPlataformaAcima = alturaPlataforma;
                    }
                }
            }
            
            // Se encontrou uma plataforma acima e está próxima o suficiente
            if (proximaPlataformaAcima !== null && distanciaMinima < 3.0) {
                // Verificar se o Mario está dentro dos limites horizontais da plataforma (-12 a 12)
                if (objetoImportado.position.x >= -12 && objetoImportado.position.x <= 12) {
                    // Definir uma altura máxima segura (um pouco abaixo da plataforma)
                    const alturaMaximaPulo = proximaPlataformaAcima - 0.5;
                    
                    // Se o Mario está prestes a ultrapassar essa altura, ajustar
                    if (objetoImportado.position.y + velocidadeY > alturaMaximaPulo) {
                        // Ajustar a posição para a altura máxima segura
                        objetoImportado.position.y = alturaMaximaPulo;
                        // Inverter a velocidade para iniciar a queda
                        velocidadeY = -0.05;
                    }
                }
            }
        }

        if (!noChao) {
            velocidadeY += gravidade; // Aplica gravidade
            podePular = false; // Cannot jump while in the air
            
            // Limitar a velocidade máxima de queda para evitar atravessar plataformas
            if (velocidadeY < -0.3) {
                velocidadeY = -0.3;
            }
        } else {
            if (pulando) {
                pulando = false; // Reseta o estado de pulo ao tocar o chão
                // Resetar a velocidade horizontal do pulo ao tocar o chão
                objetoImportado.userData.velocidadePuloX = 0;
            }
            velocidadeY = 0; // Zera a velocidade vertical ao tocar o chão
            podePular = true; // Reset jump ability when on ground

            // Snap to platform height - melhorado para evitar o efeito de "degrau invisível"
            // Usar as alturas válidas em vez de confiar apenas na plataforma atual
            const alturasValidas = [-10, -7, -4, -1, 2, 5, 8];
            let alturaAtual = objetoImportado.position.y;
            let alturaCorreta = null;
            let distanciaMinima = Infinity;
            
            // Encontrar a altura válida mais próxima
            for (let i = 0; i < alturasValidas.length; i++) {
                const distancia = Math.abs(alturaAtual - alturasValidas[i]);
                if (distancia < distanciaMinima) {
                    distanciaMinima = distancia;
                    alturaCorreta = alturasValidas[i];
                }
            }
            
            // Se encontrou uma altura válida próxima, ajustar a posição
            if (alturaCorreta !== null && distanciaMinima < 0.5) {
                objetoImportado.position.y = alturaCorreta + 0.1; // Pequeno offset para evitar flutuação
            }

            // Process pending jump if we just landed
            if (puloPendente) {
                puloPendente = false;
                pulando = true;
                podePular = false;
                velocidadeY = getForcaPulo();
                ultimoPulo = relogio.getElapsedTime();
                // Play jump sound
                if (jumpSound && !jumpSound.isPlaying) {
                    jumpSound.play();
                }
            }
        }

        // Handle jump input in the loop for consistent behavior
        // Verificar se o espaço foi pressionado ou se já está em um pulo
        if ((teclasPressionadas[32] && !teclasPressionadasAnterior[32]) || pulando) {
            const tempoAtual = relogio.getElapsedTime();

            // Se o espaço acabou de ser pressionado e podemos pular
            if (teclasPressionadas[32] && !teclasPressionadasAnterior[32] &&
                tempoAtual - ultimoPulo > 0.2 && podePular && !pulando) {
                
                // Iniciar um novo pulo - melhorado para evitar colisões indesejadas
                pulando = true;
                podePular = false;
                velocidadeY = getForcaPulo(); // Usar a força de pulo específica do nível
                ultimoPulo = tempoAtual;
                objetoImportado.userData.tempoInicioPulo = tempoAtual; // Registrar o tempo de início do pulo
                objetoImportado.userData.duracaoPulo = 0.8; // Definir duração fixa para o pulo (em segundos)
                
                // Tocar som de pulo
                if (jumpSound && !jumpSound.isPlaying) {
                    jumpSound.play();
                }
                
                // Garantir que o personagem comece a subir imediatamente
                // Impulso maior para garantir que saia do chão e evite colisões indesejadas
                objetoImportado.position.y += 0.2; 
                
                // Registrar a altura inicial do pulo para cálculos de colisão mais precisos
                objetoImportado.userData.alturaInicioPulo = objetoImportado.position.y;
                
                // Verificar se há teclas direcionais pressionadas para pulo direcional
                let puloComDirecao = false;

                // Na câmera perspectiva: W+Space = pulo para frente, S+Space = pulo para trás
                if (cameraAtual === camaraPerspectiva) {
                    if (teclasPressionadas[87]) { // W pressionado junto com espaço
                        objetoImportado.rotation.y = Math.PI / 2;
                        objetoImportado.userData.velocidadePuloX = velocidadeMovimento * 1.5; // Velocidade horizontal durante o pulo
                        puloComDirecao = true;
                    } else if (teclasPressionadas[83]) { // S pressionado junto com espaço
                        objetoImportado.rotation.y = -Math.PI / 2;
                        objetoImportado.userData.velocidadePuloX = -velocidadeMovimento * 1.5; // Velocidade horizontal durante o pulo
                        puloComDirecao = true;
                    }
                }
                // Na câmera ortográfica: D+Space = pulo para direita, A+Space = pulo para esquerda
                else if (cameraAtual === camaraOrto) {
                    if (teclasPressionadas[68]) { // D pressionado junto com espaço
                        objetoImportado.rotation.y = Math.PI / 2;
                        objetoImportado.userData.velocidadePuloX = velocidadeMovimento * 1.5; // Velocidade horizontal durante o pulo
                        puloComDirecao = true;
                    } else if (teclasPressionadas[65]) { // A pressionado junto com espaço
                        objetoImportado.rotation.y = -Math.PI / 2;
                        objetoImportado.userData.velocidadePuloX = -velocidadeMovimento * 1.5; // Velocidade horizontal durante o pulo
                        puloComDirecao = true;
                    }
                }

                // Se não houver direção, pulo vertical
                if (!puloComDirecao) {
                    objetoImportado.userData.velocidadePuloX = 0;
                }

                // Play jump sound
                if (jumpSound && !jumpSound.isPlaying) {
                    jumpSound.play();
                }
            }
            // Se já estamos pulando, verificar se o pulo deve continuar
            else if (pulando) {
                // Verificar se o pulo já ultrapassou sua duração máxima
                const tempoPulo = tempoAtual - objetoImportado.userData.tempoInicioPulo;

                // Se o pulo já durou o suficiente e estamos no chão, encerrá-lo
                if (tempoPulo >= objetoImportado.userData.duracaoPulo && noChao) {
                    pulando = false;
                    podePular = true;
                    velocidadeY = 0;
                    objetoImportado.userData.velocidadePuloX = 0;
                }
            }
            else if (noChao) {
                // If we're on the ground but can't jump yet, queue the jump
                puloPendente = true;
            }
        }

        // Atualiza a posição vertical do personagem
        objetoImportado.position.y += velocidadeY;

        // Aplicar velocidade horizontal durante o pulo, se existir
        // O pulo tem prioridade sobre o movimento normal
        if (pulando) {
            // Se estiver pulando, aplicar a velocidade horizontal definida no início do pulo
            // Isso garante que o pulo seja executado na sua totalidade mesmo se o jogador soltar a tecla
            if (objetoImportado.userData.velocidadePuloX !== undefined) {
                objetoImportado.position.x += objetoImportado.userData.velocidadePuloX;
            }

            // Verificar limites horizontais para não sair da plataforma
            if (objetoImportado.position.x < -10) {
                objetoImportado.position.x = -10;
            } else if (objetoImportado.position.x > 12) {
                objetoImportado.position.x = 12;
            }
        }

        // Prevent falling below platforms
        if (objetoImportado.position.y < -10) {
            objetoImportado.position.y = -10;
            velocidadeY = 0;
            pulando = false;
            podePular = true; // Reset jump ability when hitting bottom
        }

        // Check platform boundaries before horizontal movement
        if (plataformaAtual) {
            const novaPosicaoX = objetoImportado.position.x;
            if (novaPosicaoX < plataformaAtual.xMin) {
                objetoImportado.position.x = plataformaAtual.xMin;
            } else if (novaPosicaoX > plataformaAtual.xMax) {
                objetoImportado.position.x = plataformaAtual.xMax;
            }
        }

        // Movimentação baseada na câmera atual
        // Verificar primeiro se está pulando - o pulo tem prioridade sobre o movimento normal
        if (!pulando && cameraAtual === camaraPerspectiva) {
            // Use different movement speed based on whether Mario is in the air
            const velocidadeAtual = noChao ? velocidadeMovimento : velocidadeMovimentoAr;

            // Movimentação na câmera perspectiva: W (frente) e S (trás)
            if (objetoImportado.rotation.y === -Math.PI / 2) {
                if (teclasPressionadas[68]) { // D (esquerda)
                    objetoImportado.rotation.y = Math.PI;
                    if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) &&
                        noChao && window.gameState.currentLevel === 1) {
                        objetoImportado.position.y += 3.1;
                        objetoImportado.position.z -= 1;
                    }
                    else if (PlatformLevel2.getEscadasInfo().some(escada =>
                    objetoImportado.position.x >= escada.xMin &&
                    objetoImportado.position.x <= escada.xMax &&
                    objetoImportado.position.y >= escada.yMin &&
                    objetoImportado.position.y <= escada.yMax) && window.gameState.currentLevel === 2) {
                        objetoImportado.position.y += 3.1;
                    }
                    iniciarAnimacao();
                }
            } else if (objetoImportado.rotation.y === Math.PI / 2) {
                if (teclasPressionadas[65]) { // A (esquerda)
                    objetoImportado.rotation.y = Math.PI;
                    if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5)) &&
                        noChao && window.gameState.currentLevel === 1) {
                        objetoImportado.position.y += 3.1;
                        objetoImportado.position.z -= 1;
                    }
                    else if (PlatformLevel2.getEscadasInfo().some(escada =>
                    objetoImportado.position.x >= escada.xMin &&
                    objetoImportado.position.x <= escada.xMax &&
                    objetoImportado.position.y >= escada.yMin &&
                    objetoImportado.position.y <= escada.yMax) && window.gameState.currentLevel === 2) {
                        objetoImportado.position.y += 3.1;
                    }
                    iniciarAnimacao();
                }
            }
            
            if (teclasPressionadas[17])
            {
                if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 5) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 11 && objetoImportado.position.y >= 8)) &&
                    noChao && window.gameState.currentLevel === 1) {
                    objetoImportado.position.y -= 3.1;
                    objetoImportado.position.z += 1;
                }
                else if (PlatformLevel2.getEscadasInfo().some(escada =>
                objetoImportado.position.x >= escada.xMin &&
                objetoImportado.position.x <= escada.xMax &&
                objetoImportado.position.y - 3 >= escada.yMin &&
                objetoImportado.position.y - 3 <= escada.yMax) && window.gameState.currentLevel === 2) {
                    objetoImportado.position.y -= 3.1;
                }
                iniciarAnimacao();
            }

            if (teclasPressionadas[87]) { // W (frente)
                objetoImportado.position.x += velocidadeAtual;
                objetoImportado.rotation.y = Math.PI / 2;
                iniciarAnimacao();
            } else if (teclasPressionadas[83]) { // S (trás)
                objetoImportado.position.x -= velocidadeAtual;
                objetoImportado.rotation.y = -Math.PI / 2;
                iniciarAnimacao();
            }
        } else if (!pulando && cameraAtual === camaraOrto) {
            // Use different movement speed based on whether Mario is in the air
            const velocidadeAtual = noChao ? velocidadeMovimento : velocidadeMovimentoAr;

            if (teclasPressionadas[87]) { // W (frente)
                objetoImportado.rotation.y = Math.PI;
                if (window.gameState.currentLevel === 1){
                    // Verificar se está em uma escada e só subir se estiver no chão e não estiver pulando
                    tentandoSubirEscada = ((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -7 && objetoImportado.position.y >= -10) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                        (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                        (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                        (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                        (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5));
                }
                else if (window.gameState.currentLevel === 2)
                {
                    tentandoSubirEscada = PlatformLevel2.getEscadasInfo().some(escada =>
                    objetoImportado.position.x >= escada.xMin &&
                    objetoImportado.position.x <= escada.xMax &&
                    objetoImportado.position.y >= escada.yMin &&
                    objetoImportado.position.y <= escada.yMax)
                }
                
                // Só permitir subir escadas se estiver no chão e não estiver pulando
                if (tentandoSubirEscada && noChao && !pulando) {
                    objetoImportado.position.y += 3.1;
                    if (window.gameState.currentLevel === 1){
                        objetoImportado.position.z -= 1;
                    }
                }
                iniciarAnimacao();
            } else if (teclasPressionadas[83]) {
                objetoImportado.rotation.y = Math.PI;
                if (((objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < -4 && objetoImportado.position.y >= -7) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 0 && objetoImportado.position.x <= 1 && objetoImportado.position.y < -1 && objetoImportado.position.y >= -4) ||
                    (objetoImportado.position.x >= 1 && objetoImportado.position.x <= 3 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 2 && objetoImportado.position.y >= -1) ||
                    (objetoImportado.position.x >= -3 && objetoImportado.position.x <= -1 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= -8 && objetoImportado.position.x <= -6 && objetoImportado.position.y < 5 && objetoImportado.position.y >= 2) ||
                    (objetoImportado.position.x >= 9 && objetoImportado.position.x <= 11 && objetoImportado.position.y < 8 && objetoImportado.position.y >= 5) ||
                    (objetoImportado.position.x >= 3 && objetoImportado.position.x <= 5 && objetoImportado.position.y < 11 && objetoImportado.position.y >= 8)) &&
                    noChao && window.gameState.currentLevel === 1) {
                    objetoImportado.position.y -= 3;
                    objetoImportado.position.z += 1;
                }
                else if (PlatformLevel2.getEscadasInfo().some(escada =>
                objetoImportado.position.x >= escada.xMin &&
                objetoImportado.position.x <= escada.xMax &&
                objetoImportado.position.y - 3 >= escada.yMin &&
                objetoImportado.position.y - 3 <= escada.yMax) && window.gameState.currentLevel === 2)
                {
                    objetoImportado.position.y -= 3;
                }
                iniciarAnimacao();
            } else if (teclasPressionadas[65]) { // A (esquerda)
                objetoImportado.position.x -= velocidadeAtual;
                objetoImportado.rotation.y = -Math.PI / 2;
                iniciarAnimacao();
            } else if (teclasPressionadas[68]) { // D (direita)
                objetoImportado.position.x += velocidadeAtual;
                objetoImportado.rotation.y = Math.PI / 2;
                iniciarAnimacao();
            }
        }

        // Aplicar limites de paredes invisíveis em x = -10 e x = 12
        if (objetoImportado) {
            // Parede invisível em x = -10
            if (objetoImportado.position.x < -10) {
                objetoImportado.position.x = -10;
            }

            // Parede invisível em x = 12
            if (objetoImportado.position.x > 12) {
                objetoImportado.position.x = 12;
            }
        }

        // Atualizar posição do barril
        atualizarBarril();

        // Check for scoring with all active barrels
        if (objetoImportado && !barrilColisao) {
            barrisAtivos.forEach((barril) => {
                // Verifica se o jogador está acima do barril dentro de um range vertical e horizontal
                if (!barril.userData.scored) {
                    const marioPos = objetoImportado.position;
                    const barrilPos = barril.position;

                    // Define os ranges de proximidade
                    const rangeVertical = 0.5 // Range vertical de 2 unidades acima do barril
                    const rangeHorizontal = 1; // Range horizontal de 3 unidades (x e z)

                    // Verifica se Mario está acima do barril e próximo horizontalmente
                    const estaAcima = marioPos.y > barrilPos.y + rangeVertical;
                    const estaProximoHorizontalmente =
                        Math.abs(marioPos.x - barrilPos.x) <= rangeHorizontal &&
                        Math.abs(marioPos.z - barrilPos.z) <= rangeHorizontal;

                    // Verifica se Mario está realmente próximo o suficiente para pontuar
                    const distancia = marioPos.distanceTo(barrilPos);
                    const distanciaMaxima = 2; // Distância máxima para pontuar

                    if (estaAcima && estaProximoHorizontalmente && distancia <= distanciaMaxima) {
                        window.gameState.score += 100; // Adiciona 100 pontos
                        updateScoreDisplay();
                        barril.userData.scored = true; // Marca o barril como já pontuado
                    }
                }
            });
        }



        barrisAtivos.forEach((barril, index) => {
            // Remove o barril se estiver muito abaixo (fora da cena)
            if (barril.position.y < -10) {
                cena.remove(barril);
                barrisAtivos.splice(index, 1);
                return;
            }

            // Inicializa a plataforma atual se não existir
            if (barril.userData.plataformaAtual === undefined) {
                barril.userData.plataformaAtual = 0;
            }

            // Raycasting para verificar o chão - usando a versão original para barris
            raycaster.set(barril.position, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObjects(objetosColisao, true);
            // Para barris, usamos a detecção de colisão original sem verificar alturas específicas
            const noChao = intersects.length > 0 && intersects[0].distance < 0.6;

            // Verifica se está sobre uma escada para a plataforma atual
            const laddersAtCurrentHeight = posicoesEscadas.filter(escada => {
                const alturaCorreta = Math.abs(barril.position.y - escada.y) < 0.5;
                const dentroDosLimites = barril.position.x >= escada.xMin && barril.position.x <= escada.xMax;
                return alturaCorreta && dentroDosLimites;
            });

            // Se estiver no ar, aplica gravidade
            if (!noChao) {
                barril.userData.velocidade.y += gravidade;
                barril.position.y += barril.userData.velocidade.y;
            } else {
                // Se estiver no chão
                if (laddersAtCurrentHeight.length > 0) {
                    // Randomly decide whether to fall down a ladder or continue moving
                    if (Math.random() < 0.1) { // 10% chance to fall down a ladder
                        // Randomly choose one of the available ladders
                        const chosenLadder = laddersAtCurrentHeight[Math.floor(Math.random() * laddersAtCurrentHeight.length)];

                        // Move to the chosen ladder's position
                        barril.position.x = (chosenLadder.xMin + chosenLadder.xMax) / 2;

                        // Fall down (descida como antes)
                        barril.position.y -= 3;
                        barril.position.z += 1.8;
                        barril.userData.plataformaAtual += 1;

                        // Alternate horizontal movement direction with reduced speed
                        barril.userData.velocidade.x = barril.userData.plataformaAtual % 2 === 0 ? 0.025 : -0.025;
                    } else {
                        // Continue moving horizontally
                        barril.position.x += barril.userData.velocidade.x;
                        // Manter barril rente ao plano - usando a lógica original
                        // Verificar se o barril está em uma plataforma conhecida
                        if (intersects.length > 0 && intersects[0].object.userData.plataformaInfo) {
                            // Usar a altura da plataforma detectada
                            barril.position.y = intersects[0].object.userData.plataformaInfo.y + 0.125;
                        } else {
                            // Fallback para o método anterior
                            let alturasPlanos = [-10, -7, -4, -1, 2, 5, 8];
                            let planoMaisProximo = alturasPlanos.reduce((prev, curr) => 
                                Math.abs(curr - barril.position.y) < Math.abs(prev - barril.position.y) ? curr : prev);
                            let offset = planoMaisProximo <= 2 ? 0.01 : 0.125;
                            barril.position.y = planoMaisProximo + offset;
                        }
                    }
                } else {
                    // No ladders available, continue moving horizontally
                    barril.position.x += barril.userData.velocidade.x;
                    // Manter barril rente ao plano - usando a lógica original
                    // Verificar se o barril está em uma plataforma conhecida
                    if (intersects.length > 0 && intersects[0].object.userData.plataformaInfo) {
                        // Usar a altura da plataforma detectada
                        barril.position.y = intersects[0].object.userData.plataformaInfo.y + 0.125;
                    } else {
                        // Fallback para o método anterior
                        let alturasPlanos = [-10, -7, -4, -1, 2, 5, 8];
                        let planoMaisProximo = alturasPlanos.reduce((prev, curr) => 
                            Math.abs(curr - barril.position.y) < Math.abs(prev - barril.position.y) ? curr : prev);
                        let offset = planoMaisProximo <= 2 ? 0.01 : 0.125;
                        barril.position.y = planoMaisProximo + offset;
                    }

                    // Verifica se atingiu os limites da plataforma
                    if (barril.position.x <= -10 || barril.position.x >= 12) {
                        // Limitar a posição do barril às paredes invisíveis
                        if (barril.position.x < -10) barril.position.x = -10;
                        if (barril.position.x > 12) barril.position.x = 12;

                        // Fazer o barril descer para a próxima plataforma
                        barril.position.y -= 3;
                        barril.position.z += 1.8;
                        barril.userData.plataformaAtual += 1;
                        barril.userData.velocidade.x = barril.userData.plataformaAtual % 2 === 0 ? 0.025 : -0.025;
                    }
                }
            }

            // Check for collision with Mario
            if (objetoImportado && !barrilColisao) {
                const marioBox = new THREE.Box3().setFromObject(objetoImportado);
                const barrilBox = new THREE.Box3().setFromObject(barril);

                // Make collision detection more precise
                if (marioBox.intersectsBox(barrilBox)) {
                    // Calculate actual distance between Mario and barrel
                    const distancia = objetoImportado.position.distanceTo(barril.position);

                    // Only trigger collision if Mario is very close to the barrel
                    if (distancia < 0.8 && !(pulando &&
                        objetoImportado.position.y > barril.position.y - 2 &&
                        Math.abs(objetoImportado.position.x - barril.position.x) < 3 &&
                        Math.abs(objetoImportado.position.z - barril.position.z) < 3)) {
                        barrilColisao = true;

                        // Stop all music first
                        window.stopAllMusic();

                        // Play Dead Mario sound
                        safePlayAudio(deadMarioSound, 'Dead Mario Sound');

                        // Show game over screen
                        window.gameOver();
                    }
                }
            }

            // Atualizar a coordenada z do barril baseado na altura atual
            atualizarZDoBarril(barril);
        });

        // Check if Mario has reached the win position based on current level
        if (objetoImportado) {
            // Check if Mario is at win position with some tolerance (level 1)
            const marioPos = objetoImportado.position;
            if (window.gameState.currentLevel === 1 &&
                Math.abs(marioPos.x - 2) < 1.0 &&
                Math.abs(marioPos.y - 7) < 1.0 &&
                Math.abs(marioPos.z - (-9.5)) < 1.0) {
                // Player has reached the win position for level 1
                window.gameWin();
            }

            // Check proximity to Princess Peach as win condition based on current level
            let peachPosition;
            if (window.gameState.currentLevel === 1) {
                peachPosition = new THREE.Vector3(0, 7, -9.5);
            } else if (window.gameState.currentLevel === 2) {
                peachPosition = new THREE.Vector3(0, 8.2, -3.0);
            }
            
            // Calculate horizontal distance (ignoring Y axis)
            const horizontalDistance = Math.sqrt(
                Math.pow(objetoImportado.position.x - peachPosition.x, 2) + 
                Math.pow(objetoImportado.position.z - peachPosition.z, 2)
            );
            
            // Calculate vertical distance (Y axis only)
            const verticalDistance = Math.abs(objetoImportado.position.y - peachPosition.y);
            
            // Check if Mario is close to Peach horizontally, on the same platform (similar Y), and not jumping
            if (horizontalDistance < 1.5 && verticalDistance < 0.5 && !pulando) {
                // Stop current theme and play ending theme
                if (window.stageTheme && window.stageTheme.isPlaying) {
                    window.stageTheme.stop();
                }
                if (window.titleTheme && window.titleTheme.isPlaying) {
                    window.titleTheme.stop();
                }

                // Play ending theme
                if (endingTheme && !endingTheme.isPlaying) {
                    try {
                        endingTheme.play();
                    } catch (error) {
                        console.error('Error playing Ending Theme on Peach collision:', error);
                    }
                }

                // Change Mario to dead sprite
                if (objetoImportado) {
                    // Load dead Mario texture
                    const deadMarioTexture = textureLoader.load('./textures/mario_dead_texture.png');
                    objetoImportado.traverse(function (child) {
                        if (child.isMesh) {
                            child.material = new THREE.MeshPhongMaterial({
                                map: deadMarioTexture,
                                side: THREE.DoubleSide
                            });
                        }
                    });
                }

                // Player has reached Princess Peach
                window.gameWin();
            }
        }

        if (cameraAtual === camaraPerspectiva && objetoImportado && objetosColisao.length > 0) {
            atualizarCameraParaSeguirPersonagem(camaraPerspectiva, objetoImportado);
        }

        // Update previous key states
        teclasPressionadasAnterior = { ...teclasPressionadas };
    }

    renderer.render(cena, cameraAtual);
    requestAnimationFrame(loop);
}

const offsetCameraPerspectiva = new THREE.Vector3(0, 1, 5); // 1 unidade acima, 5 unidades atrás

function atualizarCameraParaSeguirPersonagem(camera, personagem) {
    const alturaOmbro = 1.6; // altura do ombro
    const distanciaAtras = 10.0; // distância atrás do personagem
    let deslocamentoLateral = 5; // ombro esquerdo por padrão

    // Verificar a direção do personagem com base na rotação
    if (personagem.rotation.y === -Math.PI / 2) { // Mario olhando para trás
        deslocamentoLateral = -5; // Alterar para o ombro direito
    } else {
        deslocamentoLateral = 5; // Voltar para o ombro esquerdo
    }

    // Direção "para trás" na rotação do personagem
    const direcaoAtras = new THREE.Vector3(0, 0, -1).applyQuaternion(personagem.quaternion).normalize();
    const lateralEsquerda = new THREE.Vector3(-1, 0, 0).applyQuaternion(personagem.quaternion).normalize();

    // Posição da câmera: atrás + para o lado (esquerda ou direita) + na altura do ombro
    const posicaoDesejada = personagem.position.clone()
        .add(direcaoAtras.multiplyScalar(distanciaAtras))
        .add(lateralEsquerda.multiplyScalar(deslocamentoLateral))
        .add(new THREE.Vector3(0, alturaOmbro, 0));

    // Define a posição da câmera diretamente
    camera.position.copy(posicaoDesejada);

    // Ponto para onde a câmera deve olhar (à frente do personagem)
    const direcaoFrente = new THREE.Vector3(0, 0, 1).applyQuaternion(personagem.quaternion).normalize();
    const pontoFoco = personagem.position.clone()
        .add(direcaoFrente.multiplyScalar(10))
        .add(new THREE.Vector3(0, alturaOmbro, 0));

    camera.lookAt(pontoFoco);
}

function criarChaoInvisivel(x, y, z) {
    // Voltar para a geometria original de plano "infinito" para os barris
    // mas manter a detecção especial para o Mario
    const geometry = new THREE.PlaneGeometry(10000, 10000);

    // Material invisível
    const material = new THREE.MeshBasicMaterial({
        color: 0x0000000,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const chao = new THREE.Mesh(geometry, material);

    // Posição e rotação como "chão"
    chao.position.set(x, y, z);
    chao.rotation.x = -Math.PI / 2;

    // Visível = true só pra garantir que o raycasting funcione
    chao.visible = true;

    // Extra: metadata útil
    chao.name = 'chaoInvisivel';
    chao.userData.isChao = true;
    chao.userData.interativo = true;

    return chao;
}

// Win menu buttons
document.getElementById('playAgainButton').addEventListener('click', function () {
    document.getElementById('winMenu').classList.add('hidden');
    if (typeof restartGame === 'function') {
        restartGame();
    }
});

document.getElementById('winMainMenuButton').addEventListener('click', function () {
    document.getElementById('winMenu').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');

    // Stop all music including title theme
    window.stopAllMusic();
    if (window.titleTheme && window.titleTheme.isPlaying) {
        window.titleTheme.stop();
    }

    // Play stage theme first
    if (audioInitialized && stageTheme && !stageTheme.isPlaying) {
        try {
            stageTheme.play();
        } catch (error) {
            console.error('Error playing Stage Theme from Win Main Menu:', error);
        }
    }

    // Reset the player position when returning to main menu
    if (typeof restartGame === 'function') {
        // Call restartGame without the audio part
        window.gameState.isPaused = false;
        window.gameState.isGameOver = false;
        window.gameState.isWin = false;
        window.gameState.score = 0;
        updateScoreDisplay();

        // Reset barrel collisions and remove active barrels
        barrilColisao = false;
        barrisAtivos.forEach(barril => cena.remove(barril));
        barrisAtivos = [];

        // Reset Mario's position and rotation
        if (objetoImportado) {
            // Posicionar o Mario com base no nível atual
            if (window.gameState.currentLevel === 1) {
                objetoImportado.position.set(-10, -9.7, -3.0);
            } else if (window.gameState.currentLevel === 2) {
                // Posição ajustada para ficar mais à esquerda, próximo à ponta inferior da plataforma
                objetoImportado.position.set(-8, -9.7, -3.0);
            }
            objetoImportado.rotation.set(0, Math.PI / 2, 0);

            // Reset Mario's texture back to normal
            const marioTexture = textureLoader.load('./textures/mario_texture.png');
            objetoImportado.traverse(function (child) {
                if (child.isMesh) {
                    child.material = new THREE.MeshPhongMaterial({
                        map: marioTexture,
                        side: THREE.DoubleSide
                    });
                }
            });
        }

        // Hide menus
        document.getElementById('pauseMenu').classList.add('hidden');
        document.getElementById('gameOverMenu').classList.add('hidden');
        document.getElementById('winMenu').classList.add('hidden');

        // Restart the game loop

        loop();
    }
});