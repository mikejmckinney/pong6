/* =============================================
   NEON PONG - Canvas Renderer
   Synthwave Visual Effects
   ============================================= */

const Renderer = {
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    trails: [],
    
    // Visual settings
    settings: {
        visualEffects: true,
        scanlines: true,
        screenShake: true,
        particleCount: 50,
        trailLength: 10
    },

    // Colors
    colors: {
        background: '#0a0a0a',
        backgroundGradient: ['#0a0a0a', '#1a1a2e'],
        grid: '#330033',
        paddle1: '#00ffff',
        paddle2: '#ff00ff',
        ball: '#ffffff',
        ballGlow: '#ff00ff',
        centerLine: '#333366',
        text: '#ffffff',
        particleColors: ['#ff00ff', '#00ffff', '#bf00ff', '#ff2d95', '#00f5ff']
    },

    // Initialize renderer
    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        
        this.resize();
        window.addEventListener('resize', Utils.debounce(() => this.resize(), 100));
        
        // Use IntersectionObserver to auto-resize when canvas becomes visible
        // This handles the case where canvas is hidden (display: none) during init
        this.setupVisibilityObserver();
        
        // Initialize particle pool
        this.initParticles();
        
        console.log('Renderer initialized');
    },

    // Setup IntersectionObserver to detect when canvas becomes visible
    setupVisibilityObserver() {
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers - they'll need manual resize
            console.log('IntersectionObserver not supported');
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0) {
                    // Canvas just became visible, resize to get correct dimensions
                    this.resize();
                }
            });
        }, {
            threshold: [0, 0.1] // Trigger when visibility changes
        });

        observer.observe(this.canvas);
    },

    // Resize canvas to fit container
    resize() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // If dimensions are 0 (container hidden), schedule a retry
        if (rect.width === 0 || rect.height === 0) {
            this.scheduleResizeRetry();
            return;
        }
        
        this.width = rect.width;
        this.height = rect.height;
        
        // Set canvas size with device pixel ratio for sharp rendering
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        
        // Scale canvas back down with CSS
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        
        // Reset transform before applying DPR scale to prevent compounding
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Scale context to account for DPR
        this.ctx.scale(this.dpr, this.dpr);
    },

    // Schedule a resize retry when dimensions are not yet available
    scheduleResizeRetry() {
        if (this._resizeRetryScheduled) return;
        this._resizeRetryScheduled = true;
        
        requestAnimationFrame(() => {
            this._resizeRetryScheduled = false;
            this.resize();
        });
    },

    // Get game dimensions (used for game logic)
    getDimensions() {
        return {
            width: this.width,
            height: this.height
        };
    },

    // Ensure dimensions are valid, resize if needed
    ensureValidDimensions() {
        if (this.width === 0 || this.height === 0) {
            this.resize();
        }
        return this.width > 0 && this.height > 0;
    },

    // Initialize particle pool
    initParticles() {
        this.particles = [];
        for (let i = 0; i < this.settings.particleCount; i++) {
            this.particles.push({
                active: false,
                x: 0,
                y: 0,
                vx: 0,
                vy: 0,
                size: 0,
                life: 0,
                maxLife: 0,
                color: ''
            });
        }
    },

    // Spawn particles at position
    spawnParticles(x, y, count = 10, color = null) {
        if (!this.settings.visualEffects) return;
        
        let spawned = 0;
        for (let i = 0; i < this.particles.length && spawned < count; i++) {
            if (!this.particles[i].active) {
                const p = this.particles[i];
                p.active = true;
                p.x = x;
                p.y = y;
                p.vx = Utils.randomFloat(-5, 5);
                p.vy = Utils.randomFloat(-5, 5);
                p.size = Utils.randomFloat(2, 6);
                p.maxLife = Utils.randomFloat(0.3, 0.8);
                p.life = p.maxLife;
                p.color = color || this.colors.particleColors[Utils.random(0, this.colors.particleColors.length - 1)];
                spawned++;
            }
        }
    },

    // Update particles
    updateParticles(deltaTime) {
        for (const p of this.particles) {
            if (p.active) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.2; // Gravity
                p.life -= deltaTime;
                
                if (p.life <= 0) {
                    p.active = false;
                }
            }
        }
    },

    // Add trail point
    addTrailPoint(x, y, color) {
        if (!this.settings.visualEffects) return;
        
        this.trails.push({
            x, y, color,
            alpha: 1,
            size: 8
        });
        
        // Limit trail length
        if (this.trails.length > this.settings.trailLength) {
            this.trails.shift();
        }
    },

    // Clear canvas
    clear() {
        this.ctx.fillStyle = this.colors.background;
        this.ctx.fillRect(0, 0, this.width, this.height);
    },

    // Draw background with grid effect
    drawBackground() {
        const ctx = this.ctx;
        
        // Gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, this.colors.backgroundGradient[0]);
        gradient.addColorStop(1, this.colors.backgroundGradient[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        
        if (!this.settings.visualEffects) return;
        
        // Draw grid
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        
        const gridSize = 40;
        
        // Vertical lines
        for (let x = 0; x <= this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
        
        // Center line (dashed)
        ctx.strokeStyle = this.colors.centerLine;
        ctx.lineWidth = 4;
        ctx.setLineDash([20, 15]);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();
        ctx.setLineDash([]);
    },

    // Draw paddle with glow effect
    drawPaddle(paddle, playerNum = 1) {
        const ctx = this.ctx;
        const color = playerNum === 1 ? this.colors.paddle1 : this.colors.paddle2;
        
        // Glow effect
        if (this.settings.visualEffects) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
        }
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(
            paddle.x, paddle.y,
            paddle.x + paddle.width, paddle.y + paddle.height
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, color);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Reset shadow
        ctx.shadowBlur = 0;
    },

    // Draw ball with glow and trail
    drawBall(ball) {
        const ctx = this.ctx;
        
        // Draw trail
        if (this.settings.visualEffects) {
            for (let i = 0; i < this.trails.length; i++) {
                const t = this.trails[i];
                const alpha = (i / this.trails.length) * 0.5;
                const size = (i / this.trails.length) * ball.radius;
                
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 0, 255, ${alpha})`;
                ctx.fill();
            }
        }
        
        // Glow effect
        if (this.settings.visualEffects) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = this.colors.ballGlow;
        }
        
        // Ball gradient
        const gradient = ctx.createRadialGradient(
            ball.x - ball.radius * 0.3,
            ball.y - ball.radius * 0.3,
            0,
            ball.x,
            ball.y,
            ball.radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.5, this.colors.ballGlow);
        gradient.addColorStop(1, '#ff00ff');
        
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
    },

    // Draw particles
    drawParticles() {
        if (!this.settings.visualEffects) return;
        
        const ctx = this.ctx;
        
        for (const p of this.particles) {
            if (p.active) {
                const alpha = p.life / p.maxLife;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.globalAlpha = alpha;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }
    },

    // Draw power-up
    drawPowerup(powerup) {
        const ctx = this.ctx;
        const { x, y, radius, color } = powerup;
        
        // Glow
        if (this.settings.visualEffects) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
        }
        
        // Outer circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        
        // Inner circle
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        
        // Icon
        ctx.fillStyle = '#ffffff';
        ctx.font = `${radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.icon, x, y);
        
        ctx.shadowBlur = 0;
    },

    // Draw score (on canvas, optional)
    drawScore(score1, score2) {
        const ctx = this.ctx;
        
        ctx.font = 'bold 48px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Player 1 score
        if (this.settings.visualEffects) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.colors.paddle1;
        }
        ctx.fillStyle = this.colors.paddle1;
        ctx.fillText(score1.toString(), this.width * 0.25, 20);
        
        // Player 2 score
        ctx.shadowColor = this.colors.paddle2;
        ctx.fillStyle = this.colors.paddle2;
        ctx.fillText(score2.toString(), this.width * 0.75, 20);
        
        ctx.shadowBlur = 0;
    },

    // Draw countdown number
    drawCountdown(number) {
        const ctx = this.ctx;
        const text = number === 0 ? 'GO!' : number.toString();
        
        ctx.font = `bold ${this.height * 0.3}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.settings.visualEffects) {
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#ff00ff';
        }
        
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(text, this.width / 2, this.height / 2);
        
        ctx.shadowBlur = 0;
    },

    // Draw game message
    drawMessage(text, subtext = '') {
        const ctx = this.ctx;
        
        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Main text
        ctx.font = `bold ${Math.min(this.width * 0.08, 48)}px Orbitron`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (this.settings.visualEffects) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff00ff';
        }
        
        ctx.fillStyle = '#ff00ff';
        ctx.fillText(text, this.width / 2, this.height / 2 - 20);
        
        // Subtext
        if (subtext) {
            ctx.font = `${Math.min(this.width * 0.04, 24)}px Orbitron`;
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#00ffff';
            ctx.fillText(subtext, this.width / 2, this.height / 2 + 30);
        }
        
        ctx.shadowBlur = 0;
    },

    // Draw active power-up indicator
    drawActivePowerups(player1Powerups, player2Powerups) {
        const ctx = this.ctx;
        const iconSize = 24;
        const padding = 10;
        
        // Player 1 powerups (left side)
        player1Powerups.forEach((powerup, i) => {
            const x = padding + (iconSize + 5) * i;
            const y = this.height - padding - iconSize;
            
            ctx.fillStyle = powerup.color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x, y, iconSize, iconSize);
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(powerup.icon, x + iconSize / 2, y + iconSize / 2);
        });
        
        // Player 2 powerups (right side)
        player2Powerups.forEach((powerup, i) => {
            const x = this.width - padding - iconSize - (iconSize + 5) * i;
            const y = this.height - padding - iconSize;
            
            ctx.fillStyle = powerup.color;
            ctx.globalAlpha = 0.7;
            ctx.fillRect(x, y, iconSize, iconSize);
            ctx.globalAlpha = 1;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(powerup.icon, x + iconSize / 2, y + iconSize / 2);
        });
    },

    // Screen shake effect
    shake(intensity = 5, duration = 0.2) {
        if (!this.settings.screenShake) return;
        
        const gameScreen = document.getElementById('game-screen');
        gameScreen.classList.add('screen-shake');
        
        setTimeout(() => {
            gameScreen.classList.remove('screen-shake');
        }, duration * 1000);
    },

    // Flash effect on score
    flash(color = '#ffffff') {
        if (!this.settings.visualEffects) return;
        
        const ctx = this.ctx;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.globalAlpha = 1;
    },

    // Render complete frame
    render(gameState) {
        // Clear and draw background
        this.clear();
        this.drawBackground();
        
        // Update and draw particles
        if (gameState.deltaTime) {
            this.updateParticles(gameState.deltaTime);
        }
        this.drawParticles();
        
        // Draw powerups
        if (gameState.powerups) {
            gameState.powerups.forEach(p => {
                if (p.active) this.drawPowerup(p);
            });
        }
        
        // Draw paddles
        if (gameState.paddle1) {
            this.drawPaddle(gameState.paddle1, 1);
        }
        if (gameState.paddle2) {
            this.drawPaddle(gameState.paddle2, 2);
        }
        
        // Add ball trail and draw ball
        if (gameState.ball) {
            this.addTrailPoint(gameState.ball.x, gameState.ball.y, this.colors.ballGlow);
            this.drawBall(gameState.ball);
        }
        
        // Draw extra balls (multi-ball powerup)
        if (gameState.extraBalls) {
            gameState.extraBalls.forEach(ball => {
                if (ball.active) {
                    this.drawBall(ball);
                }
            });
        }
        
        // Draw active powerup indicators
        if (gameState.activePowerups) {
            this.drawActivePowerups(
                gameState.activePowerups.player1 || [],
                gameState.activePowerups.player2 || []
            );
        }
    },

    // Update settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // Update scanlines overlay
        const scanlines = document.getElementById('scanlines-overlay');
        if (scanlines) {
            scanlines.classList.toggle('disabled', !this.settings.scanlines);
        }
    },

    // Save settings
    saveSettings() {
        Utils.storage.set('rendererSettings', this.settings);
    },

    // Load settings
    loadSettings() {
        const saved = Utils.storage.get('rendererSettings');
        if (saved) {
            this.updateSettings(saved);
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Renderer;
}
