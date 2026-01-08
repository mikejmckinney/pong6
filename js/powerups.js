/* =============================================
   NEON PONG - Power-Up System
   ============================================= */

const PowerUps = {
    // Power-up types
    types: {
        bigPaddle: {
            id: 'bigPaddle',
            name: 'Big Paddle',
            icon: '↔',
            color: '#00ff00',
            duration: 10,
            effect: 'Increases paddle size by 50%',
            apply: (target) => {
                target.paddleMultiplier = 1.5;
            },
            remove: (target) => {
                target.paddleMultiplier = 1;
            }
        },
        smallEnemy: {
            id: 'smallEnemy',
            name: 'Small Enemy',
            icon: '↕',
            color: '#ff0000',
            duration: 10,
            effect: 'Shrinks opponent paddle by 50%',
            targetOpponent: true,
            apply: (target) => {
                target.paddleMultiplier = 0.5;
            },
            remove: (target) => {
                target.paddleMultiplier = 1;
            }
        },
        speedBall: {
            id: 'speedBall',
            name: 'Speed Ball',
            icon: '⚡',
            color: '#ff6600',
            duration: -1, // Until next score
            effect: 'Ball moves 50% faster',
            apply: (game) => {
                game.ballSpeedMultiplier = 1.5;
            },
            remove: (game) => {
                game.ballSpeedMultiplier = 1;
            }
        },
        slowBall: {
            id: 'slowBall',
            name: 'Slow Ball',
            icon: '🐢',
            color: '#0080ff',
            duration: 8,
            effect: 'Ball moves 50% slower',
            apply: (game) => {
                game.ballSpeedMultiplier = 0.5;
            },
            remove: (game) => {
                game.ballSpeedMultiplier = 1;
            }
        },
        multiBall: {
            id: 'multiBall',
            name: 'Multi Ball',
            icon: '●●',
            color: '#ff00ff',
            duration: -1, // Until balls cleared
            effect: 'Spawns 2 additional balls',
            apply: (game) => {
                game.spawnExtraBalls(2);
            },
            remove: (game) => {
                // Balls remove themselves when scored
            }
        },
        fireball: {
            id: 'fireball',
            name: 'Fireball',
            icon: '🔥',
            color: '#ff3300',
            duration: -1, // Single use
            singleUse: true,
            effect: 'Ball passes through paddle once',
            apply: (game) => {
                game.fireballActive = true;
            },
            remove: (game) => {
                game.fireballActive = false;
            }
        },
        shield: {
            id: 'shield',
            name: 'Shield',
            icon: '🛡',
            color: '#00ffff',
            duration: -1, // Single use
            singleUse: true,
            effect: 'Blocks one goal',
            apply: (target) => {
                target.hasShield = true;
            },
            remove: (target) => {
                target.hasShield = false;
            }
        },
        reverse: {
            id: 'reverse',
            name: 'Reverse',
            icon: '🔄',
            color: '#bf00ff',
            duration: 8,
            targetOpponent: true,
            effect: 'Inverts opponent controls',
            apply: (target) => {
                target.controlsReversed = true;
            },
            remove: (target) => {
                target.controlsReversed = false;
            }
        }
    },

    // Active power-ups
    activePowerups: [],
    
    // Spawned power-ups on field
    spawnedPowerups: [],
    
    // Settings
    settings: {
        enabled: true,
        spawnInterval: 10000, // ms between spawns
        maxOnField: 2,
        availableTypes: ['bigPaddle', 'smallEnemy', 'speedBall', 'slowBall', 'shield', 'reverse']
    },

    // Timers
    lastSpawnTime: 0,

    // Initialize
    init(gameMode = 'classic') {
        this.reset();
        this.configureForMode(gameMode);
    },

    // Configure power-ups for game mode
    configureForMode(mode) {
        switch (mode) {
            case 'classic':
                this.settings.enabled = false;
                break;
            case 'chaos':
                this.settings.enabled = true;
                this.settings.spawnInterval = 5000;
                this.settings.maxOnField = 4;
                this.settings.availableTypes = Object.keys(this.types);
                break;
            case 'speedrun':
                this.settings.enabled = true;
                this.settings.spawnInterval = 15000;
                this.settings.maxOnField = 1;
                this.settings.availableTypes = ['speedBall', 'bigPaddle'];
                break;
            default:
                this.settings.enabled = true;
                this.settings.spawnInterval = 10000;
                this.settings.maxOnField = 2;
        }
    },

    // Reset all power-ups
    reset() {
        this.activePowerups = [];
        this.spawnedPowerups = [];
        this.lastSpawnTime = 0;
    },

    // Update power-ups
    update(deltaTime, currentTime, canvasWidth, canvasHeight) {
        if (!this.settings.enabled) return;

        // Check for new spawn
        if (currentTime - this.lastSpawnTime >= this.settings.spawnInterval) {
            if (this.spawnedPowerups.length < this.settings.maxOnField) {
                this.spawnPowerup(canvasWidth, canvasHeight);
                this.lastSpawnTime = currentTime;
            }
        }

        // Update spawned power-ups (floating animation)
        this.spawnedPowerups.forEach(powerup => {
            powerup.floatOffset = Math.sin(currentTime / 500) * 5;
        });

        // Update active power-ups (check expiration)
        this.activePowerups = this.activePowerups.filter(active => {
            if (active.duration > 0) {
                active.remainingTime -= deltaTime;
                if (active.remainingTime <= 0) {
                    this.deactivatePowerup(active);
                    return false;
                }
            }
            return true;
        });
    },

    // Spawn a new power-up
    spawnPowerup(canvasWidth, canvasHeight) {
        const typeId = this.settings.availableTypes[
            Utils.random(0, this.settings.availableTypes.length - 1)
        ];
        const type = this.types[typeId];
        
        if (!type) return null;

        const powerup = {
            id: Utils.generateId(),
            typeId: typeId,
            type: type,
            x: canvasWidth / 2 + Utils.randomFloat(-100, 100),
            y: Utils.randomFloat(100, canvasHeight - 100),
            radius: 20,
            active: true,
            floatOffset: 0,
            icon: type.icon,
            color: type.color
        };

        this.spawnedPowerups.push(powerup);
        return powerup;
    },

    // Check collision between ball and power-ups
    checkBallCollision(ball) {
        for (let i = this.spawnedPowerups.length - 1; i >= 0; i--) {
            const powerup = this.spawnedPowerups[i];
            
            if (!powerup.active) continue;

            const dist = Utils.distance(ball.x, ball.y, powerup.x, powerup.y + powerup.floatOffset);
            
            if (dist < ball.radius + powerup.radius) {
                // Collect power-up
                this.spawnedPowerups.splice(i, 1);
                return powerup;
            }
        }
        return null;
    },

    // Activate power-up for player
    activatePowerup(powerup, playerNum, game) {
        const type = powerup.type;
        const isPlayer1 = playerNum === 1;
        
        // Determine target
        let target;
        if (type.targetOpponent) {
            target = isPlayer1 ? game.player2State : game.player1State;
        } else {
            target = isPlayer1 ? game.player1State : game.player2State;
        }

        // For game-wide effects
        if (type.id === 'speedBall' || type.id === 'slowBall' || type.id === 'multiBall' || type.id === 'fireball') {
            target = game;
        }

        // Apply effect
        type.apply(target);

        // Track active power-up
        const activePowerup = {
            id: powerup.id,
            typeId: powerup.typeId,
            type: type,
            playerNum: playerNum,
            target: target,
            duration: type.duration,
            remainingTime: type.duration,
            singleUse: type.singleUse || false,
            icon: type.icon,
            color: type.color
        };

        // Only add to active list if it has duration
        if (type.duration !== -1 || type.singleUse) {
            this.activePowerups.push(activePowerup);
        }

        return activePowerup;
    },

    // Deactivate power-up
    deactivatePowerup(activePowerup) {
        activePowerup.type.remove(activePowerup.target);
    },

    // Remove single-use power-up when triggered
    consumeSingleUse(typeId, playerNum) {
        const index = this.activePowerups.findIndex(
            p => p.typeId === typeId && p.playerNum === playerNum && p.singleUse
        );
        
        if (index !== -1) {
            const powerup = this.activePowerups[index];
            this.deactivatePowerup(powerup);
            this.activePowerups.splice(index, 1);
            return true;
        }
        return false;
    },

    // Clear power-ups that expire on score
    clearOnScore() {
        this.activePowerups = this.activePowerups.filter(active => {
            if (active.typeId === 'speedBall' || active.typeId === 'fireball') {
                this.deactivatePowerup(active);
                return false;
            }
            return true;
        });
    },

    // Get active power-ups for a player
    getPlayerPowerups(playerNum) {
        return this.activePowerups.filter(p => p.playerNum === playerNum);
    },

    // Get all spawned power-ups for rendering
    getSpawnedPowerups() {
        return this.spawnedPowerups.filter(p => p.active);
    },

    // Check if player has specific power-up
    playerHasPowerup(playerNum, typeId) {
        return this.activePowerups.some(p => p.playerNum === playerNum && p.typeId === typeId);
    },

    // Get power-up type info
    getTypeInfo(typeId) {
        return this.types[typeId] || null;
    },

    // Disable power-ups
    disable() {
        this.settings.enabled = false;
        this.reset();
    },

    // Enable power-ups
    enable() {
        this.settings.enabled = true;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PowerUps;
}
