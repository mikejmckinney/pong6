# AI Repository Guide for Neon Pong

**Last Updated**: January 2026

This guide provides essential information for AI coding agents working on the Neon Pong repository. Follow these guidelines to work efficiently and avoid common pitfalls.

## Quick Start

1. **This is a zero-build vanilla JavaScript project** - No webpack, no babel, no npm scripts for the client
2. **No test suite exists** - All testing is manual by running the game in a browser
3. **No linting** - Code style is consistent but not enforced by tools
4. **Serve with Python for fastest testing**: `python3 -m http.server 8080`

## Critical Information

### What This Project Is
- **Type**: HTML5 Canvas game (classic Pong with modern features)
- **Tech Stack**: Pure vanilla JavaScript (ES6), HTML5, CSS3, Web Audio API
- **Architecture**: Modular pattern with object-based modules (no ES6 modules or imports)
- **Rendering**: Canvas 2D context with custom neon/glow effects
- **Deployment**: Static hosting on GitHub Pages (no server-side logic needed for core game)

### What This Project Is NOT
- Not a React/Vue/Angular app
- Not using TypeScript or any transpilation
- Not using npm/webpack for client-side code (only server uses npm)
- Not using any game frameworks/engines (no Phaser, no Three.js)
- Not using external asset files for sounds (all generated with Web Audio API)

## Essential Commands

### Testing Client-Side Changes
```bash
# Start from repository root
cd /home/runner/work/pong6/pong6

# Fastest method - works immediately
python3 -m http.server 8080

# Opens at http://localhost:8080
# Browser will load index.html automatically
# Press Ctrl+C to stop server
```

**When to use**: For ANY changes to HTML, CSS, or client-side JavaScript files

### Testing Multiplayer/Server Changes
```bash
# First time only - install dependencies (~5 seconds)
cd /home/runner/work/pong6/pong6/server
npm install

# Start the server (port 3000)
npm start

# Opens at http://localhost:3000
# Serves both the game AND handles multiplayer via Socket.io
# Press Ctrl+C to stop server
```

**When to use**: ONLY when testing or modifying online multiplayer features (server/index.js or server/gameRoom.js)

### Verifying Server Dependencies
```bash
cd /home/runner/work/pong6/pong6/server
node --version    # Should show v20.19.6
npm --version     # Should show 10.8.2
```

## File Loading Order

The HTML file (`index.html`) loads scripts in this specific order (critical for dependencies):

1. `js/utils.js` - Utility functions (used by all other modules)
2. `js/audio.js` - Audio system
3. `js/renderer.js` - Canvas rendering
4. `js/controls.js` - Input handling
5. `js/ai.js` - AI opponent
6. `js/powerups.js` - Power-up system
7. `js/leaderboard.js` - Stats tracking
8. `js/multiplayer.js` - Multiplayer client
9. `js/game.js` - Main game controller (must be last)

**IMPORTANT**: If you add new JavaScript files, they must be added to `index.html` in the appropriate order based on dependencies.

## Module Communication Pattern

All modules are global objects that communicate via direct references:

```javascript
// Each file defines a global object
const Game = { /* ... */ };
const Renderer = { /* ... */ };
const Controls = { /* ... */ };

// Modules call each other directly
Game.init() → Renderer.init() → Controls.init()
```

**No import/export statements** - Scope is managed through execution order and global objects.

## Common Modifications

### Changing Game Constants
Edit `js/game.js` around lines 47-56:
```javascript
settings: {
    paddleWidth: 15,      // Paddle width in pixels
    paddleHeight: 100,    // Paddle height in pixels
    paddleSpeed: 500,     // Paddle speed (pixels per second)
    paddleMargin: 20,     // Distance from edge
    ballRadius: 10,       // Ball size
    ballSpeed: 400,       // Initial ball speed
    ballSpeedIncrease: 1.05,  // Speed multiplier per hit
    maxBallSpeed: 800     // Maximum ball velocity
}
```

### Adding New Power-ups
Edit `js/powerups.js`:
```javascript
PowerUps.types = {
    newPowerup: {
        id: 'newPowerup',
        name: 'Display Name',
        icon: '⭐',  // Emoji or symbol
        color: '#ffff00',
        duration: 10,  // Seconds (0 for instant)
        effect: 'Description',
        apply: (target) => {
            // Apply effect to 'player1' or 'player2'
        },
        remove: (target) => {
            // Clean up effect
        }
    }
};
```

### Modifying Visual Style
Edit `css/main.css` - uses CSS custom properties:
```css
:root {
    --bg-primary: #0a0a0a;      /* Background color */
    --neon-pink: #ff00ff;       /* Primary accent */
    --neon-cyan: #00ffff;       /* Secondary accent */
    --neon-purple: #bf00ff;     /* Tertiary accent */
    --neon-yellow: #ffff00;
    --neon-green: #00ff00;
}
```

### Changing AI Difficulty
Edit `js/ai.js` lines 8-40 to adjust difficulty parameters:
- `reactionTime` - Delay before AI reacts (seconds)
- `maxSpeed` - Maximum paddle velocity
- `accuracy` - Tracking precision (0-1)
- `predictionError` - Random error in pixels
- `mistakeProbability` - Chance of random mistakes

## Testing Checklist

When making changes, manually test these scenarios:

### For Gameplay Changes
1. ✓ Start single player game (any difficulty)
2. ✓ Play until scoring a point
3. ✓ Pause and resume with ESC/Space
4. ✓ Complete a full game

### For UI/Visual Changes
1. ✓ Navigate through all menu screens
2. ✓ Check responsive layout (browser dev tools mobile mode)
3. ✓ Verify neon glow effects render correctly
4. ✓ Test on both light and dark browser themes

### For Touch/Control Changes
1. ✓ Test keyboard controls (W/S and Arrow keys)
2. ✓ Test mouse dragging
3. ✓ Test touch (browser mobile emulation)
4. ✓ Test local multiplayer (split touch controls)

### For Audio Changes
1. ✓ Verify sounds play (requires user interaction first)
2. ✓ Test volume controls in settings
3. ✓ Verify mute functionality

### For Multiplayer Changes
1. ✓ Start Node.js server
2. ✓ Open two browser tabs
3. ✓ Create room in tab 1, join in tab 2
4. ✓ Play complete multiplayer game
5. ✓ Check server console for errors

## Known Limitations & Issues

1. **Quick Match Not Implemented** - `js/game.js` line 321 has TODO comment. Quick match button exists in UI but functionality is incomplete.

2. **Service Worker Caching** - During development, service worker aggressively caches files. Use hard refresh (Ctrl+F5 / Cmd+Shift+R) or disable service worker in browser dev tools.

3. **No Error Boundaries** - JavaScript errors will break the game. Always check browser console for errors after making changes.

4. **localStorage Dependency** - Stats and settings require localStorage. Game works without it but won't persist data.

5. **Browser Autoplay Policy** - Audio must be initialized after user interaction. AudioManager.init() is called on first user click.

6. **No Type Checking** - Pure JavaScript with no TypeScript means no compile-time type safety. Be careful with function parameters.

## Browser Console Testing

Open browser console (F12) and test modules directly:

```javascript
// Check game state
console.log(Game.state);
console.log(Game.score);

// Manually trigger power-up
PowerUps.spawn();

// Check renderer info
console.log(Renderer.canvas.width, Renderer.canvas.height);

// Test AI settings
console.log(AI.difficulty);

// Check audio state
console.log(AudioManager.initialized);
```

## Git Workflow Notes

- **node_modules is gitignored** - Don't commit server/node_modules (already in .gitignore)
- **No build artifacts** - There are no dist/, build/, or out/ directories to ignore
- **package-lock.json in server/** - This should be committed for reproducible server builds

## Performance Considerations

- **Canvas Rendering**: Game targets 60 FPS. Check performance with browser dev tools Performance tab.
- **Particle Systems**: Heavy particle effects may impact mobile performance. Toggle via settings.
- **Multiple Balls**: Multi-ball power-up spawns 3 balls total - can impact performance on low-end devices.

## Code Style Observations

- **Semicolons**: Inconsistently used (some files use them, some don't). ASI (Automatic Semicolon Insertion) handles this.
- **Quotes**: Mostly single quotes for strings
- **Indentation**: 4 spaces
- **Line Length**: No strict limit, typically under 120 characters
- **Comments**: Sparse - mostly section headers and complex algorithm explanations
- **Naming**: camelCase for functions/variables, PascalCase for module objects

## When Things Go Wrong

### Game Won't Load
1. Check browser console for JavaScript errors
2. Verify all JS files are loaded (Network tab in dev tools)
3. Clear browser cache and hard refresh
4. Disable service worker in Application tab

### Server Won't Start
1. Verify you're in `server/` directory
2. Check Node.js version: `node --version` (needs 16+)
3. Remove node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check if port 3000 is already in use: `lsof -i :3000` or use different port: `PORT=3001 npm start`

### Changes Not Appearing
1. Hard refresh browser (Ctrl+F5)
2. Disable service worker in dev tools
3. Clear browser cache
4. Check you saved the file
5. Verify you're editing the right file (not in node_modules/)

## Summary

Keep it simple: This is a straightforward HTML5 game. Serve it, open browser, play it, check console. No build steps, no test commands, no complex tooling. The complexity is in the game logic and Canvas rendering, not in the development workflow.

**Primary test command**: `python3 -m http.server 8080`  
**That's it.** Everything else is optional based on what you're modifying.
