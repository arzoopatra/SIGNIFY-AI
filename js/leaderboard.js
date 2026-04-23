import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyChhO1P5NEDeermlYlPZ1ee---c6FOCIQE",
  authDomain: "signify3-db99e.firebaseapp.com",
  projectId: "signify3-db99e",
  storageBucket: "signify3-db99e.firebasestorage.app",
  messagingSenderId: "161768874822",
  appId: "1:161768874822:web:d12b199cc4a15a3e90bb47",
  databaseURL: "https://signify3-db99e-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const IBM_COLORS = ["#648FFF","#785EF0","#DC267F","#FE6100","#FFB000"];

function getAvatarColor(initial) {
  return IBM_COLORS[initial.charCodeAt(0) % IBM_COLORS.length];
}

let allUsers = [];
let currentUid = null;
let currentTab = "xp";

async function loadUsers() {
  const snap = await getDocs(collection(db, "users"));
  allUsers = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
  renderTable(currentTab);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUid = user.uid;
  } else {
    currentUid = null;
    document.getElementById("loginNotice").style.display = "block";
  }
  loadUsers();
});

window.switchTab = function(tab, btnEl) {
  currentTab = tab;

  document.querySelectorAll(".stat-tab").forEach(b => b.classList.remove("active"));
  btnEl.classList.add("active");

  const headers = { xp: "XP", challenges: "Challenges", streak: "Longest Streak" };
  document.getElementById("statColHeader").textContent = headers[tab];

  renderTable(tab);
};

function renderTable(tab) {
  document.getElementById("loadingState").style.display = "none";
  document.getElementById("leaderboardWrap").style.display = "block";

  const sorted = [...allUsers].sort((a, b) => {
    return getStatValue(b, tab) - getStatValue(a, tab);
  });

  const top50 = sorted.slice(0, 50);
  const currentUserRank = sorted.findIndex(u => u.uid === currentUid) + 1;
  const currentUserData = sorted.find(u => u.uid === currentUid);
  const currentUserInTop50 = currentUserRank > 0 && currentUserRank <= 50;

  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = "";

  top50.forEach((user, i) => {
    const rank = i + 1;
    const isCurrentUser = user.uid === currentUid;
    tbody.appendChild(buildRow(rank, user, tab, isCurrentUser));
  });

  if (currentUid && currentUserData && !currentUserInTop50) {
    const dividerRow = document.createElement("tr");
    dividerRow.classList.add("lb-divider");
    dividerRow.innerHTML = `<td colspan="3">· · · YOUR RANKING · · ·</td>`;
    tbody.appendChild(dividerRow);
    tbody.appendChild(buildRow(currentUserRank, currentUserData, tab, true));
  }
}

function buildRow(rank, user, tab, isCurrentUser) {
  const tr = document.createElement("tr");
  if (isCurrentUser) tr.classList.add("is-current-user");

  const name = user.displayName || "User";
  const initial = name.charAt(0).toUpperCase();
  const avatarColor = getAvatarColor(initial);
  const statVal = formatStat(getStatValue(user, tab), tab);

  let rankDisplay = `#${rank}`;
  if (rank === 1) rankDisplay = `<span class="rank-1" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons" style="font-size:18px;">emoji_events</span>1</span>`;
  else if (rank === 2) rankDisplay = `<span class="rank-2" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons" style="font-size:18px;">emoji_events</span>2</span>`;
  else if (rank === 3) rankDisplay = `<span class="rank-3" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons" style="font-size:18px;">emoji_events</span>3</span>`;

  const youBadge = isCurrentUser ? `<span class="you-badge">YOU</span>` : "";

  tr.innerHTML = `
    <td class="rank-col">${rankDisplay}</td>
    <td>
      <div class="user-cell">
        <div class="table-avatar" style="background:${avatarColor};">${initial}</div>
        <span>${name}</span>
        ${youBadge}
      </div>
    </td>
    <td class="stat-val-col">${statVal}</td>
  `;

  return tr;
}

function getStatValue(user, tab) {
  if (tab === "xp")         return user.total_xp                    || 0;
  if (tab === "challenges") return user.total_challenges_completed   || 0;
  if (tab === "streak")     return user.longest_streak               || 0;
  return 0;
}

function formatStat(value, tab) {
  if (tab === "streak") return value + " days";
  return value;
}