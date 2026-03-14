// ============ CANDIDATES DATA ============
// Update this list with your real candidates' info.
// For photos: use a URL (https://...) or a relative path (images/alice.jpg)
// For agenda: list 3-4 key points

const CANDIDATES = [
  {
    name: "Alice Smith",
    party: "Progress Party",
    photo: "https://ui-avatars.com/api/?name=Alice+Smith&background=4F46E5&color=fff&size=200&rounded=true&bold=true",
    agenda: [
      "Improve campus infrastructure",
      "Increase scholarship funds",
      "Digital-first academic experience",
      "24/7 library access"
    ]
  },
  {
    name: "Bob Jones",
    party: "Student Unity",
    photo: "https://ui-avatars.com/api/?name=Bob+Jones&background=0891b2&color=fff&size=200&rounded=true&bold=true",
    agenda: [
      "Affordable canteen meals",
      "Better transport connectivity",
      "Stronger student grievance system",
      "Sports & wellness programs"
    ]
  },
  {
    name: "Charlie Brown",
    party: "Future Forward",
    photo: "https://ui-avatars.com/api/?name=Charlie+Brown&background=059669&color=fff&size=200&rounded=true&bold=true",
    agenda: [
      "Greener campus initiative",
      "Mental health support center",
      "Industry internship portal",
      "Student entrepreneurship fund"
    ]
  },
  {
    name: "Diana Prince",
    party: "United Voice",
    photo: "https://ui-avatars.com/api/?name=Diana+Prince&background=db2777&color=fff&size=200&rounded=true&bold=true",
    agenda: [
      "Equal opportunities for all",
      "Expand women's safety measures",
      "More cultural & arts events",
      "Transparent student governance"
    ]
  }
];

// ============ RENDER CANDIDATES ============
function renderCandidates() {
  const grid = document.getElementById('candidatesGrid');
  if (!grid) return;

  grid.innerHTML = CANDIDATES.map((c, i) => `
    <div class="cand-card" style="animation-delay: ${i * 0.1}s">
      <span class="cand-number">#${i + 1}</span>
      <div class="cand-photo-wrap">
        <img class="cand-photo" src="${c.photo}" alt="${c.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=334155&color=fff&size=200&bold=true'">
        <div class="cand-photo-glow"></div>
      </div>
      <div class="cand-name">${c.name}</div>
      <div class="cand-party">${c.party}</div>
      <div class="cand-divider"></div>
      <div class="cand-agenda-title">Key Agenda</div>
      <ul class="cand-agenda-list">
        ${c.agenda.map(a => `<li>${a}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

// ============ CHECK VOTING STATUS ============
async function checkVotingMode() {
  try {
    const resp = await fetch('/api/voting-mode');
    if (!resp.ok) return;
    const { votingStarted } = await resp.json();
    const notice = document.getElementById('prevotingNotice');
    if (notice) {
      notice.style.display = votingStarted ? 'none' : 'block';
    }
  } catch (e) {
    // silently fail
  }
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
  renderCandidates();
  checkVotingMode();
});
