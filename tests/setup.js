/**
 * Jest Test Setup
 * Mocks for browser APIs and game modules
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock AudioContext
class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.currentTime = 0;
    this.destination = {};
  }
  
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    };
  }
  
  createGain() {
    return {
      gain: { setValueAtTime: jest.fn(), linearRampToValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn()
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { setValueAtTime: jest.fn(), exponentialRampToValueAtTime: jest.fn() },
      connect: jest.fn()
    };
  }
  
  createBuffer() {
    return { getChannelData: () => new Float32Array(1000) };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      connect: jest.fn(),
      start: jest.fn()
    };
  }
  
  resume() {
    return Promise.resolve();
  }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;

// Mock requestAnimationFrame
global.requestAnimationFrame = (callback) => setTimeout(callback, 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Mock performance
global.performance = {
  now: jest.fn(() => Date.now())
};

// Mock DOM elements
document.body.innerHTML = `
  <div id="game-screen" class="screen"></div>
  <div id="gameover-screen" class="screen"></div>
  <div id="pause-menu" class="screen"></div>
  <canvas id="game-canvas"></canvas>
  <div id="player1-score"><span class="score-value">0</span></div>
  <div id="player2-score"><span class="score-value">0</span></div>
  <div id="winner-text"></div>
  <div id="final-score-p1"></div>
  <div id="final-score-p2"></div>
  <div id="stat-rally"></div>
  <div id="stat-time"></div>
  <div id="countdown-overlay"></div>
  <div id="countdown-number"></div>
  <div id="toast-container"></div>
  <div id="connection-status">
    <span class="status-dot"></span>
    <span class="status-text"></span>
  </div>
`;

// Mock canvas context
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  fillText: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  setTransform: jest.fn()
}));

// Mock Utils module
global.Utils = {
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  randomFloat: (min, max) => Math.random() * (max - min) + min,
  generateId: () => Math.random().toString(36).substr(2, 9),
  formatTime: (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  debounce: (func, wait) => func,
  storage: {
    get: jest.fn((key, defaultValue) => defaultValue),
    set: jest.fn()
  }
};

// Mock Renderer module
global.Renderer = {
  init: jest.fn(),
  resize: jest.fn(),
  render: jest.fn(),
  getDimensions: jest.fn(() => ({ width: 800, height: 600 })),
  spawnParticles: jest.fn(),
  shake: jest.fn(),
  flash: jest.fn(),
  updateSettings: jest.fn(),
  saveSettings: jest.fn(),
  loadSettings: jest.fn(),
  settings: { visualEffects: true, scanlines: true, screenShake: true }
};

// Mock AudioManager module
global.AudioManager = {
  init: jest.fn(),
  resume: jest.fn(),
  playPaddleHit: jest.fn(),
  playWallBounce: jest.fn(),
  playScore: jest.fn(),
  playGameStart: jest.fn(),
  playGameOver: jest.fn(),
  playPowerupCollect: jest.fn(),
  playPowerupActivate: jest.fn(),
  playMenuClick: jest.fn(),
  playCountdown: jest.fn(),
  playBackgroundMusic: jest.fn(),
  stopBackgroundMusic: jest.fn(),
  setMasterVolume: jest.fn(),
  setMusicVolume: jest.fn(),
  setSfxVolume: jest.fn(),
  saveSettings: jest.fn(),
  loadSettings: jest.fn(),
  settings: { masterVolume: 0.8, sfxVolume: 0.8, musicVolume: 0.6 }
};

// Mock Controls module
global.Controls = {
  init: jest.fn(),
  reset: jest.fn(),
  getPaddleTarget: jest.fn(() => null),
  getKeyboardVelocity: jest.fn(() => 0),
  setSensitivity: jest.fn(),
  onPause: jest.fn(),
  onResume: jest.fn(),
  saveSettings: jest.fn(),
  loadSettings: jest.fn(),
  settings: { sensitivity: 5 }
};

// Mock PowerUps module
global.PowerUps = {
  init: jest.fn(),
  reset: jest.fn(),
  update: jest.fn(),
  checkBallCollision: jest.fn(() => null),
  activatePowerup: jest.fn(),
  clearOnScore: jest.fn(),
  consumeSingleUse: jest.fn(),
  getSpawnedPowerups: jest.fn(() => []),
  getPlayerPowerups: jest.fn(() => []),
  active: []
};

// Mock Leaderboard module
global.Leaderboard = {
  init: jest.fn(),
  renderLeaderboard: jest.fn(),
  recordGame: jest.fn(),
  playerStats: { name: 'Player' }
};

// Mock AI module
global.AI = {
  init: jest.fn(),
  update: jest.fn(() => 0)
};

// Mock Config module
global.Config = {
  getMultiplayerServerUrl: jest.fn(() => 'ws://localhost:3000')
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
