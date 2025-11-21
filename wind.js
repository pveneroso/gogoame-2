import { GameState } from "./game_state.js";
import { Ball } from "./ball.js";
import { canvasWidth, canvasHeight, ctx } from "./ui.js";
import { Config } from "./config.js";
import {
  mandalaDefinitions,
  symbolDefinitions,
  L1_NORMAL_SYMBOLS,
} from "./symbols.js";

export function drawWindCurve(cfg) {
  if (!GameState.windCurve || GameState.windCurve.points.length < 2) return;

  const now = Date.now();
  const age = now - GameState.windCurve.createdAt;

  // Use the new dynamic lifetime property. Provide a fallback just in case.
  const currentLifetime = GameState.windCurve.lifetime || cfg.windBaseLifetime;

  if (GameState.isDrawingWind) {
    return;
  }

  if (age > currentLifetime) {
    GameState.windCurve = null;
    return;
  }

  if (cfg.drawWindCurve) {
    const points = GameState.windCurve.points;
    // Also use the dynamic lifetime for the opacity calculation
    const opacity = 1.0 - age / currentLifetime;
    const fillColor = (
      cfg.invertColors ? cfg.windFillColor.inverted : cfg.windFillColor.normal
    ).replace(/[^,]+(?=\))/, opacity.toFixed(2));

    // 1. Calculate edge points (this logic remains the same)
    const topEdgePoints = [];
    const bottomEdgePoints = [];
    for (let i = 0; i < points.length; i++) {
      const progress = i / (points.length - 1);
      const currentWidth =
        cfg.windMaxWidth - (cfg.windMaxWidth - cfg.windMinWidth) * progress;
      let tangentX, tangentY;
      if (i > 0 && i < points.length - 1) {
        tangentX = points[i + 1].x - points[i - 1].x;
        tangentY = points[i + 1].y - points[i - 1].y;
      } else if (i === 0) {
        tangentX = points[i + 1].x - points[i].x;
        tangentY = points[i + 1].y - points[i].y;
      } else {
        tangentX = points[i].x - points[i - 1].x;
        tangentY = points[i].y - points[i - 1].y;
      }
      const mag = Math.sqrt(tangentX * tangentX + tangentY * tangentY);
      if (mag > 0) {
        tangentX /= mag;
        tangentY /= mag;
      }
      const normalX = -tangentY;
      const normalY = tangentX;
      topEdgePoints.push({
        x: points[i].x + (normalX * currentWidth) / 2,
        y: points[i].y + (normalY * currentWidth) / 2,
      });
      bottomEdgePoints.push({
        x: points[i].x - (normalX * currentWidth) / 2,
        y: points[i].y - (normalY * currentWidth) / 2,
      });
    }

    // 2. Draw the shape using curves for a smooth appearance
    ctx.beginPath();
    ctx.moveTo(topEdgePoints[0].x, topEdgePoints[0].y);

    // Draw the top edge with smooth quadratic curves
    for (let i = 1; i < topEdgePoints.length - 2; i++) {
      const xc = (topEdgePoints[i].x + topEdgePoints[i + 1].x) / 2;
      const yc = (topEdgePoints[i].y + topEdgePoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(topEdgePoints[i].x, topEdgePoints[i].y, xc, yc);
    }

    // Draw the end cap and connect to the bottom edge, going backwards
    ctx.lineTo(
      bottomEdgePoints[bottomEdgePoints.length - 1].x,
      bottomEdgePoints[bottomEdgePoints.length - 1].y
    );

    // Draw the bottom edge with smooth quadratic curves
    for (let i = bottomEdgePoints.length - 2; i > 1; i--) {
      const xc = (bottomEdgePoints[i].x + bottomEdgePoints[i - 1].x) / 2;
      const yc = (bottomEdgePoints[i].y + bottomEdgePoints[i - 1].y) / 2;
      ctx.quadraticCurveTo(
        bottomEdgePoints[i].x,
        bottomEdgePoints[i].y,
        xc,
        yc
      );
    }

    ctx.closePath();

    // 3. Apply the "smoky" glow effect and fill the shape
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = cfg.windShadowBlur;
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Reset shadow properties to avoid affecting other drawings
    ctx.shadowBlur = 0;
  }
}

/**
 * Checks for and manages wind-based symbol combinations, including a charge-up time.
 */
export function checkWindCombination(cfg) {
  if (!cfg.enableWindCombination || !GameState.windCurve) {
    // If the mode is off or there's no curve, cancel any ongoing charge.
    if (GameState.isChargingWindCombination) {
      GameState.isChargingWindCombination = false;
    }
    return;
  }

  const capturedBallIds = new Set(GameState.windCapturedBalls);
  // Get the actual ball objects from the list of captured IDs

  // --- State 1: Currently Charging a Combination ---
  if (GameState.isChargingWindCombination) {
    let isCombinationStillValid = true;

    // Rule 1: The number of captured balls must not change.
    if (capturedBallIds.size !== GameState.windCombinationSet.length) {
      isCombinationStillValid = false;
    } else {
      // Rule 2: The set of captured balls must be EXACTLY the same.
      for (const chargedId of GameState.windCombinationSet) {
        if (!capturedBallIds.has(chargedId)) {
          isCombinationStillValid = false;
          break;
        }
      }
    }

    if (!isCombinationStillValid) {
      // An interfering ball broke the charge! Reset.
      GameState.isChargingWindCombination = false;
      return;
    }

    // If the combo is still valid, check if the charge time is complete.
    const elapsedTime = Date.now() - GameState.windCombinationStartTime;
    if (elapsedTime >= cfg.windCombinationChargeTime) {
      const endOfCurve =
        GameState.windCurve.points[GameState.windCurve.points.length - 1];
      const capturedBalls = GameState.balls.filter((b) =>
        GameState.windCombinationSet.includes(b.id)
      );
      let spawnBall = capturedBalls[0];
      let closestDist = Infinity;

      for (const ball of capturedBalls) {
        const dist = Math.sqrt(
          (ball.x - endOfCurve.x) ** 2 + (ball.y - endOfCurve.y) ** 2
        );
        if (dist < closestDist) {
          closestDist = dist;
          spawnBall = ball;
        }
      }
      // --- Combination Success! ---
      const firstLevel = capturedBalls[0].level;
      const nextLevel = firstLevel + 1;

      const nextLevelSymbols = Object.keys(symbolDefinitions).filter(
        (id) =>
          symbolDefinitions[id].level === nextLevel &&
          !symbolDefinitions[id].isWildcard
      );
      if (nextLevelSymbols.length === 0) return; // No higher level to create

      const newSymbolId =
        nextLevelSymbols[Math.floor(Math.random() * nextLevelSymbols.length)];

      // Create the new ball
      const productDef = symbolDefinitions[newSymbolId];
      const sizeMultiplier =
        1.0 + (productDef.level - 1) * Config.sizeIncreasePerLevel;
      const newRadius = Config.baseBallRadius * sizeMultiplier;
      const newBall = new Ball(
        spawnBall.x,
        spawnBall.y,
        newRadius,
        newSymbolId,
        false
      );
      newBall.vx = spawnBall.vx;
      newBall.vy = spawnBall.vy;

      // Add/remove balls and consume the wind curve
      GameState.ballsToAddNewThisFrame.push(newBall);
      for (const ball of capturedBalls) {
        GameState.ballsToRemoveThisFrame.push(ball);
      }

      // Reset after successful combination
      GameState.isChargingWindCombination = false;
      GameState.windCurve = null; // Consume the wind
    }
  }
  // --- State 2: Not Charging - Check for a New Combination ---
  else {
    if (capturedBallIds.size < 2) return;

    const capturedBalls = GameState.balls.filter((b) =>
      capturedBallIds.has(b.id)
    );
    const firstLevel = capturedBalls[0].level;

    // Check if all captured balls are the same level and the count is correct
    const allSameLevel = capturedBalls.every((b) => b.level === firstLevel);
    const isCountCorrect = capturedBalls.length === firstLevel + 1;

    if (allSameLevel && isCountCorrect) {
      // Conditions met! Start charging.
      GameState.isChargingWindCombination = true;
      GameState.windCombinationStartTime = Date.now();
      GameState.windCombinationSet = capturedBalls.map((b) => b.id);
    }
  }
}
