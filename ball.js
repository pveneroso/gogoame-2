import { spawnParticles, updateAndDrawParticles } from "./particles.js";
import {
  drawMandala,
  drawMandalaBall,
  adjustColor,
  createMetallicGradient,
} from "./drawing.js";
import {
  symbolDefinitions,
  mandalaDefinitions,
  L1_SYMBOLS,
} from "./symbols.js";
import { Config } from "./config.js";
import { canvasWidth, canvasHeight, ctx } from "./ui.js";
import { GameState } from "./game_state.js";
import { getPoolSurfaceY } from "./effects.js";
import { destroyBall, degradeBall } from "./mechanics.js";

export class Ball {
  constructor(x, y, actualRadius, initialSymbolId, isBlack) {
    this.id = Date.now() + Math.random();
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = actualRadius;
    this.symbolId = initialSymbolId;
    this.level = symbolDefinitions[initialSymbolId].level;
    this.isGrabbed = false;
    this.isBlack = false;
    this.grabStartX = 0;
    this.grabStartY = 0;
    this.slingshotVector = { x: 0, y: 0 };
    this.createdAt = Date.now();
    this.trail = [];
    this.windImmuneUntil = 0;
    this.isDangerous = false;
    this.isCapturedByWind = false;
    this.isCapturedByWindTimer = null;
    this.hasBeenInPlayfield = false;
    this.hasBeenManipulated = false;
    this.gravityImmuneUntil = 0;
    this.isL10Symbol = symbolDefinitions[initialSymbolId].level === 10;
    this.targetPosition = null; // Will be set to a socket position if this is an L10 ball
    this.isMetallic =
      symbolDefinitions[initialSymbolId].level >= 7 || Config.allMetallic;
  }

  drawSlingshot() {
    if (
      this.isGrabbed &&
      (this.slingshotVector.x !== 0 || this.slingshotVector.y !== 0)
    ) {
      ctx.beginPath();
      ctx.strokeStyle = Config.slingshotArrowColor;
      ctx.lineWidth = 3;

      const arrowStartX = this.x;
      const arrowStartY = this.y;
      const arrowEndX = this.x + this.slingshotVector.x;
      const arrowEndY = this.y + this.slingshotVector.y;

      // Draw line
      ctx.moveTo(arrowStartX, arrowStartY);
      ctx.lineTo(arrowEndX, arrowEndY);

      // Draw arrowhead
      const angle = Math.atan2(
        arrowEndY - arrowStartY,
        arrowEndX - arrowStartX
      );
      ctx.lineTo(
        arrowEndX - 15 * Math.cos(angle - Math.PI / 6),
        arrowEndY - 15 * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(arrowEndX, arrowEndY);
      ctx.lineTo(
        arrowEndX - 15 * Math.cos(angle + Math.PI / 6),
        arrowEndY - 15 * Math.sin(angle + Math.PI / 6)
      );

      ctx.stroke();
      ctx.closePath();
    }
  }

  drawWindSparkles(cfg) {
    if (
      Date.now() < this.gravityImmuneUntil &&
      Math.random() < cfg.glitterParticleRate
    ) {
      // Spawn a short-lived, non-moving, golden particle just below the ball
      const angle = Math.random() * Math.PI; // Spawn in a half-circle below
      const spawnX =
        this.x + Math.cos(angle + Math.PI / 2) * (this.radius * Math.random());
      const spawnY = this.y + this.radius + Math.random() * 5;

      spawnParticles(
        1, // Spawn just one particle
        spawnX,
        spawnY,
        cfg.invertColors
          ? cfg.particleConstructColor.inverted
          : cfg.particleConstructColor.normal,
        0, // No speed
        1, // minSize
        3, // maxSize
        cfg.glitterParticleLifetime
      );
    }
  }

  drawDangerHighlight(cfg) {
    if (this.isDangerous) {
      ctx.save();
      // Use the ball's path to create a blurred shape
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
      // Apply the "blur" effect using shadows
      ctx.shadowBlur = cfg.dangerHighlightBlur;
      ctx.shadowColor = cfg.dangerHighlightColor;
      // The fill makes the shadow visible; its own color doesn't matter.
      ctx.fillStyle = cfg.dangerHighlightColor;
      ctx.fill();
      ctx.restore(); // Restore context to remove shadow for other drawings
    }
  }

  drawBallTrails(cfg) {
    const isInverted = cfg.invertColors;
    const isVoid = this.symbolId === "S1_VOID";

    const enableBallTrails =
      cfg.enableBallTrails && (!isVoid || cfg.enableBallTrailsForVoid);

    if (enableBallTrails && this.trail.length > 0) {
      // --- NEW: Select properties based on symbol type ---
      const startWidth = isVoid
        ? cfg.voidTrailStartWidth
        : cfg.ballTrailStartWidth;
      const endWidth = isVoid ? cfg.voidTrailEndWidth : cfg.ballTrailEndWidth;
      const opacity = isVoid ? cfg.voidTrailOpacity : cfg.ballTrailOpacity;
      const trailColor = isVoid
        ? cfg.voidTrailColor
        : isInverted
          ? cfg.symbolColor.inverted
          : cfg.symbolColor.normal;
      // --- END OF NEW LOGIC ---

      for (let i = 0; i < this.trail.length; i++) {
        const trailPoint = this.trail[i];
        const progress = i / (this.trail.length - 1);

        // Use the selected properties to draw the trail
        const currentRadius = startWidth + (endWidth - startWidth) * progress;

        let drawX = trailPoint.x;

        if (isVoid) {
          const timeComponent =
            GameState.totalElapsedTime * (cfg.voidTrailWobbleSpeed / 1000);
          const wobble =
            Math.sin(progress * cfg.voidTrailWobbleFrequency + timeComponent) *
            cfg.voidTrailWobbleAmplitude;
          drawX += wobble * (1 - progress);
        }

        ctx.fillStyle = trailColor;
        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(drawX, trailPoint.y, currentRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }
  }

  drawSymbol(cfg) {
    let enableBallFill = true;
    let enableBallBorder = false;
    if (cfg.enablePhantomSymbols) {
      enableBallFill = this.level > 1 || this.symbolId === "S1_VOID";
      enableBallBorder = this.level == 1 && this.symbolId !== "S1_VOID";
    }

    let mandalaConfig = mandalaDefinitions[this.symbolId].mandalaConfig;

    if (cfg.enableBallBorder && !mandalaConfig.isMetallic) {
      enableBallBorder = true;
    }

    drawMandalaBall(ctx, cfg, {
      x: this.x,
      y: this.y,
      radius: this.radius,
      symbolId: this.symbolId,
      level: this.level,
      createdAt: this.createdAt,
      mandalaConfig: mandalaConfig,
      enableBallFill: cfg.enableBallFill,
      enableBallBorder: cfg.enableBallBorder,
      strokeColor: cfg.strokeColors,
      drawPlate: true,
      drawEngraving: true,
      enableBallFill: enableBallFill,
      enableBallBorder: enableBallBorder,
      isMetallic: this.isMetallic,
    });
  }

  draw(cfg) {
    this.drawWindSparkles(cfg);
    this.drawDangerHighlight(cfg);
    this.drawBallTrails(cfg);
    this.drawSymbol(cfg);
  }

  applyGravity(cfg) {
    if (Date.now() < this.gravityImmuneUntil) {
      return;
    }

    if (cfg.enableZeroGravityMode && this.level > 1) {
      this.y += cfg.terminalVelocitySymbol;
      return;
    }

    if (this.symbolId === "S1_VOID") {
      this.y += cfg.voidSpeedMultiplier * cfg.terminalVelocity;
    } else if (this.symbolId === "S1_LIFE") {
      this.y += cfg.lifeSymbolFallSpeedMultiplier * cfg.terminalVelocity;
    } else {
      let massFactor = this.radius / cfg.baseBallRadius;
      const fullMassEffect = 1 / massFactor;
      massFactor = 1 + (fullMassEffect - 1) * cfg.gravityMassEffect;
      this.y += massFactor * cfg.terminalVelocity;
    }
  }

  applyFriction(cfg) {
    this.vx *= cfg.friction;
    this.vy *= cfg.friction;
  }

  // From wind curve.
  findClosestPointInWindCurve(cfg) {
    const curvePoints = GameState.windCurve.points;

    let closestDist = Infinity;
    let closestPoint = null;
    let curveDirection = { x: 0, y: 0 };
    let segmentIndex = -1; // NEW: Keep track of which segment is closest

    // 1. Find the closest point on the entire wind curve to the ball
    for (let i = 0; i < curvePoints.length - 1; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1];

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;

      if (dx === 0 && dy === 0) continue;

      const t =
        ((this.x - p1.x) * dx + (this.y - p1.y) * dy) / (dx * dx + dy * dy);

      let currentClosest;
      if (t < 0) {
        currentClosest = p1;
      } else if (t > 1) {
        currentClosest = p2;
      } else {
        currentClosest = { x: p1.x + t * dx, y: p1.y + t * dy };
      }

      const dist = Math.sqrt(
        (this.x - currentClosest.x) ** 2 + (this.y - currentClosest.y) ** 2
      );

      if (dist < closestDist) {
        closestDist = dist;
        closestPoint = currentClosest;
        const mag = Math.sqrt(dx * dx + dy * dy);
        curveDirection = { x: dx / mag, y: dy / mag };
        segmentIndex = i; // Store the index of the closest segment
      }
    }

    if (
      closestDist < cfg.windInfluenceRadius ||
      (this.isCapturedByWindTimer !== null &&
        Date.now() < this.isCapturedByWindTimer)
    ) {
      return [closestPoint, closestDist, segmentIndex, curveDirection];
    }
    return [null, Infinity, -1, curveDirection];
  }

  applyWindForce(cfg) {
    if (Date.now() < this.windImmuneUntil) return;
    if (!GameState.windCurve) return;
    if (this.symbolId === "S1_VOID") return;

    const curvePoints = GameState.windCurve.points;
    if (curvePoints.length < 2) return;

    let [closestPoint, closestDist, segmentIndex, curveDirection] =
      this.findClosestPointInWindCurve(cfg);

    // 2. If the closest point is within the influence radius, apply forces
    if (closestPoint && segmentIndex !== -1) {
      this.gravityImmuneUntil =
        Date.now() +
        cfg.windGravityImmunityDuration +
        cfg.levitationLevelMultiplier * this.level;

      GameState.windCapturedBalls.push(this.id);

      let massFactor = this.radius / cfg.baseBallRadius;
      const fullMassEffect = 1 / massFactor;
      massFactor = 1 + (fullMassEffect - 1) * cfg.gravityMassEffect;

      const progress = segmentIndex / (curvePoints.length - 1);

      const falloff = 1.0 - progress * cfg.windForceFalloff;
      const strengthMultiplier = Math.max(0, falloff); // Ensure strength doesn't go below zero

      let curvatureMultiplier = 1.0; // Default to no extra force for straight lines

      // Check if there is a "next" segment to calculate a turn
      if (segmentIndex < curvePoints.length - 2) {
        const nextSegmentP1 = curvePoints[segmentIndex + 1];
        const nextSegmentP2 = curvePoints[segmentIndex + 2];
        const nextDx = nextSegmentP2.x - nextSegmentP1.x;
        const nextDy = nextSegmentP2.y - nextSegmentP1.y;
        const nextMag = Math.sqrt(nextDx * nextDx + nextDy * nextDy);

        if (nextMag > 0) {
          const nextCurveDirection = {
            x: nextDx / nextMag,
            y: nextDy / nextMag,
          };

          // 1. Calculate the dot product between the current direction and the next.
          // A value of 1 means they are parallel (straight); a value closer to 0 means a sharp turn.
          const dotProduct =
            curveDirection.x * nextCurveDirection.x +
            curveDirection.y * nextCurveDirection.y;

          // 2. Create a multiplier that is high for sharp turns and low for straight lines.
          // (1.0 - dotProduct) gives us a value from 0 (straight) to 1 (90-degree turn).
          // We scale this by the config factor to control the intensity.
          curvatureMultiplier =
            1.0 + (1.0 - dotProduct) * cfg.couplingCurvatureFactor;
        }
      }

      const normalDx = closestPoint.x - this.x;
      const normalDy = closestPoint.y - this.y;

      const lengthRampUp =
        (curvePoints.length || !Config.enableCouplingFourceRampDown) > 10
          ? 1
          : 0;
      let couplingForce = cfg.windCouplingStrength;

      // If the ball is within the arrival distance, ramp down the force.
      if (closestDist < cfg.windArrivalDistance) {
        // This creates a scaling factor from 0 to 1 inside the arrival zone.
        couplingForce *= closestDist / cfg.windArrivalDistance;
      }

      // Apply the smoothly ramped coupling force.

      this.vx +=
        normalDx *
        couplingForce *
        strengthMultiplier *
        massFactor *
        curvatureMultiplier;
      this.vy +=
        normalDy *
        couplingForce *
        strengthMultiplier *
        massFactor *
        curvatureMultiplier;

      // B. The Tangential Force (Propulsion) - Guides the ball's SPEED along the line
      const speedAlongCurve =
        this.vx * curveDirection.x + this.vy * curveDirection.y;

      if (speedAlongCurve < cfg.windMaxSpeed) {
        const curveLength = GameState.windCurve.totalLength || 0;
        const dynamicStrength =
          cfg.windBaseStrength + (curveLength / 100) * cfg.windStrengthPer100px;

        const forceMagnitude =
          (cfg.windMaxSpeed - speedAlongCurve) * dynamicStrength;

        // Apply the falloff multiplier to the tangential force
        this.vx +=
          curveDirection.x * forceMagnitude * strengthMultiplier * massFactor;
        this.vy +=
          curveDirection.y * forceMagnitude * strengthMultiplier * massFactor;
      }

      this.isCapturedByWind = true;
      this.isCapturedByWindTimer = Date.now() + Config.windCaptureTimer;
      this.hasBeenManipulated = true;
    }
  }

  // From environmental wind.
  applySidewaysWind(cfg) {
    if (cfg.enableZeroGravityMode && this.level > 1) {
      return;
    }

    if (Date.now() < this.windImmuneUntil) return;

    // Void symbols remain immune to the wind
    if (this.symbolId === "S1_VOID") {
      return;
    }

    // Convert total elapsed time from milliseconds to seconds for more intuitive frequency values
    const timeInSeconds = GameState.totalElapsedTime / 1000;

    // --- Calculate the time-based oscillation ---
    // We use two sine waves with different frequencies and add them together.
    // This creates a much more natural, less repetitive pattern than a single sine wave.
    const oscillation1 = Math.sin(
      timeInSeconds * cfg.windOscillationFrequency1
    );
    const oscillation2 = Math.sin(
      timeInSeconds * cfg.windOscillationFrequency2
    );

    // Combine the oscillations and scale by the amplitude
    const totalOscillation =
      ((oscillation1 + oscillation2) / 2) * cfg.windOscillationAmplitude;

    // The final wind is the base strength from the slider plus the current oscillation
    const currentWindStrength = cfg.sidewaysWindStrength + totalOscillation;

    this.vx += currentWindStrength;
  }

  doVerticalBoundaryCheck(cfg) {
    if (this.y > 50 || this.hasBeenInPlayfield) {
      this.hasBeenInPlayfield = true;
    }

    const collidesTop = this.y - this.radius < 0 && this.hasBeenInPlayfield;

    const collidesBottom = this.y + this.radius > getPoolSurfaceY(this.x);

    if (collidesTop || collidesBottom) {
      const knockbackSource = {
        x: this.x,
        // Knockback comes from beyond the wall that was hit
        y: collidesTop ? -this.radius : canvasHeight + this.radius,
      };

      if (collidesTop && cfg.enableHorizontalKick && this.level > 1) {
        const dx = this.x - knockbackSource.x;
        const dy = this.y - knockbackSource.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          this.vx = (dx / distance) * Config.degradationKnockback;
          this.vy = (dy / distance) * Config.degradationKnockback;
        } else {
          this.vy = -Config.degradationKnockback; // Fallback
        }

        this.windImmuneUntil =
          Date.now() + Config.degradationWindImmunityDuration;
        return false;
      }

      // If degradation is on and the ball is high enough level, degrade it
      if (cfg.enableHardDegradation && this.level > 1) {
        degradeBall(this, knockbackSource);
        return true; // Signal for removal (as it's being replaced)
      }

      destroyBall(this, "vertical");
      return true;
    }

    return false;
  }

  doHorizontalBoundaryCheck(cfg) {
    const collidesLeft = this.x - this.radius < 0;
    const collidesRight = this.x + this.radius > canvasWidth;

    if (collidesLeft || collidesRight) {
      const knockbackSource = {
        x: collidesLeft ? -this.radius : canvasWidth + this.radius,
        y: this.y,
      };

      if (cfg.enableHorizontalKick && this.level > 1) {
        const dx = this.x - knockbackSource.x;
        const dy = this.y - knockbackSource.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
          this.vx = (dx / distance) * Config.degradationKnockback;
          this.vy = (dy / distance) * Config.degradationKnockback;
        } else {
          this.vy = -Config.degradationKnockback; // Fallback
        }

        this.windImmuneUntil =
          Date.now() + Config.degradationWindImmunityDuration;
        return false;
      }

      // Only attempt to degrade the ball if the feature is on AND the ball is Level 2 or higher.
      if (cfg.enableHardDegradation && this.level > 1) {
        const didDegrade = degradeBall(this, knockbackSource);

        return true; // Signal for removal (as it's being replaced).
      }

      destroyBall(this, "horizontal");
      return true; // Signal for removal.
    }

    return false;
  }

  updateBlackSymbol(cfg) {
    if (this.isL10Symbol && this.targetPosition) {
      const dx = this.targetPosition.x - this.x;
      const dy = this.targetPosition.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // If not at the target, move towards it
      if (dist > 1) {
        this.vx = dx * cfg.l10AttractionSpeed;
        this.vy = dy * cfg.l10AttractionSpeed;
      } else {
        // Once it arrives, lock it in place
        this.vx = 0;
        this.vy = 0;
        this.x = this.targetPosition.x;
        this.y = this.targetPosition.y;

        const allSlotsFull = GameState.l10Slots.every((slot) => slot !== null);

        // If they are full and we aren't already waiting or animating...
        if (
          allSlotsFull &&
          !GameState.isAwaitingLotusAnimation &&
          !GameState.isLotusAnimationPlaying
        ) {
          // ...start the waiting period instead of the main animation.
          GameState.isAwaitingLotusAnimation = true;
          GameState.awaitLotusStartTime = Date.now();
        }
      }

      // Apply velocity but skip ALL other physics (gravity, wind, friction, etc.)
      this.y += this.vy;
      this.x += this.vx;

      // It still adds to its trail while moving
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > cfg.ballTrailLength) {
        this.trail.shift();
      }

      return true; // Keep the ball alive
    }
    return false;
  }

  update(cfg) {
    if (this.updateBlackSymbol(cfg)) {
      return true;
    }

    this.trail.push({ x: this.x, y: this.y });

    // Keep the trail from getting too long by removing the oldest point
    if (this.trail.length > cfg.ballTrailLength) {
      this.trail.shift();
    }

    this.applyGravity(cfg);
    this.applyWindForce(cfg);
    this.applySidewaysWind(cfg);

    this.applyFriction(cfg);

    this.y += this.vy;
    this.x += this.vx;

    if (
      this.doVerticalBoundaryCheck(cfg) ||
      this.doHorizontalBoundaryCheck(cfg)
    ) {
      return false;
    }

    return true;
  }

  // Deprecated;
  applyGrab() {
    this.x += this.vx;
    this.y += this.vy;
    this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
    this.y = Math.max(
      this.radius,
      Math.min(this.y, canvasHeight - this.radius)
    );
    if (this.x === this.radius || this.x === canvasWidth - this.radius)
      this.vx = 0;
    if (this.y === this.radius || this.y === canvasHeight - this.radius)
      this.vy = 0;
  }
}
