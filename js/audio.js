/* =============================================
   NEON PONG - Audio System
   8-bit/Chiptune Sound Effects using Web Audio API
   ============================================= */

const AudioManager = {
    context: null,
    masterGain: null,
    sfxGain: null,
    musicGain: null,
    initialized: false,
    muted: false,
    
    settings: {
        masterVolume: 0.8,
        sfxVolume: 0.8,
        musicVolume: 0.6
    },

    // Initialize Audio Context
    init() {
        if (this.initialized) return;
        
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create gain nodes
            this.masterGain = this.context.createGain();
            this.sfxGain = this.context.createGain();
            this.musicGain = this.context.createGain();
            
            // Connect nodes
            this.sfxGain.connect(this.masterGain);
            this.musicGain.connect(this.masterGain);
            this.masterGain.connect(this.context.destination);
            
            // Set initial volumes
            this.updateVolumes();
            
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    },

    // Resume audio context (needed after user interaction)
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    },

    // Update volume levels
    updateVolumes() {
        if (!this.initialized) return;
        
        const master = this.muted ? 0 : this.settings.masterVolume;
        this.masterGain.gain.setValueAtTime(master, this.context.currentTime);
        this.sfxGain.gain.setValueAtTime(this.settings.sfxVolume, this.context.currentTime);
        this.musicGain.gain.setValueAtTime(this.settings.musicVolume, this.context.currentTime);
    },

    // Set master volume (0-1)
    setMasterVolume(value) {
        this.settings.masterVolume = Utils.clamp(value, 0, 1);
        this.updateVolumes();
    },

    // Set SFX volume (0-1)
    setSfxVolume(value) {
        this.settings.sfxVolume = Utils.clamp(value, 0, 1);
        this.updateVolumes();
    },

    // Set music volume (0-1)
    setMusicVolume(value) {
        this.settings.musicVolume = Utils.clamp(value, 0, 1);
        this.updateVolumes();
    },

    // Toggle mute
    toggleMute() {
        this.muted = !this.muted;
        this.updateVolumes();
        return this.muted;
    },

    // Create oscillator-based sound
    createOscillator(type, frequency, duration, gainValue = 0.3) {
        if (!this.initialized) return null;
        
        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
        
        gainNode.gain.setValueAtTime(gainValue, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.sfxGain);
        
        return { oscillator, gainNode };
    },

    // Play a simple tone
    playTone(frequency, duration = 0.1, type = 'square') {
        if (!this.initialized) return;
        this.resume();
        
        const sound = this.createOscillator(type, frequency, duration);
        if (sound) {
            sound.oscillator.start();
            sound.oscillator.stop(this.context.currentTime + duration);
        }
    },

    // Paddle hit sound - "bip" with pitch variation based on position
    playPaddleHit(hitPosition = 0.5) {
        if (!this.initialized) return;
        this.resume();
        
        // Pitch varies based on where ball hits paddle (-1 to 1)
        const baseFreq = 440;
        const frequency = baseFreq + (hitPosition * 200);
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(frequency, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.2, this.context.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.3, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.1);
    },

    // Wall bounce sound - lower pitched "bop"
    playWallBounce() {
        if (!this.initialized) return;
        this.resume();
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, this.context.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.25, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.08);
    },

    // Score point sound - celebratory jingle
    playScore(isWinner = true) {
        if (!this.initialized) return;
        this.resume();
        
        if (isWinner) {
            // Happy ascending arpeggio
            const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                setTimeout(() => this.playTone(freq, 0.15, 'square'), i * 80);
            });
        } else {
            // Sad descending tone
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(400, this.context.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.4);
            
            gain.gain.setValueAtTime(0.2, this.context.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.4);
            
            osc.connect(gain);
            gain.connect(this.sfxGain);
            
            osc.start();
            osc.stop(this.context.currentTime + 0.4);
        }
    },

    // Game start sound - ascending arpeggio
    playGameStart() {
        if (!this.initialized) return;
        this.resume();
        
        const notes = [262, 330, 392, 523, 659, 784]; // C4, E4, G4, C5, E5, G5
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.12, 'square'), i * 60);
        });
    },

    // Game over sound - dramatic fanfare
    playGameOver(isVictory = true) {
        if (!this.initialized) return;
        this.resume();
        
        if (isVictory) {
            // Victory fanfare
            const melody = [
                { freq: 523, dur: 0.15 },  // C5
                { freq: 659, dur: 0.15 },  // E5
                { freq: 784, dur: 0.15 },  // G5
                { freq: 1047, dur: 0.3 },  // C6
                { freq: 784, dur: 0.15 },  // G5
                { freq: 1047, dur: 0.4 }   // C6
            ];
            
            let time = 0;
            melody.forEach(note => {
                setTimeout(() => this.playTone(note.freq, note.dur, 'square'), time);
                time += note.dur * 800;
            });
        } else {
            // Defeat sound
            const melody = [
                { freq: 392, dur: 0.2 },   // G4
                { freq: 349, dur: 0.2 },   // F4
                { freq: 330, dur: 0.2 },   // E4
                { freq: 262, dur: 0.5 }    // C4
            ];
            
            let time = 0;
            melody.forEach(note => {
                setTimeout(() => this.playTone(note.freq, note.dur, 'sawtooth'), time);
                time += note.dur * 800;
            });
        }
    },

    // Power-up collect sound - sparkly pickup
    playPowerupCollect() {
        if (!this.initialized) return;
        this.resume();
        
        const notes = [880, 1109, 1319, 1760]; // A5, C#6, E6, A6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                const osc = this.context.createOscillator();
                const gain = this.context.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.context.currentTime);
                
                gain.gain.setValueAtTime(0.2, this.context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
                
                osc.connect(gain);
                gain.connect(this.sfxGain);
                
                osc.start();
                osc.stop(this.context.currentTime + 0.15);
            }, i * 50);
        });
    },

    // Power-up activate sound - whoosh/zap
    playPowerupActivate() {
        if (!this.initialized) return;
        this.resume();
        
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, this.context.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.25, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(this.sfxGain);
        
        osc.start();
        osc.stop(this.context.currentTime + 0.2);
    },

    // Menu navigation sound - click/blip
    playMenuClick() {
        if (!this.initialized) return;
        this.resume();
        
        this.playTone(600, 0.05, 'square');
    },

    // Menu hover sound
    playMenuHover() {
        if (!this.initialized) return;
        this.resume();
        
        this.playTone(400, 0.03, 'sine');
    },

    // Countdown beep
    playCountdown(number) {
        if (!this.initialized) return;
        this.resume();
        
        const freq = number === 0 ? 880 : 440; // Higher pitch for "GO"
        const duration = number === 0 ? 0.3 : 0.15;
        
        this.playTone(freq, duration, 'square');
    },

    // Error/invalid action sound
    playError() {
        if (!this.initialized) return;
        this.resume();
        
        this.playTone(150, 0.2, 'sawtooth');
    },

    // Create white noise (for effects)
    createNoise(duration) {
        if (!this.initialized) return null;
        
        const bufferSize = this.context.sampleRate * duration;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const output = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        return buffer;
    },

    // Play explosion sound (for scoring)
    playExplosion() {
        if (!this.initialized) return;
        this.resume();
        
        const noiseBuffer = this.createNoise(0.3);
        const noise = this.context.createBufferSource();
        const noiseGain = this.context.createGain();
        const filter = this.context.createBiquadFilter();
        
        noise.buffer = noiseBuffer;
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.context.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.3);
        
        noiseGain.gain.setValueAtTime(0.3, this.context.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        
        noise.start();
    },

    // Background music (simple synthwave loop)
    currentMusic: null,
    musicNodes: [],
    
    playBackgroundMusic() {
        if (!this.initialized || this.currentMusic) return;
        this.resume();
        
        // Create a simple synthwave bass loop
        const playBassNote = (freq, startTime, duration) => {
            const osc = this.context.createOscillator();
            const gain = this.context.createGain();
            const filter = this.context.createBiquadFilter();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, startTime);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
            gain.gain.linearRampToValueAtTime(0.1, startTime + duration * 0.5);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
            
            return { osc, gain };
        };
        
        // Bass pattern (A minor progression)
        const bassPattern = [
            { note: 110, dur: 0.5 },  // A2
            { note: 110, dur: 0.5 },
            { note: 82.41, dur: 0.5 }, // E2
            { note: 82.41, dur: 0.5 },
            { note: 98, dur: 0.5 },    // G2
            { note: 98, dur: 0.5 },
            { note: 73.42, dur: 0.5 }, // D2
            { note: 73.42, dur: 0.5 }
        ];
        
        const loopDuration = bassPattern.reduce((acc, n) => acc + n.dur, 0);
        
        const scheduleLoop = () => {
            if (!this.currentMusic) return;
            
            const now = this.context.currentTime;
            let time = now;
            
            bassPattern.forEach(note => {
                playBassNote(note.note, time, note.dur * 0.9);
                time += note.dur;
            });
            
            // Schedule next loop
            this.currentMusic = setTimeout(scheduleLoop, loopDuration * 1000 - 50);
        };
        
        this.currentMusic = setTimeout(scheduleLoop, 0);
    },

    stopBackgroundMusic() {
        if (this.currentMusic) {
            clearTimeout(this.currentMusic);
            this.currentMusic = null;
        }
    },

    // Save settings
    saveSettings() {
        Utils.storage.set('audioSettings', this.settings);
    },

    // Load settings
    loadSettings() {
        const saved = Utils.storage.get('audioSettings');
        if (saved) {
            this.settings = { ...this.settings, ...saved };
            this.updateVolumes();
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioManager;
}
