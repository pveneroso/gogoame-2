import { Config } from "./config.js";

export const GameState = {
  particles: [],
  gameOver: false,
  score: 0,
  highestScore: 0,
  balls: [],
  ballCreationTimerId: 0,
  grabbedBall: null,
  lastMouseX: 0,
  lastMouseY: 0,
  ballsToRemoveThisFrame: [],
  ballsToAddNewThisFrame: [],
  animationFrameId: 0,
  isDrawingWind: false,
  windCurve: null, // Will hold { points: [], createdAt: 0 }
  animationFrameId: 0,
  totalElapsedTime: 0,
  highestLevelAchieved: 1,
  isAnimatingHighestLevel: false,
  highestLevelAnimationStart: 0,
  lives: Config.initialLives,
  isLosingLife: false,
  lifeLossAnimationStart: 0,
  isAnimatingHighestScore: false,
  highestScoreAnimationStart: 0,
  windCapturedBalls: [],
  isChargingWindCombination: false,
  windCombinationStartTime: 0,
  windCombinationSet: [], // Stores the IDs of the balls in the charging combo
  isPaused: false,
  nextSymbolIndex: 0,
  corruptionLevel: 100,
  corruptionTargetLevel: 100,
  poolShineIntensity: 0,
  isPoolRising: false,
  corruptionPoolY: Infinity, // The Y-coordinate of the pool's surface. Starts off-screen.
  l10Slots: [null, null, null], // Will store the ID of the ball in each slot
  isLotusAnimationPlaying: false,
  lotusAnimationStart: 0,
  cleanupAfterLotus: false,
  gainedPointsForLotus: false,
  awaitLotusStartTime: 0,
  discoveredSymbols: new Set(),
};

export function triggerGameOver() {
  if (GameState.gameOver) return;
  GameState.gameOver = true;

  // Stop the ball spawner if it's running
  if (GameState.ballCreationTimerId) {
    clearInterval(GameState.ballCreationTimerId);
    GameState.ballCreationTimerId = null;
  }

  // Update the final score display on the game over screen
  document.getElementById("finalScore").textContent = GameState.score;

  // This is the essential line that makes the screen appear
  document.getElementById("gameOverScreen").style.display = "block";
}

export function handleLifeLoss(ball) {
  if (GameState.gameOver || GameState.isLosingLife) {
    return;
  }

  if (Config.enableLivesSystem) {
    GameState.lives--;
    if (GameState.lives <= 0) {
      triggerGameOver();
    }
  }

  GameState.isLosingLife = true;
  GameState.lifeLossAnimationStart = Date.now();
}

export function resetGameState() {
  console.log("Resetting game state...");

  GameState.particles = [];
  GameState.balls = [];
  GameState.gameOver = false;
  GameState.score = 0;
  GameState.highestScore = 0;
  GameState.isDrawingWind = false;
  GameState.windCurve = null;
  GameState.totalElapsedTime = 0;
  GameState.highestLevelAchieved = 1;
  GameState.isAnimatingHighestLevel = false;
  GameState.lives = Config.initialLives;
  GameState.isLosingLife = false;
  GameState.isAnimatingHighestScore = false;
  GameState.windCapturedBalls = [];
  GameState.isChargingWindCombination = false;
  GameState.windCombinationStartTime = 0;
  GameState.windCombinationSet = [];
  GameState.isPaused = false;
  GameState.nextSymbolIndex = 0;
  GameState.corruptionLevel = 0;
  GameState.corruptionTargetLevel = 0;
  GameState.poolShineIntensity = 0;
  GameState.isPoolRising = false;
  GameState.corruptionPoolY = Infinity;
  GameState.l10Slots = [null, null, null];
  GameState.isLotusAnimationPlaying = false;
  GameState.lotusAnimationStart = 0;
  GameState.cleanupAfterLotus = false;
  GameState.gainedPointsForLotus = false;
  GameState.awaitLotusStartTime = 0;
  GameState.discoveredSymbols.clear();
}
