import { Config } from "./config.js";
import { GameState } from "./game_state.js";
import { ctx } from "./ui.js";
import { getPoolSurfaceY } from "./effects.js";
import { canvasWidth, canvasHeight } from "./ui.js";

/**
 * Calculates a point on a Catmull-Rom spline.
 * @param {number} t - The interpolation factor (from 0 to 1).
 * @param {object} p0 - The point before the segment starts.
 * @param {object} p1 - The start point of the segment.
 * @param {object} p2 - The end point of the segment.
 * @param {object} p3 - The point after the segment ends.
 * @returns {{x: number, y: number}} The interpolated point on the curve.
 */
function catmullRom(t, p0, p1, p2, p3) {
  const t2 = t * t;
  const t3 = t2 * t;
  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
  return { x, y };
}

export function spawnParticles(
  count,
  x,
  y,
  color,
  maxSpeed,
  minSize,
  maxSize,
  life = Config.PARTICLE_LIFETIME_MS,
  outwardBias = true,
  type = "debris",
  spawnRadius = null
) {
  for (let i = 0; i < count; i++) {
    let finalColor = { ...color };

    if (
      type === "corruption" ||
      type == "corruption_inert" ||
      type == "glory"
    ) {
      const variance = Config.corruptionColorVariance;
      // Add a random offset to each color channel
      const r_offset = (Math.random() - 0.5) * variance;
      const g_offset = (Math.random() - 0.5) * variance;
      const b_offset = (Math.random() - 0.5) * variance;

      // Apply the offset and clamp the value between 0 and 255
      finalColor.r = Math.max(0, Math.min(255, color.r + r_offset));
      finalColor.g = Math.max(0, Math.min(255, color.g + g_offset));
      finalColor.b = Math.max(0, Math.min(255, color.b + b_offset));
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * maxSpeed + 0.5;

    let spawnX = x;
    let spawnY = y;
    if (spawnRadius && spawnRadius > 0) {
      const r = spawnRadius * Math.sqrt(Math.random());
      const theta = Math.random() * 2 * Math.PI;

      spawnX = x + r * Math.cos(theta);
      spawnY = y + r * Math.sin(theta);
    }

    const particleData = {
      id: Date.now() + Math.random(), // Add this line
      x: spawnX,
      y: spawnY,
      vx: outwardBias
        ? Math.cos(angle) * speed
        : (Math.random() - 0.5) * maxSpeed * 1.5,
      vy: outwardBias
        ? Math.sin(angle) * speed
        : (Math.random() - 0.5) * maxSpeed * 1.5,
      radius: Math.random() * (maxSize - minSize) + minSize,
      color: finalColor,
      alpha: 1.0,
      life: life * (Math.random() * 0.6 + 0.7),
      totalLife: life,
      type: type,
      trail: [],
    };

    if (
      type === "corruption" ||
      type == "corruption_inert" ||
      type == "glory" ||
      type === "flare"
    ) {
      particleData.oscillationFrequency = Math.random() * 0.01 + 0.005;
      particleData.oscillationOffset = Math.random() * Math.PI * 2;
      if (type === "flare") {
        particleData.vy = -maxSpeed; // Ensure flare has upward velocity
      }
    }

    GameState.particles.push(particleData);
  }
}

export function spawnParticlesAlongCurve(cfg) {
  if (!GameState.windCurve) return;

  const points = GameState.windCurve.points;
  if (points.length < 2) return;

  for (let i = 0; i < cfg.windParticlesPerFrame; i++) {
    // 1. Pick a random spot along the entire curve's length
    const segmentIndex = Math.floor(Math.random() * (points.length - 1));
    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];

    // 2. Calculate the base spawn position on that segment
    const t = Math.random();
    const spawnX = p1.x + (p2.x - p1.x) * t;
    const spawnY = p1.y + (p2.y - p1.y) * t;

    // 3. Calculate a random offset perpendicular to the curve direction
    const tangentX = p2.x - p1.x;
    const tangentY = p2.y - p1.y;
    const mag = Math.sqrt(tangentX * tangentX + tangentY * tangentY);

    if (mag > 0) {
      const normalX = -tangentY / mag;
      const normalY = tangentX / mag;

      // Random distance from -spread/2 to +spread/2
      const offsetDistance = (Math.random() - 0.5) * cfg.windParticleSpread;

      const particleX = spawnX + normalX * offsetDistance;
      const particleY = spawnY + normalY * offsetDistance;

      // 4. Create the new particle with the offset position
      GameState.particles.push({
        type: "wind",
        x: particleX,
        y: particleY,
        life: cfg.windParticleLifetime * (0.5 + Math.random() * 0.5),
        totalLife: cfg.windParticleLifetime,
        speed:
          cfg.windParticleBaseSpeed +
          Math.random() * cfg.windParticleSpeedVariance,
        curve: GameState.windCurve,
        curveIndex: segmentIndex,
        color: cfg.invertColors
          ? cfg.windParticleColor.inverted
          : cfg.windParticleColor.normal,
        offsetDistance: offsetDistance,
        vx: 0,
        vy: 0,
        detached: false,
        isDeflected: false,
        trail: [],
        segmentProgress: 0,
      });
    }
  }
}

export function updateAndDrawParticles(deltaTime) {
  // ctx.globalCompositeOperation = "lighter";

  for (let i = GameState.particles.length - 1; i >= 0; i--) {
    const p = GameState.particles[i];

    // --- NEW: Record trail BEFORE the particle moves ---
    if (p.type === "wind") {
      p.trail.push({ x: p.x, y: p.y });
      // Keep the trail from getting too long
      if (p.trail.length > Config.windParticleTrailLength) {
        p.trail.shift();
      }
    } else if (p.type === "sidewaysWind") {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > Config.sidewaysWindParticleTrailLength) {
        p.trail.shift();
      }
    }

    // --- (The existing physics logic for all particle types remains here) ---
    if (p.type === "flare") {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 120) p.trail.shift(); // Keep trail length manageable

      // 1. Vertical motion: Move up, then slow down and fall
      p.y += p.vy;
    } else if (p.type === "wind") {
      // First, check if a following particle should detach from the curve
      if (
        !p.detached &&
        (!p.curve || p.curve.points.length <= p.curveIndex + 1)
        // !GameState.windCurve ||
        // GameState.windCurve.points.length < 2)
      ) {
        p.detached = true; // It has reached the end, so it detaches.
      }

      // --- Apply physics based on state (following vs. detached) ---
      if (p.detached) {
        // DETACHED: Particle now moves freely based on its last momentum.
        p.x += p.vx;
        p.y += p.vy;
        // Apply friction to slow it down naturally.
        p.vx *= Config.PARTICLE_FRICTION;
        p.vy *= Config.PARTICLE_FRICTION;
        p.life -= deltaTime * 4;
      } else {
        // 1. Check if the particle's curve is still valid
        const curvePoints = p.curve ? p.curve.points : [];
        if (!p.curve || curvePoints.length < p.curveIndex + 2) {
          p.life = 0;
        } else {
          // 2. Get the 4 control points for the Catmull-Rom spline
          const p0 = curvePoints[p.curveIndex - 1] || curvePoints[p.curveIndex]; // Use duplicate point at start
          const p1 = curvePoints[p.curveIndex];
          const p2 = curvePoints[p.curveIndex + 1];
          const p3 = curvePoints[p.curveIndex + 2] || p2; // Use duplicate point at end

          // 3. Advance the particle's progress along the current segment
          const segmentLength =
            Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2) || 1;
          p.segmentProgress += p.speed / segmentLength;

          // 4. Calculate the new position on the smooth curve
          const newPos = catmullRom(
            Math.min(1.0, p.segmentProgress),
            p0,
            p1,
            p2,
            p3
          );

          // 5. Apply the parallel offset (for spread)
          const tangentX = p2.x - p1.x;
          const tangentY = p2.y - p1.y;
          const mag = Math.sqrt(tangentX * tangentX + tangentY * tangentY) || 1;
          const normalX = -tangentY / mag;
          const normalY = tangentX / mag;

          const finalX = newPos.x + normalX * p.offsetDistance;
          const finalY = newPos.y + normalY * p.offsetDistance;

          // Store velocity for when it detaches
          p.vx = finalX - p.x;
          p.vy = finalY - p.y;

          p.x = finalX;
          p.y = finalY;

          // 6. If it has completed a segment, move to the next one
          if (p.segmentProgress >= 1.0) {
            p.segmentProgress -= 1.0;
            p.curveIndex++;
          }
        }
      }
    } else if (p.type === "sidewaysWind") {
      // 1. Move horizontally at a constant speed.
      p.x += p.vx;

      // 2. Calculate the vertical position directly using a sine wave.
      // This creates the smooth, wavy motion.
      const wobble =
        Math.sin(
          p.x * Config.sidewaysWindWobbleFrequency + p.oscillationOffset
        ) * Config.sidewaysWindWobbleAmplitude;
      p.y = p.startY + wobble;

      // Remove the particle if it goes far off-screen
      if (p.x < -50 || p.x > canvasWidth + 50) {
        p.life = 0;
      }
    } else if (p.type === "scorePopup") {
      // This particle just floats upwards and slows down
      p.y += p.vy;
      p.vy *= 0.98; // Apply some friction to the upward movement
    } else if (
      p.type === "corruption" ||
      p.type === "corruption_inert" ||
      p.type === "glory"
    ) {
      p.x += p.vx * (deltaTime / 16.67);
      p.y += p.vy * (deltaTime / 16.67);
      p.vx *= Config.friction;
      p.vy *= Config.friction;
      p.vy += Config.terminalVelocity * 0.3;
      const horizontalForce =
        Math.sin(p.life * p.oscillationFrequency + p.oscillationOffset) *
        Config.corruptionWobbleAmplitude;
      p.vx += horizontalForce;

      if (Config.enableParticleBouncing) {
        for (const ball of GameState.balls) {
          const dx = p.x - ball.x;
          const dy = p.y - ball.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // Check for collision
          if (distance < ball.radius) {
            // Calculate the normal vector of the collision (from ball center to particle)
            const normalX = dx / distance;
            const normalY = dy / distance;

            // Push the particle out to prevent it from getting stuck inside the ball
            const overlap = ball.radius - distance;
            p.x += normalX * (overlap + 1);
            p.y += normalY * (overlap + 1);

            // Apply a simple bounce force to the particle's velocity
            p.vx += normalX * Config.particleBounceFactor;
            p.vy += normalY * Config.particleBounceFactor;

            // A particle can only bounce off one ball per frame
            break;
          }
        }
      }
    } else if (p.type === "debris") {
      // Logic for debris particles remains the same
      p.x += p.vx * (deltaTime / 16.67);
      p.y += p.vy * (deltaTime / 16.67);
      p.vx *= Config.PARTICLE_FRICTION;
      p.vy *= Config.PARTICLE_FRICTION;
      p.vy += Config.gravity * 0.3;
    }

    if (p.y >= getPoolSurfaceY(p.x) && p.type !== "flare") {
      if (p.type === "corruption") {
        // 1. Increase the corruption level
        if (!GameState.isPoolRising) {
          GameState.corruptionTargetLevel += Config.corruptionPerParticle;
        }

        // 2. Create a splash effect
        spawnParticles(
          Config.splashParticleCount,
          p.x,
          p.y - 5, // Spawn slightly above the surface
          Config.corruptionParticleColor,
          Config.splashParticleSpeed,
          1,
          2, // Splash particles are small
          Config.splashParticleLifetime,
          true, // Outward burst
          "corruption_inert" // Splashes are just regular debris
        );
        // --- NEW: Add logic for glory particles hitting the pool ---
      } else if (p.type === "glory") {
        // Reduce the corruption target level, ensuring it doesn't go below 0
        if (!GameState.isPoolRising) {
          GameState.corruptionTargetLevel = Math.max(
            0,
            GameState.corruptionTargetLevel - Config.purificationPerParticle
          );
        }
        // Create a bright "shine" splash effect
        spawnParticles(
          Config.poolShineParticleCount,
          p.x,
          p.y - 5,
          Config.poolShineColor,
          Config.poolShineParticleSpeed,
          1,
          3,
          Config.poolShineParticleLifetime,
          true,
          "debris"
        );
        GameState.poolShineIntensity = Math.min(
          1.0,
          GameState.poolShineIntensity + Config.poolShineIntensityPerParticle
        );
      }

      // 3. Remove the corruption particle that hit the pool
      // Setting life to 0 will make it get cleaned up this frame.
      p.life = 0;
    }

    p.life -= deltaTime;
    p.alpha = Math.max(0, p.life / p.totalLife);
    if (p.life <= 0) {
      GameState.particles.splice(i, 1);
    } else {
      if (p.type === "flare" && p.trail.length > 1) {
        const startWidth = Config.voidTrailStartWidth;
        const endWidth = Config.voidTrailEndWidth;
        const opacity = Config.voidTrailOpacity;
        const trailColor = Config.voidTrailColor;

        for (let i = 0; i < p.trail.length; i++) {
          const trailPoint = p.trail[i];
          const progress = i / (p.trail.length - 1);

          // Use the selected properties to draw the trail
          const currentRadius =
            startWidth +
            (endWidth - startWidth) *
              (1 - progress) *
              ((2 * p.life) / Config.flareLifetime);

          let drawX = trailPoint.x;

          const timeComponent =
            GameState.totalElapsedTime * (Config.flareWobbleSpeed / 1000);
          const wobble =
            Math.sin(progress * Config.flareWobbleFrequency + timeComponent) *
            Config.flareWobbleAmplitude;
          drawX += wobble * (1 - progress);

          ctx.fillStyle = trailColor;
          ctx.globalAlpha = opacity;
          ctx.beginPath();
          ctx.arc(drawX, trailPoint.y, currentRadius, 0, 2 * Math.PI);
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      } else if (p.type === "sidewaysWind" && p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);

        // Use quadratic curves to smoothly connect the trail points
        for (let j = 1; j < p.trail.length - 2; j++) {
          const xc = (p.trail[j].x + p.trail[j + 1].x) / 2;
          const yc = (p.trail[j].y + p.trail[j + 1].y) / 2;
          ctx.quadraticCurveTo(p.trail[j].x, p.trail[j].y, xc, yc);
        }
        // Curve to the last point
        ctx.lineTo(
          p.trail[p.trail.length - 1].x,
          p.trail[p.trail.length - 1].y
        );

        ctx.strokeStyle = p.color;
        ctx.lineWidth = Config.sidewaysWindLineWidth;
        ctx.globalAlpha = p.alpha * 0.5; // Make the lines faint
        ctx.stroke();
        ctx.globalAlpha = 1.0; // Reset alpha
      } else if (p.type === "scorePopup") {
        const progress = p.life / p.totalLife;
        // The text starts large and shrinks slightly as it fades
        const fontSize = Config.scorePopupFontSize * (0.5 + progress * 0.5);

        const color = Config.invertColors
          ? Config.scorePopupColor.inverted
          : Config.scorePopupColor.normal;
        ctx.fillStyle = color.replace(/[^,]+(?=\))/, p.alpha.toFixed(2));

        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.text, p.x, p.y);
      } else if (p.type === "wind" && p.trail.length > 1) {
        const topEdge = [];
        const bottomEdge = [];

        // 1. Calculate the edges of the trail
        for (let j = 0; j < p.trail.length; j++) {
          const point = p.trail[j];
          const nextPoint = p.trail[j + 1] || point;

          // Get the direction of the trail segment
          const dx = nextPoint.x - point.x;
          const dy = nextPoint.y - point.y;
          const mag = Math.sqrt(dx * dx + dy * dy);

          // Get the perpendicular normal vector
          const normalX = -dy / mag;
          const normalY = dx / mag;

          const progress = j / (p.trail.length - 1);
          const currentRadius =
            (p.type === "wind" ? 2 : p.radius) * progress * p.alpha;

          topEdge.push({
            x: point.x + normalX * currentRadius,
            y: point.y + normalY * currentRadius,
          });
          bottomEdge.push({
            x: point.x - normalX * currentRadius,
            y: point.y - normalY * currentRadius,
          });
        }

        // 2. Draw the continuous shape
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.5})`;
        ctx.beginPath();
        ctx.moveTo(topEdge[0].x, topEdge[0].y);

        for (let j = 1; j < topEdge.length; j++) {
          ctx.lineTo(topEdge[j].x, topEdge[j].y);
        }
        // Connect to the bottom edge, drawing backwards
        for (let j = bottomEdge.length - 1; j >= 0; j--) {
          ctx.lineTo(bottomEdge[j].x, bottomEdge[j].y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type !== "wind") {
        // 2. Draw the main particle head on top of the trail
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`;
        ctx.beginPath();
        let drawRadius =
          p.type === "wind" ? 2 : p.radius * (p.alpha * 0.7 + 0.3);
        drawRadius = Math.max(0, drawRadius);
        ctx.arc(p.x, p.y, drawRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // ctx.globalCompositeOperation = "source-over";
}

export function spawnHighestLevelParticles(centerX, centerY) {
  for (let i = 0; i < Config.highestLevelParticleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * Config.highestLevelParticleSpeed + 1;

    // Spawn particles in a circle around the given center point
    const spawnRadius = 80; // The radius of the burst circle
    const x = centerX + Math.cos(angle) * spawnRadius;
    const y = centerY + Math.sin(angle) * spawnRadius;

    GameState.particles.push({
      // We can reuse the 'debris' type or create a new 'gold' type.
      // For now, let's reuse 'debris' as it already has velocity properties.
      type: "debris",
      x: x,
      y: y,
      // Give particles an initial upward velocity to create a "burst" effect
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * speed,
      radius: Math.random() * 3 + 1,
      color: Config.invertColors
        ? Config.highestLevelParticleColor.inverted
        : Config.highestLevelParticleColor.normal,
      life: Config.highestLevelParticleLifetime * (0.7 + Math.random() * 0.3),
      totalLife: Config.highestLevelParticleLifetime,
    });
  }
}

export function spawnSidewaysWindParticles(cfg, deltaTime) {
  if (!cfg.enableSidewaysWindEffect) return;

  const spawnChance = (cfg.sidewaysWindParticleRate / 1000) * deltaTime;
  if (Math.random() > spawnChance) {
    return;
  }
  const fromLeft = true;
  const startY = Math.random() * canvasHeight;

  const particleData = {
    id: Date.now() + Math.random(),
    type: "sidewaysWind",
    x: fromLeft ? -10 : canvasWidth + 10,
    y: startY,
    startY: startY, // Store the starting Y position
    vx: (fromLeft ? 1 : -1) * cfg.sidewaysWindParticleSpeed,
    vy: 0,
    life: 20000, // A long lifetime to cross the screen
    totalLife: 20000,
    color: cfg.invertColors
      ? cfg.sidewaysWindParticleColor.inverted
      : cfg.sidewaysWindParticleColor.normal,
    trail: [],
    // Give each particle a unique starting point in the wave
    oscillationOffset: Math.random() * Math.PI * 2,
  };
  GameState.particles.push(particleData);
}
