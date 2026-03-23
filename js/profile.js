import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, getDocs, setDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const IBM_COLORS = ["#648FFF","#785EF0","#DC267F","rgb(254, 97, 0)","#FFB000"];
function getAvatarColor(initial) {
  return IBM_COLORS[initial.charCodeAt(0) % IBM_COLORS.length];
}

onAuthStateChanged(auth, async (user) => {
  document.getElementById("loadingState").style.display = "none";
  if (!user) {
    document.getElementById("notLoggedIn").style.display = "block";
    return;
  }

  document.getElementById("notLoggedIn").style.display = "none";
  document.getElementById("profileContent").style.display = "block";

  const [snap, allBadgesSnap, earnedSnap] = await Promise.all([
    getDoc(doc(db, "users", user.uid)),
    getDocs(collection(db, "badges")),
    getDocs(collection(db, "users", user.uid, "badges"))
  ]);

  if (!snap.exists()) return;
  const data = snap.data();

  // ── Name & email ──
  const displayName = data.displayName || "User";
  document.getElementById("profileName").textContent = displayName;
  document.getElementById("profileEmail").textContent = data.email || user.email;

  // ── Avatar ──
  const initial = displayName.charAt(0).toUpperCase();
  const avatarEl = document.getElementById("avatarCircle");
  avatarEl.textContent = initial;
  avatarEl.style.background = getAvatarColor(initial);

  // ── Joined date ──
  if (data.createdAt) {
    const date = data.createdAt.toDate();
    document.getElementById("profileJoined").textContent =
      "Joined " + date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  // ── Stats ──
  document.getElementById("statChallenges").textContent = data.total_challenges_completed || 0;
  document.getElementById("statXP").textContent = data.total_xp || 0;
  document.getElementById("statCurrentStreak").textContent = data.streak || 0;
  document.getElementById("statLongestStreak").textContent = data.longest_streak || 0;

  // ── Badge auto-assignment ──
  // Check all badge thresholds against current stats and write any newly-earned
  // badges before rendering the UI, so the display is always up to date.
  const allBadges = allBadgesSnap.docs.map(d => d.data());
  const earnedIds = earnedSnap.docs.map(d => d.data().id);
  const earnedSet = new Set(earnedIds);

  const statMap = {
    total_challenges_completed: data.total_challenges_completed || 0,
    longest_streak:             data.longest_streak             || 0,
    total_xp:                   data.total_xp                   || 0,
  };

  const writes = [];
  allBadges.forEach(badge => {
    if (earnedSet.has(badge.id)) return;           // already earned
    if (!(badge.stat in statMap)) return;           // stat not tracked
    if (statMap[badge.stat] >= badge.threshold) {
      const badgeRef = doc(db, "users", user.uid, "badges", badge.id);
      writes.push(
        setDoc(badgeRef, { id: badge.id }, { merge: true })
          .then(() => {
            earnedSet.add(badge.id); // update local set so UI reflects it immediately
            console.log(`[Signify] Badge earned: ${badge.id}`);
          })
      );
    }
  });

  if (writes.length > 0) await Promise.all(writes);

  // ── Badges UI ──
  // earnedSet is now fully up to date after any new assignments above
  const earned    = allBadges.filter(b => earnedSet.has(b.id));
  const notEarned = allBadges.filter(b => !earnedSet.has(b.id));

  // Earned panel
  const earnedEl = document.getElementById('earnedBadgesList');
  document.getElementById('earnedBadgeCount').textContent = earned.length ? `(${earned.length})` : '';

  earnedEl.innerHTML = earned.length === 0
    ? `<div class="empty-msg"><span>🏅</span>No badges yet — complete challenges and earn your first badge!</div>`
    : earned.map(b => `
        <div class="earned-badge-item">
          <div class="earned-badge-icon">${b.icon}</div>
          <div class="earned-badge-info">
            <p class="earned-badge-name">${b.name}</p>
            <p class="earned-badge-desc">${b.description}</p>
          </div>
        </div>`).join('');

  // Progress panel
  const progressEl = document.getElementById('badgeProgressList');

  if (notEarned.length === 0) {
    progressEl.innerHTML = `<div class="empty-msg"><span>🎉</span>You've earned every badge!</div>`;
    return;
  }

  progressEl.innerHTML = notEarned.map(b => {
    const current = statMap[b.stat] ?? 0;
    const pct     = Math.min(100, Math.round((current / b.threshold) * 100));
    return `
      <div class="progress-badge-item">
        <div class="progress-badge-header">
          <div class="progress-badge-icon">${b.icon}</div>
          <div class="progress-badge-label">
            <p class="progress-badge-name">${b.name}</p>
            <p class="progress-badge-desc">${b.description}</p>
          </div>
          <span class="progress-badge-pct">${current} / ${b.threshold}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join('');
});