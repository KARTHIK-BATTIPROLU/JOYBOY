// Conqueror's Haki (Haoshoku Haki) Canvas VFX Engine

class HakiVFX {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.activeBolts = [];
    this.particles = [];
    this.shockwaves = [];
    this.isActive = false;
    this.animId = null;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  resize() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  /**
   * Unleashes a dramatic burst of Conqueror's Haki
   */
  triggerHakiBurst(intensity = 1.0) {
    this.isActive = true;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height * 0.45;

    // Screen Shake effect
    const container = document.querySelector('.character-viewport');
    if (container) {
      container.style.animation = 'none';
      container.offsetHeight; // reflow
      container.style.animation = 'hakiTremor 0.6s cubic-bezier(.36,.07,.19,.97) both';
      setTimeout(() => {
        container.style.animation = '';
      }, 650);
    }

    // Add radial shockwave
    this.shockwaves.push({
      x: centerX,
      y: centerY,
      radius: 10,
      maxRadius: Math.max(this.canvas.width, this.canvas.height) * 0.85,
      alpha: 1.0,
      lineWidth: 8 * intensity,
      speed: 16 * intensity
    });

    // Spawn branching red lightning arcs
    const boltCount = Math.floor(6 + Math.random() * 6 * intensity);
    for (let i = 0; i < boltCount; i++) {
      const angle = (Math.PI * 2 * i) / boltCount + (Math.random() - 0.5) * 0.5;
      const targetDist = 180 + Math.random() * 260;
      const targetX = centerX + Math.cos(angle) * targetDist;
      const targetY = centerY + Math.sin(angle) * targetDist;
      this.createLightningBolt(centerX, centerY, targetX, targetY, 4, intensity);
    }

    // Spawn sparks
    for (let i = 0; i < 40 * intensity; i++) {
      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 60,
        y: centerY + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 14 * intensity,
        vy: (Math.random() - 0.5) * 14 * intensity,
        size: 2 + Math.random() * 4,
        alpha: 1.0,
        color: Math.random() > 0.3 ? '#ff1e38' : '#ffe17d',
        life: 0.95
      });
    }
  }

  createLightningBolt(x1, y1, x2, y2, branches = 3, intensity = 1.0) {
    const segments = [];
    let currentX = x1;
    let currentY = y1;
    const steps = 8 + Math.floor(Math.random() * 6);
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 0; i < steps; i++) {
      const nextX = currentX + dx + (Math.random() - 0.5) * 35;
      const nextY = currentY + dy + (Math.random() - 0.5) * 35;
      segments.push({ x1: currentX, y1: currentY, x2: nextX, y2: nextY });
      currentX = nextX;
      currentY = nextY;
    }

    this.activeBolts.push({
      segments,
      alpha: 1.0,
      width: (2.5 + Math.random() * 3) * intensity,
      decay: 0.05 + Math.random() * 0.04
    });
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 30, 56, ${sw.alpha * 0.8})`;
      this.ctx.lineWidth = sw.lineWidth;
      this.ctx.shadowColor = '#ff0033';
      this.ctx.shadowBlur = 20;
      this.ctx.stroke();

      // Inner gold ring
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius * 0.9, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(229, 179, 88, ${sw.alpha * 0.4})`;
      this.ctx.lineWidth = sw.lineWidth * 0.5;
      this.ctx.stroke();
      this.ctx.restore();

      sw.radius += sw.speed;
      sw.alpha -= 0.035;
      if (sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 2. Draw Lightning Bolts (Black core with Crimson Outer Glow)
    for (let i = this.activeBolts.length - 1; i >= 0; i--) {
      const bolt = this.activeBolts[i];
      this.ctx.save();

      // Outer Crimson Haki Glow
      this.ctx.strokeStyle = `rgba(255, 20, 50, ${bolt.alpha})`;
      this.ctx.lineWidth = bolt.width * 2.2;
      this.ctx.shadowColor = '#ff0037';
      this.ctx.shadowBlur = 18;
      this.ctx.beginPath();
      bolt.segments.forEach(seg => {
        this.ctx.moveTo(seg.x1, seg.y1);
        this.ctx.lineTo(seg.x2, seg.y2);
      });
      this.ctx.stroke();

      // Inner Dark Core / Pure energy
      this.ctx.strokeStyle = `rgba(20, 0, 5, ${bolt.alpha * 0.9})`;
      this.ctx.lineWidth = bolt.width * 0.8;
      this.ctx.shadowBlur = 0;
      this.ctx.beginPath();
      bolt.segments.forEach(seg => {
        this.ctx.moveTo(seg.x1, seg.y1);
        this.ctx.lineTo(seg.x2, seg.y2);
      });
      this.ctx.stroke();

      this.ctx.restore();

      bolt.alpha -= bolt.decay;
      if (bolt.alpha <= 0) {
        this.activeBolts.splice(i, 1);
      }
    }

    // 3. Draw Sparks / Embers
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.alpha;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      p.x += p.vx;
      p.y += p.vy;
      p.alpha *= p.life;
      p.size = Math.max(0, p.size - 0.05);

      if (p.alpha <= 0.05 || p.size <= 0) {
        this.particles.splice(i, 1);
      }
    }

    requestAnimationFrame(() => this.loop());
  }
}

// Add CSS keyframe tremor dynamically
const styleTag = document.createElement('style');
styleTag.innerHTML = `
@keyframes hakiTremor {
  10%, 90% { transform: translate3d(-3px, 1px, 0); }
  20%, 80% { transform: translate3d(4px, -2px, 0); }
  30%, 50%, 70% { transform: translate3d(-6px, 3px, 0); }
  40%, 60% { transform: translate3d(6px, -3px, 0); }
}
`;
document.head.appendChild(styleTag);
