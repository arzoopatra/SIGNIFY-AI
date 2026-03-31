import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
let loaderStartTime = 0;
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* 🔥 FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAtvEg9LMPYz_ksNsPkWXjSof85XD0BhWc",
  authDomain: "signify-0326.firebaseapp.com",
  projectId: "signify-0326",
  storageBucket: "signify-0326.firebasestorage.app",
  messagingSenderId: "277885993716",
  appId: "1:277885993716:web:8aa7aef7777f14417e14a1",
  databaseURL: "https://signify-0326-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

onAuthStateChanged(auth, (user) => {
  isUserLoggedIn = !!user;
});

/* =========================================================
   🔄 LOADER CONTROL (GLOBAL - RUNS ONLY ONCE)
========================================================= */
const loader = document.getElementById("pageLoader");

function startLoaderAnimation() {
  const progressBar = document.querySelector('.loader-progress');
  let width = 0;

  const interval = setInterval(() => {
    if (width >= 100) {
      clearInterval(interval);
    } else {
      width++;
      if (progressBar) {
        progressBar.style.width = width + "%";
      }
    }
  }, 20);
}

/* =========================================================
   🔐 AUTH STATE
========================================================= */
onAuthStateChanged(auth, async (user) => {
  isUserLoggedIn = !!user;
  const returningUserView = document.getElementById("returningUserView");
  const newUserView = document.getElementById("newUserView");
  const loadingView = document.getElementById("loadingView");
  const gameSection = document.getElementById("gamePromoSection");

  if (gameSection) {
    gameSection.style.display = user ? "none" : "block";
  }

  if (!returningUserView || !newUserView) return;

  if (user) {
    document.getElementById("loaderText").innerText =
    "Preparing your learning space...";
    
    // 👤 Name
    const name = user.displayName || user.email?.split("@")[0] || "Learner";
    document.getElementById("letterTitle").innerText = `Hey ${name} ✨`;

    // ❌ hide everything first
    newUserView.style.display = "none";
    returningUserView.style.display = "none";

    loader.style.display = "flex";
loaderStartTime = Date.now();

startLoaderAnimation();

// load data
await loadUserData(user);
await loadMiniLeaderboard(user.uid);

// timing logic
const elapsed = Date.now() - loaderStartTime;
const remaining = Math.max(5000 - elapsed, 0);

setTimeout(() => {
  loader.style.display = "none";
  returningUserView.style.display = "block";

  // 💌 envelope AFTER loader
  setTimeout(() => {
    showEnvelope();
    setupEnvelope();
  }, 500);

}, remaining);

  } else {
  returningUserView.style.display = "none";
  newUserView.style.display = "block";

  const isLoggingOut = localStorage.getItem("isLoggingOut");

  if (isLoggingOut === "true") {
    // 🌀 keep loader for smooth logout
    setTimeout(() => {
      loader.style.display = "none";
      localStorage.removeItem("isLoggingOut"); // reset
    }, 800);
  } else {
    loader.style.display = "none";
  }
}
});

/* =========================================================
   🔐 REQUIRE AUTH
========================================================= */
function requireAuth(action) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      action();
    } else {
      document.querySelector(".profile-icon-btn").click();
    }
  });
}

/* =========================================================
   🎮 BUTTONS
========================================================= */
document.getElementById("tryNowBtn").addEventListener("click", (e) => {
  e.preventDefault();

  requireAuth(() => {
    window.location.href = "./Sign-AI/index.html";
  });
});

const playBtn = document.getElementById("playBtn");

playBtn.addEventListener("click", () => {
  requireAuth(() => {
    window.location.href = "https://practice-game-green.vercel.app/";
  });
});

playBtn.addEventListener("mouseenter", () => {
  playBtn.src = "images/playhover.png";
});

playBtn.addEventListener("mouseleave", () => {
  playBtn.src = "images/play.png";
});

/* =========================================================
   📊 LOAD USER DATA
========================================================= */
async function loadUserData(user) {
  const userSnap = await getDoc(doc(db, "users", user.uid));
  if (!userSnap.exists()) return;

  const data = userSnap.data();

  document.getElementById("stat-streak").innerText =
    `${data.streak || 0} Days`;

  document.getElementById("stat-xp").innerText =
    `${data.total_xp || 0} XP`;

  const learned = Object.values(data.alphabet || {}).filter(v => v).length;
  const pct = Math.round((learned / 26) * 100);

  document.getElementById("progress-AtoZ-text").innerText = `${pct}%`;
  document.getElementById("progress-AtoZ-bar").style.width = `${pct}%`;

  document.getElementById("next-lesson-btn").innerText =
    `Jump to Letter "${data.nextLetter || "A"}"`;
}

/* =========================================================
   🏆 LEADERBOARD
========================================================= */
async function loadMiniLeaderboard(currentUid) {
  const leaderboardEl = document.getElementById("mini-leaderboard");
  leaderboardEl.innerHTML = "";

  const snap = await getDocs(
    query(collection(db, "users"), orderBy("total_xp", "desc"))
  );

  const docs = snap.docs;

  docs.slice(0, 4).forEach((docSnap, i) => {
    const data = docSnap.data();
    const isMe = docSnap.id === currentUid;

    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between";

    li.innerHTML = `
      <span>${data.displayName || "User"}</span>
      <span>${data.total_xp || 0} XP</span>
    `;

    leaderboardEl.appendChild(li);
  });

  const rank =
    docs.findIndex(d => d.id === currentUid) + 1;

  document.getElementById("stat-rank").innerText =
    rank > 0 ? `Rank #${rank}` : "Keep Learning!";
}

/* =========================================================
   🤖 AI MESSAGE
========================================================= */
async function generateMessage() {
  try {
    const res = await fetch("https://asl-backend-u3tt.onrender.com/api/letter-msg");
    const data = await res.json();
    return data.message || "Keep going 💙";
  } catch {
    return "You’re doing amazing 💙";
  }
}

/* =========================================================
   💌 ENVELOPE
========================================================= */
async function showEnvelope() {
  const popup = document.getElementById("envelopePopup");
  const messageEl = document.getElementById("letterMessage");

  popup.style.display = "flex";
  messageEl.innerText = "Loading... ✨";

  const msg = await generateMessage();
  messageEl.innerText = msg;
}

function setupEnvelope() {
  const wrapper = document.querySelector(".envelope-wrapper");
  const heart = document.querySelector(".heart");
  const popup = document.getElementById("envelopePopup");

  // 💌 OPEN
  setTimeout(() => {
    wrapper.classList.add("flap");
  }, 300);

  heart.addEventListener("click", () => {

    // ✉️ STEP 1: close envelope first
    wrapper.classList.remove("flap");

    // ❤️ STEP 2: AFTER envelope starts closing → reset heart
    setTimeout(() => {
      heart.style.transform = "translate(-50%, -20%) rotate(-45deg)";
    }, 500); // delay = after flap starts closing

    // 🧼 STEP 3: hide popup after everything finishes
    setTimeout(() => {
      popup.style.display = "none";
    }, 1300);
  });
}