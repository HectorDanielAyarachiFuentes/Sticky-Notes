import { PARTICLE_COUNT } from './constantes.js';

const aboutModal = document.querySelector("#about-modal");
const aboutBtn = document.querySelector("#about-btn");
const closeAboutModalBtn = aboutModal.querySelector(".modal-close-btn");
const aboutModalAudio = document.querySelector("#about-modal-audio");
const audioVisualizerCanvas = document.querySelector("#audio-visualizer");

let audioContext;
let analyser;
let source;
let dataArray;
let particles = [];
let canvasCtx;
let isVisualizerActive = false;

function setupAudioVisualizer() {
    if (audioContext) return;

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    source = audioContext.createMediaElementSource(aboutModalAudio);
    canvasCtx = audioVisualizerCanvas.getContext('2d');

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
        particles.push({
            angle,
            radius: 80,
            energy: 0,
            color: `hsl(${i / PARTICLE_COUNT * 360}, 100%, 70%)`
        });
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = audioVisualizerCanvas.parentElement;
    if (!container) return;
    const size = Math.min(container.clientWidth, container.clientHeight);
    audioVisualizerCanvas.width = size;
    audioVisualizerCanvas.height = size;
}

function animateVisualizer() {
    if (!isVisualizerActive) return;

    requestAnimationFrame(animateVisualizer);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.clearRect(0, 0, audioVisualizerCanvas.width, audioVisualizerCanvas.height);
    const centerX = audioVisualizerCanvas.width / 2;
    const centerY = audioVisualizerCanvas.height / 2;

    particles.forEach((p, i) => {
        const dataIndex = Math.floor(i * (dataArray.length / PARTICLE_COUNT));
        const dataValue = dataArray[dataIndex];

        p.energy = Math.max(dataValue / 4, p.energy * 0.92);

        const displayRadius = p.radius + p.energy;
        const x = centerX + Math.cos(p.angle) * displayRadius;
        const y = centerY + Math.sin(p.angle) * displayRadius;

        canvasCtx.beginPath();
        canvasCtx.arc(x, y, 2, 0, Math.PI * 2);
        canvasCtx.fillStyle = p.color;
        canvasCtx.globalAlpha = Math.min(1, p.energy / 30);
        canvasCtx.fill();
    });

    canvasCtx.globalAlpha = 1;
}

export function initializeAboutModal() {
    aboutBtn.addEventListener('click', () => {
        if (!audioContext) {
            setupAudioVisualizer();
        }
        aboutModal.classList.remove('hidden');
        isVisualizerActive = true;
        aboutModalAudio.play().catch(error => {
            console.log("La reproducción automática fue bloqueada por el navegador.");
        });
        animateVisualizer();
    });

    const closeModal = () => {
        aboutModal.classList.add('hidden');
        isVisualizerActive = false;
        aboutModalAudio.pause();
        aboutModalAudio.currentTime = 0;
    };

    closeAboutModalBtn.addEventListener('click', closeModal);
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) closeModal();
    });
}