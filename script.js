import { Config } from "./config.js";
import { L1_SYMBOLS } from "./symbols.js";
import { drawMandala, createBackgroundPattern } from "./drawing.js";
import {
  spawnParticles,
  updateAndDrawParticles,
  spawnParticlesAlongCurve,
  spawnSidewaysWindParticles,
} from "./particles.js";
import { Ball } from "./ball.js";
import {
  processCollisions,
  getCombinedSymbolId,
  applyWindAttraction,
} from "./physics.js";
import {
  addUiEvents,
  clearCanvas,
  drawHighestLevelDisplay,
  updateTopUI,
  drawLivesDisplay,
  ctx,
  canvasWidth,
  canvasHeight,
  canvas,
  drawLotusAnimation,
} from "./ui.js";
import { GameState, resetGameState, triggerGameOver } from "./game_state.js";
import { addPlayerEvents, addPlayerWindEvents } from "./player.js";
import { addBallSpawnsEvents, resetBallCreationTimer } from "./environment.js";
import { drawWindCurve, checkWindCombination } from "./wind.js";
import {
  drawCorruptionPool,
  drawL10Slots,
  drawPoolMaxHeightLine,
  updatePoolFlares,
} from "./effects.js";
import { destroyBall, degradeBall } from "./mechanics.js";

let backgroundPattern = null;

let lastFrameTime = performance.now();
function updateBalls() {
  for (let i = GameState.balls.length - 1; i >= 0; i--) {
    const ball = GameState.balls[i];
    if (!ball.update(Config)) {
      GameState.balls.splice(i, 1);
    }
  }
}

// --- Create the Pause Text Element ---
const pauseTextElement = document.createElement("div");
pauseTextElement.id = "pause-text";
pauseTextElement.textContent = "PAUSED";
pauseTextElement.classList.add("hidden");
document.getElementById("game-container").appendChild(pauseTextElement);

// --- Create the Toggle Pause Function ---
function togglePause() {
  GameState.isPaused = !GameState.isPaused;
  const pauseBtn = document.getElementById("pause-btn");

  if (GameState.isPaused) {
    // Show the pause text and change button label
    pauseTextElement.classList.remove("hidden");
    pauseBtn.innerHTML = "&#x25B6;";
    // Stop the ball spawner
    clearInterval(GameState.ballCreationTimerId);
  } else {
    // Hide the pause text and change button label back
    pauseTextElement.classList.add("hidden");
    pauseBtn.innerHTML = "&#x23F8;";
    // Restart the ball spawner and game loop correctly
    lastFrameTime = performance.now(); // Prevents a deltaTime jump
    resetBallCreationTimer(); // Restart ball spawner
    requestAnimationFrame(gameLoop); // Re-engage the loop
  }
}

function updateDangerHighlights(cfg) {
  // First, reset the dangerous flag on all balls from the previous frame
  for (const ball of GameState.balls) {
    ball.isDangerous = false;
  }

  // If the feature is disabled in the config, do nothing further.
  if (!cfg.enableDangerHighlight) return;

  // --- NEW: Create a Map for fast lookups ---
  // The map will store symbol IDs as keys and an array of balls as values.
  // e.g., { 'S2_SOLID_BOTH': [ball1, ball2], 'S3_LINES_BOTH': [ball3] }
  const symbolIdToBallsMap = new Map();
  for (const ball of GameState.balls) {
    if (!symbolIdToBallsMap.has(ball.symbolId)) {
      symbolIdToBallsMap.set(ball.symbolId, []);
    }
    symbolIdToBallsMap.get(ball.symbolId).push(ball);
  }

  // Iterate through every possible pair of balls
  for (let i = 0; i < GameState.balls.length; i++) {
    for (let j = i + 1; j < GameState.balls.length; j++) {
      const ballA = GameState.balls[i];
      const ballB = GameState.balls[j];

      // Skip check if either ball is below the minimum level threshold
      if (
        ballA.level < cfg.dangerHighlightMinLevel ||
        ballB.level < cfg.dangerHighlightMinLevel
      ) {
        continue;
      }

      // Condition 1: Are the two ingredient balls close to each other?
      const pairDistance = Math.sqrt(
        (ballA.x - ballB.x) ** 2 + (ballA.y - ballB.y) ** 2
      );
      if (pairDistance >= cfg.dangerHighlightMaxDistance) {
        continue;
      }

      // Condition 2: Do they form a valid new symbol?
      const resultId = getCombinedSymbolId(ballA.symbolId, ballB.symbolId);
      if (!resultId) {
        continue;
      }

      // Condition 3: Does that new symbol type already exist on screen?
      if (symbolIdToBallsMap.has(resultId)) {
        const existingResultBalls = symbolIdToBallsMap.get(resultId);

        let finalResultBall = null;
        // Is one of our ingredient balls (A or B) close to any of the existing result balls?
        const isCloseToResult = existingResultBalls.some((resultBall) => {
          const distToA = Math.sqrt(
            (ballA.x - resultBall.x) ** 2 + (ballA.y - resultBall.y) ** 2
          );
          const distToB = Math.sqrt(
            (ballB.x - resultBall.x) ** 2 + (ballB.y - resultBall.y) ** 2
          );

          const isCloseToResult =
            distToA < cfg.dangerHighlightMaxDistance ||
            distToB < cfg.dangerHighlightMaxDistance;

          if (isCloseToResult) {
            finalResultBall = resultBall;
          }

          return isCloseToResult;
        });

        if (isCloseToResult) {
          // If all conditions are met, mark the pair as dangerous.
          ballA.isDangerous = true;
          ballB.isDangerous = true;
          finalResultBall.isDangerous = true;
        }
      }
    }
  }
}

function drawBalls(cfg) {
  for (const ball of GameState.balls) {
    ball.draw(cfg);
  }
}

function updateCorruptionPool(cfg) {
  // Smoothly ease the visible level towards the target level
  if (GameState.corruptionLevel !== GameState.corruptionTargetLevel) {
    const difference =
      GameState.corruptionTargetLevel - GameState.corruptionLevel;
    GameState.corruptionLevel += difference * cfg.poolRiseSpeed;
  }

  // Calculate the base height of the pool's surface
  const baseHeight =
    (GameState.corruptionLevel / cfg.maxCorruptionLevel) *
    (canvasHeight * cfg.poolMaxHeight);

  // --- Animation and State Update ---
  if (GameState.isPoolRising) {
    const elapsed = Date.now() - GameState.lifeLossAnimationStart;
    const animationDuration = 2000;
    const progress = Math.min(1.0, elapsed / animationDuration);

    const currentPoolHeight =
      baseHeight + (canvasHeight - baseHeight) * progress;
    GameState.corruptionPoolY = canvasHeight - currentPoolHeight;

    if (progress >= 1.0 && !GameState.gameOver) {
      triggerGameOver();
    }
  } else {
    GameState.corruptionPoolY = canvasHeight - baseHeight;
  }
}

function updatePoolShine(cfg) {
  if (GameState.poolShineIntensity > 0) {
    GameState.poolShineIntensity -= cfg.poolShineFadeSpeed;
  }
}

function draw(cfg, deltaTime) {
  // --- Screen Shake Logic ---
  let shakeX = 0;
  let shakeY = 0;

  // Check if the life loss animation is currently active
  if (GameState.isLosingLife && Config.enableLifeLossAnimation) {
    const elapsed = Date.now() - GameState.lifeLossAnimationStart;
    const progress = elapsed / cfg.lifeLossAnimationDuration;

    if (progress < 1) {
      // As the animation progresses, the shake gets weaker
      const currentMagnitude = cfg.screenShakeMagnitude * (1 - progress);
      shakeX = (Math.random() - 0.5) * currentMagnitude;
      shakeY = (Math.random() - 0.5) * currentMagnitude;
    }
  }

  canvas.style.backgroundColor = cfg.invertColors
    ? cfg.backgroundColor.inverted
    : cfg.backgroundColor.normal;

  // Save the context state and apply the shake translation
  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Set the solid background color first
  ctx.fillStyle = cfg.invertColors
    ? cfg.backgroundColor.inverted
    : cfg.backgroundColor.normal;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Then, draw the repeating pattern on top
  ctx.fillStyle = backgroundPattern;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // --- Original Drawing Logic ---
  // clearCanvas();

  drawL10Slots();

  drawPoolMaxHeightLine(cfg);

  updateAndDrawParticles(deltaTime);

  drawCorruptionPool();

  if (GameState.isLotusAnimationPlaying) {
    drawLotusAnimation(cfg);
  } else {
    drawBalls(cfg);
    drawWindCurve(cfg);
  }

  drawHighestLevelDisplay();

  if (GameState.isAwaitingLotusAnimation) {
    // Find the three balls that are locked in the L10 slots
    const l10Balls = GameState.balls.filter((b) =>
      GameState.l10Slots.includes(b.id)
    );

    if (l10Balls.length === 3) {
      // // Style for the energy lines
      // ctx.strokeStyle = "rgba(255, 223, 0, 0.7)"; // Gold color
      // ctx.lineWidth = 3;
      // ctx.shadowColor = "rgba(255, 255, 255, 1)";
      // ctx.shadowBlur = 15;
      // // Animate the line dash to make the lines "shimmer"
      // ctx.setLineDash([15, 10]);
      // ctx.lineDashOffset = -(GameState.totalElapsedTime / 50);
      // // Draw lines connecting the three balls to form a triangle
      // ctx.beginPath();
      // ctx.moveTo(l10Balls[0].x, l10Balls[0].y);
      // ctx.lineTo(l10Balls[1].x, l10Balls[1].y);
      // ctx.lineTo(l10Balls[2].x, l10Balls[2].y);
      // ctx.closePath();
      // ctx.stroke();
      // // Reset dashes and shadows so they don't affect other drawings
      // ctx.setLineDash([]);
      // ctx.shadowBlur = 0;
    }
  }

  drawLivesDisplay();

  // --- Screen Flash Logic ---
  // If the animation is active, draw a fading red overlay
  if (GameState.isLosingLife && Config.enableLifeLossAnimation) {
    const elapsed = Date.now() - GameState.lifeLossAnimationStart;
    const progress = elapsed / cfg.lifeLossAnimationDuration;

    if (progress < 1) {
      // The flash is strongest at the start and fades out
      const currentOpacity = (1 - progress) * 0.1; // Get base opacity from the color string
      ctx.fillStyle = cfg.lifeLossFlashColor.replace(
        /[^,]+(?=\))/,
        currentOpacity.toFixed(2)
      );
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  }

  // Restore the context to remove the translation for the next frame
  ctx.restore();
}

// Initialize.
// addPlayerEvents();
addPlayerWindEvents();

addBallSpawnsEvents();
addUiEvents();
backgroundPattern = createBackgroundPattern(
  ctx,
  Config.backgroundColor.patternColor
);

function restartGame() {
  // 1. Reset all game data to its initial state
  resetGameState();

  // 2. Hide the game over screen
  document.getElementById("gameOverScreen").style.display = "none";

  // 3. Restart the ball creation timer with the current config settings
  resetBallCreationTimer();

  // 4. Update the UI to show the reset scores
  updateTopUI();

  // 5. Cancel the old animation loop and start a fresh one
  if (GameState.animationFrameId) {
    cancelAnimationFrame(GameState.animationFrameId);
  }
  lastFrameTime = performance.now(); // Reset the timer for deltaTime calculations
  GameState.animationFrameId = requestAnimationFrame(gameLoop);
}

document.getElementById("restartButton").addEventListener("click", restartGame);
document.getElementById("pause-btn").addEventListener("click", togglePause);

function gameLoop(currentTime) {
  if (GameState.isPaused) {
    return;
  }

  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;

  GameState.totalElapsedTime += deltaTime;

  if (GameState.isAwaitingLotusAnimation) {
    const elapsed = Date.now() - GameState.awaitLotusStartTime;
    if (elapsed >= Config.lotusAnimationPreDelay) {
      // Time is up! Stop waiting and start the main animation.
      GameState.isAwaitingLotusAnimation = false;
      GameState.isLotusAnimationPlaying = true;
      GameState.lotusAnimationStart = Date.now();
    }
  }

  if (
    GameState.isLosingLife &&
    Date.now() - GameState.lifeLossAnimationStart >
      Config.lifeLossAnimationDuration
  ) {
    GameState.isLosingLife = false;
  }

  if (GameState.cleanupAfterLotus) {
    GameState.l10Slots = [null, null, null];
    const l10Balls = GameState.balls.filter((b) => b.isL10Symbol);
    l10Balls.forEach((ball) => GameState.ballsToRemoveThisFrame.push(ball));
    GameState.balls = [];

    // Reset all animation flags
    GameState.isLotusAnimationPlaying = false;
    GameState.cleanupAfterLotus = false;
  }

  if (GameState.isLotusAnimationPlaying) {
    draw(Config, deltaTime);
    GameState.animationFrameId = requestAnimationFrame(gameLoop);
    return;
  }

  if (
    GameState.corruptionLevel >= Config.maxCorruptionLevel &&
    !GameState.isPoolRising
  ) {
    GameState.isPoolRising = true;
    // We can reuse the life loss animation start time for this, as it's a game-ending event
    GameState.lifeLossAnimationStart = Date.now();
  }

  if (GameState.gameOver) {
    draw(Config, deltaTime);
    return;
  }

  GameState.windCapturedBalls = [];
  for (const ball of GameState.balls) {
    ball.isCapturedByWind = false;
  }

  updatePoolShine(Config);
  updateCorruptionPool(Config);

  updatePoolFlares(Config, deltaTime);

  updateDangerHighlights(Config);

  updateTopUI();

  spawnParticlesAlongCurve(Config, deltaTime);

  // spawnSidewaysWindParticles(Config, deltaTime);

  GameState.ballsToRemoveThisFrame = [];
  GameState.ballsToAddNewThisFrame = [];

  updateBalls();

  // applyWindAttraction(Config);

  if (GameState.corruptionLevel > 0) {
    for (const ball of GameState.balls) {
      // Check if the ball's bottom edge is below the pool's non-wavy surface line
      if (ball.y + ball.radius > GameState.corruptionPoolY) {
        // Use the existing destroyBall function for consistent effects
        destroyBall(ball);
      }
    }
  }

  checkWindCombination(Config);

  processCollisions();

  draw(Config, deltaTime);

  GameState.animationFrameId = requestAnimationFrame(gameLoop);
}

GameState.animationFrameId = requestAnimationFrame(gameLoop);
