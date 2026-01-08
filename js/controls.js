/* =============================================
   NEON PONG - Input Controls
   Touch, Mouse, and Keyboard Support
   ============================================= */

const Controls = {
    // State
    keys: {},
    touches: {},
    mouse: { y: 0, active: false },
    
    // Settings
    settings: {
        sensitivity: 5,
        invertY: false
    },

    // Player states
    player1: {
        targetY: null,
        velocity: 0,
        touchId: null,
        active: false
    },
    
    player2: {
        targetY: null,
        velocity: 0,
        touchId: null,
        active: false
    },

    // Callbacks
    callbacks: {
        onPause: null,
        onResume: null
    },

    // Initialize controls
    init() {
        this.setupKeyboardControls();
        this.setupTouchControls();
        this.setupMouseControls();
        this.preventDefaultBehaviors();
        
        console.log('Controls initialized');
    },

    // Setup keyboard controls
    setupKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Prevent default for game keys
            if (['KeyW', 'KeyS', 'ArrowUp', 'ArrowDown', 'Space', 'Escape'].includes(e.code)) {
                e.preventDefault();
            }
            
            // Pause/Resume
            if (e.code === 'Escape' || e.code === 'KeyP') {
                if (this.callbacks.onPause) {
                    this.callbacks.onPause();
                }
            }
            
            // Space to start/resume
            if (e.code === 'Space') {
                if (this.callbacks.onResume) {
                    this.callbacks.onResume();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    },

    // Setup touch controls
    setupTouchControls() {
        const gameCanvas = document.getElementById('game-canvas');
        const touchZoneLeft = document.getElementById('touch-zone-left');
        const touchZoneRight = document.getElementById('touch-zone-right');

        // Touch start handler
        const handleTouchStart = (e) => {
            e.preventDefault();
            AudioManager.resume();
            
            for (const touch of e.changedTouches) {
                const rect = gameCanvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                const halfWidth = rect.width / 2;
                
                // Determine which player's paddle to control
                if (x < halfWidth) {
                    // Left side - Player 1
                    this.player1.touchId = touch.identifier;
                    this.player1.targetY = y;
                    this.player1.active = true;
                    touchZoneLeft?.classList.add('active');
                } else {
                    // Right side - Player 2
                    this.player2.touchId = touch.identifier;
                    this.player2.targetY = y;
                    this.player2.active = true;
                    touchZoneRight?.classList.add('active');
                }
                
                this.touches[touch.identifier] = { x, y };
            }
        };

        // Touch move handler
        const handleTouchMove = (e) => {
            e.preventDefault();
            
            for (const touch of e.changedTouches) {
                const rect = gameCanvas.getBoundingClientRect();
                const y = touch.clientY - rect.top;
                
                if (touch.identifier === this.player1.touchId) {
                    const prevY = this.player1.targetY || y;
                    this.player1.targetY = y;
                    this.player1.velocity = (y - prevY) * this.settings.sensitivity;
                }
                
                if (touch.identifier === this.player2.touchId) {
                    const prevY = this.player2.targetY || y;
                    this.player2.targetY = y;
                    this.player2.velocity = (y - prevY) * this.settings.sensitivity;
                }
                
                if (this.touches[touch.identifier]) {
                    this.touches[touch.identifier].y = y;
                }
            }
        };

        // Touch end handler
        const handleTouchEnd = (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === this.player1.touchId) {
                    this.player1.touchId = null;
                    this.player1.active = false;
                    this.player1.velocity = 0;
                    touchZoneLeft?.classList.remove('active');
                }
                
                if (touch.identifier === this.player2.touchId) {
                    this.player2.touchId = null;
                    this.player2.active = false;
                    this.player2.velocity = 0;
                    touchZoneRight?.classList.remove('active');
                }
                
                delete this.touches[touch.identifier];
            }
        };

        // Add touch listeners
        gameCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        gameCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        gameCanvas.addEventListener('touchend', handleTouchEnd);
        gameCanvas.addEventListener('touchcancel', handleTouchEnd);
    },

    // Setup mouse controls (for desktop)
    setupMouseControls() {
        const gameCanvas = document.getElementById('game-canvas');
        
        gameCanvas.addEventListener('mouseenter', () => {
            this.mouse.active = true;
        });
        
        gameCanvas.addEventListener('mouseleave', () => {
            this.mouse.active = false;
        });
        
        gameCanvas.addEventListener('mousemove', (e) => {
            if (this.mouse.active) {
                const rect = gameCanvas.getBoundingClientRect();
                const y = e.clientY - rect.top;
                const x = e.clientX - rect.left;
                
                // For single player, control player 1 paddle with mouse
                this.player1.targetY = y;
                
                // For local multiplayer, use left/right halves
                const halfWidth = rect.width / 2;
                if (x < halfWidth) {
                    this.player1.targetY = y;
                } else {
                    this.player2.targetY = y;
                }
            }
        });

        // Mouse click to interact
        gameCanvas.addEventListener('click', () => {
            AudioManager.resume();
        });
    },

    // Prevent default touch behaviors
    preventDefaultBehaviors() {
        // Prevent zoom on double-tap
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent pull-to-refresh and scroll
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('#game-canvas') || e.target.closest('.touch-zone')) {
                e.preventDefault();
            }
        }, { passive: false });

        // Prevent context menu on long press
        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#game-screen')) {
                e.preventDefault();
            }
        });
    },

    // Get keyboard input for player 1
    getPlayer1KeyboardInput() {
        let direction = 0;
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) {
            direction = -1;
        }
        if (this.keys['KeyS'] || this.keys['ArrowDown']) {
            direction = 1;
        }
        
        return direction * this.settings.sensitivity * 100;
    },

    // Get keyboard input for player 2
    getPlayer2KeyboardInput() {
        let direction = 0;
        
        if (this.keys['ArrowUp']) {
            direction = -1;
        }
        if (this.keys['ArrowDown']) {
            direction = 1;
        }
        
        return direction * this.settings.sensitivity * 100;
    },

    // Get paddle target position for player
    getPaddleTarget(playerNum, paddleHeight, canvasHeight) {
        const player = playerNum === 1 ? this.player1 : this.player2;
        
        if (player.targetY !== null) {
            // Clamp target to valid range
            const minY = paddleHeight / 2;
            const maxY = canvasHeight - paddleHeight / 2;
            return Utils.clamp(player.targetY, minY, maxY);
        }
        
        return null;
    },

    // Get keyboard velocity for paddle
    getKeyboardVelocity(playerNum) {
        if (playerNum === 1) {
            let velocity = 0;
            if (this.keys['KeyW']) velocity -= this.settings.sensitivity * 100;
            if (this.keys['KeyS']) velocity += this.settings.sensitivity * 100;
            return velocity;
        } else {
            let velocity = 0;
            if (this.keys['ArrowUp']) velocity -= this.settings.sensitivity * 100;
            if (this.keys['ArrowDown']) velocity += this.settings.sensitivity * 100;
            return velocity;
        }
    },

    // Check if any input is active for player
    isPlayerActive(playerNum) {
        const player = playerNum === 1 ? this.player1 : this.player2;
        const keyboardActive = playerNum === 1 
            ? (this.keys['KeyW'] || this.keys['KeyS'])
            : (this.keys['ArrowUp'] || this.keys['ArrowDown']);
        
        return player.active || keyboardActive || this.mouse.active;
    },

    // Reset player state
    resetPlayer(playerNum) {
        const player = playerNum === 1 ? this.player1 : this.player2;
        player.targetY = null;
        player.velocity = 0;
        player.touchId = null;
        player.active = false;
    },

    // Reset all controls
    reset() {
        this.resetPlayer(1);
        this.resetPlayer(2);
        this.keys = {};
        this.touches = {};
        this.mouse.active = false;
    },

    // Set control sensitivity
    setSensitivity(value) {
        this.settings.sensitivity = Utils.clamp(value, 1, 10);
    },

    // Register pause callback
    onPause(callback) {
        this.callbacks.onPause = callback;
    },

    // Register resume callback  
    onResume(callback) {
        this.callbacks.onResume = callback;
    },

    // Save settings
    saveSettings() {
        Utils.storage.set('controlSettings', this.settings);
    },

    // Load settings
    loadSettings() {
        const saved = Utils.storage.get('controlSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Controls;
}
