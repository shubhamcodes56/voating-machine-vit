// Candidates will be fetched from API

// ============ RENDER CANDIDATES ============
async function renderCandidates() {
  const grid = document.getElementById('candidatesGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #94A3B8; padding: 40px;">Loading candidates...</div>';

  try {
    const resp = await fetch('/api/candidates');
    const candidates = await resp.json();

    if (!resp.ok) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #fca5a5; padding: 40px;">Error: ${candidates.error || 'Failed to load'}</div>`;
      return;
    }

    if (candidates.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">No candidates are registered yet for this election.</div>';
      return;
    }

    grid.innerHTML = candidates.map((c, i) => `
      <div class="cand-card" style="animation-delay: ${i * 0.1}s">
        <span class="cand-number">#${i + 1}</span>
        <div class="cand-photo-wrap">
          <img class="cand-photo" src="${c.photo}" alt="${escapeHtml(c.name)}" 
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=334155&color=fff&size=200&bold=true'">
          <div class="cand-photo-glow"></div>
        </div>
        <div class="cand-name">${escapeHtml(c.name)}</div>
        <div class="cand-party">${escapeHtml(c.party)}</div>
        <div class="cand-divider"></div>
        <div class="cand-agenda-title">Key Agenda</div>
        <ul class="cand-agenda-list">
          ${(c.agenda || []).map(a => `<li>${escapeHtml(a)}</li>`).join('')}
        </ul>
      </div>
    `).join('');
  } catch (err) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #fca5a5; padding: 40px;">Network Error: Failed to load candidates</div>';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
