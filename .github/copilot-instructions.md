# Copilot Instructions for Neon Pong Repository

## Purpose
This file provides GitHub Copilot with project-specific context, conventions, and workflows to ensure consistent, high-quality code contributions. These instructions guide Copilot's behavior when working on issues, reviewing code, or making changes to this repository.

## Required context
- **ALWAYS read `/AI_REPO_GUIDE.md` first** - It's the comprehensive, living documentation of this repository
- The AI_REPO_GUIDE.md contains detailed architecture, data flows, troubleshooting, and gotchas
- If AI_REPO_GUIDE.md conflicts with other documentation, prefer the most recently updated source and note the discrepancy
- This file (copilot-instructions.md) provides Copilot-specific guidance; AI_REPO_GUIDE.md provides detailed technical reference

## Repository Overview

**Neon Pong** is a modern, synthwave-styled HTML5 Pong game with touch controls, power-ups, and multiplayer support. It's built entirely with vanilla JavaScript (no frameworks), HTML5 Canvas for rendering, and Web Audio API for sound effects.

**Repository Type**: Static web application (HTML5/JavaScript game) with optional Node.js multiplayer server  
**Primary Languages**: JavaScript (ES6), HTML5, CSS3  
**Size**: ~5,500 lines of code across 9 client JS files, 3 CSS files, 1 HTML file, 2 server JS files  
**Target Runtime**: Modern web browsers (Chrome 80+, Firefox 75+, Safari 13+)  
**Deployment**: Vercel (primary), GitHub Pages (secondary)

## Architecture & Project Structure

### Core Game Files (Root Directory)
```
/home/runner/work/pong6/pong6/
├── index.html              # Main HTML file with all game screens/menus (420 lines)
├── manifest.json           # PWA manifest for mobile installation
├── service-worker.js       # Service worker for offline support (not counted)
├── css/
│   ├── main.css           # Main styles with CSS custom properties (879 lines)
│   ├── animations.css     # CSS animations and effects (414 lines)
│   └── responsive.css     # Mobile/tablet responsive styles (412 lines)
├── js/
│   ├── game.js            # Main game controller and state management (1,089 lines)
│   ├── renderer.js        # Canvas rendering and visual effects (620 lines)
│   ├── controls.js        # Input handling (keyboard, touch, mouse) (347 lines)
│   ├── ai.js              # AI opponent with 4 difficulty levels (241 lines)
│   ├── powerups.js        # Power-up system (8 different power-ups) (364 lines)
│   ├── audio.js           # Web Audio API sound generation (464 lines)
│   ├── leaderboard.js     # Local stats tracking with localStorage (371 lines)
│   ├── multiplayer.js     # Online multiplayer client (Socket.io) (434 lines)
│   └── utils.js           # Utility functions (310 lines)
└── assets/
    └── images/icons/
        └── icon-192x192.svg  # PWA icon
```

### Multiplayer Server (Optional)
```
server/
├── index.js               # Express + Socket.io server (373 lines)
├── gameRoom.js           # Game room management class (174 lines)
├── package.json          # Server dependencies
└── package-lock.json     # Lock file (auto-generated)
```

### Key Architectural Elements

1. **Game State Management**: All game state is in `js/game.js` - the central controller that coordinates all modules
2. **Module Pattern**: Each JavaScript file is a self-contained module (object with methods), no module bundler needed
3. **Canvas Rendering**: `js/renderer.js` handles all drawing operations with neon glow effects and particle systems
4. **No Build Process**: Pure vanilla JavaScript - no compilation, transpilation, or bundling required
5. **PWA Support**: Service worker enables offline play and mobile installation
6. **Web Audio API**: All sound effects are generated programmatically (no audio files)

## Build, Test & Validation

### Important: No Build System
This project has **NO build process, NO test suite, and NO linting configuration**. Changes can be tested immediately by serving the files.

### Running the Game for Development

#### Option 1: Python HTTP Server (Recommended for Quick Testing)
```bash
cd /home/runner/work/pong6/pong6
python3 -m http.server 8080
```
- **Works immediately** - Python 3.12.3 is available
- Opens game at `http://localhost:8080`
- Supports service worker for PWA features
- **Use this for testing client-side changes**

#### Option 2: Node.js Server (Required for Multiplayer Testing)
```bash
cd /home/runner/work/pong6/pong6/server
npm install        # First time only - installs dependencies (takes ~5 seconds)
npm start          # Starts server on port 3000
```
- **Node.js Version**: v20.19.6
- **npm Version**: 10.8.2
- **Dependencies**: express@^4.18.2, socket.io@^4.7.2
- Server also serves static files from parent directory
- Opens game at `http://localhost:3000`
- **Required for testing online multiplayer features**

#### Option 3: npx serve (Alternative Static Server)
```bash
cd /home/runner/work/pong6/pong6
npx serve .        # Downloads and runs serve package
```

#### Option 4: PHP Server
```bash
cd /home/runner/work/pong6/pong6
php -S localhost:8080
```

### Testing Your Changes

**Manual Testing Only** - There are no automated tests. Test changes by:

1. **For JavaScript/HTML/CSS changes**:
   - Start Python HTTP server: `python3 -m http.server 8080`
   - Open browser to `http://localhost:8080`
   - Navigate to the affected feature in game
   - Test both desktop (keyboard) and mobile (touch) controls if relevant

2. **For multiplayer/server changes**:
   - Start Node server: `cd server && npm start`
   - Open two browser tabs to `http://localhost:3000`
   - Test room creation, joining, and gameplay
   - Check server console for errors

3. **Common test scenarios**:
   - Single player: Play against AI on different difficulties
   - Local multiplayer: Test two players on same device
   - Power-ups: Start "Chaos Mode" to see frequent power-ups
   - Mobile: Test touch controls (use browser dev tools mobile emulation)
   - Settings: Change volume, visual effects, control sensitivity

### Known Issues & Workarounds

1. **TODO in game.js line 321**: Quick match feature is not fully implemented (marked with `// TODO: Implement quick match`)
2. **Service Worker Cache**: When testing changes, you may need to hard refresh (Ctrl+F5 or Cmd+Shift+R) to bypass service worker cache
3. **No Error Checking**: The codebase has minimal error handling - check browser console for JavaScript errors

## GitHub Workflows & CI

The repository has the following GitHub Actions workflows:

1. **pages-build-deployment** - Automatically deploys to GitHub Pages (secondary deployment) when changes are pushed to main branch
2. **copilot-pull-request-reviewer** - Automated PR reviews
3. **copilot-swe-agent** - Copilot coding agent

**Note**: The primary deployment target is Vercel. The pages-build-deployment workflow maintains a secondary deployment on GitHub Pages.

**No CI builds or tests** - The workflows only handle deployment. There are no build steps, test runs, or linting checks to pass.

## Key Implementation Details

### Game Structure
- **Screen Flow**: Loading → Title → Main Menu → Mode Select → Difficulty Select → Game Type Select → Game → Game Over
- **State Machine**: Game state controlled by `Game.state` property: 'loading', 'menu', 'playing', 'paused', 'gameover'
- **Game Loop**: requestAnimationFrame-based loop in `game.js` with delta time for consistent physics

### Power-up System
Located in `js/powerups.js`, 8 types available:
- `bigPaddle` - Increases paddle size 50% for 10s
- `smallEnemy` - Shrinks opponent paddle for 10s  
- `speedBall` - Ball moves 50% faster until score
- `slowBall` - Ball moves 50% slower for 8s
- `multiBall` - Spawns 2 additional balls
- `fireball` - Ball passes through paddle once
- `shield` - Blocks one goal
- `reverse` - Inverts opponent controls for 8s

### AI System
4 difficulty levels in `js/ai.js`:
- **Easy**: 300ms reaction, 200 max speed, 50% accuracy, 10% mistakes
- **Medium**: 150ms reaction, 350 max speed, 75% accuracy, 5% mistakes
- **Hard**: 80ms reaction, 500 max speed, 90% accuracy, 2% mistakes
- **Impossible**: 20ms reaction, 800 max speed, 98% accuracy, 0% mistakes

### Audio System
All sounds generated with Web Audio API in `js/audio.js`:
- No external audio files
- `AudioManager.init()` must be called after user interaction (browser autoplay policy)
- Volume controls for master, music, and SFX

### Local Storage
Game saves to `localStorage`:
- Player stats (wins, losses, play time)
- Settings (volume, effects toggles, sensitivity)
- Leaderboard data
- Key: `neonPongStats`, `neonPongSettings`

## File References

### Configuration Files
- `manifest.json` - PWA configuration for mobile installation
- `server/package.json` - Server dependencies (express, socket.io, nodemon)
- **No** tsconfig.json, .eslintrc, .prettierrc, webpack.config.js, etc.

### Important Code Sections

**Game Initialization** (`js/game.js` lines 69-102):
```javascript
init() {
    Renderer.init('game-canvas');
    Controls.init();
    AudioManager.init();
    Leaderboard.init();
    this.loadSettings();
    this.setupEventListeners();
    // ...
}
```

**Canvas Rendering** (`js/renderer.js`):
- Uses 2D context with composite operations for glow effects
- Particle system for visual effects
- 60 FPS target with requestAnimationFrame

**Touch Controls** (`js/controls.js`):
- Drag-based paddle control
- Split-screen for local multiplayer
- Handles both touch and mouse events

## Making Changes

### Common Scenarios

**Adding a new power-up**: Edit `js/powerups.js` → Add entry to `PowerUps.types` object with id, name, icon, color, duration, effect, apply(), remove() methods

**Adjusting game physics**: Edit `js/game.js` → Modify `settings` object (lines 47-56) → Change paddleSpeed, ballSpeed, etc.

**Styling changes**: Edit `css/main.css` → Use CSS custom properties in `:root` for colors (--neon-pink, --neon-cyan, etc.)

**Adding game modes**: Edit `js/game.js` → Add to `gameType` options → Update HTML in `index.html` game mode select screen

**Server/multiplayer**: Edit `server/index.js` or `server/gameRoom.js` → Restart server with `npm start`

### Style Guidelines

- **No comments unless explaining complex logic** - Code is generally self-documenting
- **Consistent naming**: camelCase for variables/functions, PascalCase for module objects
- **ES6 syntax**: Use const/let, arrow functions, template literals
- **No semicolons** - Codebase uses ASI (Automatic Semicolon Insertion) inconsistently

## Do's and Don'ts

### ✅ DO:
- **Always read `/AI_REPO_GUIDE.md`** before making any changes
- **Test all changes manually** by running the game in browser (no automated tests exist)
- **Use Python HTTP server** (`python3 -m http.server 8080`) for testing client-side changes
- **Check browser console** (F12) for JavaScript errors after changes
- **Hard refresh** (Ctrl+F5 / Cmd+Shift+R) to bypass service worker cache when testing
- **Follow existing code style** - ES6 syntax, camelCase variables, PascalCase module objects
- **Keep changes minimal** - this is a vanilla JS project, avoid adding complexity
- **Test on both desktop and mobile** (use browser dev tools for mobile emulation)
- **Preserve the zero-build philosophy** - no webpack, babel, or build tools should be added

### ❌ DON'T:
- **Don't add build systems** - No webpack, babel, rollup, or bundlers (violates project philosophy)
- **Don't add test frameworks** - Manual testing in browser is the established workflow
- **Don't add linting tools** - No ESLint, Prettier, or similar tools (not part of project)
- **Don't use ES6 modules** - Code uses global objects loaded via script tags (see index.html)
- **Don't add npm dependencies for client code** - Client is pure vanilla JS with zero dependencies
- **Don't modify service-worker.js cache** without understanding offline implications
- **Don't remove manual testing steps** - They're essential with no automated tests
- **Don't force-push or rewrite history** - Maintain clean, linear commit history
- **Don't add TypeScript** - Project is intentionally vanilla JavaScript
- **Don't break backwards compatibility** - Browser support goes back to Chrome 80+, Firefox 75+, Safari 13+

## Working with Issues

### Best Tasks for Copilot
This project is well-suited for Copilot to work on:
- **Bug fixes** in game logic, rendering, or controls
- **Adding new power-ups** (well-defined structure in `js/powerups.js`)
- **UI improvements** (CSS changes, new screens)
- **Documentation updates** (README, comments, AI_REPO_GUIDE.md)
- **AI difficulty adjustments** (tuning parameters in `js/ai.js`)
- **Visual effects** (CSS animations, canvas particles)
- **Audio improvements** (Web Audio API in `js/audio.js`)

### Tasks Requiring Extra Care
- **Multiplayer features** (requires server testing with two browser tabs)
- **Service worker changes** (affects offline caching behavior)
- **Physics changes** (requires extensive gameplay testing)
- **Touch controls** (needs mobile device or emulation testing)

### Task Requirements
When working on issues, ensure:
- **Clear acceptance criteria** - What defines "done" for this issue?
- **Affected files identified** - Which modules need changes?
- **Testing strategy** - How to verify the changes work?
- **Edge cases considered** - Mobile vs desktop, different game modes, power-ups active, etc.

## Summary

This is a **zero-build, zero-test, pure vanilla JavaScript** game that runs directly in browsers. Test by serving files with any HTTP server. No compilation, no npm scripts (except for optional multiplayer server), no test framework. The main complexity is in the game logic and Canvas rendering, not in build tooling.

**Philosophy**: Keep it simple. No frameworks, no build tools, no complexity. Just HTML, CSS, and JavaScript that runs directly in the browser.

**Always start testing with**: `python3 -m http.server 8080` (fastest way to verify changes)  
**For multiplayer**: `cd server && npm install && npm start` (first time: ~5 seconds for npm install)

**Remember**: Every change must be manually tested in a browser. Check the console for errors, test different game modes, and verify on both desktop and mobile viewports.
