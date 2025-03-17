// Audio System for WebGL-Fluid-Simulation
// This file contains all the audio code that was removed from script.js
// It can be reintegrated later if needed

// Audio System Setup - Enhanced but stable version
let audioContext;
let audioInitialized = false;
let masterGain;
let lastSplatTime = 0;
let currentSounds = new Set();

// Enhanced sound profiles with better characteristics
const soundProfiles = {
    'Water': {
        oscillatorType: 'triangle',
        filterType: 'lowpass',
        filterFrequency: 800,
        filterQ: 0.5,
        attackTime: 0.02,
        releaseTime: 0.5,
        frequencyRange: [180, 400],
        modulation: true,
        modulationAmount: 12
    },
    'Ethereal': {
        oscillatorType: 'sine',
        filterType: 'bandpass',
        filterFrequency: 1200,
        filterQ: 2,
        attackTime: 0.1,
        releaseTime: 0.8,
        frequencyRange: [300, 900],
        modulation: true,
        modulationAmount: 5
    },
    'Mechanical': {
        oscillatorType: 'sawtooth',
        filterType: 'highpass',
        filterFrequency: 300,
        filterQ: 0.7,
        attackTime: 0.01,
        releaseTime: 0.3,
        frequencyRange: [120, 350],
        modulation: false
    },
    'Wind': {
        oscillatorType: 'sine',
        filterType: 'lowpass',
        filterFrequency: 500,
        filterQ: 0.3,
        attackTime: 0.2,
        releaseTime: 0.6,
        frequencyRange: [200, 600],
        modulation: true,
        modulationAmount: 20
    }
};

function initAudio() {
    try {
        if (audioInitialized) return;
        
        console.log('Attempting to initialize enhanced audio system...');
        
        // Create audio context with fallbacks
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            throw new Error("AudioContext not supported in this browser");
        }
        
        // Create context
        audioContext = new AudioContext();
        
        // Handle browsers that require user interaction
        if (audioContext.state === 'suspended') {
            console.log('Audio context suspended. Will resume on user interaction.');
            
            // Add one-time event listeners to resume context on user interaction
            const resumeAudio = () => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        console.log('Audio context resumed successfully');
                    }).catch(err => {
                        console.error('Failed to resume audio context:', err);
                    });
                }
            };
            
            // Various user interaction events
            window.addEventListener('click', resumeAudio, { once: true });
            window.addEventListener('touchend', resumeAudio, { once: true });
            window.addEventListener('keydown', resumeAudio, { once: true });
        }
        
        // Create master gain node
        masterGain = audioContext.createGain();
        masterGain.gain.value = config.AUDIO_VOLUME;
        masterGain.connect(audioContext.destination);
        
        audioInitialized = true;
        console.log('Enhanced audio system initialized successfully');
    } catch (e) {
        console.error('Audio initialization failed:', e);
        config.AUDIO_ENABLED = false;
        // Show user-friendly error
        alert('Audio is not supported in this browser or device. Audio has been disabled.');
    }
}

// Enhanced function to generate a realistic sound for a splat
function generateSplatSound(x, y, dx, dy, color) {
    if (!config.AUDIO_ENABLED || !audioInitialized) return;
    
    try {
        // Check if context is running
        if (audioContext.state !== 'running') {
            audioContext.resume().catch(e => console.error('Could not resume audio context:', e));
            return; // Skip this sound if context isn't running yet
        }
        
        // Rate limiting to avoid too many sounds
        const now = Date.now();
        if (now - lastSplatTime < 80) return; // Minimum 80ms between sounds
        lastSplatTime = now;
        
        // Limit number of sounds to keep performance stable
        if (currentSounds.size >= 5) {
            const oldestSound = currentSounds.values().next().value;
            stopSound(oldestSound);
        }
        
        // Create a simple unique ID
        const soundId = 'sound_' + now;
        
        // Extract splat parameters
        const velocity = Math.sqrt(dx * dx + dy * dy);
        const normalizedVelocity = Math.min(1.0, velocity / 1000);
        const normalizedX = x / window.innerWidth;
        const normalizedY = y / window.innerHeight;
        
        // Get profile
        const profile = soundProfiles[config.AUDIO_SOUND_TYPE] || soundProfiles['Water'];
        
        // Create enhanced sound with panning based on position
        createEnhancedSound(soundId, normalizedX, normalizedY, normalizedVelocity, profile, color);
        
        // Store the sound ID
        currentSounds.add(soundId);
        
        // Auto-stop sound after a short duration
        const duration = profile.attackTime + profile.releaseTime;
        setTimeout(() => stopSound(soundId), duration * 1000 + 100);
    } catch (e) {
        console.error('Error generating sound:', e);
        // Don't disable audio on error, just skip this sound
    }
}

// Create an enhanced sound with more realistic qualities
function createEnhancedSound(id, x, y, velocity, profile, color) {
    try {
        // Create main oscillator
        const oscillator = audioContext.createOscillator();
        oscillator.type = profile.oscillatorType;
        
        // Calculate frequency based on position and profile
        const freqRange = profile.frequencyRange;
        const baseFreq = freqRange[0] + (x * (freqRange[1] - freqRange[0]));
        oscillator.frequency.value = baseFreq;
        
        // Create gain node for volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        
        // Create a filter for tone shaping
        const filter = audioContext.createBiquadFilter();
        filter.type = profile.filterType;
        filter.frequency.value = profile.filterFrequency + (velocity * 200);
        filter.Q.value = profile.filterQ;
        
        // Create stereo panning based on x position
        const panner = audioContext.createStereoPanner();
        panner.pan.value = (x - 0.5) * 1.5; // Convert 0-1 to -0.75 to 0.75 for subtle panning
        
        // Add frequency modulation for more interesting sounds
        let modulatorOsc;
        if (profile.modulation) {
            modulatorOsc = audioContext.createOscillator();
            modulatorOsc.type = 'sine';
            modulatorOsc.frequency.value = 2 + Math.random() * 5; // 2-7 Hz modulation
            
            const modulatorGain = audioContext.createGain();
            modulatorGain.gain.value = profile.modulationAmount || 10;
            
            modulatorOsc.connect(modulatorGain);
            modulatorGain.connect(oscillator.frequency);
            modulatorOsc.start();
        }
        
        // Connect the audio nodes
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(panner);
        panner.connect(masterGain);
        
        // Create a more natural envelope
        const now = audioContext.currentTime;
        
        // Calculate volume based on velocity and color brightness for more variation
        const colorBrightness = (color.r + color.g + color.b) / 3;
        const volume = Math.min(0.4, 0.1 + (velocity * 0.3 * config.AUDIO_REACTIVITY) + (colorBrightness * 0.1));
        
        // Apply natural sounding envelope
        gainNode.gain.setValueAtTime(0, now);
        
        // Attack phase - quick rise for pluck/splash sounds
        gainNode.gain.linearRampToValueAtTime(volume, now + profile.attackTime);
        
        // Create a multi-point decay for more natural sound
        if (profile === soundProfiles['Water']) {
            // Water sounds have a bubbly decay
            gainNode.gain.setValueAtTime(volume, now + profile.attackTime);
            gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + profile.attackTime + (profile.releaseTime * 0.3));
            gainNode.gain.linearRampToValueAtTime(volume * 0.5, now + profile.attackTime + (profile.releaseTime * 0.5));
            gainNode.gain.linearRampToValueAtTime(volume * 0.2, now + profile.attackTime + (profile.releaseTime * 0.8));
            gainNode.gain.linearRampToValueAtTime(0, now + profile.attackTime + profile.releaseTime);
        } else {
            // Standard release for other sounds
            gainNode.gain.linearRampToValueAtTime(0, now + profile.attackTime + profile.releaseTime);
        }
        
        // Add slight pitch bend for water and wind sounds
        if (profile === soundProfiles['Water'] || profile === soundProfiles['Wind']) {
            oscillator.frequency.setValueAtTime(baseFreq, now);
            oscillator.frequency.linearRampToValueAtTime(
                baseFreq * (0.95 + Math.random() * 0.1), 
                now + profile.attackTime + (profile.releaseTime * 0.8)
            );
        }
        
        // Start the oscillator
        oscillator.start();
        oscillator.stop(now + profile.attackTime + profile.releaseTime + 0.1);
        
        // Store oscillator and related nodes for cleanup
        oscillator._gainNode = gainNode;
        oscillator._id = id;
        oscillator._modulatorOsc = modulatorOsc;
        
        // Clean up when done
        oscillator.onended = () => {
            if (modulatorOsc) {
                try {
                    modulatorOsc.stop();
                } catch (e) {
                    // Already stopped
                }
            }
            currentSounds.delete(id);
        };
        
        return oscillator;
    } catch (e) {
        console.error('Error creating enhanced sound:', e);
        return null;
    }
}

// Stop sound - improved to handle modulators
function stopSound(id) {
    try {
        const index = Array.from(currentSounds).indexOf(id);
        if (index !== -1) {
            currentSounds.delete(id);
        }
    } catch (e) {
        console.error('Error stopping sound:', e);
    }
}

// Stop all sounds
function stopAllSounds() {
    try {
        if (!audioContext) return;
        
        // Clear our tracking
        currentSounds.clear();
        
        // Silence any ongoing sounds
        if (masterGain) {
            const now = audioContext.currentTime;
            masterGain.gain.cancelScheduledValues(now);
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
            masterGain.gain.linearRampToValueAtTime(0, now + 0.1);
            
            // Restore volume after a short delay
            setTimeout(() => {
                masterGain.gain.setValueAtTime(0, audioContext.currentTime);
                masterGain.gain.linearRampToValueAtTime(config.AUDIO_VOLUME, audioContext.currentTime + 0.1);
            }, 200);
        }
        
        // Suspend the audio context if possible
        if (audioContext.state === 'running') {
            audioContext.suspend().catch(e => {
                console.error('Error suspending audio context:', e);
            });
        }
    } catch (e) {
        console.error('Error stopping all sounds:', e);
    }
}

// Update volume
function updateAudioVolume() {
    try {
        if (masterGain) {
            masterGain.gain.value = config.AUDIO_VOLUME;
        }
    } catch (e) {
        console.error('Error updating audio volume:', e);
    }
}

/*
INTEGRATION NOTES:

To reintegrate this audio system into script.js:

1. Copy this entire file into script.js after the hashCode function
2. Make sure config object includes these audio properties:
   - AUDIO_ENABLED: false, (or true to enable)
   - AUDIO_VOLUME: 0.5,
   - AUDIO_SOUND_TYPE: 'Water',
   - AUDIO_REACTIVITY: 0.8,

3. Add audio initialization to GUI setup:
   audioFolder.add(config, 'AUDIO_ENABLED')
       .name('Enable Audio')
       .onChange(value => {
           if (value && !audioInitialized) {
               initAudio();
           }
           if (!value) {
               stopAllSounds();
           }
       });
   
   audioFolder.add(config, 'AUDIO_VOLUME', 0, 1)
       .name('Volume')
       .onChange(updateAudioVolume);
   
   audioFolder.add(config, 'AUDIO_SOUND_TYPE', ['Water', 'Ethereal', 'Mechanical', 'Wind'])
       .name('Sound Type');
   
   audioFolder.add(config, 'AUDIO_REACTIVITY', 0, 1)
       .name('Reactivity');

4. Add sound generation to the splat function:
   if (config.AUDIO_ENABLED) {
       generateSplatSound(x, y, dx, dy, color);
   }
*/ 