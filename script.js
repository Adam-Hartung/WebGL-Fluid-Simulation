/*
MIT License

Copyright (c) 2017 Pavel Dobryakov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict';

// Mobile promo section

const promoPopup = document.getElementsByClassName('promo')[0];
const promoPopupClose = document.getElementsByClassName('promo-close')[0];

if (isMobile()) {
    setTimeout(() => {
        promoPopup.style.display = 'table';
    }, 20000);
}

promoPopupClose.addEventListener('click', e => {
    promoPopup.style.display = 'none';
});

const appleLink = document.getElementById('apple_link');
appleLink.addEventListener('click', e => {
    ga('send', 'event', 'link promo', 'app');
    window.open('https://apps.apple.com/us/app/fluid-simulation/id1443124993');
});

const googleLink = document.getElementById('google_link');
googleLink.addEventListener('click', e => {
    ga('send', 'event', 'link promo', 'app');
    window.open('https://play.google.com/store/apps/details?id=games.paveldogreat.fluidsimfree');
});

// Simulation section

const canvas = document.getElementsByTagName('canvas')[0];
resizeCanvas();

let config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    COLOR_PRESET: 'Random',
    INTERACTION_MODE: 'Normal',
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
    CONTINUOUS_SPLATS: false
};

// Store default configuration values for reset functionality
const defaultConfig = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    CAPTURE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    COLOR_PRESET: 'Random',
    INTERACTION_MODE: 'Normal',
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
    CONTINUOUS_SPLATS: false
};

function pointerPrototype () {
    this.id = -1;
    this.texcoordX = 0;
    this.texcoordY = 0;
    this.prevTexcoordX = 0;
    this.prevTexcoordY = 0;
    this.posX = 0;
    this.posY = 0;
    this.prevPosX = 0;
    this.prevPosY = 0;
    this.deltaX = 0;
    this.deltaY = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
}

let pointers = [];
let splatStack = [];
pointers.push(new pointerPrototype());

const { gl, ext } = getWebGLContext(canvas);

if (isMobile()) {
    config.DYE_RESOLUTION = 512;
}
if (!ext.supportLinearFiltering) {
    config.DYE_RESOLUTION = 512;
    config.SHADING = false;
    config.BLOOM = false;
    config.SUNRAYS = false;
}

startGUI();

function getWebGLContext (canvas) {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

    let gl = canvas.getContext('webgl2', params);
    const isWebGL2 = !!gl;
    if (!isWebGL2)
        gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);

    let halfFloat;
    let supportLinearFiltering;
    if (isWebGL2) {
        gl.getExtension('EXT_color_buffer_float');
        supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
    } else {
        halfFloat = gl.getExtension('OES_texture_half_float');
        supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    let formatRGBA;
    let formatRG;
    let formatR;

    if (isWebGL2)
    {
        formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
    }
    else
    {
        formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
        formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
    }

    ga('send', 'event', isWebGL2 ? 'webgl2' : 'webgl', formatRGBA == null ? 'not supported' : 'supported');

    return {
        gl,
        ext: {
            formatRGBA,
            formatRG,
            formatR,
            halfFloatTexType,
            supportLinearFiltering
        }
    };
}

function getSupportedFormat (gl, internalFormat, format, type)
{
    if (!supportRenderTextureFormat(gl, internalFormat, format, type))
    {
        switch (internalFormat)
        {
            case gl.R16F:
                return getSupportedFormat(gl, gl.RG16F, gl.RG, type);
            case gl.RG16F:
                return getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, type);
            default:
                return null;
        }
    }

    return {
        internalFormat,
        format
    }
}

function supportRenderTextureFormat (gl, internalFormat, format, type) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    return status == gl.FRAMEBUFFER_COMPLETE;
}

function startGUI () {
    // Add help panel CSS styles and GUI customization
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .help-button {
            position: fixed;
            top: 10px;
            left: 10px;
            background-color: rgba(40, 44, 52, 0.7);
            color: #ccc;
            border: none;
            border-radius: 4px;
            padding: 5px 12px;
            font-size: 12px;
            font-weight: normal;
            cursor: pointer;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            z-index: 10000;
            transition: background-color 0.2s, color 0.2s, opacity 0.3s;
        }
        
        .help-button:hover {
            background-color: rgba(60, 66, 78, 0.9);
            color: white;
        }
        
        .help-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 80%;
            width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10001;
            font-family: Arial, sans-serif;
            display: none;
            box-shadow: 0 0 30px rgba(0,0,0,0.5);
        }
        
        .help-panel h2 {
            color: #FF9800;
            border-bottom: 1px solid #333;
            padding-bottom: 8px;
            margin-top: 20px;
            margin-bottom: 10px;
        }
        
        .help-panel h3 {
            color: #2FA1D6;
            margin: 15px 0 5px 0;
        }
        
        .help-panel p {
            margin: 5px 0 15px 0;
            line-height: 1.5;
        }
        
        .help-close {
            position: absolute;
            top: 10px;
            right: 15px;
            color: #999;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
        }
        
        .help-close:hover {
            color: white;
        }
        
        .help-title {
            font-size: 24px;
            text-align: center;
            margin-bottom: 20px;
            color: white;
        }
        
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            z-index: 10000;
            display: none;
        }
        
        /* Custom toggle button styles */
        .dg.main.a {
            margin-right: 0 !important;
        }
        
        .dg.ac {
            position: fixed;
            top: 0;
            right: 0;
            z-index: 100;
        }
        
        /* Hide the default open/close text */
        .close-button {
            display: none !important;
        }
        
        /* Custom toggle button */
        .gui-toggle-button {
            position: fixed;
            top: 10px;
            right: 10px;
            width: 34px;
            height: 34px;
            background-color: rgba(40, 44, 52, 0.7);
            border-radius: 4px;
            cursor: pointer;
            z-index: 101;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            display: flex;
            justify-content: center;
            align-items: center;
            transition: background-color 0.2s;
        }
        
        .gui-toggle-button:hover {
            background-color: rgba(60, 66, 78, 0.9);
        }
        
        .gui-toggle-button svg {
            width: 20px;
            height: 20px;
            fill: #ccc;
            transition: fill 0.2s;
        }
        
        .gui-toggle-button:hover svg {
            fill: white;
        }
    `;
    document.head.appendChild(styleElement);

    // Create overlay element for modal background
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    // Create help button
    const helpButton = document.createElement('button');
    helpButton.className = 'help-button';
    helpButton.textContent = 'Info';
    document.body.appendChild(helpButton);

    // Create help panel with all explanations
    const helpPanel = document.createElement('div');
    helpPanel.className = 'help-panel';
    
    const helpTitle = document.createElement('div');
    helpTitle.className = 'help-title';
    helpTitle.textContent = 'WebGL Fluid Simulation Help';
    helpPanel.appendChild(helpTitle);
    
    const helpCloseBtn = document.createElement('div');
    helpCloseBtn.className = 'help-close';
    helpCloseBtn.innerHTML = '&times;';
    helpPanel.appendChild(helpCloseBtn);
    
    // Add content div for the help content
    const helpContent = document.createElement('div');
    helpPanel.appendChild(helpContent);
    
    // Add all the help content
    helpContent.innerHTML = `
        <h2>Display Settings</h2>

        <h3>Quality</h3>
        <p>Controls the resolution of the fluid. Higher quality looks better but requires more processing power.</p>

        <h3>Shading</h3>
        <p>Enables 3D-like shading effect that adds depth to the fluid simulation.</p>

        <h3>Colorful Mode</h3>
        <p>Automatically changes colors over time for a more dynamic visual effect.</p>
        
        <h3>Color Scheme</h3>
        <p>Selects from predefined color palettes for the fluid simulation:</p>
        <p>• <strong>Random</strong> - Complete range of random colors across the spectrum</p>
        <p>• <strong>Ocean</strong> - Cool blues and teals for a calming underwater effect</p>
        <p>• <strong>Fire</strong> - Warm reds, oranges and yellows for a dynamic flame-like effect</p>
        <p>• <strong>Sunset</strong> - Vibrant oranges, pinks and purples reminiscent of dusk skies</p>
        <p>• <strong>Neon</strong> - Ultra-bright, saturated colors for a glowing cyberpunk aesthetic</p>
        <p>• <strong>Forest</strong> - Natural greens and earthy browns for an organic feel</p>
        <p>• <strong>Galaxy</strong> - Deep space-inspired purples, blues and pinks for a cosmic effect</p>

        <h2>Interaction Settings</h2>
        
        <h3>Interaction Mode</h3>
        <p>Changes how your mouse or touch interacts with the fluid:</p>
        <p>• <strong>Normal</strong> - Standard fluid movement that follows your cursor direction. Drag in any direction to create flowing patterns.</p>
        <p>• <strong>Vortex</strong> - Creates gentle swirling patterns around your cursor. This mode produces subtle rotational effects that follow your movement without overwhelming the display with brightness.</p>
        
        <h3>Special Effects (Double-Click)</h3>
        <p>Double-click anywhere on the simulation to create special effects:</p>
        <p>• <strong>Normal</strong> - Creates an explosion effect with fluid bursting outward in all directions.</p>
        <p>• <strong>Vortex</strong> - Creates a giant multi-colored vortex that adapts to the currently selected theme. The vortex forms a dense spiral with intense color transitions that follow your theme's palette, creating a spectacular and dynamic visual effect.</p>
        
        <h3>Splat Radius</h3>
        <p>Controls the size of fluid splats when interacting with the simulation.</p>

        <h3>Splat Force</h3>
        <p>Controls how powerful each splat is. Higher values create stronger fluid movements.</p>

        <h2>Simulation Settings</h2>
        
        <h3>Simulation Resolution</h3>
        <p>Controls the precision of the fluid physics simulation. Higher values give more accurate physics but require more processing power.</p>

        <h3>Density Diffusion</h3>
        <p>Controls how quickly the fluid color fades away. Higher values make the fluid disappear faster.</p>
        
        <h3>Velocity Diffusion</h3>
        <p>Controls how quickly the fluid movement slows down. Higher values create more viscous fluid that stops moving sooner.</p>
        
        <h3>Pressure</h3>
        <p>Controls how strongly the fluid maintains incompressibility. Higher values create more energetic fluid interactions.</p>

        <h3>Pressure Iterations</h3>
        <p>Number of iterations for pressure solving. Higher values create more accurate physics at the cost of performance.</p>

        <h3>Vorticity</h3>
        <p>Controls the amount of swirling and turbulence in the fluid. Higher values create more complex vortices and curls.</p>

        <h2>Visual Effects</h2>

        <h3>Bloom Effect</h3>
        <p>Adds a glow effect to bright areas of the simulation, creating a more vibrant appearance.</p>

        <h3>Bloom Intensity</h3>
        <p>Controls the strength of the bloom effect. Higher values create a more pronounced glow.</p>

        <h3>Bloom Threshold</h3>
        <p>Controls which areas will glow. Lower values make more of the fluid glow.</p>

        <h3>Sunrays Effect</h3>
        <p>Creates light ray effects that emanate from bright areas of the fluid, similar to crepuscular rays.</p>
        
        <h3>Sunrays Weight</h3>
        <p>Controls the intensity of the sunrays effect. Higher values create more pronounced light rays.</p>

        <h2>Tips</h2>
        <p>• Click and drag on the simulation to create fluid movements</p>
        <p>• Double-click to create special effects based on your selected interaction mode</p>
        <p>• Press SPACE to create random splats</p>
        <p>• Press P to pause/resume the simulation</p>
        <p>• Higher quality settings may slow down performance on older devices</p>
    `;
    
    document.body.appendChild(helpPanel);
    
    // Event listeners for help panel
    helpButton.addEventListener('click', () => {
        overlay.style.display = 'block';
        helpPanel.style.display = 'block';
    });
    
    helpCloseBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
        helpPanel.style.display = 'none';
    });
    
    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        helpPanel.style.display = 'none';
    });

    var gui = new dat.GUI({ width: 300 });
    
    // Create main folders for better organization
    let displayFolder = gui.addFolder('Display Settings');
    let simulationFolder = gui.addFolder('Simulation Settings');
    let interactionFolder = gui.addFolder('Interaction Settings'); // New folder for interaction options
    let effectsFolder = gui.addFolder('Visual Effects');
    
    // Display settings with extended quality options
    displayFolder.add(config, 'DYE_RESOLUTION', { 
        'Ultra': 2048, 
        'Very High': 1536, 
        'High': 1024, 
        'Medium': 512, 
        'Low': 256, 
        'Very Low': 128 
    }).name('Quality').onFinishChange(initFramebuffers);
    
    displayFolder.add(config, 'SHADING').name('Shading').onFinishChange(updateKeywords);
    displayFolder.add(config, 'COLORFUL').name('Colorful Mode');
    
    // Add color preset selection
    displayFolder.add(config, 'COLOR_PRESET', {
        'Random': 'Random',
        'Ocean': 'Ocean',
        'Fire': 'Fire', 
        'Sunset': 'Sunset',
        'Neon': 'Neon',
        'Forest': 'Forest',
        'Galaxy': 'Galaxy'
    }).name('Color Scheme');
    
    // Simulation settings with extended resolution options
    simulationFolder.add(config, 'SIM_RESOLUTION', { 
        '512': 512, 
        '384': 384, 
        '256': 256, 
        '128': 128, 
        '64': 64, 
        '32': 32 
    }).name('Simulation Resolution').onFinishChange(initFramebuffers);
    
    simulationFolder.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('Density Diffusion');
    simulationFolder.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('Velocity Diffusion');
    simulationFolder.add(config, 'PRESSURE', 0.0, 1.0).name('Pressure');
    simulationFolder.add(config, 'PRESSURE_ITERATIONS', 1, 50).name('Pressure Iterations').step(1);
    simulationFolder.add(config, 'CURL', 0, 50).name('Vorticity').step(1);
    simulationFolder.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('Splat Radius');
    simulationFolder.add(config, 'SPLAT_FORCE', 1000, 10000).name('Splat Force').step(100);
    
    // Interactive controls - top level for easy access
    gui.add(config, 'PAUSED').name('PAUSE Simulation').listen();
    
    // Add Random Splats button with enhanced styling
    const randomSplatButton = gui.add({ fun: () => {
        splatStack.push(parseInt(Math.random() * 20) + 5);
    } }, 'fun').name('Random Splats!');
    
    // Add Continuous Splats toggle with better name
    gui.add(config, 'CONTINUOUS_SPLATS').name('Auto-Generate Splats').listen();
    
    // Add Randomize Settings button
    let randomizeButton = gui.add({ randomizeSettings: () => {
        // Define ranges for each parameter that can be randomized
        const paramRanges = {
            // Simulation parameters
            DENSITY_DISSIPATION: [0.5, 3.0],
            VELOCITY_DISSIPATION: [0.1, 2.0],
            PRESSURE: [0.2, 1.0],
            PRESSURE_ITERATIONS: [10, 40],
            CURL: [5, 45],
            
            // Interaction parameters (but not the reset/pause/etc. ones)
            SPLAT_RADIUS: [0.05, 0.9],
            SPLAT_FORCE: [2000, 9000],
            
            // Visual effects parameters
            BLOOM_INTENSITY: [0.3, 1.5],
            BLOOM_THRESHOLD: [0.1, 0.9],
            SUNRAYS_WEIGHT: [0.3, 1.0],
            
            // Other toggleable settings (randomize to either true or false)
            SHADING: [0, 1],
            COLORFUL: [0, 1],
            BLOOM: [0, 1],
            SUNRAYS: [0, 1]
        };
        
        // Random color scheme selection
        const colorSchemes = ['Random', 'Ocean', 'Fire', 'Sunset', 'Neon', 'Forest', 'Galaxy'];
        config.COLOR_PRESET = colorSchemes[Math.floor(Math.random() * colorSchemes.length)];
        
        // Randomize each parameter
        Object.keys(paramRanges).forEach(param => {
            const range = paramRanges[param];
            
            if (range.length === 2) {
                if (typeof config[param] === 'boolean') {
                    // For boolean values
                    config[param] = Math.random() < 0.5;
                } else {
                    // For numeric values
                    const min = range[0];
                    const max = range[1];
                    
                    // If the parameter is an integer (like PRESSURE_ITERATIONS)
                    if (Number.isInteger(config[param])) {
                        config[param] = Math.floor(Math.random() * (max - min + 1)) + min;
                    } else {
                        // For floating point values
                        config[param] = min + Math.random() * (max - min);
                    }
                }
            }
        });
        
        // Update GUI to reflect changes
        for (let i = 0; i < gui.__controllers.length; i++) {
            gui.__controllers[i].updateDisplay();
        }
        
        // Update folders
        for (let f in gui.__folders) {
            const folder = gui.__folders[f];
            for (let i = 0; i < folder.__controllers.length; i++) {
                folder.__controllers[i].updateDisplay();
            }
        }
        
        // Update keywords for shaders
        updateKeywords();
        
        console.log('Randomized simulation settings!');
    } }, 'randomizeSettings').name('Randomize settings');
    
    // Style the randomize button
    if (randomizeButton.domElement) {
        const randomizeLabel = randomizeButton.domElement.querySelector('.property-name');
        if (randomizeLabel) {
            randomizeLabel.style.fontWeight = 'bold';
            randomizeLabel.style.color = '#9C27B0';
            randomizeLabel.style.width = '100%';
            randomizeLabel.style.textAlign = 'center';
        }
    }
    
    // Add Reset button with improved positioning and naming
    let resetButton = gui.add({ resetAll: () => {
        // Reset all config values to defaults
        Object.keys(defaultConfig).forEach(key => {
            if (typeof defaultConfig[key] === 'object' && defaultConfig[key] !== null) {
                // Handle objects like BACK_COLOR
                Object.assign(config[key], defaultConfig[key]);
            } else {
                config[key] = defaultConfig[key];
            }
        });
        
        // Update GUI to reflect changes
        for (let i = 0; i < gui.__controllers.length; i++) {
            gui.__controllers[i].updateDisplay();
        }
        
        // Update folders (Bloom, Sunrays)
        for (let f in gui.__folders) {
            const folder = gui.__folders[f];
            for (let i = 0; i < folder.__controllers.length; i++) {
                folder.__controllers[i].updateDisplay();
            }
        }
        
        // Reinitialize framebuffers since resolution might have changed
        initFramebuffers();
        
        // Update keywords for shaders
        updateKeywords();
        
        // Show feedback that reset was successful
        console.log('All parameters reset to default values');
    } }, 'resetAll').name('RESET ALL SETTINGS');
    
    // Style the reset button more prominently
    if (resetButton.domElement) {
        const resetLabel = resetButton.domElement.querySelector('.property-name');
        if (resetLabel) {
            resetLabel.style.fontWeight = 'bold';
            resetLabel.style.color = '#FF5252';
            resetLabel.style.width = '100%';
            resetLabel.style.textAlign = 'center';
        }
    }
    
    // Improve styling for random splat button if possible
    if (randomSplatButton.domElement) {
        const splatLabel = randomSplatButton.domElement.querySelector('.property-name');
        if (splatLabel) {
            splatLabel.style.fontWeight = 'bold';
            splatLabel.style.color = '#4CAF50';
        }
    }

    // Add interaction mode selector to the new interaction folder
    interactionFolder.add(config, 'INTERACTION_MODE', {
        'Normal': 'Normal',
        'Vortex': 'Vortex'
    }).name('Interaction Mode').onChange(updateKeywords);
    
    // Move some existing controls to the interaction folder
    interactionFolder.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('Splat Radius');
    interactionFolder.add(config, 'SPLAT_FORCE', 1000, 10000).name('Splat Force').step(100);
    
    // Remove these from simulation folder since they're now in interaction folder
    // simulationFolder.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('Splat Radius');
    // simulationFolder.add(config, 'SPLAT_FORCE', 1000, 10000).name('Splat Force').step(100);
    
    // Effects subfolders
    let bloomFolder = effectsFolder.addFolder('Bloom Effect');
    bloomFolder.add(config, 'BLOOM').name('Enable Bloom').onFinishChange(updateKeywords);
    bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('Intensity');
    bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('Threshold');

    let sunraysFolder = effectsFolder.addFolder('Sunrays Effect');
    sunraysFolder.add(config, 'SUNRAYS').name('Enable Sunrays').onFinishChange(updateKeywords);
    sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('Weight');

    // Open the main folders by default for better discoverability
    displayFolder.open();
    interactionFolder.open(); // Open interaction folder by default
    effectsFolder.open();
    
    // Create custom toggle button with icon
    const toggleButton = document.createElement('div');
    toggleButton.className = 'gui-toggle-button';
    toggleButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z"/>
        </svg>
    `;
    document.body.appendChild(toggleButton);
    
    // Add functionality to custom toggle button
    toggleButton.addEventListener('click', () => {
        gui.closed ? gui.open() : gui.close();
    });
    
    // Function to handle GUI open/close state
    const updateGuiState = () => {
        const isOpen = !gui.closed;
        
        // Show/hide info button based on GUI state
        helpButton.style.opacity = isOpen ? '1' : '0';
        helpButton.style.pointerEvents = isOpen ? 'auto' : 'none';
        
        // Update toggle button position if needed
        toggleButton.style.right = isOpen ? '310px' : '10px';
        
        // Hide the default close button if it exists
        const closeButton = document.querySelector('.dg .close-button');
        if (closeButton) {
            closeButton.style.display = 'none';
        }
    };
    
    // Initialize GUI state
    setTimeout(updateGuiState, 100); // Short delay to ensure DOM is ready
    
    // Add observer to detect when GUI is opened/closed
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                updateGuiState();
            }
        });
    });
    
    // Start observing the GUI element
    const guiElement = document.querySelector('.dg.main');
    if (guiElement) {
        observer.observe(guiElement, { attributes: true });
    }
    
    // Add GUI close/open events
    gui.onResize = () => {
        updateGuiState();
    };

    if (isMobile())
        gui.close();
        
    // Final update to ensure correct initial state
    setTimeout(updateGuiState, 500);

    // After all other folders are created
    
    // Audio folder code has been removed and stored in backups/audio.js
}

function isMobile () {
    return /Mobi|Android/i.test(navigator.userAgent);
}

function captureScreenshot () {
    let res = getResolution(config.CAPTURE_RESOLUTION);
    let target = createFBO(res.width, res.height, ext.formatRGBA.internalFormat, ext.formatRGBA.format, ext.halfFloatTexType, gl.NEAREST);
    render(target);

    let texture = framebufferToTexture(target);
    texture = normalizeTexture(texture, target.width, target.height);

    let captureCanvas = textureToCanvas(texture, target.width, target.height);
    let datauri = captureCanvas.toDataURL();
    downloadURI('fluid.png', datauri);
    URL.revokeObjectURL(datauri);
}

function framebufferToTexture (target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    let length = target.width * target.height * 4;
    let texture = new Float32Array(length);
    gl.readPixels(0, 0, target.width, target.height, gl.RGBA, gl.FLOAT, texture);
    return texture;
}

function normalizeTexture (texture, width, height) {
    let result = new Uint8Array(texture.length);
    let id = 0;
    for (let i = height - 1; i >= 0; i--) {
        for (let j = 0; j < width; j++) {
            let nid = i * width * 4 + j * 4;
            result[nid + 0] = clamp01(texture[id + 0]) * 255;
            result[nid + 1] = clamp01(texture[id + 1]) * 255;
            result[nid + 2] = clamp01(texture[id + 2]) * 255;
            result[nid + 3] = clamp01(texture[id + 3]) * 255;
            id += 4;
        }
    }
    return result;
}

function clamp01 (input) {
    return Math.min(Math.max(input, 0), 1);
}

function textureToCanvas (texture, width, height) {
    let captureCanvas = document.createElement('canvas');
    let ctx = captureCanvas.getContext('2d');
    captureCanvas.width = width;
    captureCanvas.height = height;

    let imageData = ctx.createImageData(width, height);
    imageData.data.set(texture);
    ctx.putImageData(imageData, 0, 0);

    return captureCanvas;
}

function downloadURI (filename, uri) {
    let link = document.createElement('a');
    link.download = filename;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

class Material {
    constructor (vertexShader, fragmentShaderSource) {
        this.vertexShader = vertexShader;
        this.fragmentShaderSource = fragmentShaderSource;
        this.programs = [];
        this.activeProgram = null;
        this.uniforms = [];
    }

    setKeywords (keywords) {
        let hash = 0;
        for (let i = 0; i < keywords.length; i++)
            hash += hashCode(keywords[i]);

        let program = this.programs[hash];
        if (program == null)
        {
            let fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
            program = createProgram(this.vertexShader, fragmentShader);
            this.programs[hash] = program;
        }

        if (program == this.activeProgram) return;

        this.uniforms = getUniforms(program);
        this.activeProgram = program;
    }

    bind () {
        gl.useProgram(this.activeProgram);
    }
}

class Program {
    constructor (vertexShader, fragmentShader) {
        this.uniforms = {};
        this.program = createProgram(vertexShader, fragmentShader);
        this.uniforms = getUniforms(this.program);
    }

    bind () {
        gl.useProgram(this.program);
    }
}

function createProgram (vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        console.trace(gl.getProgramInfoLog(program));

    return program;
}

function getUniforms (program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniformName = gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}

function compileShader (type, source, keywords) {
    source = addKeywords(source, keywords);

    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        console.trace(gl.getShaderInfoLog(shader));

    return shader;
};

function addKeywords (source, keywords) {
    if (keywords == null) return source;
    let keywordsString = '';
    keywords.forEach(keyword => {
        keywordsString += '#define ' + keyword + '\n';
    });
    return keywordsString + source;
}

const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`);

const blurVertexShader = compileShader(gl.VERTEX_SHADER, `
    precision highp float;

    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform vec2 texelSize;

    void main () {
        vUv = aPosition * 0.5 + 0.5;
        float offset = 1.33333333;
        vL = vUv - texelSize * offset;
        vR = vUv + texelSize * offset;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`);

const blurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = texture2D(uTexture, vUv) * 0.29411764;
        sum += texture2D(uTexture, vL) * 0.35294117;
        sum += texture2D(uTexture, vR) * 0.35294117;
        gl_FragColor = sum;
    }
`);

const copyShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        gl_FragColor = texture2D(uTexture, vUv);
    }
`);

const clearShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;

    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`);

const colorShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;

    uniform vec4 color;

    void main () {
        gl_FragColor = color;
    }
`);

const checkerboardShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;

    #define SCALE 25.0

    void main () {
        vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
        float v = mod(uv.x + uv.y, 2.0);
        v = v * 0.1 + 0.8;
        gl_FragColor = vec4(vec3(v), 1.0);
    }
`);

const displayShaderSource = `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform sampler2D uDithering;
    uniform vec2 ditherScale;
    uniform vec2 texelSize;

    vec3 linearToGamma (vec3 color) {
        color = max(color, vec3(0));
        return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
    }

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;

    #ifdef SHADING
        vec3 lc = texture2D(uTexture, vL).rgb;
        vec3 rc = texture2D(uTexture, vR).rgb;
        vec3 tc = texture2D(uTexture, vT).rgb;
        vec3 bc = texture2D(uTexture, vB).rgb;

        float dx = length(rc) - length(lc);
        float dy = length(tc) - length(bc);

        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);

        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        c *= diffuse;
    #endif

    #ifdef BLOOM
        vec3 bloom = texture2D(uBloom, vUv).rgb;
    #endif

    #ifdef SUNRAYS
        float sunrays = texture2D(uSunrays, vUv).r;
        c *= sunrays;
    #ifdef BLOOM
        bloom *= sunrays;
    #endif
    #endif

    #ifdef BLOOM
        float noise = texture2D(uDithering, vUv * ditherScale).r;
        noise = noise * 2.0 - 1.0;
        bloom += noise / 255.0;
        bloom = linearToGamma(bloom);
        c += bloom;
    #endif

        float a = max(c.r, max(c.g, c.b));
        gl_FragColor = vec4(c, a);
    }
`;

const bloomPrefilterShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;

    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`);

const bloomBlurShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`);

const bloomFinalShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;

    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`);

const sunraysMaskShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;

    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`);

const sunraysShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;

    #define ITERATIONS 16

    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;

        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;

        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;

        float color = texture2D(uTexture, vUv).a;

        for (int i = 0; i < ITERATIONS; i++)
        {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }

        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`);

const splatShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;

    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`);

const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;

    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;

        vec2 iuv = floor(st);
        vec2 fuv = fract(st);

        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }

    void main () {
    #ifdef MANUAL_FILTERING
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        vec4 result = bilerp(uSource, coord, dyeTexelSize);
    #else
        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
        vec4 result = texture2D(uSource, coord);
    #endif
        float decay = 1.0 + dissipation * dt;
        gl_FragColor = result / decay;
    }`,
    ext.supportLinearFiltering ? null : ['MANUAL_FILTERING']
);

const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;

        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }

        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`);

const curlShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`);

const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
    precision highp float;
    precision highp sampler2D;

    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;

    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;

        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;

        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity += force * dt;
        velocity = min(max(velocity, -1000.0), 1000.0);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`);

const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`);

const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
    precision mediump float;
    precision mediump sampler2D;

    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;

    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`);

const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (target, clear = false) => {
        if (target == null)
        {
            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        else
        {
            gl.viewport(0, 0, target.width, target.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
        }
        if (clear)
        {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
        // CHECK_FRAMEBUFFER_STATUS();
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
})();

function CHECK_FRAMEBUFFER_STATUS () {
    let status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE)
        console.trace("Framebuffer error: " + status);
}

let dye;
let velocity;
let divergence;
let curl;
let pressure;
let bloom;
let bloomFramebuffers = [];
let sunrays;
let sunraysTemp;

let ditheringTexture = createTextureAsync('LDR_LLL1_0.png');

const blurProgram            = new Program(blurVertexShader, blurShader);
const copyProgram            = new Program(baseVertexShader, copyShader);
const clearProgram           = new Program(baseVertexShader, clearShader);
const colorProgram           = new Program(baseVertexShader, colorShader);
const checkerboardProgram    = new Program(baseVertexShader, checkerboardShader);
const bloomPrefilterProgram  = new Program(baseVertexShader, bloomPrefilterShader);
const bloomBlurProgram       = new Program(baseVertexShader, bloomBlurShader);
const bloomFinalProgram      = new Program(baseVertexShader, bloomFinalShader);
const sunraysMaskProgram     = new Program(baseVertexShader, sunraysMaskShader);
const sunraysProgram         = new Program(baseVertexShader, sunraysShader);
const splatProgram           = new Program(baseVertexShader, splatShader);
const advectionProgram       = new Program(baseVertexShader, advectionShader);
const divergenceProgram      = new Program(baseVertexShader, divergenceShader);
const curlProgram            = new Program(baseVertexShader, curlShader);
const vorticityProgram       = new Program(baseVertexShader, vorticityShader);
const pressureProgram        = new Program(baseVertexShader, pressureShader);
const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);

const displayMaterial = new Material(baseVertexShader, displayShaderSource);

function initFramebuffers () {
    let simRes = getResolution(config.SIM_RESOLUTION);
    let dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba    = ext.formatRGBA;
    const rg      = ext.formatRG;
    const r       = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    gl.disable(gl.BLEND);

    if (dye == null)
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
    else
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null)
        velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
    else
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO      (simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    curl       = createFBO      (simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure   = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);

    initBloomFramebuffers();
    initSunraysFramebuffers();
}

function initBloomFramebuffers () {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++)
    {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}

function initSunraysFramebuffers () {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays     = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
    sunraysTemp = createFBO(res.width, res.height, r.internalFormat, r.format, texType, filtering);
}

function createFBO (w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    let texelSizeX = 1.0 / w;
    let texelSizeY = 1.0 / h;

    return {
        texture,
        fbo,
        width: w,
        height: h,
        texelSizeX,
        texelSizeY,
        attach (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

function createDoubleFBO (w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: fbo1.texelSizeX,
        texelSizeY: fbo1.texelSizeY,
        get read () {
            return fbo1;
        },
        set read (value) {
            fbo1 = value;
        },
        get write () {
            return fbo2;
        },
        set write (value) {
            fbo2 = value;
        },
        swap () {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    }
}

function resizeFBO (target, w, h, internalFormat, format, type, param) {
    let newFBO = createFBO(w, h, internalFormat, format, type, param);
    copyProgram.bind();
    gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
    blit(newFBO);
    return newFBO;
}

function resizeDoubleFBO (target, w, h, internalFormat, format, type, param) {
    if (target.width == w && target.height == h)
        return target;
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

function createTextureAsync (url) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255]));

    let obj = {
        texture,
        width: 1,
        height: 1,
        attach (id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };

    let image = new Image();
    image.onload = () => {
        obj.width = image.width;
        obj.height = image.height;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    };
    image.src = url;

    return obj;
}

function updateKeywords () {
    let displayKeywords = [];
    if (config.SHADING) displayKeywords.push("SHADING");
    if (config.BLOOM) displayKeywords.push("BLOOM");
    if (config.SUNRAYS) displayKeywords.push("SUNRAYS");
    displayMaterial.setKeywords(displayKeywords);
}

updateKeywords();
initFramebuffers();
multipleSplats(parseInt(Math.random() * 20) + 5);

let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;
let continuousSplatTimer = 0.0;
let nextSplatTime = 0.75 + Math.random() * 1.5; // Random time between 0.75-2.25 seconds
update();

function update () {
    const dt = calcDeltaTime();
    if (resizeCanvas())
        initFramebuffers();
    updateColors(dt);
    applyInputs();
    
    // Add continuous random splats and movement
    if (config.CONTINUOUS_SPLATS && !config.PAUSED) {
        continuousSplatTimer += dt;
        // Generate random splats at randomized intervals
        if (continuousSplatTimer >= nextSplatTime) {
            continuousSplatTimer = 0;
            // Set a new random time for the next splat
            nextSplatTime = 0.75 + Math.random() * 2.25; // Between 0.75-3.0 seconds
            
            // Add a random splat - with variability in amount
            const amount = parseInt(Math.random() * 3) + 1; // 1-3 splats
            
            // Create gentler splats with varied brightness
            const originalSplatRadius = config.SPLAT_RADIUS;
            
            // Adjust continuous splats based on interaction mode
            if (config.INTERACTION_MODE === 'Vortex') {
                // For vortex mode, create a central point for swirling motion
                const centerX = 0.3 + Math.random() * 0.4; // Bias toward center: 0.3-0.7
                const centerY = 0.3 + Math.random() * 0.4;
                const color = generateColor();
                
                // Reduce intensity for vortex mode
                switch (config.COLOR_PRESET) {
                    case 'Neon':
                        color.r *= 3.0 + Math.random() * 1.5; // Reduced intensity
                        color.g *= 3.0 + Math.random() * 1.5;
                        color.b *= 3.0 + Math.random() * 1.5;
                        break;
                    case 'Fire':
                        color.r *= 3.0 + Math.random() * 1.0;
                        color.g *= 2.5 + Math.random() * 1.0;
                        color.b *= 1.5 + Math.random() * 1.0;
                        break;
                    case 'Ocean':
                        color.r *= 1.5 + Math.random() * 1.0;
                        color.g *= 2.0 + Math.random() * 1.0;
                        color.b *= 3.0 + Math.random() * 1.0;
                        break;
                    case 'Galaxy':
                        color.r *= 2.0 + Math.random() * 1.0;
                        color.g *= 1.5 + Math.random() * 1.0;
                        color.b *= 3.0 + Math.random() * 1.5;
                        break;
                    default:
                        color.r *= 1.5 + Math.random() * 1.5;
                        color.g *= 1.5 + Math.random() * 1.5;
                        color.b *= 1.5 + Math.random() * 1.5;
                        break;
                }
                
                // Create a mini vortex effect
                const pointCount = 3 + Math.floor(Math.random() * 3); // 3-5 points
                const radius = 0.01 + Math.random() * 0.02; // Small radius
                const rotationStrength = 200 + Math.random() * 200; // Gentle rotation
                
                // Size adjustment for vortex points
                config.SPLAT_RADIUS = originalSplatRadius * (0.8 + Math.random() * 0.4);
                
                for (let j = 0; j < pointCount; j++) {
                    const angle = (j / pointCount) * Math.PI * 2 + Math.random() * 0.2;
                    const x = centerX + Math.cos(angle) * radius;
                    const y = centerY + Math.sin(angle) * radius;
                    
                    // Create tangential force for rotation
                    const dx = -Math.sin(angle) * rotationStrength;
                    const dy = Math.cos(angle) * rotationStrength;
                    
                    // Ensure the splat is within bounds
                    if (x > 0 && x < 1 && y > 0 && y < 1) {
                        splat(x, y, dx, dy, color);
                    }
                }
            } else {
                // Original normal mode behavior
            for (let i = 0; i < amount; i++) {
                const color = generateColor();
                    
                    // Apply color multipliers based on the selected color scheme
                    switch (config.COLOR_PRESET) {
                        case 'Neon':
                            // Neon colors should be extra bright
                            color.r *= 6.0 + Math.random() * 3.0; // Range: 6.0-9.0
                            color.g *= 6.0 + Math.random() * 3.0;
                            color.b *= 6.0 + Math.random() * 3.0;
                            break;
                        case 'Fire':
                            // Fire colors need extra red and orange intensity
                            color.r *= 6.0 + Math.random() * 2.0; // Range: 6.0-8.0
                            color.g *= 5.0 + Math.random() * 2.0; // Range: 5.0-7.0
                            color.b *= 3.0 + Math.random() * 2.0; // Range: 3.0-5.0
                            break;
                        case 'Ocean':
                            // Ocean colors need more blue intensity
                            color.r *= 3.0 + Math.random() * 2.0; // Range: 3.0-5.0
                            color.g *= 4.0 + Math.random() * 2.0; // Range: 4.0-6.0
                            color.b *= 6.0 + Math.random() * 2.0; // Range: 6.0-8.0
                            break;
                        case 'Galaxy':
                            // Galaxy needs more blue and purple intensity
                            color.r *= 4.0 + Math.random() * 2.0; // Range: 4.0-6.0
                            color.g *= 3.0 + Math.random() * 2.0; // Range: 3.0-5.0
                            color.b *= 6.0 + Math.random() * 3.0; // Range: 6.0-9.0
                            break;
                        default:
                            // Default multiplier for other color schemes
                // Slightly higher brightness for more impact, but still gentle
                            color.r *= 3.0 + Math.random() * 3.0; // Range: 3.0-6.0
                            color.g *= 3.0 + Math.random() * 3.0;
                            color.b *= 3.0 + Math.random() * 3.0;
                            break;
                    }
                
                // Larger splat size for more impact - increased size range
                const sizeVariation = 1.5 + Math.random() * 1.5; // Range: 1.5-3.0 (was 0.8-2.0)
                config.SPLAT_RADIUS = originalSplatRadius * sizeVariation;
                
                // More gentle, flowing movement for a mesmerizing effect
                // Bias towards the center of the screen
                // Create a value between 0.3 and 0.7 with center bias
                const centerBias = (Math.random() * 0.4) + 0.3; // Range: 0.3-0.7
                // Further bias toward center with occasional variation
                const x = Math.random() < 0.7 ? 
                    centerBias : Math.random(); // 70% chance to spawn near center
                const y = Math.random() < 0.7 ? 
                        centerBias : Math.random();
                // Lower minimum strength but higher maximum for more varied, flowing movement
                const movementStrength = 150 + Math.random() * 550; // Range: 150-700
                
                // More directed, smoother movement
                let movementDirection;
                // Occasionally create horizontal or vertical flows for a more mesmerizing effect
                if (Math.random() < 0.3) {
                    // Create predominantly horizontal or vertical flows
                    movementDirection = Math.random() < 0.5 ? 
                        Math.random() * 0.3 + (Math.random() < 0.5 ? 0 : Math.PI) : // Near 0 or π (horizontal)
                        Math.random() * 0.3 + (Math.random() < 0.5 ? Math.PI/2 : 3*Math.PI/2); // Near π/2 or 3π/2 (vertical)
                } else {
                    movementDirection = Math.random() * Math.PI * 2; // Random direction
                }
                
                const dx = movementStrength * Math.cos(movementDirection);
                const dy = movementStrength * Math.sin(movementDirection);
                
                splat(x, y, dx, dy, color);
            }
            }
            
            // Restore original splat radius
            config.SPLAT_RADIUS = originalSplatRadius;
        }
    }
    
    if (!config.PAUSED)
        step(dt);
    render(null);
    requestAnimationFrame(update);
}

function calcDeltaTime () {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function resizeCanvas () {
    let width = scaleByPixelRatio(canvas.clientWidth);
    let height = scaleByPixelRatio(canvas.clientHeight);
    if (canvas.width != width || canvas.height != height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

function updateColors (dt) {
    if (!config.COLORFUL) return;

    // Use a fixed moderate rate instead of config.COLOR_UPDATE_SPEED
    colorUpdateTimer += dt * 10; // Fixed moderate speed (matching default value)
    if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
            p.color = generateColor();
        });
    }
}

function applyInputs () {
    if (splatStack.length > 0)
        multipleSplats(splatStack.pop());

    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

function step (dt) {
    gl.disable(gl.BLEND);

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
    blit(pressure.write);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write);
        pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    if (!ext.supportLinearFiltering)
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write);
    velocity.swap();

    if (!ext.supportLinearFiltering)
        gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(dye.write);
    dye.swap();
}

function render (target) {
    if (config.BLOOM)
        applyBloom(dye.read, bloom);
    if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays);
        blur(sunrays, sunraysTemp, 1);
    }

    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    drawColor(target, normalizeColor(config.BACK_COLOR));
    drawDisplay(target);
}

function drawColor (target, color) {
    colorProgram.bind();
    gl.uniform4f(colorProgram.uniforms.color, color.r, color.g, color.b, 1);
    blit(target);
}

function drawCheckerboard (target) {
    checkerboardProgram.bind();
    gl.uniform1f(checkerboardProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    blit(target);
}

function drawDisplay (target) {
    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;

    displayMaterial.bind();
    if (config.SHADING)
        gl.uniform2f(displayMaterial.uniforms.texelSize, 1.0 / width, 1.0 / height);
    gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
    if (config.BLOOM) {
        gl.uniform1i(displayMaterial.uniforms.uBloom, bloom.attach(1));
        gl.uniform1i(displayMaterial.uniforms.uDithering, ditheringTexture.attach(2));
        let scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(displayMaterial.uniforms.ditherScale, scale.x, scale.y);
    }
    if (config.SUNRAYS)
        gl.uniform1i(displayMaterial.uniforms.uSunrays, sunrays.attach(3));
    blit(target);
}

function applyBloom (source, destination) {
    if (bloomFramebuffers.length < 2)
        return;

    // Automatically reduce bloom intensity when in vortex mode to prevent blinding brightness
    let bloomIntensity = config.BLOOM_INTENSITY;
    let bloomThreshold = config.BLOOM_THRESHOLD;
    
    // If in vortex mode, reduce bloom intensity and increase threshold
    if (config.INTERACTION_MODE === 'Vortex') {
        bloomIntensity *= 0.4; // Reduce bloom intensity by 60% in vortex mode
        bloomThreshold = Math.min(bloomThreshold + 0.2, 0.9); // Increase threshold to cut off lower brightness values
    }

    let last = source;

    // Prefilter
    bloomPrefilterProgram.bind();
    let knee = bloomThreshold * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = bloomThreshold - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, bloomThreshold);
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    blit(bloomFramebuffers[0]);
    last = bloomFramebuffers[0];

    // Blur
    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        blit(dest);
        last = dest;
    }

    // Composite
    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
        gl.uniform1i(bloomBlurProgram.uniforms.uBloom, baseTex.attach(1));
        blit(baseTex);
        last = baseTex;
    }

    // Final pass
    bloomFinalProgram.bind();
    gl.uniform2f(bloomFinalProgram.uniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, bloomIntensity);
    blit(destination);
}

function applySunrays (source, mask, destination) {
    gl.disable(gl.BLEND);
    sunraysMaskProgram.bind();
    gl.uniform1i(sunraysMaskProgram.uniforms.uTexture, source.attach(0));
    blit(mask);

    sunraysProgram.bind();
    gl.uniform1f(sunraysProgram.uniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysProgram.uniforms.uTexture, mask.attach(0));
    blit(destination);
}

function blur (target, temp, iterations) {
    blurProgram.bind();
    for (let i = 0; i < iterations; i++) {
        gl.uniform2f(blurProgram.uniforms.texelSize, target.texelSizeX, 0.0);
        gl.uniform1i(blurProgram.uniforms.uTexture, target.attach(0));
        blit(temp);

        gl.uniform2f(blurProgram.uniforms.texelSize, 0.0, target.texelSizeY);
        gl.uniform1i(blurProgram.uniforms.uTexture, temp.attach(0));
        blit(target);
    }
}

function splatPointer (pointer) {
    let dx, dy;
    
    // Calculate direction and force based on interaction mode
    switch (config.INTERACTION_MODE) {
        case 'Normal':
            // Original behavior based on pointer movement
            dx = pointer.deltaX * config.SPLAT_FORCE;
            dy = pointer.deltaY * config.SPLAT_FORCE;
            break;
            
        case 'Vortex':
            // Create a very subtle vortex effect with minimal spiral motion
            // Tangential motion around cursor with minimal forces
            const vortexRadius = 0.02; // Reduced radius
            const vortexStrength = config.SPLAT_FORCE * 0.6; // Dramatically reduced strength
            
            // Use pointer movement to make vortex more dynamic
            const moveX = pointer.texcoordX - pointer.prevTexcoordX;
            const moveY = pointer.texcoordY - pointer.prevTexcoordY;
            const moveMagnitude = Math.sqrt(moveX * moveX + moveY * moveY);
            
            // Generate spiraling pattern around the cursor - only 2 points for subtlety
            const numVortexPoints = 2; // Minimum points for a vortex effect
            let rotationDirection = (Math.abs(moveX) > Math.abs(moveY)) ? 
                                    Math.sign(moveX) : Math.sign(-moveY);
            
            // Default rotation if no significant movement
            if (moveMagnitude < 0.0001 || rotationDirection === 0) {
                rotationDirection = 1;
            }
            
            // Only create additional points if moving significantly to avoid brightness buildup
            if (moveMagnitude > 0.0005) {
                for (let i = 0; i < numVortexPoints; i++) {
                    const angle = (Math.PI * 2 * i / numVortexPoints) + 
                                (pointer.texcoordX + pointer.texcoordY) * 3; // Reduced angle variation
                    
                    const radius = vortexRadius; // Fixed radius, no variation to prevent excessive buildup
                    const offsetX = Math.cos(angle) * radius;
                    const offsetY = Math.sin(angle) * radius;
                    
                    // Position vortex points around cursor
                    const pointX = pointer.texcoordX + offsetX;
                    const pointY = pointer.texcoordY + offsetY;
                    
                    // Ensure points are within bounds
                    if (pointX > 0 && pointX < 1 && pointY > 0 && pointY < 1) {
                        // Create very gentle tangential forces
                        const vortexDx = rotationDirection * -offsetY * vortexStrength * 0.7;
                        const vortexDy = rotationDirection * offsetX * vortexStrength * 0.7;
                        
                        // No inward/outward flow to prevent intensity buildup
                        
                        // Create a muted color for the additional points
                        const mutedColor = {
                            r: pointer.color.r * 0.4, // Reduce color intensity
                            g: pointer.color.g * 0.4,
                            b: pointer.color.b * 0.4
                        };
                        
                        // Add vortex point with reduced forces and muted color
                        splat(pointX, pointY, vortexDx, vortexDy, mutedColor);
                    }
                }
            }
            
            // Main cursor point still creates tangential force, but very gentle
            dx = -moveY * vortexStrength * 0.8;
            dy = moveX * vortexStrength * 0.8;
            break;
    }
    
    // For vortex mode, create a more muted color to prevent excessive brightness
    let color = pointer.color;
    if (config.INTERACTION_MODE === 'Vortex') {
        color = {
            r: pointer.color.r * 0.5,
            g: pointer.color.g * 0.5,
            b: pointer.color.b * 0.5
        };
    }
    
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
}

function multipleSplats (amount) {
    // Store original splat radius to restore it later
    const originalSplatRadius = config.SPLAT_RADIUS;
    
    // Generate splats based on the current interaction mode
    if (config.INTERACTION_MODE === 'Vortex') {
        // For vortex mode, create collections of swirling splats
    for (let i = 0; i < amount; i++) {
            // Create a central point for each vortex
            const centerX = Math.random();
            const centerY = Math.random();
        const color = generateColor();
            
            // Higher color intensity for better visibility
            switch (config.COLOR_PRESET) {
                case 'Neon':
                    color.r *= 6.0 + Math.random() * 3.0;
                    color.g *= 6.0 + Math.random() * 3.0;
                    color.b *= 6.0 + Math.random() * 3.0;
                    break;
                case 'Fire':
                    color.r *= 6.0 + Math.random() * 2.0;
                    color.g *= 4.0 + Math.random() * 2.0;
                    color.b *= 2.0 + Math.random() * 2.0;
                    break;
                case 'Ocean':
                    color.r *= 3.0 + Math.random() * 2.0;
                    color.g *= 4.0 + Math.random() * 2.0;
                    color.b *= 6.0 + Math.random() * 2.0;
                    break;
                case 'Galaxy':
                    color.r *= 4.0 + Math.random() * 2.0;
                    color.g *= 3.0 + Math.random() * 2.0;
                    color.b *= 6.0 + Math.random() * 2.0;
                    break;
                default:
                    color.r *= 5.0 + Math.random() * 2.0;
                    color.g *= 5.0 + Math.random() * 2.0;
                    color.b *= 5.0 + Math.random() * 2.0;
                    break;
            }
            
            // Increase splat radius for better visibility
            config.SPLAT_RADIUS = originalSplatRadius * (2.0 + Math.random() * 1.0);
            
            // Create a mini-vortex with several points
            const pointCount = 5; // Number of points in each vortex
            const radius = 0.02 + Math.random() * 0.03; // Larger radius for better visibility
            const rotationStrength = 400 + Math.random() * 400; // Stronger rotation for visibility
            
            for (let j = 0; j < pointCount; j++) {
                const angle = (j / pointCount) * Math.PI * 2;
                const x = centerX + Math.cos(angle) * radius;
                const y = centerY + Math.sin(angle) * radius;
                
                // Create tangential force for rotation - stronger for visibility
                const dx = -Math.sin(angle) * rotationStrength;
                const dy = Math.cos(angle) * rotationStrength;
                
                // Ensure the splat is within bounds
                if (x > 0 && x < 1 && y > 0 && y < 1) {
                    splat(x, y, dx, dy, color);
                }
            }
        }
    } else {
        // Normal mode - create standard splats with higher visibility
        for (let i = 0; i < amount; i++) {
            const color = generateColor();
            
            // Higher color intensity for better visibility
            switch (config.COLOR_PRESET) {
                case 'Neon':
                    color.r *= 6.0 + Math.random() * 3.0;
                    color.g *= 6.0 + Math.random() * 3.0;
                    color.b *= 6.0 + Math.random() * 3.0;
                    break;
                case 'Fire':
                    color.r *= 6.0 + Math.random() * 2.0;
                    color.g *= 4.0 + Math.random() * 2.0;
                    color.b *= 2.0 + Math.random() * 2.0;
                    break;
                case 'Ocean':
                    color.r *= 3.0 + Math.random() * 2.0;
                    color.g *= 4.0 + Math.random() * 2.0;
                    color.b *= 6.0 + Math.random() * 2.0;
                    break;
                case 'Galaxy':
                    color.r *= 4.0 + Math.random() * 2.0;
                    color.g *= 3.0 + Math.random() * 2.0;
                    color.b *= 6.0 + Math.random() * 2.0;
                    break;
                default:
                    color.r *= 5.0 + Math.random() * 2.0;
                    color.g *= 5.0 + Math.random() * 2.0;
                    color.b *= 5.0 + Math.random() * 2.0;
                    break;
            }
            
            // Increase splat radius for better visibility
            config.SPLAT_RADIUS = originalSplatRadius * (2.0 + Math.random() * 1.0);
            
        const x = Math.random();
        const y = Math.random();
            
            // Higher movement strength for more impact
            const movementStrength = 400 + Math.random() * 600;
            const movementDirection = Math.random() * Math.PI * 2;
            
            const dx = movementStrength * Math.cos(movementDirection);
            const dy = movementStrength * Math.sin(movementDirection);
            
        splat(x, y, dx, dy, color);
    }
    }
    
    // Restore original splat radius
    config.SPLAT_RADIUS = originalSplatRadius;
}

function splat (x, y, dx, dy, color) {
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x, y);
    gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write);
    velocity.swap();

    gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(dye.write);
    dye.swap();
}

function correctRadius (radius) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1)
        radius *= aspectRatio;
    return radius;
}

// Variables for tracking double-clicks
let lastClickTime = 0;
const doubleClickDelay = 300; // ms between clicks to count as double-click

// Modify mousedown event listener to handle double-clicks and interaction modes
canvas.addEventListener('mousedown', e => {
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    
    // Check for double-click
    const currentTime = Date.now();
    if (currentTime - lastClickTime < doubleClickDelay) {
        // Double-click detected, create special effect
        createSpecialEffect(posX / canvas.width, 1.0 - posY / canvas.height);
        lastClickTime = 0; // Reset to avoid triple-click detection
    } else {
        // Single click - normal handling
    let pointer = pointers.find(p => p.id == -1);
    if (pointer == null)
        pointer = new pointerPrototype();
    updatePointerDownData(pointer, -1, posX, posY);
        lastClickTime = currentTime;
    }
});

// Add mousemove event handler to support dragging
canvas.addEventListener('mousemove', e => {
    let pointer = pointers[0];
    if (!pointer.down) return;
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    updatePointerMoveData(pointer, posX, posY);
});

// Add mouseup event handler to end the drag operation
canvas.addEventListener('mouseup', () => {
    let pointer = pointers[0];
    updatePointerUpData(pointer);
});

// Add mouseleave event handler to handle when mouse leaves the canvas
canvas.addEventListener('mouseleave', () => {
    let pointer = pointers[0];
    updatePointerUpData(pointer);
});

// Touch events for mobile devices
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    
    // Handle double-tap similar to double-click
    if (touches.length === 1) {
        const currentTime = Date.now();
        if (currentTime - lastClickTime < doubleClickDelay) {
            const touch = touches[0];
            const posX = scaleByPixelRatio(touch.pageX);
            const posY = scaleByPixelRatio(touch.pageY);
            createSpecialEffect(posX / canvas.width, 1.0 - posY / canvas.height);
            lastClickTime = 0;
            return;
        }
        lastClickTime = currentTime;
    }
    
    // Handle regular touch
    while (touches.length >= pointers.length)
        pointers.push(new pointerPrototype());
    for (let i = 0; i < touches.length; i++) {
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerDownData(pointers[i + 1], touches[i].identifier, posX, posY);
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers[i + 1];
        if (!pointer.down) continue;
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerMoveData(pointer, posX, posY);
    }
});

canvas.addEventListener('touchend', e => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers.find(p => p.id === touches[i].identifier);
        if (pointer == null) continue;
        updatePointerUpData(pointer);
    }
});

// Create special effect function for double-clicks
function createSpecialEffect(x, y) {
    const color = generateColor();
    
    // Apply color multipliers based on current color preset
    switch (config.COLOR_PRESET) {
        case 'Neon':
            color.r *= 8.0; // Reduced from 20.0
            color.g *= 8.0;
            color.b *= 8.0;
            break;
        case 'Fire':
            color.r *= 8.0; // Reduced from 20.0
            color.g *= 6.0; // Reduced from 16.0
            color.b *= 3.0; // Reduced from 8.0
            break;
        case 'Ocean':
            color.r *= 4.0; // Reduced from 10.0
            color.g *= 6.0; // Reduced from 15.0
            color.b *= 8.0; // Reduced from 20.0
            break;
        case 'Galaxy':
            color.r *= 6.0; // Reduced from 15.0
            color.g *= 4.0; // Reduced from 10.0
            color.b *= 8.0; // Reduced from 20.0
            break;
        default:
            color.r *= 6.0; // Reduced from 15.0
            color.g *= 6.0;
            color.b *= 6.0;
            break;
    }
    
    // Different special effects based on the current interaction mode
    switch (config.INTERACTION_MODE) {
        case 'Vortex':
            createVortexEffect(x, y, color);
            break;
        case 'Normal':
        default:
            createExplosionEffect(x, y, color);
            break;
    }
}

function createExplosionEffect(x, y, color) {
    // Create multiple splats in a circular pattern
    const numSplats = 16;
    const radius = 0.015;
    const force = 2000;
    
    for (let i = 0; i < numSplats; i++) {
        const angle = i * (Math.PI * 2 / numSplats);
        const dx = Math.cos(angle) * force;
        const dy = Math.sin(angle) * force;
        
        // Add some randomness to the explosion
        const distVariation = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        const splatX = x + Math.cos(angle) * radius * distVariation;
        const splatY = y + Math.sin(angle) * radius * distVariation;
        
        // Ensure the splat is within bounds
        const clampedX = Math.max(0.001, Math.min(0.999, splatX));
        const clampedY = Math.max(0.001, Math.min(0.999, splatY));
        
        splat(clampedX, clampedY, dx, dy, color);
    }
}

function createVortexEffect(x, y, color) {
    // Create a giant multi-colored vortex following the current theme
    const numSplats = 40; // Significantly more splats for a giant effect
    const maxRadius = 0.15; // Much larger radius for giant vortex
    const force = 800; // Stronger force for a more dynamic effect
    
    // Store original splat radius to restore it later
    const originalSplatRadius = config.SPLAT_RADIUS;
    // Increase splat radius for better visibility and size
    config.SPLAT_RADIUS = originalSplatRadius * 3.0;
    
    for (let i = 0; i < numSplats; i++) {
        const t = i / (numSplats - 1); // 0 to 1
        const radius = Math.pow(t, 0.8) * maxRadius; // Adjusted curve for better spiral
        const angle = t * Math.PI * 12; // More rotations for a denser spiral
        
        // Generate a color that follows the theme but varies throughout the vortex
        const vortexColor = {
            r: color.r,
            g: color.g,
            b: color.b
        };
        
        // Adjust colors based on position in spiral to create multi-colored effect
        // while following the theme's color palette
        switch (config.COLOR_PRESET) {
            case 'Neon':
                // Neon theme with rainbow-like variations
                vortexColor.r = color.r * (0.7 + 0.6 * Math.sin(t * Math.PI * 4));
                vortexColor.g = color.g * (0.7 + 0.6 * Math.sin(t * Math.PI * 4 + Math.PI * 0.6));
                vortexColor.b = color.b * (0.7 + 0.6 * Math.sin(t * Math.PI * 4 + Math.PI * 1.2));
                break;
            case 'Fire':
                // Fire theme with red to yellow gradient
                vortexColor.r = color.r * (0.7 + 0.3 * Math.sin(t * Math.PI));
                vortexColor.g = color.g * (0.4 + 0.6 * t);
                vortexColor.b = color.b * (0.2 + 0.4 * Math.pow(t, 2));
                break;
            case 'Ocean':
                // Ocean theme with blue to teal to white gradient
                vortexColor.r = color.r * (0.2 + 0.8 * Math.pow(t, 1.5));
                vortexColor.g = color.g * (0.4 + 0.6 * Math.sin(t * Math.PI * 2));
                vortexColor.b = color.b * (0.6 + 0.4 * Math.sin(t * Math.PI));
                break;
            case 'Galaxy':
                // Galaxy theme with purple, blue, and pink
                vortexColor.r = color.r * (0.4 + 0.6 * Math.sin(t * Math.PI * 3));
                vortexColor.g = color.g * (0.2 + 0.4 * Math.pow(t, 1.2));
                vortexColor.b = color.b * (0.6 + 0.4 * Math.sin(t * Math.PI * 2 + Math.PI * 0.5));
                break;
            default:
                // Default theme with nice gradient
                vortexColor.r = color.r * (0.5 + 0.5 * Math.sin(t * Math.PI * 3));
                vortexColor.g = color.g * (0.5 + 0.5 * Math.sin(t * Math.PI * 3 + Math.PI * 0.66));
                vortexColor.b = color.b * (0.5 + 0.5 * Math.sin(t * Math.PI * 3 + Math.PI * 1.33));
                break;
        }
        
        // Apply brightness enhancement but avoid overexposure
        const intensityFactor = 1.5 + Math.sin(t * Math.PI * 2) * 0.5;
        vortexColor.r *= intensityFactor;
        vortexColor.g *= intensityFactor;
        vortexColor.b *= intensityFactor;
        
        // Tangential force for rotation - stronger at the beginning, weaker at the end
        const forceFactor = 1.0 - Math.pow(t, 0.7);
        const dx = -Math.sin(angle) * force * forceFactor;
        const dy = Math.cos(angle) * force * forceFactor;
        
        // Spiral pattern
        const splatX = x + Math.cos(angle) * radius;
        const splatY = y + Math.sin(angle) * radius;
        
        // Ensure the splat is within bounds
        const clampedX = Math.max(0.001, Math.min(0.999, splatX));
        const clampedY = Math.max(0.001, Math.min(0.999, splatY));
        
        // Add variation in splat size throughout the vortex
        config.SPLAT_RADIUS = originalSplatRadius * (3.0 - 1.5 * t);
        
        splat(clampedX, clampedY, dx, dy, vortexColor);
    }
    
    // Add some additional splats in the center for a more dramatic effect
    const centerSplats = 8;
    for (let i = 0; i < centerSplats; i++) {
        const angle = (i / centerSplats) * Math.PI * 2;
        const smallRadius = 0.01;
        
        // Strong outward force from center
        const centerForce = force * 1.5;
        const dx = Math.cos(angle) * centerForce;
        const dy = Math.sin(angle) * centerForce;
        
        // Center points
        const splatX = x + Math.cos(angle) * smallRadius;
        const splatY = y + Math.sin(angle) * smallRadius;
        
        // Ensure the splat is within bounds
        const clampedX = Math.max(0.001, Math.min(0.999, splatX));
        const clampedY = Math.max(0.001, Math.min(0.999, splatY));
        
        // Larger splat radius for center
        config.SPLAT_RADIUS = originalSplatRadius * 4.0;
        
        // Brighter center color
        const centerColor = {
            r: color.r * 2.0,
            g: color.g * 2.0,
            b: color.b * 2.0
        };
        
        splat(clampedX, clampedY, dx, dy, centerColor);
    }
    
    // Restore original splat radius
    config.SPLAT_RADIUS = originalSplatRadius;
}

function updatePointerDownData (pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
}

function updatePointerMoveData (pointer, posX, posY) {
    // Update raw position (in pixels)
    pointer.prevPosX = pointer.posX;
    pointer.prevPosY = pointer.posY;
    pointer.posX = posX;
    pointer.posY = posY;
    
    // Update texture coordinates (normalized 0-1)
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    
    // Calculate deltas in texture coordinates
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

function updatePointerUpData (pointer) {
    pointer.down = false;
}

function correctDeltaX (delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
}

function correctDeltaY (delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
}

function generateColor () {
    // Get colors based on the selected color preset
    switch (config.COLOR_PRESET) {
        case 'Ocean':
            return generateOceanColor();
        case 'Fire':
            return generateFireColor();
        case 'Sunset':
            return generateSunsetColor();
        case 'Neon':
            return generateNeonColor();
        case 'Forest':
            return generateForestColor();
        case 'Galaxy':
            return generateGalaxyColor();
        case 'Random':
        default:
            // Original random color generation
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
            c.r *= 0.15;
            c.g *= 0.15;
            c.b *= 0.15;
            return c;
    }
}

// Color preset generator functions
function generateOceanColor() {
    // Blue and teal hues (0.5-0.65 in HSV)
    const hue = 0.5 + Math.random() * 0.15;
    const saturation = 0.7 + Math.random() * 0.3; // 0.7-1.0
    const value = 0.8 + Math.random() * 0.2; // 0.8-1.0
    
    let c = HSVtoRGB(hue, saturation, value);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function generateFireColor() {
    // Red, orange, yellow hues (0.0-0.1 in HSV)
    const hue = Math.random() * 0.1;
    const saturation = 0.7 + Math.random() * 0.3; // 0.7-1.0
    const value = 0.8 + Math.random() * 0.2; // 0.8-1.0
    
    let c = HSVtoRGB(hue, saturation, value);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function generateSunsetColor() {
    // Warm pinks, oranges, purples (0.8-1.0 or 0.0-0.1 in HSV)
    const hue = Math.random() < 0.5 ? 
        0.8 + Math.random() * 0.2 : // Purples (0.8-1.0)
        Math.random() * 0.1;        // Reds (0.0-0.1)
    const saturation = 0.7 + Math.random() * 0.3; // 0.7-1.0
    const value = 0.7 + Math.random() * 0.3; // 0.7-1.0
    
    let c = HSVtoRGB(hue, saturation, value);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function generateNeonColor() {
    // Bright neon colors - full spectrum but with high saturation and value
    const hue = Math.random(); // Full spectrum
    const saturation = 0.9 + Math.random() * 0.1; // 0.9-1.0 (very saturated)
    const value = 0.9 + Math.random() * 0.1; // 0.9-1.0 (very bright)
    
    let c = HSVtoRGB(hue, saturation, value);
    c.r *= 0.2; // Slightly brighter than default
    c.g *= 0.2;
    c.b *= 0.2;
    return c;
}

function generateForestColor() {
    // Green and earth tones (0.2-0.4 in HSV)
    const hue = 0.2 + Math.random() * 0.2;
    const saturation = 0.6 + Math.random() * 0.4; // 0.6-1.0
    const value = 0.6 + Math.random() * 0.4; // 0.6-1.0
    
    let c = HSVtoRGB(hue, saturation, value);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function generateGalaxyColor() {
    // Deep blues, purples and pinks (0.6-0.9 in HSV)
    const hue = 0.6 + Math.random() * 0.3;
    const saturation = 0.7 + Math.random() * 0.3; // 0.7-1.0
    const value = 0.7 + Math.random() * 0.3; // 0.7-1.0
    
    let c = HSVtoRGB(hue, saturation, value);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function HSVtoRGB (h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r,
        g,
        b
    };
}

function normalizeColor (input) {
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
    return output;
}

function wrap (value, min, max) {
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}

function getResolution (resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1)
        aspectRatio = 1.0 / aspectRatio;

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight)
        return { width: max, height: min };
    else
        return { width: min, height: max };
}

function getTextureScale (texture, width, height) {
    return {
        x: width / texture.width,
        y: height / texture.height
    };
}

function scaleByPixelRatio (input) {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}

function hashCode (s) {
    if (s.length == 0) return 0;
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        hash = (hash << 5) - hash + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

