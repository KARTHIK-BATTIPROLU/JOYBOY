// 2D Vector Shanks Avatar Controller & Animator

class ShanksAvatar {
  constructor(svgContainerId) {
    this.container = document.getElementById(svgContainerId);
    this.currentState = 'idle';
    this.mouthOpenness = 0; // 0 to 1
    this.pupilTargetX = 0;
    this.pupilTargetY = 0;
    this.currentPupilX = 0;
    this.currentPupilY = 0;

    this.renderSvg();
    this.initElements();
    this.initMouseTracking();
    this.startBlinkLoop();
    this.startAnimationLoop();
  }

  renderSvg() {
    this.container.innerHTML = `
      <svg id="shanksSvg" viewBox="0 0 500 520" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradients -->
          <radialGradient id="hakiAuraGrad" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stop-color="#ff1a35" stop-opacity="0.35"/>
            <stop offset="70%" stop-color="#3a040b" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#000" stop-opacity="0"/>
          </radialGradient>
          
          <linearGradient id="cloakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1c1f26"/>
            <stop offset="60%" stop-color="#101217"/>
            <stop offset="100%" stop-color="#08090c"/>
          </linearGradient>

          <linearGradient id="cloakLining" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#800a16"/>
            <stop offset="100%" stop-color="#4a040b"/>
          </linearGradient>

          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f8ceb0"/>
            <stop offset="100%" stop-color="#e3ab88"/>
          </linearGradient>

          <linearGradient id="redHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#e62035"/>
            <stop offset="45%" stop-color="#bd1325"/>
            <stop offset="100%" stop-color="#730511"/>
          </linearGradient>

          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="100%" stop-color="#cfd4dc"/>
          </linearGradient>

          <!-- Scar Filter / Glow -->
          <filter id="scarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#400b0e" flood-opacity="0.6"/>
          </filter>
        </defs>

        <!-- Dynamic Haki Background Aura -->
        <circle id="avatarAura" cx="250" cy="240" r="230" fill="url(#hakiAuraGrad)" opacity="0.4" />

        <!-- Master Avatar Group (Handles Breathing & State Tilts) -->
        <g id="avatarBodyGroup" transform="translate(0, 0)">
          
          <!-- Back Hair Layer -->
          <g id="hairBack">
            <path d="M 160 170 C 130 220 120 320 150 380 C 170 340 180 290 190 260 Z" fill="url(#redHairGrad)"/>
            <path d="M 340 170 C 370 220 380 320 350 380 C 330 340 320 290 310 260 Z" fill="url(#redHairGrad)"/>
            <path d="M 180 230 C 160 290 170 370 210 410 C 220 360 215 300 210 250 Z" fill="#9e101f"/>
            <path d="M 320 230 C 340 290 330 370 290 410 C 280 360 285 300 290 250 Z" fill="#9e101f"/>
          </g>

          <!-- Captain's Cloak (High Collar & Shoulders) -->
          <g id="cloakGroup">
            <!-- Back of Cloak -->
            <path d="M 120 360 C 100 420 85 490 80 520 L 420 520 C 415 490 400 420 380 360 Z" fill="url(#cloakGrad)"/>
            <!-- Crimson Inner Lining Collar -->
            <path d="M 145 280 L 175 365 L 210 380 L 170 330 Z" fill="url(#cloakLining)"/>
            <path d="M 355 280 L 325 365 L 290 380 L 330 330 Z" fill="url(#cloakLining)"/>
          </g>

          <!-- Chest, Neck & Pirate Shirt -->
          <g id="torsoGroup">
            <!-- Neck & Upper Chest -->
            <path d="M 215 270 L 210 360 L 250 385 L 290 360 L 285 270 Z" fill="url(#skinGrad)"/>
            <!-- Deep Unbuttoned V-Neck Shirt -->
            <path d="M 180 340 L 225 365 L 250 415 L 275 365 L 320 340 L 315 520 L 185 520 Z" fill="url(#shirtGrad)"/>
            <!-- Collar Flaps -->
            <path d="M 175 330 L 225 375 L 215 390 L 165 345 Z" fill="#ffffff" stroke="#c0c6d0" stroke-width="2"/>
            <path d="M 325 330 L 275 375 L 285 390 L 335 345 Z" fill="#ffffff" stroke="#c0c6d0" stroke-width="2"/>
            <!-- Chest Muscle Definition Line -->
            <path d="M 250 385 L 250 435" stroke="#cc9572" stroke-width="3" stroke-linecap="round"/>
            <path d="M 235 410 C 245 420 255 420 265 410" stroke="#cc9572" stroke-width="2" fill="none"/>
            <!-- Empty Left Sleeve Pinned Up (Canon Detail) -->
            <path d="M 140 375 C 130 420 135 470 145 510 C 160 480 165 430 160 380 Z" fill="url(#cloakGrad)"/>
            <circle cx="150" cy="385" r="5" fill="#e5b358"/> <!-- Brass pin -->
          </g>

          <!-- Head & Face Group -->
          <g id="headGroup">
            <!-- Chiseled Jaw & Ears -->
            <path d="M 175 220 C 175 295 210 335 250 335 C 290 335 325 295 325 220 C 325 155 290 135 250 135 C 210 135 175 155 175 220 Z" fill="url(#skinGrad)"/>
            <!-- Ears -->
            <path d="M 170 215 C 162 205 162 245 174 245 Z" fill="#e3ab88"/>
            <path d="M 330 215 C 338 205 338 245 326 245 Z" fill="#e3ab88"/>
            <!-- Pirate Stubble / Scruff -->
            <g opacity="0.35">
              <circle cx="240" cy="320" r="1.5" fill="#3a1e12"/>
              <circle cx="246" cy="323" r="1.5" fill="#3a1e12"/>
              <circle cx="254" cy="323" r="1.5" fill="#3a1e12"/>
              <circle cx="260" cy="320" r="1.5" fill="#3a1e12"/>
              <circle cx="250" cy="326" r="1.5" fill="#3a1e12"/>
              <circle cx="232" cy="312" r="1.2" fill="#3a1e12"/>
              <circle cx="268" cy="312" r="1.2" fill="#3a1e12"/>
            </g>

            <!-- Iconic 3 Diagonal Scars across Left Eye -->
            <g id="shanksScars" filter="url(#scarGlow)">
              <line x1="282" y1="180" x2="304" y2="242" stroke="#942127" stroke-width="3" stroke-linecap="round"/>
              <line x1="290" y1="178" x2="312" y2="240" stroke="#942127" stroke-width="3.5" stroke-linecap="round"/>
              <line x1="298" y1="182" x2="320" y2="244" stroke="#942127" stroke-width="3" stroke-linecap="round"/>
            </g>

            <!-- Eyes & Eyebrows -->
            <g id="eyesGroup">
              <!-- Right Eyebrow -->
              <path id="eyebrowRight" d="M 195 205 Q 215 198 235 208" stroke="#87000e" stroke-width="4.5" stroke-linecap="round" fill="none"/>
              <!-- Left Eyebrow (Cut by scars) -->
              <path id="eyebrowLeft" d="M 265 208 Q 285 198 305 205" stroke="#87000e" stroke-width="4.5" stroke-linecap="round" fill="none"/>

              <!-- Right Eye -->
              <g id="rightEye">
                <ellipse cx="215" cy="222" rx="15" ry="8" fill="#ffffff" stroke="#331811" stroke-width="1.5"/>
                <g id="rightPupilGroup" transform="translate(0, 0)">
                  <circle cx="215" cy="222" r="5" fill="#2e1a12"/>
                  <circle cx="215" cy="222" r="2.5" fill="#000000"/>
                  <circle cx="213" cy="220" r="1.5" fill="#ffffff"/> <!-- catchlight -->
                </g>
                <!-- Eyelid for Blinking -->
                <path id="rightEyelid" d="M 199 214 Q 215 214 231 214 Q 215 214 199 214 Z" fill="url(#skinGrad)" stroke="#331811" stroke-width="1.5"/>
              </g>

              <!-- Left Eye (Behind scars) -->
              <g id="leftEye">
                <ellipse cx="285" cy="222" rx="15" ry="8" fill="#ffffff" stroke="#331811" stroke-width="1.5"/>
                <g id="leftPupilGroup" transform="translate(0, 0)">
                  <circle cx="285" cy="222" r="5" fill="#2e1a12"/>
                  <circle cx="285" cy="222" r="2.5" fill="#000000"/>
                  <circle cx="283" cy="220" r="1.5" fill="#ffffff"/> <!-- catchlight -->
                </g>
                <!-- Eyelid for Blinking -->
                <path id="leftEyelid" d="M 269 214 Q 285 214 301 214 Q 285 214 269 214 Z" fill="url(#skinGrad)" stroke="#331811" stroke-width="1.5"/>
              </g>
            </g>

            <!-- Chiseled Nose -->
            <path d="M 250 216 L 246 254 L 255 256" stroke="#b87b56" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

            <!-- Dynamic Animated Mouth (Viseme Target) -->
            <g id="mouthGroup" transform="translate(0, 0)">
              <!-- Neutral / Confident Smirk Line -->
              <path id="mouthBase" d="M 230 286 Q 250 292 270 286" stroke="#4a1c12" stroke-width="3" stroke-linecap="round" fill="none"/>
              <!-- Dynamic Lip Opening / Teeth -->
              <path id="mouthOpening" d="M 233 286 Q 250 286 267 286 Q 250 286 233 286 Z" fill="#5c1015"/>
              <path id="mouthTeeth" d="M 238 286 Q 250 286 262 286" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0"/>
            </g>

          </g>

          <!-- Front Hair Layer (Bangs, Part, and Framing Locks) -->
          <g id="hairFront">
            <!-- Center Parting / Crown -->
            <path d="M 250 145 C 230 145 200 155 180 185 C 205 180 230 190 245 205 C 248 185 252 185 255 205 C 270 190 295 180 320 185 C 300 155 270 145 250 145 Z" fill="url(#redHairGrad)"/>
            <!-- Left Bangs Falling Across Forehead -->
            <path id="hairStrandL1" d="M 225 175 Q 200 210 185 250 Q 195 230 215 210 Z" fill="url(#redHairGrad)"/>
            <path id="hairStrandL2" d="M 240 185 Q 220 225 210 260 Q 225 235 235 215 Z" fill="url(#redHairGrad)"/>
            <!-- Right Bangs Framing Scarred Eye -->
            <path id="hairStrandR1" d="M 260 185 Q 280 225 290 260 Q 275 235 265 215 Z" fill="url(#redHairGrad)"/>
            <path id="hairStrandR2" d="M 275 175 Q 300 210 315 250 Q 305 230 285 210 Z" fill="url(#redHairGrad)"/>
            <!-- Sideburns & Locks -->
            <path d="M 180 220 C 170 260 175 310 190 350 C 185 300 190 260 195 230 Z" fill="url(#redHairGrad)"/>
            <path d="M 320 220 C 330 260 325 310 310 350 C 315 300 310 260 305 230 Z" fill="url(#redHairGrad)"/>
          </g>

        </g>
      </svg>
    `;
  }

  initElements() {
    this.svg = document.getElementById('shanksSvg');
    this.avatarBodyGroup = document.getElementById('avatarBodyGroup');
    this.rightPupilGroup = document.getElementById('rightPupilGroup');
    this.leftPupilGroup = document.getElementById('leftPupilGroup');
    this.rightEyelid = document.getElementById('rightEyelid');
    this.leftEyelid = document.getElementById('leftEyelid');
    this.mouthBase = document.getElementById('mouthBase');
    this.mouthOpening = document.getElementById('mouthOpening');
    this.mouthTeeth = document.getElementById('mouthTeeth');
    this.aura = document.getElementById('avatarAura');
    this.eyebrowLeft = document.getElementById('eyebrowLeft');
    this.eyebrowRight = document.getElementById('eyebrowRight');
  }

  initMouseTracking() {
    window.addEventListener('mousemove', (e) => {
      if (this.currentState !== 'idle' && this.currentState !== 'thinking') return;
      const rect = this.container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height * 0.45;

      const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
      const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

      this.pupilTargetX = Math.max(-4, Math.min(4, deltaX * 4));
      this.pupilTargetY = Math.max(-2.5, Math.min(2.5, deltaY * 2.5));
    });
  }

  startBlinkLoop() {
    const doBlink = () => {
      if (this.isBlinking) return;
      this.isBlinking = true;

      // Close eyelids
      this.rightEyelid.setAttribute('d', 'M 199 214 Q 215 228 231 214 Q 215 230 199 214 Z');
      this.leftEyelid.setAttribute('d', 'M 269 214 Q 285 228 301 214 Q 285 230 269 214 Z');

      setTimeout(() => {
        // Open eyelids
        this.rightEyelid.setAttribute('d', 'M 199 214 Q 215 214 231 214 Q 215 214 199 214 Z');
        this.leftEyelid.setAttribute('d', 'M 269 214 Q 285 214 301 214 Q 285 214 269 214 Z');
        this.isBlinking = false;

        // Schedule next random blink (3 to 6.5 seconds)
        const nextBlink = 3000 + Math.random() * 3500;
        setTimeout(doBlink, nextBlink);
      }, 150);
    };

    setTimeout(doBlink, 3000);
  }

  setState(state) {
    if (this.currentState === state) return;
    this.currentState = state;

    switch (state) {
      case 'idle':
        this.aura.setAttribute('opacity', '0.35');
        this.aura.setAttribute('fill', 'url(#hakiAuraGrad)');
        this.eyebrowLeft.setAttribute('d', 'M 265 208 Q 285 198 305 205');
        this.eyebrowRight.setAttribute('d', 'M 195 205 Q 215 198 235 208');
        break;

      case 'listening':
        // Attentive lean, glowing aura
        this.aura.setAttribute('opacity', '0.7');
        this.eyebrowLeft.setAttribute('d', 'M 265 211 Q 285 203 305 208');
        this.eyebrowRight.setAttribute('d', 'M 195 208 Q 215 203 235 211');
        break;

      case 'thinking':
        this.aura.setAttribute('opacity', '0.5');
        break;

      case 'speaking':
        this.aura.setAttribute('opacity', '0.8');
        break;

      case 'haki':
        this.aura.setAttribute('opacity', '1.0');
        break;
    }
  }

  /**
   * Updates mouth shape from real-time audio energy (0.0 to 1.0)
   */
  setMouthViseme(openness) {
    this.mouthOpenness = Math.max(0, Math.min(1, openness));

    if (this.mouthOpenness < 0.08) {
      // Closed mouth / smirk
      this.mouthBase.setAttribute('d', 'M 230 286 Q 250 292 270 286');
      this.mouthOpening.setAttribute('d', 'M 233 286 Q 250 286 267 286 Q 250 286 233 286 Z');
      this.mouthTeeth.setAttribute('opacity', '0');
    } else if (this.mouthOpenness < 0.35) {
      // Small / moderate speech opening
      const drop = 6 + this.mouthOpenness * 12;
      this.mouthBase.setAttribute('d', `M 230 286 Q 250 ${286 + drop * 0.3} 270 286`);
      this.mouthOpening.setAttribute('d', `M 233 286 Q 250 ${286 + drop} 267 286 Q 250 ${286 - 2} 233 286 Z`);
      this.mouthTeeth.setAttribute('opacity', '0.6');
    } else {
      // Wide open / laughing "Dahahahaha!"
      const drop = 14 + this.mouthOpenness * 18;
      this.mouthBase.setAttribute('d', `M 226 284 Q 250 ${286 + drop * 0.4} 274 284`);
      this.mouthOpening.setAttribute('d', `M 230 284 Q 250 ${284 + drop} 270 284 Q 250 282 230 284 Z`);
      this.mouthTeeth.setAttribute('opacity', '1.0');
    }
  }

  startAnimationLoop() {
    let startTime = performance.now();

    const loop = (time) => {
      const elapsed = (time - startTime) / 1000;

      // 1. Smooth Pupil Interpolation
      this.currentPupilX += (this.pupilTargetX - this.currentPupilX) * 0.1;
      this.currentPupilY += (this.pupilTargetY - this.currentPupilY) * 0.1;

      this.rightPupilGroup.setAttribute('transform', `translate(${this.currentPupilX}, ${this.currentPupilY})`);
      this.leftPupilGroup.setAttribute('transform', `translate(${this.currentPupilX}, ${this.currentPupilY})`);

      // 2. State-driven body physics
      if (this.currentState === 'idle') {
        // Sinusoidal gentle breathing (period ~3.4s)
        const breatheY = Math.sin(elapsed * 1.85) * 3;
        const headTilt = Math.sin(elapsed * 0.9) * 0.7;
        this.avatarBodyGroup.setAttribute('transform', `translate(0, ${breatheY}) rotate(${headTilt}, 250, 350)`);
      } else if (this.currentState === 'listening') {
        // Lean slightly forward and pulse
        const pulse = Math.sin(elapsed * 4.5) * 1.8;
        this.avatarBodyGroup.setAttribute('transform', `scale(1.02) translate(-2, ${2 + pulse})`);
      } else if (this.currentState === 'speaking') {
        // Speech cadence nodding
        const speechBob = Math.sin(elapsed * 8) * (2 + this.mouthOpenness * 4);
        const speechTilt = Math.sin(elapsed * 5) * (1.2 + this.mouthOpenness * 1.5);
        this.avatarBodyGroup.setAttribute('transform', `translate(0, ${speechBob}) rotate(${speechTilt}, 250, 350)`);
      } else if (this.currentState === 'thinking') {
        const thinkTilt = Math.sin(elapsed * 2) * 1.5;
        this.avatarBodyGroup.setAttribute('transform', `translate(0, -2) rotate(${thinkTilt}, 250, 350)`);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}
