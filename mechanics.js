import { Config } from "./config.js";
import { GameState, handleLifeLoss } from "./game_state.js";
import { Ball } from "./ball.js";
import { spawnParticles } from "./particles.js";
import { canvasWidth, canvasHeight } from "./ui.js";
import { losePoints } from "./ui.js";

/**
 * Handles the degradation of a ball upon collision.
 * If the ball has ingredients, it degrades into one of them with a knockback.
 * Otherwise, it is simply destroyed.
 * @param {Ball} ballToDegrade - The ball instance to be degraded.
 * @param {object} knockbackSource - An object with {x, y} to apply knockback force FROM.
 */
export function degradeBall(ballToDegrade, knockbackSource) {
  const targetDef = symbolDefinitions[ballToDegrade.symbolId];

  // Check if the symbol can be degraded (i.e., it has a recipe)
  if (targetDef && targetDef.recipe && targetDef.recipe.length > 0) {
    // It can be degraded!
    const degradedSymbolId =
      targetDef.recipe[Math.floor(Math.random() * targetDef.recipe.length)];
    const degradedDef = symbolDefinitions[degradedSymbolId];

    const newRadius = Config.baseBallRadius * degradedDef.sizeMultiplier;

    const newBall = new Ball(
      ballToDegrade.x,
      ballToDegrade.y,
      newRadius,
      degradedSymbolId,
      ballToDegrade.isBlack
    );

    // --- KNOCKBACK LOGIC ---
    const dx = ballToDegrade.x - knockbackSource.x;
    const dy = ballToDegrade.y - knockbackSource.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0) {
      newBall.vx = (dx / distance) * Config.degradationKnockback;
      newBall.vy = (dy / distance) * Config.degradationKnockback;
    } else {
      newBall.vy = -Config.degradationKnockback; // Fallback
    }

    GameState.ballsToAddNewThisFrame.push(newBall);
    spawnParticles(
      Config.Construction_Particle_Count,
      ballToDegrade.x,
      ballToDegrade.y,
      Config.invertColors
        ? Config.particleConstructColor.inverted
        : Config.particleConstructColor.normal,
      Config.Construction_Particle_Speed,
      1,
      4
    );
    GameState.ballsToRemoveThisFrame.push(ballToDegrade);
    return true;
  }

  destroyBall(ballToDegrade);
  return false;
}

export function destroyBall(ballToDestroy, type) {
  // Prevent a ball from being destroyed multiple times in one frame
  if (GameState.ballsToRemoveThisFrame.includes(ballToDestroy)) return;

  // 1. Queue the ball for removal
  GameState.ballsToRemoveThisFrame.push(ballToDestroy);

  // 2. Handle life loss if the system is enabled
  if (
    ballToDestroy.level > Config.minLevelToLoseLife &&
    !GameState.isPoolRising
  ) {
    handleLifeLoss();
  }

  // 3. Spawn the new corruption particles
  // const particleCount =
  //   Math.pow(2, ballToDestroy.level - 1) * Config.corruptionParticleBaseCount;

  let x = ballToDestroy.x;
  let y = ballToDestroy.y;
  if (type == "glory") {
    const gloryParticleCount =
      Math.pow(ballToDestroy.level, 2) * Config.gloryParticleBaseCount;
    spawnParticles(
      gloryParticleCount,
      ballToDestroy.x,
      ballToDestroy.y,
      Config.gloryParticleColor,
      Config.Debris_Particle_Speed,
      1,
      2,
      20000,
      true,
      "glory" // A new particle type
    );
  } else {
    const isVoid = ballToDestroy.symbolId === "S1_VOID";

    let particleCount =
      Math.pow(ballToDestroy.level, 2) * Config.corruptionParticleBaseCount;
    if (isVoid) {
      particleCount = Config.voidParticleCount;
    }

    spawnParticles(
      particleCount,
      ballToDestroy.x,
      ballToDestroy.y,
      Config.corruptionParticleColor,
      Config.Debris_Particle_Speed,
      1, // minSize
      2, // maxSize
      20000, // lifetime
      true, // outwardBias
      "corruption",
      ballToDestroy.radius
    );
  }

  if (ballToDestroy.level > 1 && Config.enableLosePoints) {
    losePoints(ballToDestroy);
  }
}
