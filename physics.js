import { GameState, handleLifeLoss } from "./game_state.js";
import { Ball } from "./ball.js";
import { symbolDefinitions, L1_SYMBOLS } from "./symbols.js";
import { Config } from "./config.js";
import { spawnParticles, spawnHighestLevelParticles } from "./particles.js";
import { destroyBall, degradeBall } from "./mechanics.js";
import { gainPoints, canvasWidth, canvasHeight } from "./ui.js";

export function applyWindAttraction(cfg) {
  if (
    !cfg.enableWindAttraction ||
    !GameState.windCurve ||
    GameState.windCapturedBalls.length < 2
  ) {
    return;
  }

  // Get the actual ball objects that are captured
  const capturedBalls = GameState.balls.filter((b) =>
    GameState.windCapturedBalls.includes(b.id)
  );

  // Apply the force between every unique pair of captured balls
  for (let i = 0; i < capturedBalls.length; i++) {
    for (let j = i + 1; j < capturedBalls.length; j++) {
      const ballA = capturedBalls[i];
      const ballB = capturedBalls[j];

      const dx = ballB.x - ballA.x;
      const dy = ballB.y - ballA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Avoid extreme forces at very close distances
      if (distance < 1) continue;

      // The force is stronger when balls are closer (inverse relationship)
      const forceMagnitude = cfg.windAttractionStrength / distance;

      // Apply the force to each ball, pulling them towards each other
      const forceX = (dx / distance) * forceMagnitude;
      const forceY = (dy / distance) * forceMagnitude;

      ballA.vx += forceX;
      ballA.vy += forceY;
      ballB.vx -= forceX;
      ballB.vy -= forceY;
    }
  }
}

/**
 * Correctly extracts the level number from a symbol ID.
 * @param {string} inputString - The symbol ID (e.g., 'S10_SOLID_BOTH').
 * @returns {number | null} The level number or null if not found.
 */
function getLevel(inputString) {
  const underscoreIndex = inputString.indexOf("_");
  if (underscoreIndex > 1) {
    // Get the substring between 'S' and the '_' (e.g., '10')
    const levelStr = inputString.substring(1, underscoreIndex);
    return parseInt(levelStr, 10);
  }
  return null;
}

/**
 * Correctly extracts the type name from a symbol ID.
 * @param {string} inputString - The symbol ID (e.g., 'S10_SOLID_BOTH').
 * @returns {string | null} The type name including the underscore (e.g., '_SOLID_BOTH').
 */
function getLineType(inputString) {
  const underscoreIndex = inputString.indexOf("_");
  if (underscoreIndex !== -1) {
    // Return the substring from the '_' to the end.
    return inputString.substring(underscoreIndex);
  }
  return null;
}

export function getCombinedSymbolId(id1, id2) {
  if (Config.enableWindCombination) {
    return null;
  }

  const level1 = getLevel(id1);
  const level2 = getLevel(id2);
  if (level1 !== level2) return null;

  if (id1 === id2) {
    if (Config.enableWildcard) {
      const level = getLevel(id1);
      return `S${level}_WILDCARD`;
    } else if (Config.enableSimpleCombinationMode) {
      const level = getLevel(id1);
      const lineType = getLineType(id2);
      return `S${level + 1}${lineType}`;
    }
  }

  let resultId = null;
  for (const symbolId in symbolDefinitions) {
    const def = symbolDefinitions[symbolId];
    if (def.recipe) {
      if (
        (def.recipe[0] === id1 && def.recipe[1] === id2) ||
        (def.recipe[0] === id2 && def.recipe[1] === id1)
      ) {
        resultId = symbolId;
        break;
      }
    }
  }

  const def1 = symbolDefinitions[id1];
  const def2 = symbolDefinitions[id2];

  if (def1.isWildcard && def2.isWildcard) {
    return null;
  } else if (def1.isWildcard) {
    const level = getLevel(id2);
    const lineType = getLineType(id2);
    return `S${level + 1}${lineType}`;
  } else if (def2.isWildcard) {
    const level = getLevel(id1);
    const lineType = getLineType(id1);
    return `S${level + 1}${lineType}`;
  }

  if (resultId && getLevel(resultId) === 10) {
    console.log("inside");
    const type = getLineType(resultId); // e.g., _SOLID_BOTH

    // Check the specific slot for this type.
    if (
      (type === "_A" && GameState.l10Slots[0] !== null) ||
      (type === "_B" && GameState.l10Slots[1] !== null) ||
      (type === "_C" && GameState.l10Slots[2] !== null)
    ) {
      // The slot is full, so the combination is impossible.
      return null;
    }
  }

  return resultId;
}

function createBall(ballA, ballB, combinedSymId) {
  const productDef = symbolDefinitions[combinedSymId];

  const sizeMultiplier =
    1.0 + (productDef.level - 1) * Config.sizeIncreasePerLevel;
  let newRadius = Config.baseBallRadius * sizeMultiplier;
  newRadius = Math.max(5, newRadius); // Use 5 to match environment.js

  const midX =
    (ballA.x * ballB.radius + ballB.x * ballA.radius) /
    (ballA.radius + ballB.radius);
  const midY =
    (ballA.y * ballB.radius + ballB.y * ballA.radius) /
    (ballA.radius + ballB.radius);

  const totalMassProxy = ballA.radius + ballB.radius;
  const newVx =
    (ballA.vx * ballA.radius + ballB.vx * ballB.radius) / totalMassProxy;
  const newVy =
    (ballA.vy * ballA.radius + ballB.vy * ballB.radius) / totalMassProxy;
  const newBall = new Ball(midX, midY, newRadius, combinedSymId, false);
  newBall.vx = newVx;
  newBall.vy = newVy;
  newBall.gravityImmuneUntil =
    Date.now() +
    Config.windGravityImmunityDuration +
    Config.levitationLevelMultiplier * productDef.level;

  return newBall;
}

function playHighestLevelAnimation(newBall) {
  GameState.highestLevelAchieved = newBall.level;
  GameState.isAnimatingHighestLevel = true;
  GameState.highestLevelAnimationStart = Date.now();

  const uiPanel = document.getElementById("highestLevelCanvas");
  if (uiPanel) {
    const rect = uiPanel.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    spawnHighestLevelParticles(centerX, centerY);
  }

  // spawnHighestLevelParticles(newBall.x, newBall.y);
}

function combineSymbols(ballA, ballB) {
  const level1 = getLevel(ballA.symbolId);
  const level2 = getLevel(ballB.symbolId);
  if (level1 !== level2) return false;

  if (
    Config.enableZeroGravityMode &&
    !ballA.hasBeenManipulated &&
    !ballB.hasBeenManipulated
  ) {
    return false;
  }

  let combinedSymId = getCombinedSymbolId(ballA.symbolId, ballB.symbolId);
  if (!combinedSymId) {
    if (Config.numberOfSymbolTypes == 4) {
      destroyBall(ballA);
      destroyBall(ballB);
      return true;
    }
    return false;
  }

  const newBall = createBall(ballA, ballB, combinedSymId);

  if (newBall.isL10Symbol) {
    const type = getLineType(newBall.symbolId);
    let socketIndex = -1;

    if (type === "_A") socketIndex = 0;
    else if (type === "_B") socketIndex = 1;
    else if (type === "_C") socketIndex = 2;
    else if (type === "_D") socketIndex = 3;

    if (socketIndex !== -1) {
      GameState.l10Slots[socketIndex] = newBall.id;
      const targetPos = Config.l10SymbolPositions[socketIndex];
      newBall.targetPosition = {
        x: canvasWidth * targetPos.x,
        y: canvasHeight * targetPos.y,
      };
    }
  }

  GameState.ballsToRemoveThisFrame.push(ballA, ballB);
  GameState.ballsToAddNewThisFrame.push(newBall);

  if (newBall.level > 1) {
    gainPoints(newBall);
  }

  if (newBall.level > GameState.highestLevelAchieved) {
    playHighestLevelAnimation(newBall);
  }

  let gloryParticleCount = Config.gloryParticleBaseCount * 2;

  // Math.pow(newBall.level, 2) * Config.gloryParticleBaseCount;
  if (!GameState.discoveredSymbols.has(newBall.symbolId)) {
    gloryParticleCount =
      Math.pow(newBall.level, 2) * Config.gloryParticleBaseCount;
    GameState.discoveredSymbols.add(newBall.symbolId);
  }

  spawnParticles(
    gloryParticleCount,
    newBall.x,
    newBall.y,
    Config.gloryParticleColor,
    Config.Debris_Particle_Speed,
    1,
    2,
    20000,
    true,
    "glory" // A new particle type
  );

  // Play construction particle effect.
  spawnParticles(
    Config.Construction_Particle_Count,
    newBall.x,
    newBall.y,
    Config.invertColors
      ? Config.particleConstructColor.inverted
      : Config.particleConstructColor.normal,
    Config.Construction_Particle_Speed,
    1,
    5,
    Config.PARTICLE_LIFETIME_MS * 0.8,
    false
  );
  return true;
}

function collideSimpleWithComplexSymbol(ballA, ballB) {
  const ballA_is_L10 = symbolDefinitions[ballA.symbolId]?.level === 10;
  const ballB_is_L10 = symbolDefinitions[ballB.symbolId]?.level === 10;
  if (ballA_is_L10 || ballB_is_L10) {
    return false;
  }

  if (ballA.level != 1 && ballB.level != 1) {
    return false;
  }

  const combinedLevel = ballA.level + ballB.level;
  if (combinedLevel <= 2) {
    return false;
  }

  const simpleBall = ballA.level > ballB.level ? ballB : ballA;
  const complexBall = ballA.level > ballB.level ? ballA : ballB;

  if (!Config.enableCollision) {
    return true;
  }

  if (Config.enableImmunity) {
    destroyBall(simpleBall);
    return true;
  }

  return false;
}

function bounce(ballA, ballB) {
  const dx = ballA.x - ballB.x;
  const dy = ballA.y - ballB.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 1. Resolve Overlap
  // This pushes the balls apart slightly so they don't get stuck inside each other.
  const overlap = ballA.radius + ballB.radius - distance;
  if (overlap > 0) {
    const totalMass = ballA.radius + ballB.radius;

    // The amount each ball is pushed is inversely proportional to its mass
    const pushFactor = overlap / totalMass;

    ballA.x += (dx / distance) * ballB.radius * pushFactor;
    ballA.y += (dy / distance) * ballB.radius * pushFactor;
    ballB.x -= (dx / distance) * ballA.radius * pushFactor;
    ballB.y -= (dy / distance) * ballA.radius * pushFactor;
  }

  // 2. Calculate Bounce Physics (2D Elastic Collision)

  // Find the normal and tangent vectors of the collision plane
  const normalX = dx / distance;
  const normalY = dy / distance;
  const tangentX = -normalY;
  const tangentY = normalX;

  // Project the velocities of each ball onto the normal and tangent vectors
  const v1n = ballA.vx * normalX + ballA.vy * normalY; // ballA's velocity along the normal
  const v1t = ballA.vx * tangentX + ballA.vy * tangentY; // ballA's velocity along the tangent
  const v2n = ballB.vx * normalX + ballB.vy * normalY;
  const v2t = ballB.vx * tangentX + ballB.vy * tangentY;

  // Use radius as a proxy for mass
  const m1 = ballA.radius;
  const m2 = ballB.radius;

  // Perform a 1D elastic collision calculation on the normal velocities
  const v1n_final = (v1n * (m1 - m2) + 2 * m2 * v2n) / (m1 + m2);
  const v2n_final = (v2n * (m2 - m1) + 2 * m1 * v1n) / (m1 + m2);

  // The tangential velocities remain unchanged after the collision
  // Convert the final scalar velocities back into vectors
  const v1nVecX = v1n_final * normalX;
  const v1nVecY = v1n_final * normalY;
  const v1tVecX = v1t * tangentX;
  const v1tVecY = v1t * tangentY;

  const v2nVecX = v2n_final * normalX;
  const v2nVecY = v2n_final * normalY;
  const v2tVecX = v2t * tangentX;
  const v2tVecY = v2t * tangentY;

  // Recombine the normal and tangent vectors to get the final velocity
  ballA.vx = v1nVecX + v1tVecX;
  ballA.vy = v1nVecY + v1tVecY;
  ballB.vx = v2nVecX + v2tVecX;
  ballB.vy = v2nVecY + v2tVecY;
}

function createExplosion(symbolDefA, midX, midY) {
  const actualExplosionRadius =
    symbolDefA.explosionRadiusUnits * Config.baseBallRadius;
  for (let k = 0; k < GameState.balls.length; k++) {
    const otherBall = GameState.balls[k];
    if (GameState.ballsToRemoveThisFrame.includes(otherBall)) continue;
    const distToOther = Math.sqrt(
      (otherBall.x - midX) ** 2 + (otherBall.y - midY) ** 2
    );
    if (distToOther < actualExplosionRadius + otherBall.radius) {
      if (symbolDefA.explosionEffectLevels.includes(otherBall.level)) {
        GameState.ballsToRemoveThisFrame.push(otherBall);
        spawnParticles(
          Config.Debris_Particle_Count,
          otherBall.x,
          otherBall.y,
          Config.invertColors
            ? Config.particleDebrisColor.inverted
            : Config.particleDebrisColor.normal,
          Config.Debris_Particle_Speed,
          1,
          4
        );
      }
    }
  }
}

function knockbackOnCollision(voidBall, targetBall, newBall) {
  let knockbackVx = 0;
  let knockbackVy = 0;

  // Calculate the vector pointing from the void ball to the target ball.
  const dx = targetBall.x - voidBall.x;
  const dy = targetBall.y - voidBall.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Normalize the vector (make its length 1) to get a pure direction.
  // We check if distance > 0 to avoid dividing by zero.
  if (distance > 0) {
    const normalizedX = dx / distance;
    const normalizedY = dy / distance;

    // Apply the knockback force from the config.
    knockbackVx = normalizedX * Config.degradationKnockback * 5;
    knockbackVy = normalizedY * Config.degradationKnockback * 5;
  } else {
    // Fallback: If they are perfectly overlapped, push the new ball upwards.
    knockbackVy = -Config.degradationKnockback;
  }

  // Inherit the parent's velocity AND add the new knockback force.
  newBall.vx += targetBall.vx + knockbackVx;
  newBall.vy += targetBall.vy + knockbackVy;
}

export function collideWithVoid(ballA, ballB) {
  if (
    !(
      (ballA.symbolId === "S1_VOID" && ballB.symbolId !== "S1_VOID") ||
      (ballB.symbolId === "S1_VOID" && ballA.symbolId !== "S1_VOID")
    )
  ) {
    return false;
  }

  const voidBall = ballA.symbolId === "S1_VOID" ? ballA : ballB;
  const targetBall = ballA.symbolId === "S1_VOID" ? ballB : ballA;

  const targetDef = symbolDefinitions[targetBall.symbolId];

  if (targetBall.isMetallic) {
    knockbackOnCollision(voidBall, targetBall, targetBall);
    targetBall.windImmuneUntil =
      Date.now() + Config.degradationWindImmunityDuration;
    spawnParticles(
      100, // More particles for a significant event
      targetBall.x,
      targetBall.y,
      Config.metallicShieldBreakColor,
      10,
      2,
      1,
      2000,
      true,
      "corruption_inert",
      targetBall.radius
    );
    targetBall.isMetallic = false;
    return true;
  }

  // Check if degradation is enabled AND if the target symbol has a valid recipe.
  if (
    Config.enableDegradation &&
    targetDef &&
    targetDef.recipe &&
    targetDef.recipe.length > 0
  ) {
    // It can be degraded!
    // 1. Randomly pick one of the two ingredients from the recipe.
    const degradedSymbolId =
      targetDef.recipe[Math.floor(Math.random() * targetDef.recipe.length)];
    const degradedDef = symbolDefinitions[degradedSymbolId];

    // 2. Calculate properties for the new, degraded ball.
    const newRadius = Config.baseBallRadius * degradedDef.sizeMultiplier;
    const newIsBlack = targetBall.isBlack; // Inherit the color type.

    // Create the new ball at the position of the old one.
    const newBall = new Ball(
      targetBall.x,
      targetBall.y,
      newRadius,
      degradedSymbolId,
      newIsBlack
    );

    knockbackOnCollision(voidBall, targetBall, newBall);

    newBall.windImmuneUntil =
      Date.now() + Config.degradationWindImmunityDuration;

    // 3. Queue the new ball to be added and the old one to be removed.
    GameState.ballsToAddNewThisFrame.push(newBall);
    GameState.ballsToRemoveThisFrame.push(targetBall); // Only remove the target.

    if (targetBall.level > Config.minLevelToLoseLife) {
      handleLifeLoss();
    }

    // 4. Spawn particles to give visual feedback of the degradation.
    spawnParticles(
      Config.Construction_Particle_Count, // Use construction particles for feedback
      targetBall.x,
      targetBall.y,
      Config.invertColors
        ? Config.particleConstructColor.inverted
        : Config.particleConstructColor.normal,
      Config.Construction_Particle_Speed,
      1,
      4
    );
    return true;
  }

  destroyBall(targetBall);
  return true;
}

export function isColliding(ballA, ballB) {
  if (
    GameState.ballsToRemoveThisFrame.includes(ballB) ||
    GameState.ballsToRemoveThisFrame.includes(ballA) ||
    ballA.isGrabbed ||
    ballB.isGrabbed
  ) {
    return false;
  }

  const dx = ballA.x - ballB.x;
  const dy = ballA.y - ballB.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < ballA.radius + ballB.radius && distance > 0.1;
}

function shouldDestroy(ballA, ballB) {
  let destroy =
    ballA.symbolId === ballB.symbolId &&
    !Config.enableWildcard &&
    !Config.enableSimpleCombinationMode &&
    !Config.enableWindCombination;

  if (
    Config.enableWildcard &&
    def1.isWildcard &&
    def2.isWildcard &&
    level1 == level2
  ) {
    destroy = true;
  }
  return destroy;
}

function destroySymbols(ballA, ballB) {
  let destroy = shouldDestroy(ballA, ballB);
  if (!destroy) {
    return false;
  }

  const midX =
    (ballA.x * ballB.radius + ballB.x * ballA.radius) /
    (ballA.radius + ballB.radius);
  const midY =
    (ballA.y * ballB.radius + ballB.y * ballA.radius) /
    (ballA.radius + ballB.radius);

  if (ballA.level > Config.minLevelToLoseLife) {
    handleLifeLoss();
  }

  destroyBall(ballA);
  destroyBall(ballB);

  if (Config.enableExplosions) {
    createExplosion(symbolDefA, midX, midY);
  }
  return true;
}

function collideLife(ballA, ballB) {
  if (ballA.symbolId === ballB.symbolId && ballA.symbolId === "S1_LIFE") {
    if (GameState.lives < Config.maxLives) {
      GameState.lives++;
    }
    GameState.ballsToRemoveThisFrame.push(ballA, ballB);
    spawnHighestLevelParticles(midX, midY);
    return true;
  }
  return false;
}

function degradeOnSameSymbolCollision(ballA, ballB) {
  if (
    ballA.symbolId === ballB.symbolId &&
    Config.enableHardDegradation &&
    !Config.enableWildcard
  ) {
    const didDegrade = degradeBall(ballA, ballB); // Degrade ball A
    if (didDegrade && ballA.level > Config.minLevelToLoseLife) {
      handleLifeLoss();
    }
    return true;
  }
  return false;
}

export function collideWithFinalSymbol(ballA, ballB) {
  const ballA_is_L10 = symbolDefinitions[ballA.symbolId]?.level === 10;
  const ballB_is_L10 = symbolDefinitions[ballB.symbolId]?.level === 10;

  // --- NEW: Priority 1: L10 Symbol Collision Logic ---
  if (ballA_is_L10 || ballB_is_L10) {
    const l10Ball = ballA_is_L10 ? ballA : ballB;
    const otherBall = ballA_is_L10 ? ballB : ballA;

    // The L10 symbol destroys the Void symbol
    if (otherBall.symbolId === "S1_VOID") {
      destroyBall(otherBall);
    } else if (otherBall.level == 1 && !Config.enableBlackSlideOff) {
      destroyBall(otherBall);
    } else {
      // For any other symbol, it acts as an immovable wall
      // Apply a one-way bounce to the other ball
      // const dx = otherBall.x - l10Ball.x;
      // const dy = otherBall.y - l10Ball.y;
      // const distance = Math.sqrt(dx * dx + dy * dy);
      // if (distance > 0) {
      //   otherBall.vx = (dx / distance) * 2.5; // Strong bounce
      //   otherBall.vy = (dy / distance) * 2.5;
      // }
      return false;
    }
    return true;
  }
  return false;
}

export function processCollision(ballA, ballB) {
  if (collideWithFinalSymbol(ballA, ballB)) {
    return;
  }

  if (collideWithVoid(ballA, ballB)) {
    return;
  }

  if (collideLife(ballA, ballB)) {
    return;
  }

  if (degradeOnSameSymbolCollision(ballA, ballB)) {
    return;
  }

  if (destroySymbols(ballA, ballB)) {
    return;
  }

  if (combineSymbols(ballA, ballB)) {
    return;
  }

  if (collideSimpleWithComplexSymbol(ballA, ballB)) {
    return;
  }

  bounce(ballA, ballB);
}

export function processCollisions() {
  for (let i = 0; i < GameState.balls.length; i++) {
    let ballA = GameState.balls[i];
    if (GameState.ballsToRemoveThisFrame.includes(ballA)) continue;

    for (let j = i + 1; j < GameState.balls.length; j++) {
      let ballB = GameState.balls[j];

      if (!isColliding(ballA, ballB)) continue;

      processCollision(ballA, ballB);
    }
  }

  if (GameState.ballsToRemoveThisFrame.length > 0) {
    GameState.balls = GameState.balls.filter(
      (b) => !GameState.ballsToRemoveThisFrame.includes(b)
    );
  }

  if (GameState.ballsToAddNewThisFrame.length > 0) {
    GameState.balls.push(...GameState.ballsToAddNewThisFrame);
  }
}
