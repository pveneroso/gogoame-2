import { Config } from "./config.js";
import { canvas } from "./ui.js";
import { GameState } from "./game_state.js";
import { spawnParticles, updateAndDrawParticles } from "./particles.js";

// A flag to ensure we only try to set up the audio source once
let isAudioSetup = false;

/**
 * Creates and starts a silent audio loop to prevent mobile browsers from
 * throttling the requestAnimationFrame loop. Handles modern autoplay policies.
 */
function startSilentAudioLoop() {
  if (isAudioSetup) return;

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();

  // If the audio context is in a suspended state, it needs to be resumed after a user gesture
  if (audioContext.state === "suspended") {
    audioContext.resume().then(() => {
      console.log("AudioContext resumed successfully.");
    });
  }

  // Create a silent buffer
  const buffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(audioContext.destination);

  // Start the silent audio loop
  source.start(0);

  console.log("Silent audio loop started to maintain frame rate.");
  isAudioSetup = true; // Mark as setup so we don't do it again
}

// A flag to ensure we only request the lock once
let isWakeLockActive = false;

async function requestWakeLock() {
  if (isWakeLockActive || !("wakeLock" in navigator)) return;
  try {
    await navigator.wakeLock.request("screen");
    isWakeLockActive = true;
    console.log("Screen Wake Lock is active.");
  } catch (err) {
    console.error(`${err.name}, ${err.message}`);
  }
}

let hasInteracted = false;

// --- Generic Input Handlers ---
// These functions contain the core logic and are called by both mouse and touch events.

/**
 * Starts the wind curve drawing process at a specific coordinate.
 * @param {number} x The starting x-coordinate.
 * @param {number} y The starting y-coordinate.
 */
function handleDragStart(x, y) {
  if (GameState.gameOver) return;

  startSilentAudioLoop();
  requestWakeLock();
  if (!hasInteracted) {
    const video = document.getElementById("keep-alive-video");
    if (video) {
      video.play().catch((e) => {
        console.error("Video play failed:", e);
      });
    }
    hasInteracted = true;
    console.log("Keep-alive video started.");
  }

  GameState.isDrawingWind = true;

  // Initialize a new wind curve
  GameState.windCurve = {
    points: [{ x, y }],
    createdAt: Date.now(),
    particleSpawnAccumulator: 0,
  };

  for (const ball of GameState.balls) {
    ball.isCapturedByWind = false;
    ball.isCapturedByWindTimer = null;
  }
}

function _snapAngle(points, newPoint) {
  const lookback = Math.floor(Config.windAngleLookback);
  if (Config.enableAngleSnapping && points.length > lookback) {
    // The first point of our vector is now several points back in the array
    const p1 = points[points.length - lookback];
    const p2 = points[points.length - 1]; // The last point
    const p3 = newPoint; // The new potential point

    // The rest of the angle calculation remains the same
    const v1x = p2.x - p1.x;
    const v1y = p2.y - p1.y;
    const v2x = p3.x - p2.x;
    const v2y = p3.y - p2.y;

    const dotProduct = v1x * v2x + v1y * v2y;
    const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

    if (mag1 > 0 && mag2 > 0) {
      const angle = Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);

      if (angle > Config.maxWindCurveAngle) {
        spawnParticles(
          Config.angleSnapParticleCount,
          p2.x, // Spawn at the corner
          p2.y,
          Config.angleSnapParticleColor,
          Config.angleSnapParticleSpeed,
          1,
          2,
          500, // minSize, maxSize, lifetime
          true,
          "corruption_inert"
        );
        handleDragEnd(); // Finalize the old curve
        handleDragStart(newPoint.x, newPoint.y); // Immediately start a new one
        return true; // Stop processing this move
      }
    }
  }
  return false;
}

function _smoothCurve(points) {
  if (points.length < 3) return; // Need at least 3 points to smooth

  // 2. Iterate backwards over the existing points (excluding the two newest ones).
  // This loop pulls each point slightly towards the average of its neighbors.
  for (let i = points.length - 3; i > 0; i--) {
    const p0 = points[i - 1]; // Previous point
    const p1 = points[i]; // The point we are smoothing
    const p2 = points[i + 1]; // Next point

    // Find the average position between the neighbors
    const avgX = (p0.x + p2.x) / 2;
    const avgY = (p0.y + p2.y) / 2;

    // Move the current point a fraction of the way towards that average.
    p1.x += (avgX - p1.x) * Config.windSmoothingFactor;
    p1.y += (avgY - p1.y) * Config.windSmoothingFactor;
  }
}

function _calculateCurveLength() {
  const points = GameState.windCurve.points;
  // Calculate the total length of the curve by summing its segments
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    totalLength += Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
  }

  GameState.windCurve.totalLength = totalLength;
}

/**
 * Continues the wind curve drawing process at a new coordinate.
 * @param {number} x The new x-coordinate.
 * @param {number} y The new y-coordinate.
 */
function handleDragMove(x, y) {
  if (!GameState.isDrawingWind || !GameState.windCurve) return;

  const points = GameState.windCurve.points;
  const lastPoint = points[points.length - 1];
  const distance = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);

  if (distance > Config.minPointDistance) {
    const newPoint = { x, y };
    // Ensure we have enough points to perform the lookback check

    if (_snapAngle(points, newPoint)) {
      return;
    }

    // 1. Add the new, raw point to the end of the curve. This ensures no lag.
    GameState.windCurve.points.push(newPoint);

    _smoothCurve(points);

    _calculateCurveLength();
  }
}

/**
 * Ends the wind curve drawing process.
 */
function handleDragEnd() {
  if (GameState.windCurve) {
    _calculateCurveLength();

    // Calculate the final lifetime based on the length
    const totalLength = GameState.windCurve.totalLength;
    const dynamicLifetime = totalLength * Config.windLifetimePerPixel;
    GameState.windCurve.lifetime = Config.windBaseLifetime + dynamicLifetime;
  }

  GameState.isDrawingWind = false;
}

export function addPlayerEvents() {}
// --- Main Exported Function ---

/**
 * Sets up all player input listeners for both mouse (desktop) and touch (mobile).
 */
export function addPlayerWindEvents() {
  // NOTE: We REMOVE `const rect = ...` from here.

  // --- Mouse Event Listeners ---
  canvas.addEventListener("mousedown", (event) => {
    // Get the fresh canvas position at the moment of the event
    const rect = canvas.getBoundingClientRect();
    handleDragStart(event.clientX - rect.left, event.clientY - rect.top);
  });

  document.addEventListener("mousemove", (event) => {
    if (GameState.isDrawingWind) {
      // Get the fresh canvas position at the moment of the event
      const rect = canvas.getBoundingClientRect();
      handleDragMove(event.clientX - rect.left, event.clientY - rect.top);
    }
  });

  document.addEventListener("mouseup", () => {
    if (GameState.isDrawingWind) {
      handleDragEnd();
    }
  });

  // --- Touch Event Listeners ---
  canvas.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();
      // Get the fresh canvas position at the moment of the event
      const rect = canvas.getBoundingClientRect();
      const touch = event.touches[0];
      handleDragStart(touch.clientX - rect.left, touch.clientY - rect.top);
    },
    { passive: false }
  );

  canvas.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();
      if (GameState.isDrawingWind) {
        // Get the fresh canvas position at the moment of the event
        const rect = canvas.getBoundingClientRect();
        const touch = event.touches[0];
        handleDragMove(touch.clientX - rect.left, touch.clientY - rect.top);
      }
    },
    { passive: false }
  );

  // touchend and touchcancel do not need coordinates, so they are fine
  canvas.addEventListener("touchend", () => {
    if (GameState.isDrawingWind) {
      handleDragEnd();
    }
  });

  canvas.addEventListener("touchcancel", () => {
    if (GameState.isDrawingWind) {
      handleDragEnd();
    }
  });
}
