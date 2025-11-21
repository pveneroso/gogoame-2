export const baseConfig = {
  // --- Core Gameplay & Physics ---
  baseBallRadius: 14,
  terminalVelocity: 0.5, // Terminal velocity for regular symbols.
  terminalVelocitySymbol: 0.25, // Terminal velocity for complex symbols (> level 1).
  gravityMassEffect: 1.0, // How much the ball mass adds to inertia.
  friction: 0.985,
  MAX_SYMBOL_LEVEL: 10,
  ballCreationInterval: 800, // How long in ms between each ball is created.
  voidSymbolSpawnRate: 0.25, // Chance of spawning a void symbol.
  degradationKnockback: 1, // Force of the knockback when a ball hits something and bounces back.
  degradationWindImmunityDuration: 1000, // How long the ball stays immune to wind effects when it bounces.
  sizeIncreasePerLevel: 0.1, // How much the ball size increases on each level.
  enableHorizontalKick: true, // The ball bounces off the walls.
  enableMetallicShield: true, // The metallic balls have a shield.
  numberOfSymbolTypes: 3, // Can be 3 or 4.
  enableBlackSlideOff: true, // Level 1 balls slide off the black ball instead of getting destroyed on touch.

  // --- Collision ---
  enableCollision: true, // Disable collision between balls that do not form a higher level symbol.
  enableParticleBouncing: true, // Collision for particles.
  particleBounceFactor: 0.3, // How strongly particles bounce off symbols.

  // --- Player Interaction: Wind Curve ---
  windBaseLifetime: 0, // How long the curve lasts in ms.
  windLifetimePerPixel: 4, // How long the curve lasts for each pixel added to length.
  windInfluenceRadius: 28, // How close a ball must be to the curve to be affected
  windMaxSpeed: 3.5, // The max speed for balls caught in the wind.
  windBaseStrength: 0.0, // The minimum strength of any wind curve
  windStrengthPer100px: 0.05, // How much each pixel in length adds to the wind strength.
  minPointDistance: 10, // Minimum distance in px between points on the curve to be recorded
  windForceFalloff: 1.0, // How much the wind force diminishes as the ball progresses along the curve.
  windCouplingStrength: 0.015, // The coupling strength that forces balls to stay in the wind.
  couplingCurvatureFactor: 60, // How much force is added to the wind coupling in sharp curves.
  windArrivalDistance: 100, // Distance (in pixels) from the curve to start slowing down
  windSmoothingFactor: 0.5, // How much the wind curve is smoothed out when you finish drawing it.
  windCaptureTimer: 500, // How long the ball needs to stay off the curve to stop being affected by it.
  enableCouplingFourceRampDown: true, // Makes the coupling force wane at the beginning and end of the curve.

  // Wind angle snapping.
  enableAngleSnapping: true, // Snap the wind curve if the angle between points is too sharp.
  maxWindCurveAngle: 120, // The maximum angle (in degrees) allowed before the curve breaks.
  angleSnapParticleCount: 25,
  angleSnapParticleSpeed: 4,
  windAngleLookback: 4,

  //   When draw wind curve is enabled.
  drawWindCurve: false, // Draw the wind curve (besides particles).
  windMaxWidth: 12, // The width of the stroke at its start in pixels
  windMinWidth: 2, // The width of the stroke at its end

  // --- Alternative Gameplay ---
  enableExplosions: false, // Explode balls if two equal symbols touch.
  enableWildcard: false, // Equal symbols generate a wildcard.
  enableDegradation: false, // Symbols degrade to a lower level instead of being destroyed.
  enableHardDegradation: false, // Symbols degrade when they touch the sides of the screen.
  enableWildcardColor: false,
  enableLosePoints: false, // Lose points when a symbols is destroyed.
  enableWindAttraction: false, 

  windAttractionStrength: 0.8, // How strongly captured balls pull on each other

  // --- Player Interaction: Slingshot ---
  slingshotMaxStrength: 150,
  slingshotPowerMultiplier: 0.05,
  throwMultiplier: 0.1,

  // --- Particles ---
  PARTICLE_LIFETIME_MS: 1000,
  PARTICLE_FRICTION: 0.96,
  Construction_Particle_Count: 25,
  Construction_Particle_Speed: 4,
  Explosion_Particle_Count: 50,
  Explosion_Particle_Speed: 7,
  Debris_Particle_Count: 15,
  Debris_Particle_Speed: 3,
  gravity: 0.05, // For particles only.
  highestLevelParticleCount: 100,
  highestLevelParticleSpeed: 10,
  highestLevelParticleLifetime: 2500, // Make them last longer
  corruptionParticleBaseCount: 15, // Multiplier for particle amount
  corruptionParticleSpeed: 1.5,
  corruptionWobbleAmplitude: 0.02,
  corruptionColorVariance: 40,

  // --- Game Rules & Modes ---
  enableImmunity: true, // Balls do not fall.
  immunityKnockback: 2.5, // The force of the knockback on the L1 ball
  enableLivesSystem: false,
  minLevelToLoseLife: 1,
  initialLives: 3,
  maxLives: 5, // The maximum number of lives the player can have
  lifeSymbolFallSpeedMultiplier: 1.5, // Makes it fall 50% faster than normal
  lifeSymbolSpawnRate: 0.0,
  enableSimpleCombinationMode: false,
  enableWindCombination: false,
  windCombinationChargeTime: 1500,
  enableZeroGravityMode: true,
  windGravityImmunityDuration: 1500, // How long immunity lasts in ms

  //   Void rules.
  enableVariableVoidSize: true, // Master switch to turn this feature on/off.
  voidBallRadiusMultiplier: 1.0,
  voidSizeMultiplierMin: 1.1, // The smallest a void symbol can be (e.g., 0.5 = 50% of base radius).
  voidSizeMultiplierMax: 1.1,
  voidSpeedMultiplier: 1.5,
  voidTrailStartWidth: 0,
  voidTrailEndWidth: 15,
  voidTrailOpacity: 0.05,
  voidTrailWobbleFrequency: 15.0, // How many waves appear in the trail
  voidTrailWobbleAmplitude: 10.0, // How wide the wobbles are in pixels
  voidTrailWobbleSpeed: 15,
  voidParticleCount: 50,

  // Spawn other symbols besides lvl 1.
  enableMultiLevelSpawning: false,
  spawnChanceL1: 0.7, // 70% chance for a Level 1 symbol
  spawnChanceL2: 0.25, // 25% chance for a Level 2 symbol
  spawnChanceL3: 0.05, // 5% chance for a Level 3 symbol

  // --- Sideways wind (environmental) ---
  enableSidewaysWindEffect: true,
  windOscillationAmplitude: 0.006, // How strong the gusts are
  windOscillationFrequency1: 0.2, // Speed of the main gusting effect
  windOscillationFrequency2: 0.0, // Speed of a smaller, secondary ripple for more randomness
  sidewaysWindStrength: 0.001, // How strong the gusts are
  sidewaysWindParticleRate: 1, // How many lines to spawn per second
  sidewaysWindParticleSpeed: 1.5, // Horizontal speed of the lines
  sidewaysWindParticleColor: {
    normal: "rgba(255, 255, 255, 0.1)",
    inverted: "rgba(0, 0, 0, 0.1)",
  },
  sidewaysWindWobbleFrequency: 0.01, // Controls the "waviness" of the lines
  sidewaysWindLineWidth: 2, // Controls the "waviness" of the lines
  sidewaysWindWobbleAmplitude: 10, // Controls the height of the waves
  sidewaysWindParticleTrailLength: 300, // Controls the height of the waves

  // --- Visuals & Effects ---
  enableBallTrails: true,
  enableBallTrailsForVoid: true,
  ballTrailLength: 120, // How many points to store in the trail.
  ballTrailStartWidth: 1, // The width of the trail at its oldest point (in pixels).
  ballTrailEndWidth: 3, // The width of the trail right behind the symbol.
  ballTrailOpacity: 0.003,
  enableBallBorder: true,
  enableBallFill: true,
  invertColors: false,
  strokeColors: false,
  allMetalic: false,
  enableWindSparkles: false,
  glitterParticleRate: 0.4, // Chance to spawn a glitter particle per frame (0 to 1)
  glitterParticleLifetime: 400, // How long each glitter particle lasts
  levitationLevelMultiplier: 3000, // How long each glitter particle lasts
  scorePopupLifetime: 1200, // How long the text stays on screen (in ms)
  scorePopupFontSize: 22, // The starting font size in pixels
  scorePopupUpwardSpeed: -0.8, // The initial upward velocity

  //     Wind Visuals
  windParticlesPerFrame: 1, // How many particles to spawn each frame along the curve
  windParticleSpread: 30,
  windParticleLifetime: 2000, // How long each particle lasts in ms
  windParticleSpawnRate: 3, // How many particles to spawn per recorded mouse point
  windParticleBaseSpeed: 1.5, // The base speed for particles flowing along the curve
  windParticleSpeedVariance: 1.0, // Randomness added to the speed
  windParticleTrailLength: 40,
  windShadowBlur: 15,

  //   Highest score animation.
  highestLevelAnimationDuration: 3000,
  highestScoreAnimationDuration: 1000, // Duration in ms
  highestScoreFlashColor: "#FFD700", // A gold color for the flash

  //   Life Loss animation.
  enableLifeLossAnimation: false,
  lifeLossAnimationDuration: 400, // How long the effect lasts in ms
  screenShakeMagnitude: 6, // How intense the screen shake is in pixels

  //    Danger highlight when a combination will produce the same ball as an existing one.
  enableDangerHighlight: false,
  dangerHighlightMinLevel: 2, // Only highlight potential collisions for balls of this level or higher
  dangerHighlightBlur: 25, // The blur radius of the glow
  dangerHighlightMaxDistance: 100,

  //   Construction animation.
  constructionAnimationDuration: 400,

  // --- Corruption Pool & Glory & Flares ---
  gloryParticlesNeededForUpgrade: 10,
  maxCorruptionLevel: 2000, // The pool level that triggers a game over
  poolMaxHeight: 0.25, // The max height of the pool (60% of the screen)
  splashParticleCount: 1,
  splashParticleSpeed: 2,
  splashParticleLifetime: 500,
  poolRiseSpeed: 0.01,
  gloryParticleBaseCount: 10,
  gloryParticleSpeed: 1.5,
  corruptionPerParticle: 0.2, // How many points of corruption each corruption particle adds
  purificationPerParticle: 2, // How many points of corruption each glory particle removes
  enablePoolFlares: true,
  flareSpawnRate: 100, // How many flare eruptions per second
  flareParticleCount: 1, // Particles per eruption
  flareLifetime: 1000, // How long each particle lasts in ms
  flareUpwardSpeed: 0.5, // How high the flares erupt
  flareWobbleFrequency: 25, // How wavy the tendrils are
  flareWobbleAmplitude: 10, // How wide the wobbles are
  flareWobbleSpeed: 5, // How wide the wobbles are
  flareGlowColor: "rgba(255, 80, 80, 1)", // A fiery crimson

  // --- Mandala Defs ---
  mandalaInnerRadius: 0.0, // The initial upward velocity
  mandalaCurveAmount: 0.35, // The initial upward velocity

  // --- Background / Win Animation ---
  l10SymbolPositions: [
    // Normalized coordinates for the 3 sockets
    { x: 0.25, y: 0.2 }, // 25% from left, 10% from top
    { x: 0.5, y: 0.2 }, // Center, 10% from top
    { x: 0.75, y: 0.2 }, // 75% from left, 10% from top
    { x: 0.5, y: 0.35 }, // ADD this new one for the bottom point of the diamond
  ],
  l10AttractionSpeed: 0.02, // How quickly L10 balls move to their socket
  lotusAnimationPreDelay: 2000,
  lotusAnimationDuration: 10000, // Total duration of the animation in ms
  lotusPointBonus: 1000,
  showL10SlotsInBg: true,
  l10SlotLineWidth: 3,

  // --- Color Definitions ---
  //
  // Canvas background is a special case, handled in script.js, but we'll define it here.
  backgroundColor: {
    normal: "#444",
    inverted: "#dde1e6",
    patternColor: "rgba(128, 128, 128, 0.04)", // Subtle gray for the waves
  },

  // Symbol Colors
  symbolColor: { normal: "#FFFFFF", inverted: "#000000" },
  grabbedBallSymbolColor: { normal: "#f1c40f", inverted: "#2980b9" }, // Gold -> Strong Blue
  voidSymbolColor: {
    normal: "rgba(120, 40, 30, 0.9)",
    inverted: "rgba(231, 76, 60, 0.9)",
  }, // Keep red, but maybe brighter
  lifeSymbolColor: {
    normal: "rgba(46, 204, 113, 0.9)",
    inverted: "rgba(39, 174, 96, 1.0)",
  }, // Keep green
  lifeLeafColor: {
    normal: "rgba(46, 204, 113, 0.5)",
    inverted: "rgba(46, 204, 113, 0.5)",
  }, // Keep green
  lostLifeLeafColor: {
    normal: "rgba(50, 50, 50, 0.7)",
    inverted: "rgba(189, 195, 199, 0.8)",
  }, // Dark Gray -> Light Gray

  // Particle & Effect Colors
  windFillColor: {
    normal: "rgba(220, 235, 255, 0.7)",
    inverted: "rgba(50, 50, 80, 0.6)",
  },
  dangerHighlightColor: {
    normal: "rgba(255, 50, 50, 0.7)",
    inverted: "rgba(255, 50, 50, 0.7)",
  },
  particleConstructColor: {
    normal: { r: 200, g: 220, b: 255 },
    inverted: { r: 44, g: 62, b: 80 },
  },
  particleExplosionColor: {
    normal: { r: 255, g: 180, b: 120 },
    inverted: { r: 100, g: 30, b: 22 },
  },
  // particleExplosionColor: { r: 255, g: 180, b: 120 },
  particleDebrisColor: {
    normal: { r: 180, g: 180, b: 180 },
    inverted: { r: 80, g: 80, b: 80 },
  },
  windParticleColor: {
    normal: { r: 220, g: 235, b: 255 },
    inverted: { r: 44, g: 62, b: 80 },
  },
  highestLevelParticleColor: {
    normal: { r: 255, g: 215, b: 0 },
    inverted: { r: 60, g: 20, b: 80 },
  }, // Gold -> Dark Purple
  scorePopupColor: {
    normal: "rgba(223, 223, 223, 1)",
    inverted: "rgba(0, 0, 0, 1)",
  },

  lifeLossFlashColor: "rgba(100, 0, 0, 0.1)", // Color of the screen flash

  levelColorsGray: [
    "rgba(52, 152, 219, 0.7)", // L1: Blue
    "rgba(142, 68, 173, 0.7)", // L2: Purple
    "rgba(230, 126, 34, 0.7)", // L3: Orange
    "rgba(241, 196, 15, 0.7)", // L4: Yellow/Gold
    "rgba(168, 204, 52, 0.7)", // L5: Lime
    "rgba(231, 76, 60, 0.7)", // L6: Red
    "rgba(190, 190, 190, 0.7)", // L7: Silver
    "rgba(0, 150, 100, 0.7)", // L8: Emerald
    "rgba(255, 0, 255, 0.7)", // L9: Pink
    "rgba(0, 0, 0, 1.0)", // L10: Black <<<
  ],

  innerColors: [
    "rgba(255, 255, 255, 1.0)", // L1: White
    "rgba(255, 255, 255, 1.0)", // L2: White
    "rgba(255, 255, 255, 1.0)", // L3: White
    "rgba(255, 255, 255, 1.0)", // L4: White
    "rgba(255, 255, 255, 1.0)", // L5: White
    "rgba(255, 255, 255, 1.0)", // L6: White
    "rgba(255, 255, 255, 1.0)", // L7: Silver
    "rgba(241, 196, 15, 0.7)", // L8: Yellow/Gold
    "rgba(220, 220, 220, 0.7)", // L9: Silver
    "rgba(241, 196, 15, 0.7)", // L10: Yellow/Gold
  ],

  corruptionParticleColor: { r: 79, g: 0, b: 0 }, // A dark red

  poolColor: "rgba(192, 57, 43, 0.4)", // Base color of the pool

  poolWaveLayers: [
    {
      amplitude: 8,
      frequency: 0.01,
      speed: 0.001,
      color: "rgba(80, 20, 20, 0.6)",
    },
    // Layer 2: Middle
    {
      amplitude: 2,
      frequency: 0.01,
      speed: -0.003,
      color: "rgba(120, 40, 30, 0.7)",
    },
    // Layer 3: Bottom-most, slowest, most opaque
    {
      amplitude: 1,
      frequency: 0.03,
      speed: 0.003,
      color: "rgba(80, 20, 20, 0.8)",
    },
  ],

  gloryParticleColor: { r: 255, g: 223, b: 0 }, // A rich gold color

  l10SlotColor: "rgba(0, 0, 0, 0.15)", // A dark, subtle gray

  voidTrailColor: "rgba(150, 40, 40, 0.7)", // A dark, smoky red

  metallicShieldBreakColor: { r: 255, g: 255, b: 255 }, // A bright, silvery-blue

  angleSnapParticleColor: { r: 255, g: 255, b: 255 }, // A sharp white

  poolMaxHeightLineColor: "rgba(0, 0, 0, 0.05)",

  // Deprecated.
  poolShineColor: { r: 255, g: 255, b: 200 }, // A bright yellow-white for the shine
  poolShineParticleCount: 1,
  poolShineParticleSpeed: 1,
  poolShineParticleLifetime: 400,
  poolShineIntensityPerParticle: 0.01, // How much brightness each glory particle adds (capped at 1.0)
  poolShineFadeSpeed: 0.01, // How quickly the shine fades per frame
  poolShineColor: "rgba(180, 180, 145, 0.7)", // A bright, glowing yellow-white
};

const mobileOverrides = {
  terminalVelocity: 0.4,
  ballCreationInterval: 1300,
  baseBallRadius: 11,
  Debris_Particle_Speed: 0.5,
  voidSymbolSpawnRate: 0.15,
  voidParticleCount: 83,
  windMaxSpeed: 2.5, // The target speed for balls caught in the wind
  enableCouplingFourceRampDown: false,
  friction: 0.98,
  friction: 0.98,
  windBaseStrength: 0.0, // The minimum strength of any wind curve
  windStrengthPer100px: 0.05,
  windLifetimePerPixel: 6,
};

const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

export const Config = isMobile
  ? { ...baseConfig, ...mobileOverrides }
  : baseConfig;
