import { Config } from "./config.js";
import { GameState, triggerGameOver } from "./game_state.js";
import { ctx, canvasWidth, canvasHeight } from "./ui.js";
import { drawMandala, drawMandalaBall, adjustColor } from "./drawing.js"; // We need this for the gradient
import {
  spawnParticles,
  updateAndDrawParticles,
  spawnParticlesAlongCurve,
} from "./particles.js";
import {
  symbolDefinitions,
  mandalaDefinitions,
  L1_SYMBOLS,
} from "./symbols.js";

/**
 * Calculates the y-position of the TOP wave for particle collision detection.
 */
export function getPoolSurfaceY(x) {
  if (GameState.corruptionLevel <= 0) return canvasHeight + 10;

  const topLayer = Config.poolWaveLayers[Config.poolWaveLayers.length - 1];
  const waveOffset =
    Math.sin(
      x * topLayer.frequency + GameState.totalElapsedTime * topLayer.speed
    ) * topLayer.amplitude;

  // Read directly from the global state
  return GameState.corruptionPoolY + waveOffset;
}

/**
 * Draws the multi-layered, animated corruption pool.
 */
export function drawCorruptionPool() {
  // if (GameState.corruptionLevel <= 0 && !GameState.isPoolRising) return;

  let baseHeight =
    (GameState.corruptionLevel / Config.maxCorruptionLevel) *
    (canvasHeight * Config.poolMaxHeight);

  let i = 0;
  [...Config.poolWaveLayers].reverse().forEach((layer) => {
    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);

    for (let x = 0; x <= canvasWidth; x += 10) {
      const waveOffset =
        Math.sin(
          x * layer.frequency + GameState.totalElapsedTime * layer.speed
        ) * layer.amplitude;
      // Use the global state for the base Y position
      ctx.lineTo(x, GameState.corruptionPoolY + waveOffset + i * 5);
    }

    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.closePath();

    // --- Create a vertical gradient for this layer ---
    const gradient = ctx.createLinearGradient(
      0,
      canvasHeight - baseHeight,
      0,
      canvasHeight
    );
    const bottomColor = adjustColor(layer.color, -40); // Make the bottom significantly darker

    gradient.addColorStop(0, layer.color);
    gradient.addColorStop(1, bottomColor);

    ctx.fillStyle = gradient;
    ctx.fill();

    i++;
  });

  if (GameState.poolShineIntensity > 0) {
    ctx.save();
    // The shine layer's opacity is controlled by the intensity state
    ctx.globalAlpha = GameState.poolShineIntensity;

    // We can reuse the top wave's path for the shine
    // const topLayer = Config.poolWaveLayers[0];
    const topLayer = Config.poolWaveLayers[Config.poolWaveLayers.length - 1];
    const baseHeight =
      (GameState.corruptionLevel / Config.maxCorruptionLevel) *
      (canvasHeight * Config.poolMaxHeight);

    ctx.beginPath();
    ctx.moveTo(0, canvasHeight);
    for (let x = 0; x <= canvasWidth; x += 10) {
      const waveOffset =
        Math.sin(
          x * topLayer.frequency + GameState.totalElapsedTime * topLayer.speed
        ) * topLayer.amplitude;
      ctx.lineTo(x, canvasHeight - baseHeight + waveOffset);
    }
    ctx.lineTo(canvasWidth, canvasHeight);
    ctx.closePath();

    ctx.fillStyle = Config.poolShineColor;
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Draws faint outlines in the background for the L10 symbol slots.
 */
export function drawL10Slots() {
  if (!Config.showL10SlotsInBg) return;

  // Get the IDs for the three primary L10 symbols
  let l10Ids = ["S10_A", "S10_B", "S10_C", "S10_D"];
  l10Ids = l10Ids.slice(0, Config.numberOfSymbolTypes);

  l10Ids.forEach((symbolId, index) => {
    // Only draw the slot if it's currently empty
    const mandalaConfig = mandalaDefinitions[symbolId].mandalaConfig;

    // Calculate the position and size based on the config
    const pos = Config.l10SymbolPositions[index];
    const centerX = canvasWidth * pos.x;
    const centerY = canvasHeight * pos.y;

    const l10Def = symbolDefinitions[symbolId];
    const sizeMultiplier =
      1.0 + (l10Def.level - 1) * Config.sizeIncreasePerLevel;
    const radius = Config.baseBallRadius * sizeMultiplier;

    // Draw the mandala using the special slot style
    drawMandalaBall(ctx, Config, {
      x: centerX,
      y: centerY,
      radius: radius,
      symbolId: symbolId,
      level: 10,
      mandalaConfig: mandalaDefinitions[symbolId].mandalaConfig,
      enableBallFill: true,
      enableBallBorder: true,
      fillColor: "rgba(0.4, 0.4, 0.4, 0.04)",
      innerColor: "rgba(0, 0, 0, 0.1)",
      isMetallic: false,
      drawPlate: true,
      drawEngraving: true,
      isMetallic: false,
    });
  });
}

export function drawPoolMaxHeightLine(cfg) {
  const maxHeightY = canvasHeight - canvasHeight * Config.poolMaxHeight;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, maxHeightY);
  ctx.lineTo(canvasWidth, maxHeightY);

  ctx.strokeStyle = cfg.poolMaxHeightLineColor;
  ctx.lineWidth = 2;

  ctx.stroke();
  ctx.restore();
}

/**
 * Periodically spawns bursts of 'flare' particles from the corruption pool's surface.
 */
export function updatePoolFlares(cfg, deltaTime) {
  if (
    !cfg.enablePoolFlares ||
    GameState.corruptionLevel <= 0 ||
    GameState.isPoolRising
  )
    return;

  // Use an accumulator to handle spawning over time
  const spawnChance = (cfg.flareSpawnRate / 1000) * deltaTime;
  if (Math.random() < spawnChance) {
    // Pick a random spot on the pool surface to erupt from
    const x = Math.random() * canvasWidth;
    const y = getPoolSurfaceY(x) + 20; // Use the existing function to find the wave's surface

    // Spawn a burst of 'flare' type particles
    spawnParticles(
      cfg.flareParticleCount,
      x,
      y,
      cfg.flareGlowColor, // This will be parsed into an object
      cfg.flareUpwardSpeed,
      1,
      2, // min/max size
      cfg.flareLifetime,
      false, // Don't burst outwards
      "flare"
    );
  }
}
