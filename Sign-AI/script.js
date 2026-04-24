// Basic Setup
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d", {
  alpha: false,
  desynchronized: true,
  willReadFrequently: false,
});
const statusDiv = document.getElementById("status");
const gestureDiv = document.getElementById("output");

let sentence = "";
let lastGesture = "—";
let lastTime = 0;
let COOLDOWN = 900;
let conversationHistory = [];
let isProcessing = false;
let gestureHistory = [];

const templates = [
  { pattern: ["Hello", "You"], sentence: "Hello, how are you?" },
  { pattern: ["Help", "You"], sentence: "Do you need help?" },
  { pattern: ["Yes", "Help"], sentence: "Yes, I need help." },
  { pattern: ["No", "Help"], sentence: "I don't need help." },
  { pattern: ["Thank you", "You"], sentence: "Thank you very much!" },
  { pattern: ["Good", "You"], sentence: "You are good." },
  { pattern: ["Stop", "You"], sentence: "Please stop!" },
];

// Sound Effects
function playSuccessSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800;
  oscillator.type = "sine";

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.1
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

// Dark Mode
const themeToggle = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme") || "light";

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("theme", isDark ? "dark" : "light");
});

// Conversation History
function addToHistory(text, type = "gesture") {
  const timestamp = new Date().toLocaleTimeString();
  conversationHistory.push({ text, timestamp, type });

  const historyContainer = document.getElementById("historyContainer");
  const item = document.createElement("div");
  item.className = "history-item";
  item.innerHTML = `
    <div class="time">${timestamp}</div>
    <div class="text">${text}</div>
  `;
  historyContainer.appendChild(item);
  historyContainer.scrollTop = historyContainer.scrollHeight;
}

document.getElementById("clearHistory").addEventListener("click", () => {
  conversationHistory = [];
  document.getElementById("historyContainer").innerHTML =
    '<p style="color: var(--text-secondary); font-size: 14px;">Your conversation will appear here...</p>';
});

// Speed Control
const speedSlider = document.getElementById("speedSlider");
const speedLabel = document.getElementById("speedLabel");

speedSlider.addEventListener("input", (e) => {
  const value = e.target.value;
  COOLDOWN = parseInt(value);

  if (COOLDOWN <= 500) {
    speedLabel.textContent = "Fast Mode";
  } else if (COOLDOWN <= 900) {
    speedLabel.textContent = "Normal Mode";
  } else {
    speedLabel.textContent = "Learning Mode";
  }
});

// Preset Phrases
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const phrase = btn.getAttribute("data-phrase");
    sentence = phrase;
    document.getElementById("sentenceText").innerText = sentence;
    addToHistory(phrase, "preset");
  });
});

// Export Conversation
document.getElementById("exportBtn").addEventListener("click", () => {
  if (conversationHistory.length === 0) {
    alert("No conversation to export!");
    return;
  }

  let exportText = "=== SignAI Conversation Export ===\n\n";
  conversationHistory.forEach((item) => {
    exportText += `[${item.timestamp}] ${item.text}\n`;
  });

  const blob = new Blob([exportText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `signai-conversation-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// Gesture Stabilization
const GESTURE_BUFFER_SIZE = 12;
const gestureBuffer = [];

function getStabilizedGesture(newGesture) {
  gestureBuffer.push(newGesture);
  if (gestureBuffer.length > GESTURE_BUFFER_SIZE) {
    gestureBuffer.shift();
  }

  const counts = {};
  gestureBuffer.forEach((g) => {
    counts[g] = (counts[g] || 0) + 1;
  });

  let maxCount = 0;
  let stabilized = "—";
  for (const g in counts) {
    if (counts[g] > maxCount) {
      maxCount = counts[g];
      stabilized = g;
    }
  }

  return maxCount > GESTURE_BUFFER_SIZE * 0.6 ? stabilized : lastGesture;
}

function classifyGesture(landmarks, handedness = "Unknown") {
  function getDist(p1, p2) {
    return Math.hypot(
      landmarks[p1].x - landmarks[p2].x,
      landmarks[p1].y - landmarks[p2].y
    );
  }

  function isFingerOpen(tipIdx, pipIdx) {
    return getDist(tipIdx, 0) > getDist(pipIdx, 0) * 1.2;
  }

  const thumbOpen = getDist(4, 0) > getDist(3, 0) * 1.1;
  const indexOpen = isFingerOpen(8, 6);
  const middleOpen = isFingerOpen(12, 10);
  const ringOpen = isFingerOpen(16, 14);
  const pinkyOpen = isFingerOpen(20, 18);

  // Gesture Classification
  const thumbIndexDist = getDist(4, 8);
  if (thumbIndexDist < 0.05 && middleOpen && ringOpen && pinkyOpen) {
    return { gesture: "OK", confidence: 95 };
  }

  if (thumbOpen && indexOpen && middleOpen && ringOpen && pinkyOpen) {
    const thumbIndexSpread = Math.abs(landmarks[4].x - landmarks[8].x);
    const indexMiddleSpread = Math.abs(landmarks[8].x - landmarks[12].x);
    const middleRingSpread = Math.abs(landmarks[12].x - landmarks[16].x);
    const ringPinkySpread = Math.abs(landmarks[16].x - landmarks[20].x);

    const avgSpread =
      (thumbIndexSpread +
        indexMiddleSpread +
        middleRingSpread +
        ringPinkySpread) /
      4;

    if (avgSpread > 0.04) {
      return { gesture: "Hello", confidence: 95 };
    }
  }

  if (!thumbOpen && indexOpen && middleOpen && ringOpen && pinkyOpen) {
    if (handedness === "Left") {
      return { gesture: "Help", confidence: 90 };
    }
  }

  if (indexOpen && middleOpen && !ringOpen && !pinkyOpen && !thumbOpen) {
    return { gesture: "Good", confidence: 92 };
  }

  if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    return { gesture: "You", confidence: 90 };
  }

  if (thumbOpen && pinkyOpen && !indexOpen && !middleOpen && !ringOpen) {
    return { gesture: "Thank you", confidence: 88 };
  }

  if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    if (landmarks[4].y < landmarks[3].y) {
      return { gesture: "Yes", confidence: 95 };
    }
  }

  if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    if (landmarks[4].y > landmarks[3].y) {
      return { gesture: "No", confidence: 95 };
    }
  }

  if (!thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    return { gesture: "Stop", confidence: 90 };
  }

  return { gesture: "—", confidence: 0 };
}

// MediaPipe Setup
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  selfieMode: true,
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});

hands.onResults((results) => {
  if (isProcessing) return;
  isProcessing = true;

  requestAnimationFrame(() => {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.image) {
      canvasCtx.drawImage(
        results.image,
        0,
        0,
        canvasElement.width,
        canvasElement.height
      );
    }

    let gestureOutput = "—";
    let confidence = 0;

    if (results.multiHandLandmarks?.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const handedness = results.multiHandedness?.[0]?.label || "Unknown"; // "Left" or "Right"

      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
        color: "#00FF00",
        lineWidth: 2,
      });
      drawLandmarks(canvasCtx, landmarks, {
        color: "#FF0000",
        lineWidth: 1,
        radius: 3,
      });

      const rawResult = classifyGesture(landmarks, handedness);
      gestureOutput = getStabilizedGesture(rawResult.gesture);
      confidence = rawResult.confidence;

      statusDiv.textContent = `Hand: ${handedness} | Detected`;
    } else {
      statusDiv.textContent = "No hand detected";
      confidence = 0;
    }

    gestureDiv.textContent = gestureOutput;
    const confidenceBar = document.getElementById("confidenceBar");
    const confidenceValue = document.getElementById("confidenceValue");
    confidenceBar.style.width = confidence + "%";
    confidenceValue.textContent = Math.round(confidence) + "%";

    if (confidence >= 80) {
      confidenceValue.style.color = "#00ff88";
    } else if (confidence >= 50) {
      confidenceValue.style.color = "#ffaa00";
    } else {
      confidenceValue.style.color = "#ff4444";
    }

    const now = Date.now();
    if (
      gestureOutput !== "—" &&
      gestureOutput !== lastGesture &&
      now - lastTime > COOLDOWN
    ) {
      gestureHistory.push(gestureOutput);

      let englishSentence = gestureOutput;

      if (gestureHistory.length >= 2) {
        const lastTwo = gestureHistory.slice(-2);
        const template = templates.find(
          (t) => t.pattern[0] === lastTwo[0] && t.pattern[1] === lastTwo[1]
        );
        if (template) englishSentence = template.sentence;
      }

      sentence = englishSentence;
      document.getElementById("sentenceText").textContent = sentence;
      addToHistory(englishSentence, "gesture");
      playSuccessSound();

      lastGesture = gestureOutput;
      lastTime = now;
    }

    isProcessing = false;
  });
});

// Camera Setup
const camera = new Camera(videoElement, {
  onFrame: async () => await hands.send({ image: videoElement }),
  width: 640,
  height: 480,
});

camera.start().then(() => (statusDiv.innerText = "Status: Camera started"));

// Clear & Speak
document.getElementById("clearSentence").onclick = () => {
  sentence = "";
  lastGesture = "—";
  document.getElementById("sentenceText").innerText = "Waiting for gesture...";
};

document.getElementById("speakSentence").onclick = () => {
  if (!sentence || sentence === "Waiting for gesture...") {
    alert("No sentence to speak!");
    return;
  }
  let msg = new SpeechSynthesisUtterance(sentence);
  window.speechSynthesis.speak(msg);
};

// Translation
async function translateSentence() {
  const text = sentence.trim();
  const target = document.getElementById("languageSelect").value;

  if (target === "en") {
    document.getElementById("translatedText").innerText = text;
    return;
  }

  if (!text || text === "Waiting for gesture...") {
    alert("No sentence to translate!");
    return;
  }

  document.getElementById("translatedText").innerText = "Translating...";
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=en|${target}`
    );
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData.translatedText) {
      const translated = data.responseData.translatedText;
      const lowerTranslated = translated.toLowerCase();
      const garbageKeywords = [
        "delhi metro",
        "station",
      ];
      const hasGarbage = garbageKeywords.some((keyword) =>
        lowerTranslated.includes(keyword)
      );

      if (hasGarbage || translated.toLowerCase() === text.toLowerCase()) {
        document.getElementById("translatedText").innerText =
          "⚠️ Translation quality poor. Try Google Translate for better results.";
      } else {
        document.getElementById("translatedText").innerText = translated;
        addToHistory(`[${target.toUpperCase()}] ${translated}`, "translation");
      }
    } else {
      document.getElementById("translatedText").innerText =
        "Translation service error. Please try again.";
    }
  } catch (err) {
    document.getElementById("translatedText").innerText =
      "Translation failed. Check your internet connection.";
    console.error("Translation error:", err);
  }
}
document.getElementById("translateBtn").onclick = translateSentence;
