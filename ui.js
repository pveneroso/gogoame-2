import { Config } from "./config.js";
import {
  mandalaDefinitions,
  symbolDefinitions,
  recreateSymbols,
} from "./symbols.js";
import { GameState } from "./game_state.js";
import {
  drawMandala,
  drawMandalaBall,
  createMetallicGradient,
  adjustColor,
  getColorFromPalette,
} from "./drawing.js"; // Import the shared function
import {
  spawnParticles,
  updateAndDrawParticles,
  spawnParticlesAlongCurve,
} from "./particles.js";
import { destroyBall } from "./mechanics.js";

import { resetBallCreationTimer, spawnSpecificBall } from "./environment.js";

const controlsPanel = document.querySelector(".controls");
const highestLevelCanvas = document.getElementById("highestLevelCanvas");
const highestLevelCtx = highestLevelCanvas.getContext("2d");
export const canvas = document.getElementById("gameCanvas");
export const ctx = canvas.getContext("2d");
export let canvasWidth = window.innerWidth;
export let canvasHeight = window.innerHeight;

const dpr = window.devicePixelRatio || 1;

// 2. Set the canvas's drawing buffer to the high-resolution size.
canvas.width = canvasWidth * dpr;
canvas.height = canvasHeight * dpr;

// 3. Use CSS to scale the canvas element back down to the logical size.
canvas.style.width = `${canvasWidth}px`;
canvas.style.height = `${canvasHeight}px`;

// 4. Scale the main drawing context. All drawing operations will now be scaled up.
ctx.scale(dpr, dpr);

const displayWidth = highestLevelCanvas.width;
const displayHeight = highestLevelCanvas.height;

highestLevelCanvas.width = displayWidth * dpr;
highestLevelCanvas.height = displayHeight * dpr;

highestLevelCanvas.style.width = `${displayWidth}px`;
highestLevelCanvas.style.height = `${displayHeight}px`;
highestLevelCtx.scale(dpr, dpr);

const rangeFactor = 10;

const configurableParams = [
  ["terminalVelocity", 0.1],
  ["terminalVelocitySymbol", 0.05],
  ["baseBallRadius", 1],
  ["ballCreationInterval", 100],
  ["friction", 0.005],
  ["sidewaysWindStrength", 0.001],
  ["windOscillationAmplitude", 0.001],
  ["windOscillationFrequency1", 0.1],
  ["windOscillationFrequency2", 0.2],
  ["ballTrailLength", 50],
  ["ballTrailStartWidth", 1],
  ["ballTrailEndWidth", 1],
  ["ballTrailOpacity", 0.001],
  ["voidBallRadiusMultiplier", 0.1],
  ["enablePhantomSymbols", "toggle"],
  ["enableBallTrails", "toggle"],
  ["enableCollision", "toggle"],
  ["enableWildcard", "toggle"],
  ["enableDegradation", "toggle"],
  ["enableHardDegradation", "toggle"],
  ["degradationKnockback", 1],
  ["degradationWindImmunityDuration", 100],
  ["voidSymbolSpawnRate", 0.05],
  ["voidSizeMultiplierMin", 0.05],
  ["voidSizeMultiplierMax", 0.05],
  ["voidSpeedMultiplier", 0.25],
  ["enableDangerHighlight", "toggle"],
  ["dangerHighlightMinLevel", 1],
  ["dangerHighlightBlur", 5],
  ["dangerHighlightMaxDistance", 10],
  ["enableLivesSystem", "toggle"],
  ["enableSimpleCombinationMode", "toggle"],
  ["initialLives", 1],
  ["lifeSymbolSpawnRate", 0.01],
  ["lifeSymbolFallSpeedMultiplier", 0.1],
  ["maxLives", 1],
  ["sizeIncreasePerLevel", 0.01],
  ["enableWindCombination", "toggle"],
  ["windCombinationChargeTime", 100],
  ["enableBallBorder", "toggle"],
  ["enableBallFill", "toggle"],
  ["invertColors", "toggle"],
  ["strokeColors", "toggle"],
  ["enableLifeLossAnimation", "toggle"],
  ["gravityMassEffect", 0.5],
  ["enableZeroGravityMode", "toggle"],
  ["enableImmunity", "toggle"],
  ["immunityKnockback", 0.1],
  ["mandalaInnerRadius", 0.05],
  ["mandalaCurveAmount", 0.05],
  ["allMetallic", "toggle"],
  ["windGravityImmunityDuration", 100],
  ["glitterParticleRate", 0.05],
  ["glitterParticleLifetime", 50],
  ["corruptionParticleBaseCount", 1],
  ["corruptionPerParticle", 0.2],
  ["purificationPerParticle", 0.2],
  ["windParticleSpread", 1],
  ["windParticleLifetime", 500],
  ["windParticleSpawnRate", 1],
  ["windParticleBaseSpeed", 0.5],
  ["windParticleSpeedVariance", 1.0],
  ["windParticleTrailLength", 5],
  ["minPointDistance", 1],
  ["windInfluenceRadius", 5],
  ["windCouplingStrength", 0.005],
  ["windForceFalloff", 0.05],
  ["windBaseLifetime", 200],
  ["windLifetimePerPixel", 1],
  ["windSmoothingFactor", 0.1],
  ["windMaxSpeed", 0.5],
  ["windShadowBlur", 5],
  ["windBaseStrength", 0.05],
  ["windStrengthPer100px", 0.01],
  ["windArrivalDistance", 10],
  ["couplingCurvatureFactor", 10],
  ["voidTrailStartWidth", 1],
  ["voidTrailEndWidth", 1],
  ["voidTrailOpacity", 0.05],
  ["voidTrailWobbleFrequency", 5],
  ["voidTrailWobbleAmplitude", 5],
  ["voidTrailWobbleSpeed", 5],
  ["enableHorizontalKick", "toggle"],
  ["voidParticleCount", "toggle"],
  ["enableLosePoints", "toggle"],
  ["numberOfSymbolTypes", 1],
  ["enableBlackSlideOff", "toggle"],
  ["enablePoolFlares", "toggle"],
  ["enableWindAttraction", "toggle"],
  ["windAttractionStrength", 0.1],
  ["enableMultiLevelSpawning", "toggle"],
  ["spawnChanceL1", 0.1],
  ["spawnChanceL2", 0.1],
  ["spawnChanceL3", 0.1],
];

function drawLeaf(x, y, color) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = color;

  // --- NEW: Dynamic Size Calculation ---
  // Define a base size for the leaf on a large screen.
  const baseLeafHeight = 30;
  // Create a scale factor based on the canvas width.
  // We'll use 800px as a reference width for full-size leaves.
  // The Math.min ensures the leaves don't get overly large on ultra-wide screens.
  const scaleFactor = Math.min(1.0, canvasWidth / 100);

  const leafHeight = baseLeafHeight * scaleFactor;
  // Maintain the leaf's aspect ratio by scaling its width proportionally.
  const leafHalfWidth = leafHeight / 2;
  // --- End of New Logic ---

  // Move the canvas origin to the leaf's position
  ctx.translate(x, y);
  // Rotate the entire canvas by 45 degrees
  ctx.rotate(Math.PI / 4);

  // Draw the leaf at the new (0,0) origin using the dynamic dimensions
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(leafHalfWidth, leafHalfWidth, 0, leafHeight);
  ctx.quadraticCurveTo(-leafHalfWidth, leafHalfWidth, 0, 0);
  ctx.fill();

  // ctx.strokeStyle = (Config.invertColors) ? Config.symbolColor.inverted : Config.symbolColor.normal;
  // ctx.stroke();

  ctx.restore();
}

/**
 * Draws the current number of lives as leaves in the top-right corner.
 */
export function drawLivesDisplay() {
  if (!Config.enableLivesSystem) return;

  for (let i = 0; i < Config.maxLives; i++) {
    // Position leaves from right to left
    const x = canvasWidth - 70 - i * 25;
    const y = 20;

    // Determine if the leaf should be green (alive) or black (lost)
    const isLifeRemaining = i < GameState.lives;
    const color = isLifeRemaining
      ? Config.invertColors
        ? Config.lifeLeafColor.inverted
        : Config.lifeLeafColor.normal
      : Config.invertColors
        ? Config.lostLifeLeafColor.inverted
        : Config.lostLifeLeafColor.normal;

    drawLeaf(x, y, color);
  }
}

export function drawHighestLevelDisplay() {
  // --- NEW: Use the intended display size for all calculations ---
  // We get this from the canvas's style, which we set during the high-DPI setup.
  const displayWidth = parseInt(highestLevelCanvas.style.width, 10);
  const displayHeight = parseInt(highestLevelCanvas.style.height, 10);

  highestLevelCtx.clearRect(
    0,
    0,
    highestLevelCanvas.width,
    highestLevelCanvas.height
  );

  let backgroundColor = "#000"; // Default background color is black

  const levelToDisplay = Math.min(
    GameState.highestLevelAchieved,
    Config.MAX_SYMBOL_LEVEL
  );

  const representativeId = `S${levelToDisplay}_A`;
  const mandalaDef = mandalaDefinitions[representativeId];

  if (mandalaDef && mandalaDef.mandalaConfig) {
    const config = mandalaDef.mandalaConfig;
    const displayColor = "#FFFFFF";
    const maxRadius = (displayWidth / 2) * 0.9;

    const finalSpikeDistance = config.spikeDistance * maxRadius;
    let currentSpikeDistance = finalSpikeDistance;

    if (GameState.isAnimatingHighestLevel) {
      const elapsedTime = Date.now() - GameState.highestLevelAnimationStart;
      const animationProgress = Math.min(
        1.0,
        elapsedTime / Config.highestLevelAnimationDuration
      );

      // --- NEW TWO-STAGE ANIMATION LOGIC ---

      // Stage 1: The mandala grows quickly during the first half of the animation.
      const growProgress = Math.min(1.0, animationProgress / 0.5);
      currentSpikeDistance = finalSpikeDistance * growProgress;

      // The background is solid gold during the grow stage.
      backgroundColor = "#D4AF37"; // A nice gold color

      // Stage 2: The background fades from gold to black during the second half.
      if (animationProgress > 0.5) {
        // This value goes from 0.0 to 1.0 during the second half of the animation
        const fadeProgress = (animationProgress - 0.5) / 0.5;

        // The RGB values for gold
        const gold = { r: 212, g: 175, b: 55 };

        // Interpolate each color channel from gold towards black (0)
        const r = gold.r * (1 - fadeProgress);
        const g = gold.g * (1 - fadeProgress);
        const b = gold.b * (1 - fadeProgress);

        backgroundColor = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
      }

      // If the entire animation is complete, turn it off
      if (animationProgress >= 1.0) {
        GameState.isAnimatingHighestLevel = false;
        backgroundColor = "#000"; // Ensure it ends on black
      }
    }

    // Fill the background with the calculated color
    highestLevelCtx.fillStyle = backgroundColor;
    highestLevelCtx.fillRect(
      0,
      0,
      highestLevelCanvas.width,
      highestLevelCanvas.height
    );

    const symbolId = `S${levelToDisplay}_C`;
    drawMandalaBall(highestLevelCtx, Config, {
      x: displayWidth / 2,
      y: displayHeight / 2,
      radius: maxRadius,
      symbolId: symbolId,
      level: levelToDisplay,
      mandalaConfig: mandalaDefinitions[symbolId].mandalaConfig,
      enableBallFill: false,
      enableBallBorder: false,
      innerColor: displayColor,
      isMetallic: false,
      drawPlate: false,
      drawEngraving: true,
      currentSpikeDistance: currentSpikeDistance,
    });
  }

  const highestScoreEl = document.getElementById("scoreDisplay");
  if (highestScoreEl) {
    highestScoreEl.style.color = Config.invertColors
      ? Config.scorePopupColor.inverted
      : Config.scorePopupColor.normal;
    if (GameState.isAnimatingHighestScore) {
      const elapsed = Date.now() - GameState.isAnimatingHighestScoreStart;
      const progress = elapsed / Config.highestScoreAnimationDuration;

      // Create a "pulse" effect by scaling up and then back down using a sine wave
      const pulse = Math.sin(progress * Math.PI);
      const scale = 1 + pulse * 0.5; // Scale up to 1.5x size at the animation's midpoint

      highestScoreEl.style.transform = `scale(${scale})`;

      if (progress >= 1.0) {
        GameState.isAnimatingHighestScore = false;
        // Reset styles when animation is done
        highestScoreEl.style.transform = "scale(1)";
      }
    } else {
      // Ensure styles are reset if not animating
      highestScoreEl.style.transform = "scale(1)";
    }
  }
}

export function updateTopUI() {
  const scoreEl = document.getElementById("scoreDisplay");
  const timerEl = document.getElementById("timerDisplay"); // Get the new timer element

  if (scoreEl) {
    const seconds = Math.floor(GameState.totalElapsedTime / 1000);
    timerEl.textContent = `${seconds}`;
    scoreEl.textContent = `${GameState.score}`;
    if (timerEl) timerEl.style.display = "block"; // Ensure it's visible otherwise
  }
}

function resizeCanvas() {
  // CHANGE these two lines
  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight; // The canvas should always fill the window

  // This logic is incorrect for an overlay panel and should be removed:
  // canvasHeight = window.innerHeight - controlsPanel.offsetHeight - 10;

  if (canvasHeight < 50) canvasHeight = 50; // This check can be removed or kept as a safeguard
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
}

export function clearCanvas() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
}

/**
 * Generic handler for any slider change.
 * Updates the Config object and the value display span.
 * @param {Event} event
 */
function handleSliderChange(event) {
  const slider = event.target;
  const paramName = slider.id;
  const value = parseFloat(slider.value);
  const decimals = parseInt(slider.dataset.decimals, 10);

  // Update the global Config object
  Config[paramName] = value;

  // Update the corresponding value display
  const valueSpan = document.getElementById(`${paramName}Value`);
  if (valueSpan) {
    valueSpan.textContent = value.toFixed(decimals);
  }
}

function handleSliderChangeWithSymbolUpdate(event) {
  const slider = event.target;
  const paramName = slider.id;
  const value = parseFloat(slider.value);
  const decimals = parseInt(slider.dataset.decimals, 10);

  // Update the global Config object
  Config[paramName] = value;

  // Update the corresponding value display
  const valueSpan = document.getElementById(`${paramName}Value`);
  if (valueSpan) {
    valueSpan.textContent = value.toFixed(decimals);
  }
  recreateSymbols();

  const lastElement = controlsPanel.lastElementChild;
  if (lastElement) {
    lastElement.remove();
  }
  generateSpawnerControls();
}

function handleCheckboxChange(event) {
  const checkbox = event.target;
  Config[checkbox.id] = checkbox.checked;
}

function handleCheckboxChangeWithSymbolUpdate(event) {
  const checkbox = event.target;
  Config[checkbox.id] = checkbox.checked;
  recreateSymbols();
}

function handleIntervalChange(event) {
  const slider = event.target;
  const value = parseInt(slider.value, 10);

  // 1. Update the Config object
  Config.ballCreationInterval = value;

  // 2. Update the display span
  const valueSpan = document.getElementById(`${slider.id}Value`);
  if (valueSpan) {
    valueSpan.textContent = value;
  }

  // 3. Call the function to reset the actual game timer
  resetBallCreationTimer();
}

function camelCaseToTitleCase(text) {
  // Insert a space before any uppercase letter
  const withSpaces = text.replace(/([A-Z])/g, " $1");
  // Capitalize the first letter and return
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/**
 * Generates all UI slider controls programmatically based on the configurableParams array.
 */
function generateUiControls() {
  controlsPanel.innerHTML = ""; // Clear any existing controls

  configurableParams.forEach(([name, step]) => {
    const initialValue = Config[name];

    // Create the container div
    const group = document.createElement("div");
    group.className = "ctrl-div";

    // Create the label
    const label = document.createElement("label");
    label.setAttribute("for", name);
    label.textContent = camelCaseToTitleCase(name) + ":";
    group.appendChild(label);

    if (step === "toggle") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = name;
      checkbox.checked = Config[name];

      if (name === "allMetallic") {
        checkbox.addEventListener(
          "change",
          handleCheckboxChangeWithSymbolUpdate
        );
      } else {
        checkbox.addEventListener("change", handleCheckboxChange);
      }
      group.appendChild(checkbox);
    } else {
      // Create the range slider input
      const slider = document.createElement("input");
      slider.type = "range";
      slider.id = name;
      slider.value = initialValue;
      slider.step = step;

      const initialValueString = initialValue.toString();
      let decimals = initialValueString.includes(".")
        ? initialValueString.split(".")[1].length
        : 0;
      const stepValueString = step.toString();
      const stepDecimals = stepValueString.includes(".")
        ? stepValueString.split(".")[1].length
        : 0;
      slider.dataset.decimals = Math.max(decimals, stepDecimals);

      // Calculate min/max range around the initial value
      const range = rangeFactor * step;
      slider.min = Math.max(0, initialValue - range);
      slider.max = initialValue + range;

      if (name === "ballCreationInterval") {
        slider.addEventListener("input", handleIntervalChange);
      } else if (
        name === "mandalaInnerRadius" ||
        name === "mandalaCurveAmount" ||
        name === "numberOfSymbolTypes"
      ) {
        slider.addEventListener("input", handleSliderChangeWithSymbolUpdate);
      } else {
        slider.addEventListener("input", handleSliderChange);
      }
      group.appendChild(slider);

      // Create the value display span
      const valueSpan = document.createElement("span");
      valueSpan.id = `${name}Value`;
      valueSpan.textContent = initialValue.toFixed(decimals);
      group.appendChild(valueSpan);
    }

    // Add the completed group to the controls panel
    controlsPanel.appendChild(group);
  });
}

function generateSpawnerControls() {
  const spawnerContainer = document.createElement("div");
  spawnerContainer.className = "spawner-container";

  const spawnerGrid = document.createElement("div");
  spawnerGrid.className = "spawner-grid";

  // Get all defined, non-special symbols
  const spawnableSymbols = Object.keys(symbolDefinitions).filter(
    (id) =>
      !symbolDefinitions[id].isWildcard &&
      !id.includes("VOID") &&
      !id.includes("LIFE")
  );

  // Sort them by level, then by name
  spawnableSymbols.sort((a, b) => {
    const levelA = symbolDefinitions[a].level;
    const levelB = symbolDefinitions[b].level;
    if (levelA !== levelB) {
      return levelA - levelB;
    }
    return a.localeCompare(b); // Alphabetical sort within the same level
  });

  // Create a button with a canvas for each spawnable symbol
  spawnableSymbols.forEach((symbolId) => {
    const def = symbolDefinitions[symbolId];
    const mandalaConfig = mandalaDefinitions[symbolId].mandalaConfig;

    const button = document.createElement("button");
    button.className = "spawner-btn";
    button.title = symbolId; // Show the ID on hover
    button.onclick = () => spawnSpecificBall(symbolId);

    // Create a mini-canvas for the icon
    const btnCanvas = document.createElement("canvas");
    const btnCtx = btnCanvas.getContext("2d");
    const canvasSize = 160; // Internal resolution for the icon
    btnCanvas.width = canvasSize;
    btnCanvas.height = canvasSize;
    const lightColors = Config.levelColorsGray;
    btnCanvas.style.background = lightColors[def.level - 1];

    // Draw the mandala on the button's canvas
    const maxRadius = (canvasSize / 2) * 0.8;
    drawMandala(btnCtx, {
      centerX: canvasSize / 2,
      centerY: canvasSize / 2,
      innerRadius: mandalaConfig.innerRadius * maxRadius,
      numPoints: mandalaConfig.numPoints,
      spikeDistance: mandalaConfig.spikeDistance * maxRadius,
      leafType: mandalaConfig.leafType,
      shadowColor: Config.invertColors ? "#000000" : "#FFFFFF", // Use black/white for clarity
      highlightColor: null,
      curveAmount: mandalaConfig.curveAmount * maxRadius,
      fillStyle: mandalaConfig.fillStyle,
    });

    button.appendChild(btnCanvas);
    spawnerGrid.appendChild(button);
  });

  spawnerContainer.appendChild(spawnerGrid);
  controlsPanel.appendChild(spawnerContainer);
}

export function addUiEvents() {
  // Add the button to the bottom of the controls panel
  generateUiControls();
  generateSpawnerControls();
  resizeCanvas();

  // Get references to the buttons AFTER they have been created
  const expandBtn = document.getElementById("expand-controls-btn");

  // Create and add the debug button for the lotus animation
  const lotusDebugBtn = document.createElement("button");
  lotusDebugBtn.className = "debug-btn";
  lotusDebugBtn.textContent = "Play Lotus Animation";

  // Add an event listener to trigger the animation state
  lotusDebugBtn.addEventListener("click", () => {
    // Don't do anything if an animation is already playing
    if (GameState.isLotusAnimationPlaying || GameState.isLosingLife) return;

    console.log("Triggering Lotus Animation for debugging...");
    GameState.isLotusAnimationPlaying = true;
    GameState.lotusAnimationStart = Date.now();
  });
  controlsPanel.appendChild(lotusDebugBtn);

  // Add events to toggle the panel's visibility
  expandBtn.addEventListener("click", () => {
    controlsPanel.classList.toggle("hidden");
  });

  window.addEventListener("resize", resizeCanvas);
}

export function gainPointsInternal(pointsGained, x, y) {
  GameState.score += pointsGained;
  GameState.isAnimatingHighestScore = true;
  GameState.isAnimatingHighestScoreStart = Date.now();

  GameState.particles.push({
    type: "scorePopup",
    x: x,
    y: y - 20,
    text: `+${pointsGained}`,
    life: Config.scorePopupLifetime,
    totalLife: Config.scorePopupLifetime,
    vy: Config.scorePopupUpwardSpeed, // Negative Y is up
  });

  const scoreEl = document.getElementById("scoreDisplay");
  if (scoreEl) {
    const rect = scoreEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    GameState.particles.push({
      type: "scorePopup",
      x: centerX,
      y: centerY + 20,
      text: `+${pointsGained}`,
      life: Config.scorePopupLifetime,
      totalLife: Config.scorePopupLifetime,
      vy: Config.scorePopupUpwardSpeed, // Negative Y is up
    });
  }
}

export function gainPoints(newBall) {
  const pointsGained = Math.pow(newBall.level, 2);
  gainPointsInternal(pointsGained, newBall.x, newBall.y);
}

export function losePoints(newBall) {
  let pointsGained = 0;
  let count = 1;
  for (let i = newBall.level; i > 1; i--) {
    pointsGained -= Math.pow(i, 2) * count;
    count *= 2;
  }

  GameState.score += pointsGained;
  GameState.isAnimatingHighestScore = true;
  GameState.isAnimatingHighestScoreStart = Date.now();

  GameState.particles.push({
    type: "scorePopup",
    x: newBall.x,
    y: newBall.y - 20,
    text: `${pointsGained}`,
    life: Config.scorePopupLifetime,
    totalLife: Config.scorePopupLifetime,
    vy: Config.scorePopupUpwardSpeed, // Negative Y is up
  });

  const scoreEl = document.getElementById("scoreDisplay");
  if (scoreEl) {
    const rect = scoreEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    GameState.particles.push({
      type: "scorePopup",
      x: centerX,
      y: centerY + 20,
      text: `${pointsGained}`,
      life: Config.scorePopupLifetime,
      totalLife: Config.scorePopupLifetime,
      vy: Config.scorePopupUpwardSpeed, // Negative Y is up
    });
  }
}

export function drawLotusAnimation(cfg) {
  const elapsed = Date.now() - GameState.lotusAnimationStart;
  const progress = Math.min(1.0, elapsed / cfg.lotusAnimationDuration);

  const l10Balls = GameState.balls.filter((b) =>
    GameState.l10Slots.includes(b.id)
  );

  GameState.balls.forEach((b) => {
    destroyBall(b, "glory");
  });

  GameState.balls = [];

  const startAnimationDuration = 0.1;

  // --- Animation Stage 1: Disappearance (first 15% of the animation) ---
  const disappearProgress = Math.min(1.0, progress / startAnimationDuration);
  if (progress < 0.7) {
    // Spawn particles from the L10 balls
    Config.l10SymbolPositions.forEach((pos) => {
      if (Math.random() < 0.5) {
        spawnParticles(
          0.1 * Math.max(20, progress > 0 ? 0.7 / progress : 1),
          pos.x * canvasWidth,
          pos.y * canvasHeight,
          Config.gloryParticleColor,
          Config.Debris_Particle_Speed * 0.5,
          1,
          2,
          20000,
          true,
          "glory",
          20
        );
      }
    });
  }

  const formationStart = 0.05; // When the lotus starts appearing
  const settleStart = 0.7; // When the lotus stops cycling colors and holds its final form
  const fadeStart = 0.9; // When the final lotus begins to fade out

  const maxRadius = Math.min(canvasWidth / 2, canvasHeight / 2) * 0.5;

  if (progress > formationStart && progress < fadeStart) {
    // This block handles the lotus being visible on screen (growing and holding)
    const formationPhaseDuration = settleStart - formationStart;
    const formationProgress = Math.min(
      1.0,
      (progress - formationStart) / formationPhaseDuration
    );

    const symbolId = `LOTUS`;
    const mandalaConfig = mandalaDefinitions[symbolId].mandalaConfig;

    let lotusColor;
    let innerColor;

    // Check if we are in the "color cycling" or "settled" phase
    if (progress < settleStart) {
      // --- STAGE 2: Color Cycling Phase ---
      const timeOffset = (GameState.totalElapsedTime / 3000) % 1; // 3-second cycle
      lotusColor = getColorFromPalette(cfg.levelColorsGray, timeOffset % 1);
      innerColor = getColorFromPalette(
        cfg.levelColorsGray,
        (timeOffset + 0.5) % 1
      );
    } else {
      // --- STAGE 3: Settled Phase ---
      // The lotus has reached its final, stable colors.
      lotusColor = "rgba(255, 255, 255, 1.0)"; // A brilliant white
      innerColor = "rgba(220, 220, 255, 1.0)"; // A light silver/blue
    }

    // Draw the mandala using the determined colors and progress
    drawMandalaBall(ctx, Config, {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      radius: maxRadius * formationProgress,
      symbolId: symbolId,
      mandalaConfig: mandalaConfig,
      level: 20,
      enableBallFill: true,
      enableBallBorder: false,
      fillColor: lotusColor,
      innerColor: innerColor,
      isMetallic: true,
      drawPlate: true,
      drawEngraving: true,
      currentSpikeDistance: 0.9 * maxRadius * formationProgress,
    });
  }

  // --- Animation Stage 3: Disappearance & Reward (75% to 100%) ---
  if (progress > 0.9) {
    if (!GameState.gainedPointsForLotus) {
      GameState.gainedPointsForLotus = true;
      gainPointsInternal(
        Config.lotusPointBonus,
        canvasWidth / 2,
        canvasHeight / 2
      );
    }

    spawnParticles(
      40,
      canvasWidth / 2,
      canvasHeight / 2,
      Config.gloryParticleColor,
      Config.Debris_Particle_Speed,
      1,
      2,
      20000,
      true,
      "glory", // A new particle type
      maxRadius
    );
  }

  // --- Animation End ---
  if (progress >= 1.0) {
    GameState.cleanupAfterLotus = true;
  }
}
