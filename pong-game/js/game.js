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
    },

    // Setup online lobby listeners
    setupOnlineLobbyListeners() {
        document.querySelectorAll('#online-lobby .btn-menu').forEach(btn => {
            btn.addEventListener('click', async () => {
                AudioManager.playMenuClick();
                const action = btn.dataset.lobby;
                
                switch (action) {
                    case 'quickmatch':
                        // TODO: Implement quick match
                        alert('Online multiplayer requires a server. Coming soon!');
                        break;
                    case 'createroom':
                        alert('Online multiplayer requires a server. Coming soon!');
                        break;
                    case 'joinroom':
                        document.getElementById('room-code-input').style.display = 'flex';
                        break;
                }
            });
        });

        document.getElementById('join-room-btn')?.addEventListener('click', () => {
            const code = document.getElementById('room-code').value;
            if (code.length === 6) {
                alert('Online multiplayer requires a server. Coming soon!');
            }
        });
    },

    // Show screen
    showScreen(screenName) {
        // Hide all screens
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
        
        if (this.currentScreen === 'settings' && this.previousScreen === 'pause') {
            this.screens.pause.classList.add('active');
            this.screens.settings.classList.remove('active');
            this.currentScreen = 'pause';
        } else {
            this.showScreen(target);
        }
    },

    // Start new game
    startGame() {
        console.log(`Starting ${this.gameType} game in ${this.mode} mode`);
        
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

        // Show game screen
        this.showScreen('game');
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

        // Update game time
        this.stats.gameTime = (performance.now() - this.stats.gameStartTime) / 1000;
    },

    // Update player 1 paddle
    updatePaddle1(dt, dims) {
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
    },

    // Update player 2 paddle
    updatePaddle2(dt, dims) {
        if (this.mode === 'single') {
            // AI control
            const aiVelocity = AI.update(dt, this.ball, this.paddle2, dims.width, dims.height);
            this.paddle2.y += aiVelocity * dt;
        } else {
            // Human control
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
        
        const winner = this.score.player1 >= this.pointsToWin ? 1 : 2;
        const isPlayerWin = this.mode === 'single' ? winner === 1 : true;
        
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

    // Save settings
    saveSettings() {
        AudioManager.saveSettings();
        Renderer.saveSettings();
        Controls.saveSettings();
        Utils.storage.set('gameSettings', {
            pointsToWin: this.pointsToWin
        });
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
