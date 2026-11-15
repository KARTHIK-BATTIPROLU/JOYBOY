/**
 * ShanksAvatar — 2D Layered Vector SVG Avatar Controller & Animator
 * Project JOYBOY — Milestone 2
 * Character: Red Hair Shanks (One Piece)
 */

class ShanksAvatar {
  /**
   * @param {HTMLElement|string} [container] - Container element or CSS selector / ID
   * @param {Object} [options] - Configuration options
   */
  constructor(container = null, options = {}) {
    this.options = Object.assign({
      minBlinkInterval: 3200,
      maxBlinkInterval: 5800,
      doubleBlinkProbability: 0.18,
      defaultViseme: 'closed',
      defaultState: 'idle'
    }, options);

    this.container = null;
    this.svgElement = null;
    this.mouthGroup = null;
    this.layerHead = null;
    this.eyebrowRight = null;
    this.eyebrowLeft = null;

    this.currentState = 'idle';
    this.currentViseme = 'closed';
    this.audioEnergy = 0.0;
    this.isBlinking = false;
    this.isDestroyed = false;

    // Timers
    this.blinkTimer = null;
    this.doubleBlinkTimer = null;
    this.blinkEndTimer = null;

    // Bindings
    this._scheduleBlink = this._scheduleBlink.bind(this);

    if (container) {
      this.init(container);
    }
  }

  /**
   * Returns the canonical SVG markup string (viewBox="0 0 400 460")
   * @returns {string}
   */
  static getSvgMarkup() {
    return `<svg id="shanks-avatar-svg" class="shanks-avatar-svg shanks-svg" viewBox="0 0 400 460" xmlns="http://www.w3.org/2000/svg" aria-label="Red Hair Shanks 2D Vector Avatar">
  <defs>
    <!-- Skin Shading Gradient -->
    <linearGradient id="shanks-skin-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FCE1C8" />
      <stop offset="70%" stop-color="#F2CEAE" />
      <stop offset="100%" stop-color="#DEB088" />
    </linearGradient>

    <!-- Neck Shading Gradient -->
    <linearGradient id="shanks-neck-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#C99870" />
      <stop offset="40%" stop-color="#DCAE88" />
      <stop offset="100%" stop-color="#F2CEAE" />
    </linearGradient>

    <!-- Hair Base Gradient -->
    <linearGradient id="shanks-hair-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#D61838" />
      <stop offset="35%" stop-color="#B22222" />
      <stop offset="85%" stop-color="#801216" />
      <stop offset="100%" stop-color="#550A0D" />
    </linearGradient>

    <!-- Cape Charcoal Outer Gradient -->
    <linearGradient id="shanks-cape-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#24242B" />
      <stop offset="50%" stop-color="#18181D" />
      <stop offset="100%" stop-color="#0F0F13" />
    </linearGradient>

    <!-- Cape Crimson Interior Lining -->
    <linearGradient id="shanks-lining-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6B1318" />
      <stop offset="100%" stop-color="#400A0D" />
    </linearGradient>

    <!-- Gold Brass Metallic Gradient -->
    <linearGradient id="shanks-gold-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBE68A" />
      <stop offset="45%" stop-color="#D4AF37" />
      <stop offset="85%" stop-color="#AA821C" />
      <stop offset="100%" stop-color="#73550E" />
    </linearGradient>

    <!-- Eye Clip Paths for Eyelid Blink Mechanics -->
    <clipPath id="left-eye-clip">
      <path d="M 224,177 C 224,171 234,167 248,172 C 248,177 241,183 224,177 Z" />
    </clipPath>
    <clipPath id="right-eye-clip">
      <path d="M 152,172 C 166,167 176,171 176,177 C 159,183 152,177 152,172 Z" />
    </clipPath>
  </defs>

  <!-- LAYER 1: Ambient Drop Shadow -->
  <g id="layer-shadow">
    <ellipse cx="200" cy="452" rx="145" ry="12" fill="#000000" opacity="0.45" />
  </g>

  <!-- LAYER 2: Cape Back Volume -->
  <g id="layer-cape-back">
    <!-- Outer Billowing Silhouette -->
    <path d="M 75,305 C 50,340 38,390 42,460 L 358,460 C 362,390 350,340 325,305 C 285,285 240,280 200,280 C 160,280 115,285 75,305 Z" fill="url(#shanks-cape-grad)" />
    <!-- Crimson Interior Lining Peeking on Sides -->
    <path d="M 42,460 C 50,420 62,370 85,325 L 75,305 C 50,340 38,390 42,460 Z" fill="url(#shanks-lining-grad)" opacity="0.85" />
    <path d="M 358,460 C 350,420 338,370 315,325 L 325,305 C 350,340 362,390 358,460 Z" fill="url(#shanks-lining-grad)" opacity="0.85" />
    <!-- Deep Cape Folds -->
    <path d="M 120,330 Q 110,400 95,460" stroke="#0B0B0E" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6" />
    <path d="M 280,330 Q 290,400 305,460" stroke="#0B0B0E" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6" />
    <path d="M 160,320 Q 155,390 145,460" stroke="#0B0B0E" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.4" />
    <path d="M 240,320 Q 245,390 255,460" stroke="#0B0B0E" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.4" />
  </g>

  <!-- LAYER 3: Body & Clothing -->
  <g id="layer-body">
    <!-- Torso & Broad Shoulders Base -->
    <path d="M 85,320 L 110,460 L 290,460 L 315,320 C 275,305 235,300 200,300 C 165,300 125,305 85,320 Z" fill="#F3EFE6" />
    <!-- Deep V-Neck Muscular Chest (Tanned Skin) -->
    <path d="M 162,298 C 168,340 180,390 200,405 C 220,390 232,340 238,298 Z" fill="url(#shanks-skin-grad)" />
    <!-- Pectoral & Collarbone Muscle Shadows -->
    <path d="M 200,315 L 200,400" stroke="#D4A882" stroke-width="2.5" stroke-linecap="round" />
    <!-- Left Pec Arch -->
    <path d="M 170,365 Q 186,375 198,370" stroke="#D4A882" stroke-width="2" fill="none" stroke-linecap="round" />
    <!-- Right Pec Arch -->
    <path d="M 230,365 Q 214,375 202,370" stroke="#D4A882" stroke-width="2" fill="none" stroke-linecap="round" />
    <!-- Collarbones -->
    <path d="M 160,305 Q 180,312 195,318" stroke="#C99870" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <path d="M 240,305 Q 220,312 205,318" stroke="#C99870" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <!-- Unbuttoned Shirt Left Lapel (Viewer's Left) -->
    <path d="M 158,295 L 142,350 L 172,375 L 165,300 Z" fill="#FFFFFF" stroke="#D8D2C5" stroke-width="1.5" />
    <path d="M 142,350 L 168,372" stroke="#B8B0A0" stroke-width="2" />
    <!-- Unbuttoned Shirt Right Lapel (Viewer's Right) -->
    <path d="M 242,295 L 258,350 L 228,375 L 235,300 Z" fill="#FFFFFF" stroke="#D8D2C5" stroke-width="1.5" />
    <path d="M 258,350 L 232,372" stroke="#B8B0A0" stroke-width="2" />
    <!-- Shirt Drapery & Fold Lines -->
    <path d="M 125,360 Q 140,400 135,460" stroke="#CDC5B4" stroke-width="2" fill="none" />
    <path d="M 275,360 Q 260,400 265,460" stroke="#CDC5B4" stroke-width="2" fill="none" />
    <!-- Crimson Waist Sash (Cinched at bottom) -->
    <path d="M 105,425 Q 200,440 295,425 L 292,460 Q 200,465 108,460 Z" fill="#82161A" />
    <path d="M 106,440 Q 200,452 294,440" stroke="#4E0C0F" stroke-width="3" fill="none" />
    <!-- Sash Knot Tails (Viewer's Left Hip) -->
    <path d="M 115,432 C 105,445 102,458 100,460 L 118,460 C 119,452 122,442 120,432 Z" fill="#82161A" stroke="#4E0C0F" stroke-width="1.5" />
  </g>

  <!-- LAYER 4: Right Arm & Gryphon Saber (Viewer's Left) -->
  <g id="layer-right-arm">
    <!-- Right Upper Arm Sleeve & Muscle -->
    <path d="M 85,320 C 72,345 68,380 70,430 L 105,430 C 105,385 108,350 115,325 Z" fill="#F3EFE6" />
    <path d="M 70,400 Q 88,410 105,400" stroke="#CDC5B4" stroke-width="2" fill="none" />
    <!-- Forearm (Tanned Skin emerging from sleeve) -->
    <path d="M 70,430 C 72,445 76,458 78,460 L 102,460 C 104,450 105,438 105,430 Z" fill="url(#shanks-skin-grad)" />
    <!-- Gryphon Saber: Brass Crossguard & Pommel -->
    <ellipse cx="88" cy="425" rx="20" ry="6" transform="rotate(-15, 88, 425)" fill="url(#shanks-gold-grad)" stroke="#8C6F19" stroke-width="1.5" />
    <!-- Hilt Grip with Brown Leather Wrap -->
    <path d="M 84,420 L 76,380 L 84,378 L 92,418 Z" fill="#2C1A14" stroke="#1A0E0A" stroke-width="1" />
    <!-- Grip Rings -->
    <line x1="82" y1="410" x2="90" y2="408" stroke="#D4AF37" stroke-width="1.5" />
    <line x1="80" y1="400" x2="88" y2="398" stroke="#D4AF37" stroke-width="1.5" />
    <line x1="78" y1="390" x2="86" y2="388" stroke="#D4AF37" stroke-width="1.5" />
    <!-- Spherical Brass Pommel Cap -->
    <circle cx="80" cy="378" r="6" fill="url(#shanks-gold-grad)" stroke="#8C6F19" stroke-width="1" />
    <!-- Curved Brass Guard Arc -->
    <path d="M 78,380 C 65,395 68,415 80,426" stroke="url(#shanks-gold-grad)" stroke-width="3" fill="none" stroke-linecap="round" />
    <!-- Scabbard Top Chape -->
    <path d="M 86,430 L 98,460 L 110,457 L 98,427 Z" fill="#2A2A30" stroke="#1B1B20" stroke-width="1.5" />
    <path d="M 89,438 L 101,435" stroke="url(#shanks-gold-grad)" stroke-width="3" />
  </g>

  <!-- LAYER 5: Head, Neck, Jaw, Ears & Scars -->
  <g id="layer-head">
    <!-- Neck Silhouette -->
    <path d="M 166,230 C 166,270 162,285 160,305 L 240,305 C 238,285 234,270 234,230 Z" fill="url(#shanks-neck-grad)" />
    <!-- Sternocleidomastoid Neck Muscle Lines -->
    <path d="M 176,245 Q 180,275 192,305" stroke="#BF8960" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <path d="M 224,245 Q 220,275 208,305" stroke="#BF8960" stroke-width="2.5" fill="none" stroke-linecap="round" />
    <!-- Adam's Apple Shadow -->
    <path d="M 196,272 L 200,277 L 204,272" stroke="#B37C52" stroke-width="2" fill="none" stroke-linecap="round" />
    <!-- Left Ear (Viewer's Left, X=136) -->
    <path d="M 144,175 C 132,175 130,205 142,215 C 145,217 146,210 145,200 Z" fill="#F2CEAE" stroke="#D4A882" stroke-width="1.5" />
    <path d="M 139,185 Q 135,195 142,205" stroke="#C99870" stroke-width="1.5" fill="none" />
    <!-- Right Ear (Viewer's Right, X=264) -->
    <path d="M 256,175 C 268,175 270,205 258,215 C 255,217 254,210 255,200 Z" fill="#F2CEAE" stroke="#D4A882" stroke-width="1.5" />
    <path d="M 261,185 Q 265,195 258,205" stroke="#C99870" stroke-width="1.5" fill="none" />
    <!-- Defined Anime Jawline & Chin -->
    <path id="jaw-contour" d="M 144,165 C 142,205 148,228 168,248 L 190,265 L 210,265 L 232,248 C 252,228 258,205 256,165 C 256,130 240,110 200,110 C 160,110 144,130 144,165 Z" fill="url(#shanks-skin-grad)" stroke="#D4A882" stroke-width="1.5" />
    <!-- Jaw Stubble / 5 O'Clock Shadow -->
    <g id="jaw-stubble" opacity="0.65">
      <path d="M 188,260 Q 200,263 212,260" stroke="#684A3B" stroke-width="2" stroke-dasharray="1.5 2" fill="none" />
      <path d="M 185,263 Q 200,266 215,263" stroke="#684A3B" stroke-width="2" stroke-dasharray="2 2" fill="none" />
      <path d="M 190,266 Q 200,268 210,266" stroke="#684A3B" stroke-width="1.5" stroke-dasharray="1 2" fill="none" />
      <path d="M 152,222 Q 166,242 184,258" stroke="#684A3B" stroke-width="1.8" stroke-dasharray="2 2.5" fill="none" />
      <path d="M 248,222 Q 234,242 216,258" stroke="#684A3B" stroke-width="1.8" stroke-dasharray="2 2.5" fill="none" />
    </g>
    <!-- CANONICAL THREE CLAW SCARS (Across Left Eye, Viewer's Right) -->
    <g id="shanks-scars">
      <!-- Inner Scar -->
      <path d="M 226,150 L 230,166 L 233,184 L 235,198" stroke="#A83236" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M 226,150 L 230,166 L 233,184 L 235,198" stroke="#5C1417" stroke-width="1.2" stroke-linecap="round" fill="none" />
      <line x1="225" y1="156" x2="229" y2="157" stroke="#CB6D6F" stroke-width="1" />
      <line x1="230" y1="174" x2="234" y2="175" stroke="#CB6D6F" stroke-width="1" />
      <line x1="233" y1="192" x2="237" y2="193" stroke="#CB6D6F" stroke-width="1" />
      <!-- Middle Scar (Longest, slicing directly through eye center) -->
      <path d="M 234,142 L 238,162 L 241,185 L 244,206" stroke="#A83236" stroke-width="3.5" stroke-linecap="round" fill="none" />
      <path d="M 234,142 L 238,162 L 241,185 L 244,206" stroke="#5C1417" stroke-width="1.4" stroke-linecap="round" fill="none" />
      <line x1="233" y1="150" x2="237" y2="151" stroke="#CB6D6F" stroke-width="1" />
      <line x1="238" y1="170" x2="242" y2="171" stroke="#CB6D6F" stroke-width="1" />
      <line x1="241" y1="196" x2="245" y2="197" stroke="#CB6D6F" stroke-width="1" />
      <!-- Outer Scar -->
      <path d="M 242,148 L 246,165 L 249,183 L 251,196" stroke="#A83236" stroke-width="3" stroke-linecap="round" fill="none" />
      <path d="M 242,148 L 246,165 L 249,183 L 251,196" stroke="#5C1417" stroke-width="1.2" stroke-linecap="round" fill="none" />
      <line x1="242" y1="154" x2="246" y2="155" stroke="#CB6D6F" stroke-width="1" />
      <line x1="246" y1="174" x2="250" y2="175" stroke="#CB6D6F" stroke-width="1" />
      <line x1="249" y1="190" x2="253" y2="191" stroke="#CB6D6F" stroke-width="1" />
    </g>
  </g>

  <!-- LAYER 6: Eyes & Eyebrows -->
  <g id="layer-eyes">
    <!-- CHARACTER RIGHT EYE (Viewer's Left, Center=(164, 175)) -->
    <g id="eye-right-group">
      <!-- Eyebrow Right -->
      <path id="eyebrow-right" class="shanks-eyebrow" d="M 148,162 C 155,158 168,157 178,163 C 172,165 160,163 150,165 Z" fill="#8A1B1B" stroke="#5A0F11" stroke-width="0.8" />
      <!-- Sclera -->
      <path d="M 152,174 C 158,168 170,168 176,174 C 170,180 158,180 152,174 Z" fill="#F5F5FA" stroke="#C8C8D4" stroke-width="0.8" />
      <path d="M 153,172 C 160,169 168,169 175,172" stroke="#D0D0DC" stroke-width="1.5" fill="none" />
      <!-- Iris & Pupil (Clipped) -->
      <g clip-path="url(#right-eye-clip)">
        <circle cx="164" cy="174" r="5" fill="#1A110C" />
        <circle cx="164" cy="174" r="3.2" fill="#A35415" />
        <circle cx="164" cy="174" r="1.8" fill="#0A0604" />
        <circle cx="162.5" cy="172.5" r="1" fill="#FFFFFF" />
      </g>
      <!-- Upper Lash Line -->
      <path d="M 150,174 Q 164,168 178,173" stroke="#22120C" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <!-- Blinking Eyelid -->
      <g class="eyelid-wrapper" style="transform-origin: 164px 169px;">
        <path class="eyelid eyelid-right" d="M 149,168 C 158,166 170,166 179,168 L 179,178 C 170,182 158,182 149,178 Z" fill="#F2CEAE" stroke="#D4A882" stroke-width="1" />
        <path class="eyelid-crease" d="M 151,174 Q 164,176 177,174" stroke="#8A4E32" stroke-width="1.5" fill="none" />
      </g>
    </g>

    <!-- CHARACTER LEFT EYE (Viewer's Right, Scarred, Center=(236, 175)) -->
    <g id="eye-left-group">
      <!-- Eyebrow Left -->
      <path id="eyebrow-left" class="shanks-eyebrow" d="M 222,163 C 232,157 245,158 252,162 C 250,165 238,163 224,165 Z" fill="#8A1B1B" stroke="#5A0F11" stroke-width="0.8" />
      <!-- Sclera -->
      <path d="M 224,174 C 230,168 242,168 248,174 C 242,180 230,180 224,174 Z" fill="#F5F5FA" stroke="#C8C8D4" stroke-width="0.8" />
      <path d="M 225,172 C 232,169 240,169 247,172" stroke="#D0D0DC" stroke-width="1.5" fill="none" />
      <!-- Iris & Pupil (Clipped) -->
      <g clip-path="url(#left-eye-clip)">
        <circle cx="236" cy="174" r="5" fill="#1A110C" />
        <circle cx="236" cy="174" r="3.2" fill="#A35415" />
        <circle cx="236" cy="174" r="1.8" fill="#0A0604" />
        <circle cx="234.5" cy="172.5" r="1" fill="#FFFFFF" />
      </g>
      <!-- Upper Lash Line -->
      <path d="M 222,173 Q 236,168 250,174" stroke="#22120C" stroke-width="2.2" stroke-linecap="round" fill="none" />
      <!-- Blinking Eyelid -->
      <g class="eyelid-wrapper" style="transform-origin: 236px 169px;">
        <path class="eyelid eyelid-left" d="M 221,168 C 230,166 242,166 251,168 L 251,178 C 242,182 230,182 221,178 Z" fill="#F2CEAE" stroke="#D4A882" stroke-width="1" />
        <path class="eyelid-crease" d="M 223,174 Q 236,176 249,174" stroke="#8A4E32" stroke-width="1.5" fill="none" />
      </g>
    </g>
  </g>

  <!-- LAYER 7: Nose & Shadow Contours -->
  <g id="layer-nose">
    <path d="M 197,185 L 198,206" stroke="#D4A882" stroke-width="1.2" stroke-linecap="round" />
    <path d="M 194,212 Q 199,215 204,212" stroke="#B87D56" stroke-width="2" stroke-linecap="round" fill="none" />
    <circle cx="206" cy="211" r="1.2" fill="#8C5332" />
    <path d="M 195,214 Q 200,217 205,214" stroke="#C99870" stroke-width="1" fill="none" />
  </g>

  <!-- LAYER 8: Mouth Viseme Group (5 Distinct Pre-Rendered Shapes) -->
  <g id="layer-mouth-group" class="viseme-closed">
    <!-- VISEME 1: CLOSED (Default confident pirate resting smirk) -->
    <g id="viseme-closed" class="viseme">
      <path d="M 188,245 Q 198,247 212,244" stroke="#3A1C14" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 211,244 Q 214,242 215,244" stroke="#5A2E20" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <path d="M 194,251 Q 200,252.5 206,251" stroke="#B87D56" stroke-width="2.2" stroke-linecap="round" fill="none" />
    </g>

    <!-- VISEME 2: NARROW (/e/, /i/, consonants, sibilance) -->
    <g id="viseme-narrow" class="viseme">
      <path d="M 186,245 Q 200,242 214,245 Q 200,249 186,245 Z" fill="#2E0D10" stroke="#4A181C" stroke-width="1.5" />
      <path d="M 189,244.5 Q 200,243 211,244.5 L 210,246 Q 200,244.5 190,246 Z" fill="#F8F8FA" />
      <path d="M 193,252 Q 200,253.5 207,252" stroke="#B87D56" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>

    <!-- VISEME 3: ROUND (/o/, /u/, low-mid formant focus) -->
    <g id="viseme-round" class="viseme">
      <ellipse cx="200" cy="247" rx="8" ry="9" fill="#260A0D" stroke="#4A181C" stroke-width="1.8" />
      <path d="M 195,251 Q 200,248 205,251 Q 200,255 195,251 Z" fill="#992A34" />
      <path d="M 195,241 Q 200,243 205,241" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" fill="none" />
      <path d="M 194,258 Q 200,259.5 206,258" stroke="#B87D56" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>

    <!-- VISEME 4: OPEN (/a/, /ah/, high energy vocal syllables) -->
    <g id="viseme-open" class="viseme">
      <path d="M 186,242 C 188,239 212,239 214,242 C 216,252 210,260 200,260 C 190,260 184,252 186,242 Z" fill="#24070A" stroke="#4A181C" stroke-width="2" />
      <path d="M 188,242 Q 200,244 212,242 L 211,246 Q 200,248 189,246 Z" fill="#FFFFFF" />
      <path d="M 191,256 Q 200,250 209,256 C 206,259 194,259 191,256 Z" fill="#B32D3A" />
      <path d="M 192,264 Q 200,266 208,264" stroke="#B87D56" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>

    <!-- VISEME 5: LAUGH ("Dahahaha!", wide open joyful pirate grin) -->
    <g id="viseme-laugh" class="viseme">
      <path d="M 182,240 C 186,236 214,236 218,240 C 222,256 214,266 200,266 C 186,266 178,256 182,240 Z" fill="#1F0407" stroke="#401014" stroke-width="2" />
      <path d="M 184,240 Q 200,243 216,240 L 215,246 Q 200,248 185,246 Z" fill="#FFFFFF" />
      <line x1="195" y1="240" x2="195" y2="245" stroke="#E0E0E8" stroke-width="0.8" />
      <line x1="200" y1="241" x2="200" y2="246" stroke="#E0E0E8" stroke-width="0.8" />
      <line x1="205" y1="240" x2="205" y2="245" stroke="#E0E0E8" stroke-width="0.8" />
      <path d="M 188,262 Q 200,258 212,262 L 211,259 Q 200,256 189,259 Z" fill="#F0F0F8" />
      <ellipse cx="200" cy="256" rx="9" ry="5" fill="#C2303E" />
      <path d="M 179,238 Q 181,243 180,246" stroke="#8C4426" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <path d="M 221,238 Q 219,243 220,246" stroke="#8C4426" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <path d="M 190,270 Q 200,272 210,270" stroke="#B87D56" stroke-width="2" stroke-linecap="round" fill="none" />
    </g>
  </g>

  <!-- LAYER 9: Crimson Hair Front & Bangs -->
  <g id="layer-hair-front">
    <!-- Crown Top Volume & Center Part Base -->
    <path d="M 145,130 C 140,85 170,68 200,68 C 230,68 260,85 255,130 C 248,110 225,98 200,98 C 175,98 152,110 145,130 Z" fill="url(#shanks-hair-grad)" />
    <!-- LEFT HAIR MASS (Viewer's Left) -->
    <g id="hair-mass-left" class="hair-wave-left" style="transform-origin: 155px 105px;">
      <path d="M 152,112 C 132,130 120,165 118,210 C 117,240 125,275 136,295 C 134,265 130,225 136,190 C 140,165 146,140 155,120 Z" fill="url(#shanks-hair-grad)" stroke="#6B0F13" stroke-width="1" />
      <path d="M 160,118 C 148,140 144,165 143,195 C 147,175 152,155 162,132 Z" fill="#D61838" />
      <path d="M 124,200 C 114,225 110,255 118,280 C 122,255 125,230 130,208 Z" fill="#7A1215" />
    </g>
    <!-- RIGHT HAIR MASS (Viewer's Right) -->
    <g id="hair-mass-right" class="hair-wave-right" style="transform-origin: 245px 105px;">
      <path d="M 248,112 C 268,130 280,165 282,210 C 283,240 275,275 264,295 C 266,265 270,225 264,190 C 260,165 254,140 245,120 Z" fill="url(#shanks-hair-grad)" stroke="#6B0F13" stroke-width="1" />
      <path d="M 240,118 C 252,140 256,165 257,195 C 253,175 248,155 238,132 Z" fill="#D61838" />
      <path d="M 276,200 C 286,225 290,255 282,280 C 278,255 275,230 270,208 Z" fill="#7A1215" />
    </g>
    <!-- FOREHEAD CENTER BANGS & PARTING -->
    <g id="hair-bangs-center">
      <path d="M 200,72 L 200,108" stroke="#4A080A" stroke-width="2" stroke-linecap="round" />
      <path d="M 198,100 C 185,115 174,130 166,150 C 174,135 186,122 201,112 Z" fill="#B22222" stroke="#660D10" stroke-width="0.8" />
      <path d="M 202,100 C 215,115 226,130 234,150 C 226,135 214,122 199,112 Z" fill="#B22222" stroke="#660D10" stroke-width="0.8" />
      <path d="M 188,106 C 182,122 178,138 177,152 C 182,138 188,124 193,112 Z" fill="#D61838" />
      <path d="M 212,106 C 218,122 222,138 223,152 C 218,138 212,124 207,112 Z" fill="#D61838" />
    </g>
  </g>

  <!-- LAYER 10: Cape Front, Collar & Pinned Empty Left Sleeve -->
  <g id="layer-cape-front">
    <!-- High Popped Cloak Collar -->
    <path d="M 135,270 C 125,230 135,185 142,165 L 155,200 C 148,225 145,255 152,280 Z" fill="url(#shanks-cape-grad)" stroke="#0E0E12" stroke-width="1.5" />
    <path d="M 265,270 C 275,230 265,185 258,165 L 245,200 C 252,225 255,255 248,280 Z" fill="url(#shanks-cape-grad)" stroke="#0E0E12" stroke-width="1.5" />
    <!-- Cape Shoulder Mantle Folds -->
    <path d="M 75,305 C 95,295 130,288 160,296 L 154,325 C 128,320 98,328 78,345 Z" fill="#18181D" stroke="#0B0B0E" stroke-width="1.5" />
    <!-- Gold Cape Fastener Chain & Brass Medallion -->
    <path d="M 154,298 Q 200,312 246,298" stroke="url(#shanks-gold-grad)" stroke-width="3.5" fill="none" stroke-linecap="round" />
    <circle cx="200" cy="308" r="5" fill="url(#shanks-gold-grad)" stroke="#73550E" stroke-width="1.5" />
    <!-- STRICTLY PINNED BACK EMPTY LEFT SLEEVE (Viewer's Right) -->
    <g id="pinned-empty-sleeve">
      <path d="M 240,296 C 270,288 305,295 325,305 L 322,345 C 302,328 272,320 246,325 Z" fill="#18181D" stroke="#0B0B0E" stroke-width="1.5" />
      <path d="M 315,320 C 318,355 315,400 310,445 L 282,442 C 285,400 288,355 285,322 Z" fill="#131317" stroke="#0A0A0C" stroke-width="1.5" />
      <!-- Gold Safety Pin / Fastener Clasp -->
      <line x1="288" y1="355" x2="310" y2="350" stroke="url(#shanks-gold-grad)" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="289" cy="355" r="2" fill="#FBE68A" />
      <!-- Hollow Bottom Cuff (Flattened void) -->
      <ellipse cx="296" cy="444" rx="14" ry="4" fill="#0A0A0D" stroke="#1F1F26" stroke-width="1.5" />
      <path d="M 298,358 L 297,438" stroke="#08080A" stroke-width="2" stroke-linecap="round" />
    </g>
  </g>
</svg>`;
  }

  /**
   * Initializes the SVG DOM inside the target container element
   * @param {HTMLElement|string} containerElement
   */
  init(containerElement) {
    if (typeof document === 'undefined') {
      // In non-DOM environment (e.g. Node.js unit tests)
      return;
    }

    if (typeof containerElement === 'string') {
      this.container = document.getElementById(containerElement) || document.querySelector(containerElement);
    } else if (containerElement && containerElement.nodeType) {
      this.container = containerElement;
    }

    if (!this.container) {
      console.warn('[ShanksAvatar] Warning: Container element could not be found during init()');
      return;
    }

    // Ensure avatar.css is loaded if not already present
    this._ensureStylesheetLoaded();

    // Set container classes
    this.container.classList.add('shanks-avatar-container');
    if (!this.container.id) {
      this.container.id = 'shanks-avatar-container';
    }

    // Embed SVG Markup
    this.container.innerHTML = ShanksAvatar.getSvgMarkup();
    this.svgElement = this.container.querySelector('#shanks-avatar-svg');
    this.mouthGroup = this.container.querySelector('#layer-mouth-group');
    this.layerHead = this.container.querySelector('#layer-head');
    this.eyebrowRight = this.container.querySelector('#eyebrow-right');
    this.eyebrowLeft = this.container.querySelector('#eyebrow-left');

    // Initial state and viseme
    this.setState(this.options.defaultState);
    this.setViseme(this.options.defaultViseme);

    // Start natural blinking scheduler
    this._scheduleBlink();
  }

  /**
   * Backward-compatibility alias for older scaffolding
   */
  renderSvg() {
    if (this.container) {
      this.init(this.container);
    }
  }

  /**
   * Dynamically links public/css/avatar.css if not already referenced
   * @private
   */
  _ensureStylesheetLoaded() {
    if (typeof document === 'undefined') return;
    const existing = document.querySelector('link[href*="avatar.css"]');
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'css/avatar.css';
      document.head.appendChild(link);
    }
  }

  /**
   * Sets the avatar state
   * @param {string} state - 'idle' | 'listening' | 'recording' | 'processing' | 'speaking' | 'error'
   */
  setState(state) {
    if (!state) return;
    const rawState = String(state).toLowerCase();
    let normalized = rawState;
    if (rawState === 'thinking') normalized = 'processing';
    if (rawState === 'recording') normalized = 'listening';

    this.currentState = normalized;

    if (!this.container) return;

    // Remove previous state classes
    const stateClasses = ['state-idle', 'state-listening', 'state-recording', 'state-speaking', 'state-processing', 'state-error'];
    stateClasses.forEach(cls => {
      this.container.classList.remove(cls);
      if (this.svgElement) this.svgElement.classList.remove(cls);
    });

    const newClass = `state-${normalized}`;
    this.container.classList.add(newClass);
    if (this.svgElement) this.svgElement.classList.add(newClass);

    this.container.setAttribute('data-state', normalized);

    // If leaving speaking state, reset mouth to closed and clear head micro-motion
    if (normalized !== 'speaking') {
      this.setViseme('closed');
      if (this.layerHead) {
        this.layerHead.style.transform = '';
      }
    }
  }

  /**
   * Gets current state
   * @returns {string}
   */
  getState() {
    return this.currentState;
  }

  /**
   * Sets the active mouth viseme
   * @param {'closed'|'narrow'|'round'|'open'|'laugh'} viseme
   */
  setViseme(viseme) {
    const validVisemes = ['closed', 'narrow', 'round', 'open', 'laugh'];
    const target = validVisemes.includes(viseme) ? viseme : 'closed';
    this.currentViseme = target;

    if (!this.mouthGroup) return;

    // Reset viseme classes on mouth group
    validVisemes.forEach(v => {
      this.mouthGroup.classList.remove(`viseme-${v}`);
    });
    this.mouthGroup.classList.add(`viseme-${target}`);

    if (this.container) {
      this.container.classList.toggle('viseme-laugh', target === 'laugh');
    }
  }

  /**
   * Gets active viseme
   * @returns {string}
   */
  getViseme() {
    return this.currentViseme;
  }

  /**
   * Ingests real-time normalized audio energy RMS [0.0 - 1.0] for micro-motion
   * @param {number} rms
   */
  setAudioEnergy(rms) {
    this.audioEnergy = Math.max(0, Math.min(1, Number(rms) || 0));

    if (this.currentState !== 'speaking' || !this.layerHead) {
      return;
    }

    if (this.audioEnergy > 0.04) {
      const offsetY = -(this.audioEnergy * 4.5);
      const angle = (Math.sin(Date.now() * 0.008) * 1.2 * this.audioEnergy).toFixed(2);
      this.layerHead.style.transform = `translate3d(0, ${offsetY.toFixed(2)}px, 0) rotate(${angle}deg)`;
    } else {
      this.layerHead.style.transform = '';
    }
  }

  /**
   * Triggers an immediate natural eye blink sequence
   * @param {boolean} [allowDouble=true] - Whether double-blink is permitted
   */
  triggerBlink(allowDouble = true) {
    if (this.isBlinking || this.isDestroyed || !this.container) return;

    // Suppress blink during joyous laugh to preserve crescent squint expression
    if (this.currentViseme === 'laugh') return;

    this.isBlinking = true;
    this.container.classList.add('is-blinking');

    // Blink close duration (120ms - 140ms)
    this.blinkEndTimer = setTimeout(() => {
      if (this.isDestroyed || !this.container) return;
      this.container.classList.remove('is-blinking');
      this.isBlinking = false;

      // Handle natural double blink
      if (allowDouble && Math.random() < this.options.doubleBlinkProbability) {
        this.doubleBlinkTimer = setTimeout(() => {
          this.triggerBlink(false);
        }, 80);
      }
    }, 130);
  }

  /**
   * Schedules next natural random blink
   * @private
   */
  _scheduleBlink() {
    if (this.isDestroyed) return;

    const min = this.options.minBlinkInterval;
    const max = this.options.maxBlinkInterval;
    const interval = min + Math.random() * (max - min);

    this.blinkTimer = setTimeout(() => {
      this.triggerBlink(true);
      this._scheduleBlink();
    }, interval);
  }

  /**
   * Cleans up timers, event handlers, and DOM
   */
  destroy() {
    this.isDestroyed = true;
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.doubleBlinkTimer) clearTimeout(this.doubleBlinkTimer);
    if (this.blinkEndTimer) clearTimeout(this.blinkEndTimer);

    if (this.container) {
      this.container.classList.remove('is-blinking', 'viseme-laugh');
    }
  }
}

// Dual Export (Browser Global + CommonJS Module)
if (typeof window !== 'undefined') {
  window.ShanksAvatar = ShanksAvatar;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShanksAvatar };
}
