import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

let isLoggingOut = false;

import {
  getFirestore,
  doc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ── Firebase Initialization ──────────────────────────────────

const firebaseConfig = {
  apiKey: "AIzaSyChhO1P5NEDeermlYlPZ1ee---c6FOCIQE",
  authDomain: "signify3-db99e.firebaseapp.com",
  projectId: "signify3-db99e",
  storageBucket: "signify3-db99e.firebasestorage.app",
  messagingSenderId: "161768874822",
  appId: "1:161768874822:web:d12b199cc4a15a3e90bb47",
  databaseURL: "https://signify3-db99e-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// ── Google Sign-In Logic ─────────────────────────────────────

document.addEventListener("click", async (e) => {
  if (e.target.closest("#googleSignInBtn")) {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = result._tokenResponse?.isNewUser;

      if (isNewUser) {
        await createUserDocument(user.uid, user.email, user.displayName || "User");
      }

      closeModal();
    } catch (err) {
      console.error("Google error:", err);
    }
  }
});

// ── Firestore Data Helpers ───────────────────────────────────

function buildAlphabetDocs() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  return letters.reduce((acc, letter) => {
    acc[letter] = {
      learned: false
    };
    return acc;
  }, {});
}

async function createUserDocument(uid, email, displayName) {
  await setDoc(doc(db, "users", uid), {
    email,
    displayName,
    createdAt: new Date(),
    streak: 0,
    longest_streak: 0,
    total_xp: 0,
    total_challenges_completed: 0,
    nextLetter: "A",
    next_word_learn: "Hello",
  });

  const alphabetData = buildAlphabetDocs();
  for (const [letter, data] of Object.entries(alphabetData)) {
    await setDoc(doc(db, "users", uid, "alphabet", letter), data);
  }
}

// ── UI Injection (Modal & Dropdown) ──────────────────────────

document.body.insertAdjacentHTML("beforeend", `
  <div id="authModal" style="
    display:none;position:fixed;inset:0;z-index:9999;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);
    justify-content:center;align-items:center;
  ">
    <div style="
      background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;
      padding:40px;width:100%;max-width:420px;position:relative;
      box-shadow:0 25px 60px rgba(0,0,0,0.15);
    ">
      <button id="authModalClose" style="
        position:absolute;top:16px;right:16px;
        background:none;border:none;color:#64748b;font-size:22px;cursor:pointer;
      ">✕</button>

      <div style="display:flex;margin-bottom:32px;border-bottom:1px solid #e2e8f0;">
        <button id="tabSignIn" onclick="switchTab('signin')" style="
          flex:1;background:none;border:none;color:#0f172a;
          font-size:15px;font-weight:600;padding:10px;cursor:pointer;
          border-bottom:2px solid #648FFF;transition:all .2s;
        ">Sign In</button>
        <button id="tabSignUp" onclick="switchTab('signup')" style="
          flex:1;background:none;border:none;color:#64748b;
          font-size:15px;font-weight:600;padding:10px;cursor:pointer;
          border-bottom:2px solid transparent;transition:all .2s;
        ">Sign Up</button>
      </div>

      <div id="formSignIn">
        <h3 style="color:#0f172a;margin-bottom:24px;font-size:22px;">Welcome back</h3>
        <button id="googleSignInBtn" style="
          width:100%;padding:13px;margin-bottom:14px;background:#ffffff;
          border:1px solid #e2e8f0;border-radius:8px;display:flex;
          align-items:center;justify-content:center;gap:10px;font-weight:600;
          cursor:pointer;transition:all .2s;
        " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#ffffff'">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18">
          Continue with Google
        </button>
        <div style="text-align:center;margin:10px 0;color:#94a3b8;font-size:13px;">or</div>
        <input id="siEmail" type="email" placeholder="Email address" style="width:100%;padding:13px 16px;margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;font-size:14px;box-sizing:border-box;outline:none;">
        <input id="siPassword" type="password" placeholder="Password" style="width:100%;padding:13px 16px;margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;font-size:14px;box-sizing:border-box;outline:none;">
        <button onclick="handleSignIn()" style="width:100%;padding:14px;background:#648FFF;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;">
          Sign In
        </button>
        <p id="siError" style="color:#ff6b6b;font-size:13px;margin-top:12px;display:none;"></p>
      </div>

      <div id="formSignUp" style="display:none;">
        <h3 style="color:#0f172a;margin-bottom:24px;font-size:22px;">Create account</h3>
        <input id="suName" type="text" placeholder="Display name" style="width:100%;padding:13px 16px;margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;font-size:14px;box-sizing:border-box;outline:none;">
        <input id="suEmail" type="email" placeholder="Email address" style="width:100%;padding:13px 16px;margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;font-size:14px;box-sizing:border-box;outline:none;">
        <input id="suPassword" type="password" placeholder="Password" style="width:100%;padding:13px 16px;margin-bottom:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;font-size:14px;box-sizing:border-box;outline:none;">
        <input id="suPassword2" type="password" placeholder="Confirm password" style="width:100%;padding:13px 16px;margin-bottom:20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;color:#0f172a;font-size:14px;box-sizing:border-box;outline:none;">
        <button onclick="handleSignUp()" style="width:100%;padding:14px;background:#648FFF;border:none;border-radius:8px;color:#fff;font-size:15px;font-weight:600;cursor:pointer;">Create Account</button>
        <p id="suError" style="color:#ff6b6b;font-size:13px;margin-top:12px;display:none;"></p>
      </div>
    </div>
  </div>

  <div id="profileDropdown" style="
    display:none;position:fixed;background:#ffffff;
    border:1px solid #e2e8f0;border-radius:10px;padding:8px;
    min-width:180px;box-shadow:0 10px 30px rgba(0,0,0,0.1);z-index:9998;
  ">
    <p id="dropdownEmail" style="color:#64748b;font-size:12px;padding:8px 12px 4px;margin:0 0 6px 0;border-bottom:1px solid #e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></p>
    <a href="profile.html" style="display:block;padding:9px 12px;color:#0f172a;text-decoration:none;font-size:14px;border-radius:6px;transition:background .15s;"
      onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#648FFF"><path d="M367-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z"/></svg> Go to Profile
    </a>
    <button onclick="handleSignOut()" style="width:100%;text-align:left;padding:9px 12px;background:none;border:none;color:#ff6b6b;font-size:14px;cursor:pointer;border-radius:6px;transition:background .15s;"
      onmouseover="this.style.background='rgba(255,107,107,0.1)'" onmouseout="this.style.background='none'">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#648FFF"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg> Log Out
    </button>
  </div>
`);

// ── UI Control Logic ─────────────────────────────────────────

window.switchTab = function(tab) {
  const isSignIn = tab === "signin";
  document.getElementById("formSignIn").style.display = isSignIn ? "block" : "none";
  document.getElementById("formSignUp").style.display = isSignIn ? "none" : "block";
  document.getElementById("tabSignIn").style.color = isSignIn ? "#0f172a" : "#64748b";
  document.getElementById("tabSignIn").style.borderBottom = isSignIn ? "2px solid #648FFF" : "2px solid transparent";
  document.getElementById("tabSignUp").style.color = isSignIn ? "#64748b" : "#0f172a";
  document.getElementById("tabSignUp").style.borderBottom = isSignIn ? "2px solid transparent" : "2px solid #648FFF";
};

function openModal() {
  document.getElementById("authModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("authModal").style.display = "none";
}

document.getElementById("authModalClose").addEventListener("click", closeModal);
document.getElementById("authModal").addEventListener("click", function(e) {
  if (e.target === this) closeModal();
});

// ── Dropdown Logic ───────────────────────────────────────────

let dropdownOpen = false;

function handleIconClick(e) {
  const user = auth.currentUser;
  const dropdown = document.getElementById("profileDropdown");

  if (!user) {
    openModal();
    return;
  }

  if (dropdownOpen) {
    dropdown.style.display = "none";
    dropdownOpen = false;
    return;
  }

  const rect = e.target.getBoundingClientRect();
  dropdown.style.top = (rect.bottom + 8) + "px";
  dropdown.style.left = (rect.left - 100) + "px";
  document.getElementById("dropdownEmail").textContent = user.email;
  dropdown.style.display = "block";
  dropdownOpen = true;
}

document.addEventListener("click", function(e) {
  const dropdown = document.getElementById("profileDropdown");
  if (dropdownOpen && !dropdown.contains(e.target) && !e.target.classList.contains("profile-icon-btn")) {
    dropdown.style.display = "none";
    dropdownOpen = false;
  }
});

// ── Auth Handlers ────────────────────────────────────────────
window.handleSignUp = async function() {
  const name = document.getElementById("suName").value.trim();
  const email = document.getElementById("suEmail").value.trim();
  const password = document.getElementById("suPassword").value;
  const password2 = document.getElementById("suPassword2").value;
  const errEl = document.getElementById("suError");
  errEl.style.display = "none";

  if (!name) {
    errEl.textContent = "Please enter a display name.";
    errEl.style.display = "block";
    return;
  }
  if (password !== password2) {
    errEl.textContent = "Passwords don't match.";
    errEl.style.display = "block";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createUserDocument(cred.user.uid, cred.user.email, name);
    closeModal();
  } catch (err) {
    errEl.textContent = friendlyError(err.code);
    errEl.style.display = "block";
  }
};

window.handleSignOut = async function() {
  const loader = document.getElementById("pageLoader");
  const loaderText = document.getElementById("loaderText");

  // 🔥 change text
  if (loaderText) {
    loaderText.innerText = "Logging you out...";
  }

  loader.style.display = "flex";

  if (typeof startLoaderAnimation === "function") {
    startLoaderAnimation();
  }

  document.getElementById("profileDropdown").style.display = "none";
  dropdownOpen = false;

  setTimeout(async () => {
    await signOut(auth);
  }, 1200);
};
// ── Auth State Observer ──────────────────────────────────────

onAuthStateChanged(auth, (user) => {
  document.querySelectorAll(".profile-icon-btn").forEach(icon => {
    icon.style.color = user ? "#648FFF" : "#0f172a";
  });
});

// ── Error Messaging ──────────────────────────────────────────

function friendlyError(code) {
  const map = {
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/invalid-credential": "Invalid email or password."
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Initialization ───────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".profile-icon-btn").forEach(icon => {
    icon.removeEventListener("click", handleIconClick);
    icon.addEventListener("click", handleIconClick);
  });
});