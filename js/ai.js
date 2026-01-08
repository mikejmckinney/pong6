/* =============================================
   NEON PONG - AI Opponent
   Multiple difficulty levels
   ============================================= */

const AI = {
    // Difficulty settings
    difficulties: {
        easy: {
            reactionTime: 0.3,      // Time to react to ball direction change
            maxSpeed: 200,          // Maximum paddle speed
            accuracy: 0.5,          // How accurately it tracks the ball (0-1)
            predictionError: 100,   // Random error in prediction (pixels)
            updateInterval: 100,    // How often AI updates its target (ms)
            mistakeProbability: 0.1 // Chance to make a mistake
        },
        medium: {
            reactionTime: 0.15,
            maxSpeed: 350,
            accuracy: 0.75,
            predictionError: 50,
            updateInterval: 60,
            mistakeProbability: 0.05
        },
        hard: {
            reactionTime: 0.08,
            maxSpeed: 500,
            accuracy: 0.9,
            predictionError: 20,
            updateInterval: 30,
            mistakeProbability: 0.02
        },
        impossible: {
            reactionTime: 0.02,
            maxSpeed: 800,
            accuracy: 0.98,
            predictionError: 5,
            updateInterval: 16,
            mistakeProbability: 0
        }
    },

    // Current state
    difficulty: 'medium',
    settings: null,
    targetY: 0,
    lastUpdateTime: 0,
    reactionTimer: 0,
    lastBallDirection: 0,
    predictedY: 0,
    isMakingMistake: false,
    mistakeDirection: 0,

    // Initialize AI
    init(difficulty = 'medium') {
        this.setDifficulty(difficulty);
        this.reset();
        console.log(`AI initialized with ${difficulty} difficulty`);
    },

    // Set difficulty
    setDifficulty(difficulty) {
        if (this.difficulties[difficulty]) {
            this.difficulty = difficulty;
            this.settings = { ...this.difficulties[difficulty] };
        }
    },

    // Reset AI state
    reset() {
        this.targetY = 0;
        this.lastUpdateTime = 0;
        this.reactionTimer = 0;
        this.lastBallDirection = 0;
        this.predictedY = 0;
        this.isMakingMistake = false;
    },

    // Predict where the ball will intersect with the AI paddle
    predictBallPosition(ball, paddle, canvasWidth, canvasHeight) {
        if (ball.vx <= 0) {
            // Ball moving away, return to center
            return canvasHeight / 2;
        }

        // Calculate time to reach paddle
        const distanceTopaddle = paddle.x - ball.x - ball.radius;
        const timeToReach = distanceTopaddle / ball.vx;
        
        if (timeToReach < 0) {
            return ball.y;
        }

        // Predict Y position accounting for bounces
        let predictedY = ball.y + (ball.vy * timeToReach);
        
        // Account for wall bounces
        let bounces = 0;
        const maxBounces = 10;
        
        while ((predictedY < 0 || predictedY > canvasHeight) && bounces < maxBounces) {
            if (predictedY < 0) {
                predictedY = -predictedY;
            } else if (predictedY > canvasHeight) {
                predictedY = 2 * canvasHeight - predictedY;
            }
            bounces++;
        }

        // Add prediction error based on difficulty
        const error = Utils.randomFloat(-this.settings.predictionError, this.settings.predictionError);
        predictedY += error * (1 - this.settings.accuracy);

        return Utils.clamp(predictedY, paddle.height / 2, canvasHeight - paddle.height / 2);
    },

    // Update AI logic
    update(deltaTime, ball, paddle, canvasWidth, canvasHeight) {
        if (!this.settings) return 0;

        const currentTime = performance.now();

        // Check for ball direction change
        const currentDirection = ball.vx > 0 ? 1 : -1;
        if (currentDirection !== this.lastBallDirection) {
            this.reactionTimer = this.settings.reactionTime;
            this.lastBallDirection = currentDirection;
        }

        // Wait for reaction time
        if (this.reactionTimer > 0) {
            this.reactionTimer -= deltaTime;
            // During reaction time, continue moving towards last target
            return this.calculateMovement(paddle, canvasHeight, deltaTime);
        }

        // Update target at intervals
        if (currentTime - this.lastUpdateTime >= this.settings.updateInterval) {
            this.lastUpdateTime = currentTime;
            
            // Decide whether to make a mistake
            if (Math.random() < this.settings.mistakeProbability) {
                this.isMakingMistake = true;
                this.mistakeDirection = Math.random() > 0.5 ? 1 : -1;
            } else {
                this.isMakingMistake = false;
            }

            // Predict ball position
            this.predictedY = this.predictBallPosition(ball, paddle, canvasWidth, canvasHeight);
            
            // Apply accuracy - mix between perfect prediction and random position
            const randomTarget = Utils.randomFloat(paddle.height / 2, canvasHeight - paddle.height / 2);
            this.targetY = Utils.lerp(randomTarget, this.predictedY, this.settings.accuracy);
        }

        return this.calculateMovement(paddle, canvasHeight, deltaTime);
    },

    // Calculate paddle movement velocity
    calculateMovement(paddle, canvasHeight, deltaTime) {
        const paddleCenter = paddle.y + paddle.height / 2;
        let targetY = this.targetY;

        // Apply mistake behavior
        if (this.isMakingMistake) {
            targetY += this.mistakeDirection * 100;
        }

        // Calculate distance to target
        const distance = targetY - paddleCenter;
        
        // Dead zone - don't move if close enough
        if (Math.abs(distance) < 5) {
            return 0;
        }

        // Calculate velocity with smooth acceleration
        let velocity = distance * 10; // Proportional control
        
        // Clamp to max speed
        velocity = Utils.clamp(velocity, -this.settings.maxSpeed, this.settings.maxSpeed);

        return velocity;
    },

    // Get difficulty info
    getDifficultyInfo(difficulty) {
        const d = this.difficulties[difficulty];
        if (!d) return null;
        
        return {
            name: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
            description: this.getDifficultyDescription(difficulty),
            stats: {
                speed: this.mapValue(d.maxSpeed, 200, 800, 1, 5),
                accuracy: this.mapValue(d.accuracy, 0.5, 0.98, 1, 5),
                reaction: this.mapValue(1 - d.reactionTime, 0.7, 0.98, 1, 5)
            }
        };
    },

    // Get description for difficulty
    getDifficultyDescription(difficulty) {
        const descriptions = {
            easy: 'Relaxed gameplay, perfect for beginners',
            medium: 'Balanced challenge for casual play',
            hard: 'Fast and accurate, for experienced players',
            impossible: 'Near-perfect AI, good luck!'
        };
        return descriptions[difficulty] || '';
    },

    // Map value from one range to another
    mapValue(value, inMin, inMax, outMin, outMax) {
        return Math.round(((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin);
    },

    // Adaptive difficulty adjustment (optional feature)
    adaptDifficulty(playerScore, aiScore, gamesPlayed) {
        if (gamesPlayed < 3) return; // Need some games to adapt

        const scoreDiff = playerScore - aiScore;
        const difficultyLevels = ['easy', 'medium', 'hard', 'impossible'];
        const currentIndex = difficultyLevels.indexOf(this.difficulty);

        // If player is winning by a lot, increase difficulty
        if (scoreDiff > 5 && currentIndex < difficultyLevels.length - 1) {
            this.setDifficulty(difficultyLevels[currentIndex + 1]);
        }
        // If AI is winning by a lot, decrease difficulty
        else if (scoreDiff < -5 && currentIndex > 0) {
            this.setDifficulty(difficultyLevels[currentIndex - 1]);
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI;
}
