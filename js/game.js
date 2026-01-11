/* =============================================
   NEON PONG - Main Game Controller
   ============================================= */

const Game = {
    // Game state
    state: 'loading', // loading, menu, playing, paused, gameover
    mode: 'single', // single, local, online
    gameType: 'classic', // classic, chaos, speedrun, survival
    difficulty: 'medium',
    
    // Game objects
    ball: null,
    paddle1: null,
    paddle2: null,
    extraBalls: [],
    
    // Score
    score: { player1: 0, player2: 0 },
    pointsToWin: 11,
    
    // Stats
    stats: {
        rallyCount: 0,
        longestRally: 0,
        gameStartTime: 0,
        gameTime: 0
    },

    // Player states (for power-ups)
    player1State: {
        paddleMultiplier: 1,
        hasShield: false,
        controlsReversed: false
    },
    player2State: {
        paddleMultiplier: 1,
        hasShield: false,
        controlsReversed: false
    },

    // Ball modifiers
    ballSpeedMultiplier: 1,
    fireballActive: false,

    // Game settings
    settings: {
        paddleWidth: 15,
        paddleHeight: 100,
        paddleSpeed: 500,
        paddleMargin: 20,
        ballRadius: 10,
        ballSpeed: 400,
        ballSpeedIncrease: 1.05,
        maxBallSpeed: 800
    },

    // Animation
    animationId: null,
    lastTime: 0,
    deltaTime: 0,

    // Screen management
    screens: {},
    currentScreen: null,
    previousScreen: null,
    settingsOpenedFromPause: false,  // Track if settings opened during paused game

    // Initialize game
    init() {
        console.log('Initializing Neon Pong...');
        
        // Cache screen elements
        this.screens = {
            loading: document.getElementById('loading-screen'),
            title: document.getElementById('title-screen'),
            menu: document.getElementById('main-menu'),
            modeSelect: document.getElementById('mode-select'),
            difficultySelect: document.getElementById('difficulty-select'),
            gameModeSelect: document.getElementById('game-mode-select'),
            game: document.getElementById('game-screen'),
            pause: document.getElementById('pause-menu'),
            gameover: document.getElementById('gameover-screen'),
            settings: document.getElementById('settings-screen'),
            howtoplay: document.getElementById('howtoplay-screen'),
            leaderboard: document.getElementById('leaderboard-screen'),
            onlineLobby: document.getElementById('online-lobby')
        };

        // Initialize modules
        Renderer.init('game-canvas');
        Controls.init();
        AudioManager.init();
        Leaderboard.init();
        
        // Initialize multiplayer with configured server URL
        const serverUrl = Config.getMultiplayerServerUrl();
        Multiplayer.init(serverUrl);
        console.log('Multiplayer server URL:', serverUrl);
        
        // Load saved settings
        this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup control callbacks
        Controls.onPause(() => this.togglePause());
        Controls.onResume(() => {
            if (this.state === 'paused') this.resumeGame();
        });

        // Simulate loading
        setTimeout(() => {
            this.showScreen('title');
            this.state = 'menu';
        }, 2000);
    },

    // Setup event listeners
    setupEventListeners() {
        // Title screen
        document.getElementById('start-btn')?.addEventListener('click', () => {
            AudioManager.playMenuClick();
            this.showScreen('menu');
        });

        // Main menu buttons
        document.querySelectorAll('#main-menu .btn-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                const action = btn.dataset.action;
                switch (action) {
                    case 'play': this.showScreen('modeSelect'); break;
                    case 'settings': this.showScreen('settings'); break;
                    case 'leaderboard': 
                        Leaderboard.renderLeaderboard('leaderboard-list');
                        this.showScreen('leaderboard'); 
                        break;
                    case 'howtoplay': this.showScreen('howtoplay'); break;
                }
            });
        });

        // Mode selection
        document.querySelectorAll('#mode-select .btn-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                this.mode = btn.dataset.mode;
                if (this.mode === 'online') {
                    this.showScreen('onlineLobby');
                } else if (this.mode === 'single') {
                    this.showScreen('difficultySelect');
                } else {
                    this.showScreen('gameModeSelect');
                }
            });
        });

        // Difficulty selection
        document.querySelectorAll('#difficulty-select .btn-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                this.difficulty = btn.dataset.difficulty;
                this.showScreen('gameModeSelect');
            });
        });

        // Game mode selection
        document.querySelectorAll('#game-mode-select .btn-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                this.gameType = btn.dataset.gametype;
                this.startGame();
            });
        });

        // Back buttons
        document.querySelectorAll('.btn-back').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                this.goBack();
            });
        });

        // Pause menu
        document.getElementById('pause-btn')?.addEventListener('click', () => {
            AudioManager.playMenuClick();
            this.togglePause();
        });

        document.querySelectorAll('#pause-menu .btn-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                const action = btn.dataset.action;
                switch (action) {
                    case 'resume': this.resumeGame(); break;
                    case 'restart': this.restartGame(); break;
                    case 'settings': 
                        this.settingsOpenedFromPause = true;
                        this.previousScreen = 'pause';
                        this.showScreen('settings'); 
                        break;
                    case 'quit': this.quitToMenu(); break;
                }
            });
        });

        // Game over buttons
        document.querySelectorAll('#gameover-screen .btn-menu').forEach(btn => {
            btn.addEventListener('click', () => {
                AudioManager.playMenuClick();
                const action = btn.dataset.action;
                switch (action) {
                    case 'rematch': this.restartGame(); break;
                    case 'menu': this.quitToMenu(); break;
                }
            });
        });

        // Settings sliders
        this.setupSettingsListeners();

        // Leaderboard tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Leaderboard.renderLeaderboard('leaderboard-list', { timeFilter: btn.dataset.tab });
            });
        });

        // Online lobby
        this.setupOnlineLobbyListeners();

        // Window resize
        window.addEventListener('resize', Utils.debounce(() => {
            if (this.state === 'playing' || this.state === 'paused') {
                this.handleResize();
            }
        }, 100));

        // Visibility change (pause when tab hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state === 'playing') {
                this.pauseGame();
            }
        });
    },

    // Setup settings listeners
    setupSettingsListeners() {
        // Volume sliders
        const masterVolume = document.getElementById('master-volume');
        const musicVolume = document.getElementById('music-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        const sensitivity = document.getElementById('control-sensitivity');
        const pointsToWin = document.getElementById('points-to-win');

        if (masterVolume) {
            masterVolume.addEventListener('input', (e) => {
                AudioManager.setMasterVolume(e.target.value / 100);
                document.getElementById('master-volume-value').textContent = `${e.target.value}%`;
            });
        }

        if (musicVolume) {
            musicVolume.addEventListener('input', (e) => {
                AudioManager.setMusicVolume(e.target.value / 100);
                document.getElementById('music-volume-value').textContent = `${e.target.value}%`;
            });
        }

        if (sfxVolume) {
            sfxVolume.addEventListener('input', (e) => {
                AudioManager.setSfxVolume(e.target.value / 100);
                document.getElementById('sfx-volume-value').textContent = `${e.target.value}%`;
            });
        }

        if (sensitivity) {
            sensitivity.addEventListener('input', (e) => {
                Controls.setSensitivity(parseInt(e.target.value));
                document.getElementById('control-sensitivity-value').textContent = e.target.value;
            });
        }

        if (pointsToWin) {
            pointsToWin.addEventListener('input', (e) => {
                this.pointsToWin = parseInt(e.target.value);
                document.getElementById('points-to-win-value').textContent = e.target.value;
            });
        }

        // Toggles
        const visualEffects = document.getElementById('visual-effects');
        const scanlines = document.getElementById('scanlines');
        const screenShake = document.getElementById('screen-shake');

        if (visualEffects) {
            visualEffects.addEventListener('change', (e) => {
                Renderer.updateSettings({ visualEffects: e.target.checked });
            });
        }

        if (scanlines) {
            scanlines.addEventListener('change', (e) => {
                Renderer.updateSettings({ scanlines: e.target.checked });
            });
        }

        if (screenShake) {
            screenShake.addEventListener('change', (e) => {
                Renderer.updateSettings({ screenShake: e.target.checked });
            });
        }

        // Analytics toggle
        const analyticsEnabled = document.getElementById('analytics-enabled');
        if (analyticsEnabled) {
            analyticsEnabled.addEventListener('change', (e) => {
                this.setAnalyticsEnabled(e.target.checked);
            });
        }
    },

    // Setup online lobby listeners
    setupOnlineLobbyListeners() {
        // Setup multiplayer callbacks
        Multiplayer.on('connect', () => {
            this.updateConnectionStatus(true);
        });
        
        Multiplayer.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });
        
        Multiplayer.on('joinRoom', (data) => {
            this.handleRoomJoined(data);
        });
        
        Multiplayer.on('opponentJoin', (data) => {
            this.handleOpponentJoined(data);
        });
        
        Multiplayer.on('opponentLeave', () => {
            this.handleOpponentLeft();
        });
        
        Multiplayer.on('gameStart', (data) => {
            this.handleOnlineGameStart(data);
        });
        
        Multiplayer.on('paddleUpdate', (data) => {
            this.handleOpponentPaddleUpdate(data);
        });
        
        Multiplayer.on('gameState', (data) => {
            this.handleGameStateUpdate(data);
        });
        
        Multiplayer.on('error', (error) => {
            this.showToast(error.message || 'Connection error', 'error');
            this.updateConnectionStatus(false);
        });
        
        Multiplayer.on('matchFound', (data) => {
            this.handleMatchFound(data);
        });
        
        Multiplayer.on('gameOver', (data) => {
            this.handleOnlineGameOver(data);
        });

        document.querySelectorAll('#online-lobby .btn-menu').forEach(btn => {
            btn.addEventListener('click', async () => {
                AudioManager.playMenuClick();
                const action = btn.dataset.lobby;
                
                switch (action) {
                    case 'quickmatch':
                        await this.handleQuickMatch();
                        break;
                    case 'createroom':
                        await this.handleCreateRoom();
                        break;
                    case 'joinroom':
                        document.getElementById('room-code-input').style.display = 'flex';
                        break;
                }
            });
        });

        document.getElementById('join-room-btn')?.addEventListener('click', async () => {
            const code = document.getElementById('room-code').value;
            if (code.length === 6) {
                await this.handleJoinRoom(code);
            }
        });
    },

    // Update connection status UI
    updateConnectionStatus(connected) {
        const statusDot = document.querySelector('#connection-status .status-dot');
        const statusText = document.querySelector('#connection-status .status-text');
        
        if (statusDot && statusText) {
            if (connected) {
                statusDot.classList.add('connected');
                statusText.textContent = 'Connected';
            } else {
                statusDot.classList.remove('connected');
                statusText.textContent = 'Disconnected';
            }
        }
    },

    // Show toast notification (non-blocking alternative to alert)
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // Auto-remove after duration
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Ensure multiplayer connection (avoids UI flicker if already connected)
    async ensureConnected() {
        const statusText = document.querySelector('#connection-status .status-text');
        
        if (Multiplayer.getStatus().connected) {
            // Already connected, just update UI
            this.updateConnectionStatus(true);
            return;
        }

        // Not connected, show connecting state and connect
        if (statusText) {
            statusText.textContent = 'Connecting...';
        }
        await Multiplayer.connect();
        this.updateConnectionStatus(true);
    },

    // Handle quick match
    async handleQuickMatch() {
        try {
            await this.ensureConnected();
            
            const statusText = document.querySelector('#connection-status .status-text');
            if (statusText) {
                statusText.textContent = 'Finding opponent...';
            }
            
            await Multiplayer.quickMatch();
            // Room joined, waiting for game start via callback
        } catch (error) {
            console.error('Quick match error:', error);
            this.showToast(error.message || 'Failed to find match. Make sure the server is running.', 'error');
            this.updateConnectionStatus(false);
        }
    },

    // Handle create room
    async handleCreateRoom() {
        try {
            await this.ensureConnected();
            
            const statusText = document.querySelector('#connection-status .status-text');
            const result = await Multiplayer.createRoom({
                pointsToWin: this.pointsToWin,
                gameMode: this.gameType
            });
            
            // Show room code to user with toast notification
            this.showToast(`Room created! Code: ${result.roomCode}`, 'success', 8000);
            if (statusText) {
                statusText.textContent = `Room: ${result.roomCode} - Waiting for opponent...`;
            }
        } catch (error) {
            console.error('Create room error:', error);
            this.showToast(error.message || 'Failed to create room. Make sure the server is running.', 'error');
            this.updateConnectionStatus(false);
        }
    },

    // Handle join room
    async handleJoinRoom(code) {
        try {
            await this.ensureConnected();
            
            const statusText = document.querySelector('#connection-status .status-text');
            if (statusText) {
                statusText.textContent = 'Joining room...';
            }
            
            await Multiplayer.joinRoom(code);
            document.getElementById('room-code-input').style.display = 'none';
            document.getElementById('room-code').value = '';
            // Room joined, game will start via callback when both players ready
        } catch (error) {
            console.error('Join room error:', error);
            this.showToast(error.message || 'Failed to join room. Check the code and try again.', 'error');
            this.updateConnectionStatus(false);
        }
    },

    // Handle room joined event
    handleRoomJoined(data) {
        const statusText = document.querySelector('#connection-status .status-text');
        if (statusText) {
            statusText.textContent = `Room: ${data.roomCode} - ${data.opponent ? 'Ready to start!' : 'Waiting for opponent...'}`;
        }
        
        if (data.opponent) {
            // Both players present, send ready signal
            Multiplayer.sendReady();
        }
    },

    // Handle opponent joined event
    handleOpponentJoined(data) {
        const statusText = document.querySelector('#connection-status .status-text');
        if (statusText) {
            statusText.textContent = `Opponent joined: ${data.opponent.name}`;
        }
        
        // Send ready signal
        Multiplayer.sendReady();
    },

    // Handle opponent left event
    handleOpponentLeft() {
        this.showToast('Opponent disconnected', 'error');
        const statusText = document.querySelector('#connection-status .status-text');
        if (statusText) {
            statusText.textContent = 'Opponent left - Waiting for new opponent...';
        }
        
        if (this.state === 'playing') {
            this.quitToMenu();
        }
    },

    // Handle match found event (quick match)
    handleMatchFound(data) {
        const statusText = document.querySelector('#connection-status .status-text');
        const opponentName = data.opponent?.name || 'opponent';
        if (statusText) {
            statusText.textContent = `Match found! Playing against ${opponentName}`;
        }
        this.showToast(`Match found! Playing against ${opponentName}`, 'success');
        
        // Send ready signal to start the game
        Multiplayer.sendReady();
    },

    // Handle online game start event
    handleOnlineGameStart(data) {
        this.mode = 'online';
        this.showScreen('game');
        
        // Force browser reflow
        this.screens.game.offsetHeight;
        
        // Start the actual game
        this.startOnlineGame();
    },

    // Handle opponent paddle update
    handleOpponentPaddleUpdate(data) {
        if (this.state !== 'playing' || this.mode !== 'online') return;
        
        // Update opponent paddle position
        const isPlayer1 = Multiplayer.playerNumber === 1;
        const opponentPaddle = isPlayer1 ? this.paddle2 : this.paddle1;
        
        if (data.playerNumber !== Multiplayer.playerNumber) {
            opponentPaddle.y = data.y;
        }
    },

    // Handle game state update from host
    handleGameStateUpdate(data) {
        if (this.state !== 'playing' || this.mode !== 'online') return;
        if (Multiplayer.isHost) return; // Host doesn't receive state updates
        
        // Update ball position and velocity from host
        if (data.ball) {
            this.ball.x = data.ball.x;
            this.ball.y = data.ball.y;
            this.ball.vx = data.ball.vx;
            this.ball.vy = data.ball.vy;
            if (data.ball.speed !== undefined) {
                this.ball.speed = data.ball.speed;
            }
            if (data.ball.radius !== undefined) {
                this.ball.radius = data.ball.radius;
            }
        }
        
        // Update host paddle position (opponent for client)
        if (data.hostPaddle) {
            this.paddle1.y = data.hostPaddle.y;
        }
        
        // Update scores and refresh display if changed
        if (data.score) {
            const scoreChanged = this.score.player1 !== data.score.player1 || 
                                 this.score.player2 !== data.score.player2;
            this.score.player1 = data.score.player1;
            this.score.player2 = data.score.player2;
            
            if (scoreChanged) {
                this.updateScoreDisplay();
                // Play score sound effect for client
                AudioManager.playScore(true);
            }
        }
        
        // Update power-ups
        if (data.powerUps) {
            PowerUps.active = data.powerUps;
        }
    },
    
    // Handle online game over event (received by client)
    handleOnlineGameOver(data) {
        if (this.mode !== 'online') return;
        
        // Update final scores from host
        if (data.score) {
            this.score.player1 = data.score.player1;
            this.score.player2 = data.score.player2;
        }
        
        // Update stats from host
        if (data.stats) {
            this.stats.longestRally = data.stats.longestRally ?? this.stats.longestRally;
            this.stats.gameTime = data.stats.gameTime ?? this.stats.gameTime;
        }
        
        // End the game on client side
        this.endGame();
    },

    // Start online multiplayer game
    startOnlineGame() {
        console.log('Starting online game');
        
        // Resize renderer
        Renderer.resize();
        
        // Reset game state (scores, stats, player states, paddles, ball, power-ups)
        this.resetGame();
        
        // Configure power-ups for the current game type
        PowerUps.init(this.gameType);
        
        // Set state
        this.state = 'playing';
        
        // Resume audio context (required after user interaction)
        AudioManager.resume();
        
        // Start the game loop with background music
        this.startGameLoop();
    },

    // Show screen
    showScreen(screenName) {
        // Special case: Opening settings from pause menu during gameplay
        // Keep game screen visible to prevent ending the game
        if (screenName === 'settings' && this.settingsOpenedFromPause) {
            // Only hide non-game screens
            Object.keys(this.screens).forEach(key => {
                if (key !== 'game' && this.screens[key]) {
                    this.screens[key].classList.remove('active');
                }
            });
            
            // Show settings screen
            if (this.screens.settings) {
                this.screens.settings.classList.add('active');
                this.previousScreen = this.currentScreen;
                this.currentScreen = screenName;
            }
            return;
        }

        // Normal screen transition: hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = this.screens[screenName];
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.previousScreen = this.currentScreen;
            this.currentScreen = screenName;
        }
    },

    // Go back to previous screen
    goBack() {
        const backMap = {
            modeSelect: 'menu',
            difficultySelect: 'modeSelect',
            gameModeSelect: this.mode === 'single' ? 'difficultySelect' : 'modeSelect',
            settings: this.previousScreen === 'pause' ? 'pause' : 'menu',
            howtoplay: 'menu',
            leaderboard: 'menu',
            onlineLobby: 'modeSelect'
        };

        const target = backMap[this.currentScreen] || 'menu';
        
        // Special case: Going back from settings to pause menu during gameplay
        if (this.currentScreen === 'settings' && this.settingsOpenedFromPause) {
            // Hide settings, show pause menu (game screen stays visible)
            this.screens.settings.classList.remove('active');
            this.screens.pause.classList.add('active');
            this.currentScreen = 'pause';
            this.settingsOpenedFromPause = false;  // Clear the flag
        } else {
            this.showScreen(target);
        }
    },

    // Start new game
    startGame() {
        console.log(`Starting ${this.gameType} game in ${this.mode} mode`);
        
        // Show game screen first
        this.showScreen('game');
        
        // Force browser reflow so dimensions are available
        // Must read from the container (game-screen), not canvas
        this.screens.game.offsetHeight;
        
        // Now resize renderer with correct dimensions
        Renderer.resize();
        
        // Reset game state
        this.resetGame();
        
        // Configure based on game type
        PowerUps.init(this.gameType);
        
        if (this.gameType === 'speedrun') {
            this.pointsToWin = 5;
        }

        // Initialize AI for single player
        if (this.mode === 'single') {
            AI.init(this.difficulty);
        }

        this.state = 'playing';

        // Start countdown
        this.startCountdown();
    },

    // Reset game state
    resetGame() {
        const dims = Renderer.getDimensions();
        
        // Reset scores
        this.score = { player1: 0, player2: 0 };
        this.updateScoreDisplay();

        // Reset stats
        this.stats = {
            rallyCount: 0,
            longestRally: 0,
            gameStartTime: performance.now(),
            gameTime: 0
        };

        // Reset player states
        this.player1State = { paddleMultiplier: 1, hasShield: false, controlsReversed: false };
        this.player2State = { paddleMultiplier: 1, hasShield: false, controlsReversed: false };
        this.ballSpeedMultiplier = 1;
        this.fireballActive = false;

        // Initialize paddles
        const paddleHeight = this.settings.paddleHeight;
        this.paddle1 = {
            x: this.settings.paddleMargin,
            y: dims.height / 2 - paddleHeight / 2,
            width: this.settings.paddleWidth,
            height: paddleHeight,
            baseHeight: paddleHeight,
            velocity: 0
        };

        this.paddle2 = {
            x: dims.width - this.settings.paddleMargin - this.settings.paddleWidth,
            y: dims.height / 2 - paddleHeight / 2,
            width: this.settings.paddleWidth,
            height: paddleHeight,
            baseHeight: paddleHeight,
            velocity: 0
        };

        // Initialize ball
        this.resetBall();

        // Clear extra balls
        this.extraBalls = [];

        // Reset power-ups
        PowerUps.reset();

        // Reset controls
        Controls.reset();
    },

    // Reset ball to center
    resetBall(direction = null) {
        const dims = Renderer.getDimensions();
        
        // Random direction if not specified
        if (direction === null) {
            direction = Math.random() > 0.5 ? 1 : -1;
        }

        const angle = Utils.randomFloat(-Math.PI / 4, Math.PI / 4);
        const speed = this.settings.ballSpeed;

        this.ball = {
            x: dims.width / 2,
            y: dims.height / 2,
            radius: this.settings.ballRadius,
            vx: Math.cos(angle) * speed * direction,
            vy: Math.sin(angle) * speed,
            speed: speed
        };

        // Reset ball-related power-ups
        this.ballSpeedMultiplier = 1;
        this.fireballActive = false;
        PowerUps.clearOnScore();
    },

    // Spawn extra balls (for multi-ball power-up)
    spawnExtraBalls(count) {
        const dims = Renderer.getDimensions();
        
        for (let i = 0; i < count; i++) {
            const angle = Utils.randomFloat(0, Math.PI * 2);
            const speed = this.settings.ballSpeed;
            
            this.extraBalls.push({
                x: dims.width / 2,
                y: dims.height / 2,
                radius: this.settings.ballRadius,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                speed: speed,
                active: true
            });
        }
    },

    // Start countdown
    startCountdown() {
        const overlay = document.getElementById('countdown-overlay');
        const number = document.getElementById('countdown-number');
        
        overlay.classList.add('active');
        
        // Render initial game state so screen isn't black during countdown
        this.render();
        
        // Keep rendering during countdown so game elements are visible
        let countdownRenderActive = true;
        const renderCountdownLoop = () => {
            if (countdownRenderActive) {
                try {
                    this.render();
                    requestAnimationFrame(renderCountdownLoop);
                } catch (error) {
                    console.error('Error during countdown render:', error);
                    countdownRenderActive = false;
                }
            }
        };
        requestAnimationFrame(renderCountdownLoop);
        
        let count = 3;
        const countdown = () => {
            if (count > 0) {
                number.textContent = count;
                number.style.animation = 'none';
                number.offsetHeight; // Trigger reflow
                number.style.animation = 'countdown-pop 0.5s ease-out';
                AudioManager.playCountdown(count);
                count--;
                setTimeout(countdown, 1000);
            } else {
                number.textContent = 'GO!';
                number.style.animation = 'none';
                number.offsetHeight;
                number.style.animation = 'countdown-pop 0.5s ease-out';
                AudioManager.playCountdown(0);
                
                setTimeout(() => {
                    countdownRenderActive = false;
                    overlay.classList.remove('active');
                    AudioManager.playGameStart();
                    this.startGameLoop();
                }, 500);
            }
        };
        
        countdown();
    },

    // Start game loop
    startGameLoop() {
        this.lastTime = performance.now();
        // Cancel any existing animation frame before starting new one
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Start background music
        AudioManager.playBackgroundMusic();
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    },

    // Main game loop
    gameLoop(currentTime) {
        // Stop the loop if not playing to save CPU/battery
        if (this.state !== 'playing') {
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            return;
        }

        // Calculate delta time
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Cap delta time to prevent large jumps
        this.deltaTime = Math.min(this.deltaTime, 0.05);

        // Update game
        this.update(this.deltaTime);

        // Render
        this.render();

        // Continue loop
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    },

    // Update game state
    update(dt) {
        const dims = Renderer.getDimensions();

        // Update paddle heights based on power-ups
        this.paddle1.height = this.paddle1.baseHeight * this.player1State.paddleMultiplier;
        this.paddle2.height = this.paddle2.baseHeight * this.player2State.paddleMultiplier;

        // Update paddles
        this.updatePaddle1(dt, dims);
        this.updatePaddle2(dt, dims);

        // Update ball and power-ups (single player, local multiplayer, or online host)
        if (this.mode !== 'online' || Multiplayer.isHost) {
            // Update ball
            this.updateBall(dt, dims);

            // Update extra balls
            this.extraBalls.forEach(ball => {
                if (ball.active) {
                    this.updateExtraBall(ball, dt, dims);
                }
            });

            // Update power-ups
            PowerUps.update(dt, performance.now(), dims.width, dims.height);

            // Check power-up collection
            this.checkPowerupCollection();
        }

        // Update game time
        this.stats.gameTime = (performance.now() - this.stats.gameStartTime) / 1000;

        // Send game state if host in online mode (send every frame for smooth sync)
        if (this.mode === 'online' && Multiplayer.isHost && Multiplayer.connected) {
            this.sendGameState();
        }
    },

    // Send game state to opponent (host only)
    sendGameState() {
        const state = {
            ball: {
                x: this.ball.x,
                y: this.ball.y,
                vx: this.ball.vx,
                vy: this.ball.vy,
                speed: this.ball.speed,
                radius: this.ball.radius
            },
            score: {
                player1: this.score.player1,
                player2: this.score.player2
            },
            powerUps: PowerUps.active,
            hostPaddle: {
                y: this.paddle1.y
            }
        };
        Multiplayer.sendGameState(state);
    },

    // Update player 1 paddle
    updatePaddle1(dt, dims) {
        // In online mode, only update if we're player 1
        if (this.mode === 'online' && Multiplayer.playerNumber !== 1) {
            return; // Opponent's paddle, updated via network
        }

        let targetY = null;
        let velocity = 0;

        // Touch/mouse control
        targetY = Controls.getPaddleTarget(1, this.paddle1.height, dims.height);
        
        // Keyboard control
        velocity = Controls.getKeyboardVelocity(1);
        
        // Apply reversed controls if affected
        if (this.player1State.controlsReversed) {
            velocity = -velocity;
            if (targetY !== null) {
                targetY = dims.height - targetY;
            }
        }

        // Move paddle
        if (targetY !== null) {
            // Smooth movement towards target
            const paddleCenter = this.paddle1.y + this.paddle1.height / 2;
            const diff = targetY - paddleCenter;
            velocity = diff * 10;
        }

        // Apply velocity
        velocity = Utils.clamp(velocity, -this.settings.paddleSpeed, this.settings.paddleSpeed);
        this.paddle1.y += velocity * dt;

        // Keep paddle in bounds
        this.paddle1.y = Utils.clamp(
            this.paddle1.y,
            0,
            dims.height - this.paddle1.height
        );

        // Send paddle position to opponent in online mode
        if (this.mode === 'online' && Multiplayer.connected) {
            Multiplayer.sendPaddleUpdate(this.paddle1.y, velocity);
        }
    },

    // Update player 2 paddle
    updatePaddle2(dt, dims) {
        if (this.mode === 'single') {
            // AI control
            const aiVelocity = AI.update(dt, this.ball, this.paddle2, dims.width, dims.height);
            this.paddle2.y += aiVelocity * dt;
        } else if (this.mode === 'online' && Multiplayer.playerNumber !== 2) {
            // Online mode: opponent's paddle, updated via network
            return;
        } else {
            // Local multiplayer or online player 2: Human control
            let targetY = Controls.getPaddleTarget(2, this.paddle2.height, dims.height);
            let velocity = Controls.getKeyboardVelocity(2);

            // Apply reversed controls
            if (this.player2State.controlsReversed) {
                velocity = -velocity;
                if (targetY !== null) {
                    targetY = dims.height - targetY;
                }
            }

            if (targetY !== null) {
                const paddleCenter = this.paddle2.y + this.paddle2.height / 2;
                const diff = targetY - paddleCenter;
                velocity = diff * 10;
            }

            velocity = Utils.clamp(velocity, -this.settings.paddleSpeed, this.settings.paddleSpeed);
            this.paddle2.y += velocity * dt;

            // Send paddle position in online mode
            if (this.mode === 'online' && Multiplayer.connected) {
                Multiplayer.sendPaddleUpdate(this.paddle2.y, velocity);
            }
        }

        // Keep paddle in bounds
        this.paddle2.y = Utils.clamp(
            this.paddle2.y,
            0,
            dims.height - this.paddle2.height
        );
    },

    // Update ball
    updateBall(dt, dims) {
        // Apply speed multiplier
        const speedMult = this.ballSpeedMultiplier;
        
        // Move ball
        this.ball.x += this.ball.vx * dt * speedMult;
        this.ball.y += this.ball.vy * dt * speedMult;

        // Wall collision (top/bottom)
        if (this.ball.y - this.ball.radius <= 0) {
            this.ball.y = this.ball.radius;
            this.ball.vy = Math.abs(this.ball.vy);
            AudioManager.playWallBounce();
        } else if (this.ball.y + this.ball.radius >= dims.height) {
            this.ball.y = dims.height - this.ball.radius;
            this.ball.vy = -Math.abs(this.ball.vy);
            AudioManager.playWallBounce();
        }

        // Paddle collision
        this.checkPaddleCollision(this.ball, this.paddle1, 1);
        this.checkPaddleCollision(this.ball, this.paddle2, 2);

        // Score detection
        if (this.ball.x + this.ball.radius < 0) {
            this.handleScore(2);
        } else if (this.ball.x - this.ball.radius > dims.width) {
            this.handleScore(1);
        }
    },

    // Update extra ball
    updateExtraBall(ball, dt, dims) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Wall collision
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= dims.height) {
            ball.vy *= -1;
            ball.y = Utils.clamp(ball.y, ball.radius, dims.height - ball.radius);
        }

        // Paddle collision
        this.checkPaddleCollision(ball, this.paddle1, 1);
        this.checkPaddleCollision(ball, this.paddle2, 2);

        // Score (deactivate extra ball)
        if (ball.x + ball.radius < 0 || ball.x - ball.radius > dims.width) {
            ball.active = false;
        }
    },

    // Check paddle collision
    checkPaddleCollision(ball, paddle, playerNum) {
        // Check if ball is in paddle's x range
        const paddleLeft = paddle.x;
        const paddleRight = paddle.x + paddle.width;
        const paddleTop = paddle.y;
        const paddleBottom = paddle.y + paddle.height;

        // Ball bounds
        const ballLeft = ball.x - ball.radius;
        const ballRight = ball.x + ball.radius;
        const ballTop = ball.y - ball.radius;
        const ballBottom = ball.y + ball.radius;

        // Check collision
        if (ballRight >= paddleLeft && ballLeft <= paddleRight &&
            ballBottom >= paddleTop && ballTop <= paddleBottom) {
            
            // Calculate hit position (-1 to 1)
            const paddleCenter = paddle.y + paddle.height / 2;
            const hitPos = (ball.y - paddleCenter) / (paddle.height / 2);
            
            // Calculate new angle based on hit position
            const maxAngle = Math.PI / 3; // 60 degrees
            const angle = hitPos * maxAngle;
            
            // Determine direction
            const direction = playerNum === 1 ? 1 : -1;
            
            // Increase speed
            const newSpeed = Math.min(ball.speed * this.settings.ballSpeedIncrease, this.settings.maxBallSpeed);
            ball.speed = newSpeed;
            
            // Set new velocity
            ball.vx = Math.cos(angle) * newSpeed * direction;
            ball.vy = Math.sin(angle) * newSpeed;
            
            // Move ball outside paddle
            if (playerNum === 1) {
                ball.x = paddleRight + ball.radius;
            } else {
                ball.x = paddleLeft - ball.radius;
            }

            // Effects
            AudioManager.playPaddleHit(hitPos);
            Renderer.spawnParticles(ball.x, ball.y, 10);
            
            // Increment rally
            this.stats.rallyCount++;
            if (this.stats.rallyCount > this.stats.longestRally) {
                this.stats.longestRally = this.stats.rallyCount;
            }
        }
    },

    // Check power-up collection
    checkPowerupCollection() {
        const collected = PowerUps.checkBallCollision(this.ball);
        
        if (collected) {
            // Determine which player gets the power-up (based on ball direction)
            const playerNum = this.ball.vx > 0 ? 1 : 2;
            
            PowerUps.activatePowerup(collected, playerNum, this);
            AudioManager.playPowerupCollect();
            Renderer.spawnParticles(collected.x, collected.y, 20, collected.color);
        }
    },

    // Handle scoring
    handleScore(scoringPlayer) {
        // Check for shield
        const defender = scoringPlayer === 1 ? this.player2State : this.player1State;
        if (defender.hasShield) {
            defender.hasShield = false;
            PowerUps.consumeSingleUse('shield', scoringPlayer === 1 ? 2 : 1);
            this.resetBall(scoringPlayer === 1 ? 1 : -1);
            AudioManager.playPowerupActivate();
            return;
        }

        // Update score
        if (scoringPlayer === 1) {
            this.score.player1++;
            AudioManager.playScore(true);
        } else {
            this.score.player2++;
            AudioManager.playScore(this.mode === 'single' ? false : true);
        }

        this.updateScoreDisplay();
        
        // Reset rally
        this.stats.rallyCount = 0;

        // Visual effects
        Renderer.shake(10, 0.3);
        Renderer.flash('#ffffff');
        Renderer.spawnParticles(
            scoringPlayer === 1 ? 0 : Renderer.getDimensions().width,
            this.ball.y,
            30
        );

        // Check for game over
        if (this.score.player1 >= this.pointsToWin || this.score.player2 >= this.pointsToWin) {
            this.endGame();
        } else {
            // Reset ball
            this.resetBall(scoringPlayer === 1 ? -1 : 1);
        }
    },

    // Update score display
    updateScoreDisplay() {
        const score1El = document.querySelector('#player1-score .score-value');
        const score2El = document.querySelector('#player2-score .score-value');
        
        if (score1El) {
            score1El.textContent = this.score.player1;
            score1El.classList.add('score-pop');
            setTimeout(() => score1El.classList.remove('score-pop'), 300);
        }
        if (score2El) {
            score2El.textContent = this.score.player2;
            score2El.classList.add('score-pop');
            setTimeout(() => score2El.classList.remove('score-pop'), 300);
        }
    },

    // Render game
    render() {
        const gameState = {
            paddle1: this.paddle1,
            paddle2: this.paddle2,
            ball: this.ball,
            extraBalls: this.extraBalls,
            powerups: PowerUps.getSpawnedPowerups(),
            activePowerups: {
                player1: PowerUps.getPlayerPowerups(1),
                player2: PowerUps.getPlayerPowerups(2)
            },
            deltaTime: this.deltaTime
        };

        Renderer.render(gameState);
    },

    // Pause game
    pauseGame() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.screens.pause.classList.add('active');
        }
    },

    // Resume game
    resumeGame() {
        if (this.state === 'paused') {
            this.state = 'playing';
            this.screens.pause.classList.remove('active');
            this.lastTime = performance.now();
            // Restart the game loop since it stopped when paused
            this.startGameLoop();
        }
    },

    // Toggle pause
    togglePause() {
        if (this.state === 'playing') {
            this.pauseGame();
        } else if (this.state === 'paused') {
            this.resumeGame();
        }
    },

    // End game
    endGame() {
        this.state = 'gameover';
        
        // Stop background music
        AudioManager.stopBackgroundMusic();
        
        const winner = this.score.player1 >= this.pointsToWin ? 1 : 2;
        const isPlayerWin = this.mode === 'single' ? winner === 1 : true;
        
        // If host in online mode, notify the client about game over
        if (this.mode === 'online' && Multiplayer.isHost && Multiplayer.connected) {
            Multiplayer.sendGameOver({
                winner: winner,
                score: {
                    player1: this.score.player1,
                    player2: this.score.player2
                },
                stats: {
                    longestRally: this.stats.longestRally,
                    gameTime: this.stats.gameTime
                }
            });
        }
        
        // Play sound
        AudioManager.playGameOver(isPlayerWin);

        // Update game over screen
        const winnerText = document.getElementById('winner-text');
        const finalScoreP1 = document.getElementById('final-score-p1');
        const finalScoreP2 = document.getElementById('final-score-p2');
        const statRally = document.getElementById('stat-rally');
        const statTime = document.getElementById('stat-time');

        if (winnerText) {
            if (this.mode === 'single') {
                winnerText.textContent = winner === 1 ? 'YOU WIN!' : 'AI WINS!';
            } else if (this.mode === 'online') {
                // In online mode, show perspective based on player number
                const playerWon = (Multiplayer.playerNumber === 1 && winner === 1) || 
                                  (Multiplayer.playerNumber === 2 && winner === 2);
                winnerText.textContent = playerWon ? 'YOU WIN!' : 'OPPONENT WINS!';
            } else {
                winnerText.textContent = `PLAYER ${winner} WINS!`;
            }
        }
        
        if (finalScoreP1) finalScoreP1.textContent = this.score.player1;
        if (finalScoreP2) finalScoreP2.textContent = this.score.player2;
        if (statRally) statRally.textContent = this.stats.longestRally;
        if (statTime) statTime.textContent = Utils.formatTime(this.stats.gameTime);

        // Record to leaderboard
        Leaderboard.recordGame({
            isWin: isPlayerWin,
            playerScore: this.score.player1,
            opponentScore: this.score.player2,
            gameMode: this.gameType,
            difficulty: this.difficulty,
            longestRally: this.stats.longestRally,
            gameTime: this.stats.gameTime
        });

        // Show game over screen
        this.showScreen('gameover');
    },

    // Restart game
    restartGame() {
        this.screens.pause.classList.remove('active');
        this.screens.gameover.classList.remove('active');
        this.startGame();
    },

    // Quit to menu
    quitToMenu() {
        this.state = 'menu';
        this.screens.pause.classList.remove('active');
        this.screens.gameover.classList.remove('active');
        
        // Stop background music
        AudioManager.stopBackgroundMusic();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.showScreen('menu');
    },

    // Handle window resize
    handleResize() {
        const dims = Renderer.getDimensions();
        
        // Reposition paddles
        this.paddle2.x = dims.width - this.settings.paddleMargin - this.settings.paddleWidth;
        
        // Keep paddles in bounds
        this.paddle1.y = Utils.clamp(this.paddle1.y, 0, dims.height - this.paddle1.height);
        this.paddle2.y = Utils.clamp(this.paddle2.y, 0, dims.height - this.paddle2.height);
        
        // Keep ball in bounds
        this.ball.x = Utils.clamp(this.ball.x, this.ball.radius, dims.width - this.ball.radius);
        this.ball.y = Utils.clamp(this.ball.y, this.ball.radius, dims.height - this.ball.radius);
    },

    // Analytics management
    setAnalyticsEnabled(enabled) {
        const previousEnabled = this.getAnalyticsEnabled()

        // Always persist the latest consent choice
        Utils.storage.set('analyticsConsent', { enabled: enabled });
        
        // Reload page to apply changes since analytics is loaded on page load.
        // Reload only when the consent state actually changes, for both enable and disable.
        if (previousEnabled !== enabled) {
            window.location.reload();
        }
    },

    getAnalyticsEnabled() {
        const consent = Utils.storage.get('analyticsConsent', { enabled: true });
        return consent.enabled;
    },

    // Save settings
    saveSettings() {
        AudioManager.saveSettings();
        Renderer.saveSettings();
        Controls.saveSettings();
        Utils.storage.set('gameSettings', {
            pointsToWin: this.pointsToWin
        });
        // Analytics consent is saved separately via setAnalyticsEnabled
    },

    // Load settings
    loadSettings() {
        AudioManager.loadSettings();
        Renderer.loadSettings();
        Controls.loadSettings();
        
        const gameSettings = Utils.storage.get('gameSettings');
        if (gameSettings) {
            this.pointsToWin = gameSettings.pointsToWin || 11;
        }

        // Update UI with loaded values
        this.updateSettingsUI();
    },

    // Update settings UI with current values
    updateSettingsUI() {
        const masterVolume = document.getElementById('master-volume');
        const musicVolume = document.getElementById('music-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        const sensitivity = document.getElementById('control-sensitivity');
        const pointsToWin = document.getElementById('points-to-win');
        const visualEffects = document.getElementById('visual-effects');
        const scanlines = document.getElementById('scanlines');
        const screenShake = document.getElementById('screen-shake');

        if (masterVolume) {
            masterVolume.value = AudioManager.settings.masterVolume * 100;
            document.getElementById('master-volume-value').textContent = `${Math.round(AudioManager.settings.masterVolume * 100)}%`;
        }
        if (musicVolume) {
            musicVolume.value = AudioManager.settings.musicVolume * 100;
            document.getElementById('music-volume-value').textContent = `${Math.round(AudioManager.settings.musicVolume * 100)}%`;
        }
        if (sfxVolume) {
            sfxVolume.value = AudioManager.settings.sfxVolume * 100;
            document.getElementById('sfx-volume-value').textContent = `${Math.round(AudioManager.settings.sfxVolume * 100)}%`;
        }
        if (sensitivity) {
            sensitivity.value = Controls.settings.sensitivity;
            document.getElementById('control-sensitivity-value').textContent = Controls.settings.sensitivity;
        }
        if (pointsToWin) {
            pointsToWin.value = this.pointsToWin;
            document.getElementById('points-to-win-value').textContent = this.pointsToWin;
        }
        if (visualEffects) visualEffects.checked = Renderer.settings.visualEffects;
        if (scanlines) scanlines.checked = Renderer.settings.scanlines;
        if (screenShake) screenShake.checked = Renderer.settings.screenShake;
        
        // Analytics toggle
        const analyticsEnabled = document.getElementById('analytics-enabled');
        if (analyticsEnabled) {
            analyticsEnabled.checked = this.getAnalyticsEnabled();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});

// Save settings before leaving
window.addEventListener('beforeunload', () => {
    Game.saveSettings();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Game;
}
