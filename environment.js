import { Config } from "./config.js";
import {
  symbolDefinitions,
  L1_NORMAL_SYMBOLS,
  L2_NORMAL_SYMBOLS,
  L3_NORMAL_SYMBOLS,
} from "./symbols.js";
import { spawnParticles, updateAndDrawParticles } from "./particles.js";
import { Ball } from "./ball.js";
import { canvasWidth, canvasHeight, canvas, ctx } from "./ui.js";
import { GameState } from "./game_state.js";
import { addPlayerEvents } from "./player.js";

export function spawnSpecificBall(symbolId) {
  if (GameState.gameOver) return;

  const symbolDef = symbolDefinitions[symbolId];
  if (!symbolDef) {
    console.error(`Attempted to spawn unknown symbol: ${symbolId}`);
    return;
  }

  const sizeMultiplier =
    1.0 + (symbolDef.level - 1) * Config.sizeIncreasePerLevel;
  const radius = Math.max(5, Config.baseBallRadius * sizeMultiplier);

  // Spawn at the top-center of the canvas
  const x = canvasWidth / 2;
  const y = -radius;

  GameState.balls.push(new Ball(x, y, radius, symbolId, false));
}

function createBall() {
  if (GameState.gameOver) return;

  let randomSymbolId;

  // 1. Roll the dice (get a random number between 0 and 1).
  const roll = Math.random();

  if (roll < Config.lifeSymbolSpawnRate) {
    randomSymbolId = "S1_LIFE";
  } else if (roll < Config.lifeSymbolSpawnRate + Config.voidSymbolSpawnRate) {
    randomSymbolId = "S1_VOID";
  } else {
    // randomSymbolId = L1_NORMAL_SYMBOLS[GameState.nextSymbolIndex];

    // GameState.nextSymbolIndex++;

    // if (GameState.nextSymbolIndex >= Config.numberOfSymbolTypes) {
    //   GameState.nextSymbolIndex = 0;
    // }

    // --- NEW: Weighted Level Spawning Logic ---
    if (Config.enableMultiLevelSpawning) {
      const levelRoll = Math.random();

      if (levelRoll < Config.spawnChanceL1) {
        randomSymbolId = L1_NORMAL_SYMBOLS[GameState.nextSymbolIndex];
        GameState.nextSymbolIndex =
          (GameState.nextSymbolIndex + 1) % L1_NORMAL_SYMBOLS.length;
      } else if (levelRoll < Config.spawnChanceL1 + Config.spawnChanceL2) {
        // Spawn a Level 2 symbol
        randomSymbolId =
          L2_NORMAL_SYMBOLS[
            Math.floor(Math.random() * L2_NORMAL_SYMBOLS.length)
          ];
      } else {
        // Spawn a Level 3 symbol
        randomSymbolId =
          L3_NORMAL_SYMBOLS[
            Math.floor(Math.random() * L3_NORMAL_SYMBOLS.length)
          ];
      }
    } else {
      // Fallback to the deterministic Level 1 spawning if multi-level is off
      randomSymbolId = L1_NORMAL_SYMBOLS[GameState.nextSymbolIndex];
      GameState.nextSymbolIndex =
        (GameState.nextSymbolIndex + 1) % Config.numberOfSymbolTypes;
    }
  }

  const symbolDef = symbolDefinitions[randomSymbolId];

  let actualRadius;
  if (randomSymbolId === "S1_VOID") {
    // Check if the variable size feature is enabled in the config.
    if (Config.enableVariableVoidSize) {
      // 1. Calculate a random multiplier within the min/max range.
      const randomMultiplier =
        Math.random() *
          (Config.voidSizeMultiplierMax - Config.voidSizeMultiplierMin) +
        Config.voidSizeMultiplierMin;

      // 2. Apply the random multiplier to the base radius.
      actualRadius = Config.baseBallRadius * randomMultiplier;
    } else {
      // 3. If disabled, use the original fixed multiplier as a fallback.
      actualRadius = Config.baseBallRadius * Config.voidBallRadiusMultiplier;
    }
  } else {
    // This logic for normal symbols remains unchanged.
    const sizeMultiplier =
      1.0 + (symbolDef.level - 1) * Config.sizeIncreasePerLevel;
    actualRadius = Config.baseBallRadius * sizeMultiplier;
  }

  actualRadius = Math.max(5, actualRadius);

  const x = Math.random() * (canvasWidth - actualRadius * 2) + actualRadius;

  const y = -actualRadius - Math.random() * 20;
  const isBlack = Math.random() < Config.Initial_Ratio_Black_To_Gray;
  GameState.balls.push(new Ball(x, y, actualRadius, randomSymbolId, isBlack));
}

export function addBallSpawnsEvents() {
  if (Config.ballCreationInterval > 0) {
    GameState.ballCreationTimerId = setInterval(
      createBall,
      Config.ballCreationInterval
    );
  }
}

export function resetBallCreationTimer() {
  clearInterval(GameState.ballCreationTimerId);
  if (Config.ballCreationInterval > 0) {
    GameState.ballCreationTimerId = setInterval(
      createBall,
      Config.ballCreationInterval
    );
  }
}
