// ============ DOM ELEMENTS ============
const verifyBtn = document.getElementById('verifyBtn');
const submitBtn = document.getElementById('submitBtn');
const voterIdInput = document.getElementById('voterIdInput');
const voterIdSuccessMessage = document.getElementById('voterIdSuccessMessage');
const voterIdErrorMessage = document.getElementById('voterIdErrorMessage');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const voterIdSection = document.getElementById('voterIdSection');
const votingSection = document.getElementById('votingSection');
const adminModal = document.getElementById('adminModal');
const adminPassword = document.getElementById('adminPassword');
const adminMessage = document.getElementById('adminMessage');
const monitorModal = document.getElementById('monitorModal');
const monitorPasswordInput = document.getElementById('monitorPassword');
const monitorMessage = document.getElementById('monitorMessage');

// ============ GLOBAL VARIABLES ============
let verifiedVoterId = '';

// ============ AUTO-FILL FROM QR SCANNER (kiosk mode) ============
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const vid = params.get('vid'); // URLSearchParams.get() already decodes — no decodeURIComponent needed
  if (vid) {
    console.log('[QR Redirect] Voter ID received from scanner:', vid);
    const input = document.getElementById('voterIdInput');
    input.value = vid; // already decoded by URLSearchParams
    input.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.45)';
    setTimeout(() => { input.style.boxShadow = ''; }, 1200);
    // Auto-trigger verification
    setTimeout(() => {
      console.log('[QR Redirect] Auto-triggering verifyVoterId() with:', vid);
      verifyVoterId();
    }, 200);
  }

  // FORCE FRESH START ON KIOSK SCAN LINKS
  document.querySelectorAll('a[href="scan.html"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = 'scan.html?t=' + Date.now();
    });
  });

  // Check voting MODE first (is session open?) then status (is voting paused?)
  checkVotingMode();
  checkVotingStatus();
  loadCandidates();

  // Poll every 5 seconds for live updates
  setInterval(checkVotingMode, 5000);
  setInterval(checkVotingStatus, 3000);
});

// ============ PRE-VOTING MODE CHECK ============
let currentVotingStarted = false; // Global to track pre-voting state

async function checkVotingMode() {
  try {
    const resp = await fetch('/api/voting-mode');
    if (!resp.ok) return;
    const { votingStarted } = await resp.json();
    currentVotingStarted = votingStarted;

    const banner        = document.getElementById('preVotingBanner');
    const votingHeader  = document.getElementById('votingHeader');
    const votingMain    = document.getElementById('votingMain');
    const kioskNavLink  = document.getElementById('kioskNavLink');

    if (votingStarted) {
      // Voting is open — show full site
      if (banner)       banner.style.display = 'none';
      if (votingHeader) votingHeader.style.display = '';
      if (votingMain)   votingMain.style.display = '';
      if (kioskNavLink) kioskNavLink.style.display = '';
    } else {
      // Pre-voting mode — hide voting interface, show banner
      if (banner)       banner.style.display = 'block';
      if (votingHeader) votingHeader.style.display = 'none';
      if (votingMain)   votingMain.style.display = 'none';
      if (kioskNavLink) kioskNavLink.style.display = 'none';
      
      // Ensure the "paused" overlay doesn't show in pre-voting mode
      removeVotingPausedMessage();
    }
  } catch (e) {
    // silently fail — default shows full site
  }
}

// ============ CHECK VOTING STATUS ============
let isVotingActive = true;

async function checkVotingStatus() {
  try {
    const response = await fetch('/api/voting-status');
    const data = await response.json();
    const newStatus = data.isVotingActive;

    // Only show paused message if we are NOT in pre-voting mode
    if (currentVotingStarted) {
      // If status changed to inactive
      if (isVotingActive && !newStatus) {
        showVotingPausedMessage();
      } 
      // If status changed back to active
      else if (!isVotingActive && newStatus) {
        removeVotingPausedMessage();
      }
    }

    isVotingActive = newStatus;
  } catch (err) {
    console.error('Error checking voting status:', err);
  }
}

function showVotingPausedMessage() {
  if (document.getElementById('votingPausedOverlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'votingPausedOverlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(4, 9, 26, 0.95);
    backdrop-filter: blur(15px);
    z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    color: white; font-family: 'Outfit', sans-serif; text-align: center; padding: 20px;
    animation: fadeIn 0.5s ease;
  `;
  overlay.innerHTML = `
    <div style="background: rgba(244, 63, 94, 0.1); border: 1px solid rgba(244, 63, 94, 0.2); padding: 40px; border-radius: 30px; max-width: 600px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
      <div style="font-size: 5rem; margin-bottom: 1.5rem;">🛑</div>
      <h1 style="font-size: 3rem; margin-bottom: 1rem; color: #F43F5E; font-weight: 800; letter-spacing: -1px;">Voting Paused</h1>
      <p style="font-size: 1.25rem; color: #94A3B8; margin-bottom: 2rem; line-height: 1.6;">
        The election process has been temporarily halted by the administrator for verification.
      </p>
      <div style="padding: 15px 25px; border-radius: 12px; background: rgba(255,255,255,0.03); display: inline-flex; align-items: center; gap: 10px; margin-bottom: 30px;">
        <span class="pulse-dot"></span>
        <span style="font-size: 0.9rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Waiting for resumption...</span>
      </div>
      <div>
        <button onclick="showMonitorPanel()" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94A3B8; padding: 10px 20px; border-radius: 8px; font-family: 'Outfit', sans-serif; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;">
          🔒 Monitoring Access
        </button>
      </div>
    </div>
    <style>
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .pulse-dot { width: 8px; height: 8px; background: #3B82F6; border-radius: 50%; animation: pulse 1.5s infinite; }
      @keyframes pulse { 0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); } 70% { transform: scale(1.1); opacity: 0.3; box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); } 100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } }
    </style>
  `;
  document.body.appendChild(overlay);
}

function removeVotingPausedMessage() {
  const overlay = document.getElementById('votingPausedOverlay');
  if (overlay) {
    overlay.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    overlay.style.opacity = '0';
    overlay.style.transform = 'scale(1.1)';
    setTimeout(() => overlay.remove(), 500);
  }
}

// ============ RIPPLE EFFECT HELPER ============
function addRipple(btn, e) {
  const ripple = document.createElement('span');
  ripple.classList.add('ripple');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

// ============ LOADING STATE HELPERS ============
function setLoading(btn, text = 'Loading...') {
  btn.classList.add('loading');
  btn.dataset.originalText = btn.innerHTML;
  btn.innerHTML = `<span class="btn-loading"><span class="spinner"></span>${text}</span>`;
}

function clearLoading(btn) {
  btn.classList.remove('loading');
  btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
}

// ============ EVENT LISTENERS ============
verifyBtn.addEventListener('click', (e) => {
  addRipple(verifyBtn, e);
  verifyVoterId();
});

voterIdInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyVoterId();
});

submitBtn.addEventListener('click', (e) => {
  addRipple(submitBtn, e);
  submitVote();
});

adminPassword.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyAdminPassword();
});

monitorPasswordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyMonitorPassword();
});

// ============ VERIFY VOTER ID ============
async function verifyVoterId() {
  const voterId = voterIdInput.value.trim();

  if (!isVotingActive) {
    showError('Voting is currently paused. Please wait.');
    return;
  }

  if (!voterId) {
    showVoterIdError('Please enter your Voter ID');
    return;
  }

  setLoading(verifyBtn, 'Verifying...');

  try {
    const response = await fetch('/api/verify-voter-id', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voterId })
    });

    const data = await response.json();
    clearLoading(verifyBtn);

    if (response.ok) {
      verifiedVoterId = voterId;
      showVoterIdSuccess('Voter ID verified! Proceeding to voting...');

      setTimeout(() => {
        // Slide out the current section, then show voting section
        voterIdSection.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        voterIdSection.style.opacity = '0';
        voterIdSection.style.transform = 'translateX(-40px)';

        setTimeout(() => {
          voterIdSection.style.display = 'none';
          votingSection.style.display = 'block';
          votingSection.classList.add('section-enter');
          // Focus on rollNo since candidateName is a group of radios
          const rollNoInput = document.getElementById('rollNo');
          if (rollNoInput) rollNoInput.focus();
        }, 400);
      }, 1200);
    } else {
      showVoterIdError(data.message || 'Invalid Voter ID');
      
      // Auto-redirect to scanner after 3 seconds on duplicate/invalid scan
      if (response.status === 409 || response.status === 401) {
        setTimeout(() => {
          window.location.href = '/scan';
        }, 3000);
      }
    }
  } catch (error) {
    clearLoading(verifyBtn);
    showVoterIdError('Error verifying Voter ID');
    console.error('Error:', error);
  }
}

function showVoterIdSuccess(message) {
  voterIdSuccessMessage.textContent = '✓ ' + message;
  voterIdSuccessMessage.style.display = 'flex';
  voterIdErrorMessage.style.display = 'none';
}

function showVoterIdError(message) {
  voterIdErrorMessage.textContent = '✗ ' + message;
  voterIdErrorMessage.style.display = 'flex';
  voterIdSuccessMessage.style.display = 'none';
}

// ============ LOAD CANDIDATES ============
async function loadCandidates() {
  const container = document.getElementById('candidateListContainer');
  try {
    const resp = await fetch('/api/candidates');
    const candidates = await resp.json();
    
    if (resp.ok) {
      renderCandidatesList(candidates);
    } else {
      const errorMsg = candidates.error || candidates.message || 'Failed to load';
      container.innerHTML = `<div style="color: #fca5a5; padding: 20px; text-align: center;">Error: ${errorMsg}</div>`;
    }
  } catch (err) {
    container.innerHTML = `<div style="color: #fca5a5; padding: 20px; text-align: center;">Network Error: Failed to load candidates</div>`;
  }
}

function renderCandidatesList(candidates) {
  const container = document.getElementById('candidateListContainer');
  if (!candidates || candidates.length === 0) {
    container.innerHTML = '<div style="grid-column: 1/-1; color: #64748b; padding: 40px; text-align: center;">No candidates currently registered.</div>';
    return;
  }

  container.innerHTML = candidates.map((c, i) => `
    <label class="cand-card-label">
      <input type="radio" name="candidateName" value="${escapeHtml(c.name)}">
      <div class="cand-card" style="animation-delay: ${i * 0.1}s; height: 100%;">
        <div class="selection-indicator"></div>
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
    </label>
  `).join('');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============ SUBMIT VOTE ============
async function submitVote() {
  const selectedCandidate = document.querySelector('input[name="candidateName"]:checked');
  const candidateName = selectedCandidate ? selectedCandidate.value.trim() : '';
  const rollNo = document.getElementById('rollNo').value.trim();

  if (!isVotingActive) {
    showError('Voting is currently paused. Vote cannot be submitted.');
    return;
  }

  if (!candidateName || !rollNo) {
    showError('Please fill in all fields (Select a candidate and enter Roll No)');
    return;
  }

  setLoading(submitBtn, 'Submitting...');

  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        option: candidateName,
        name: rollNo,
        voterId: verifiedVoterId
      })
    });

    const data = await response.json();
    clearLoading(submitBtn);

    if (response.ok) {
      showSuccess('Vote recorded successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/scan';
      }, 800);
    } else {
      showError(data.message || 'Error submitting vote');
    }
  } catch (error) {
    clearLoading(submitBtn);
    showError('Error: Unable to submit vote');
    console.error('Error:', error);
  }
}

// ============ SHOW SUCCESS MESSAGE ============
function showSuccess(message) {
  successMessage.textContent = '✓ ' + message;
  successMessage.style.display = 'flex';
  errorMessage.style.display = 'none';

  setTimeout(() => {
    successMessage.style.animation = 'none';
    successMessage.style.transition = 'opacity 0.4s ease';
    successMessage.style.opacity = '0';
    setTimeout(() => {
      successMessage.style.display = 'none';
      successMessage.style.opacity = '';
      successMessage.style.transition = '';
      successMessage.style.animation = '';
    }, 400);
  }, 4000);
}

// ============ SHOW ERROR MESSAGE ============
function showError(message) {
  errorMessage.textContent = '✗ ' + message;
  errorMessage.style.display = 'flex';
  successMessage.style.display = 'none';

  setTimeout(() => {
    errorMessage.style.transition = 'opacity 0.4s ease';
    errorMessage.style.opacity = '0';
    setTimeout(() => {
      errorMessage.style.display = 'none';
      errorMessage.style.opacity = '';
      errorMessage.style.transition = '';
    }, 400);
  }, 4000);
}

// ============ ADMIN AUTHENTICATION ============
function showAdminPanel() {
  adminModal.style.display = 'flex';
  adminPassword.value = '';
  adminMessage.style.display = 'none';
  // small delay so display:flex applies before animation starts
  requestAnimationFrame(() => adminPassword.focus());
}

function closeAdminPanel() {
  const content = adminModal.querySelector('.modal-content');
  content.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  content.style.transform = 'translateY(30px) scale(0.95)';
  content.style.opacity = '0';
  setTimeout(() => {
    adminModal.style.display = 'none';
    content.style.transform = '';
    content.style.opacity = '';
    content.style.transition = '';
    adminPassword.value = '';
    adminMessage.style.display = 'none';
  }, 300);
}

async function verifyAdminPassword() {
  const password = adminPassword.value;

  if (!password) {
    showAdminError('Please enter the admin password');
    return;
  }

  try {
    const response = await fetch(`/api/all-votes?password=${encodeURIComponent(password)}`);
    const data = await response.json();

    if (response.ok) {
      sessionStorage.setItem('adminPassword', password);
      adminMessage.textContent = '✓ Password verified! Redirecting...';
      adminMessage.style.display = 'flex';
      adminMessage.style.color = '#155724';
      adminMessage.style.background = 'linear-gradient(135deg, #d4edda, #c3f4d5)';
      adminMessage.style.border = '1px solid #c3e6cb';
      adminMessage.style.padding = '15px';
      adminMessage.style.borderRadius = '10px';

      setTimeout(() => {
        window.location.href = '/admin.html';
      }, 1000);
    } else {
      showAdminError(data.message || 'Invalid password');
    }
  } catch (error) {
    showAdminError('Error verifying password');
    console.error('Error:', error);
  }
}

function showAdminError(message) {
  adminMessage.innerHTML = '✗ ' + message;
  adminMessage.style.display = 'flex';
  adminMessage.style.color = '#721c24';
  adminMessage.style.background = 'linear-gradient(135deg, #f8d7da, #fde0e3)';
  adminMessage.style.border = '1px solid #f5c6cb';
  adminMessage.style.padding = '15px';
  adminMessage.style.borderRadius = '10px';
  // Re-trigger shake animation
  adminMessage.style.animation = 'none';
  requestAnimationFrame(() => {
    adminMessage.style.animation = 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both, shake 0.4s ease 0.1s both';
  });
}

// ============ MONITORING PANEL AUTHENTICATION ============
function showMonitorPanel() {
  monitorModal.style.display = 'flex';
  monitorPasswordInput.value = '';
  monitorMessage.style.display = 'none';
  requestAnimationFrame(() => monitorPasswordInput.focus());
}

function closeMonitorPanel() {
  const content = monitorModal.querySelector('.modal-content');
  content.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  content.style.transform = 'translateY(30px) scale(0.95)';
  content.style.opacity = '0';
  setTimeout(() => {
    monitorModal.style.display = 'none';
    content.style.transform = '';
    content.style.opacity = '';
    content.style.transition = '';
    monitorPasswordInput.value = '';
    monitorMessage.style.display = 'none';
  }, 300);
}

async function verifyMonitorPassword() {
  const password = monitorPasswordInput.value;

  if (!password) {
    showMonitorError('Please enter the monitoring password');
    return;
  }

  try {
    const response = await fetch(`/api/all-votes?password=${encodeURIComponent(password)}`);
    const data = await response.json();

    if (response.ok) {
      sessionStorage.setItem('monitorPassword', password);
      monitorMessage.textContent = '✓ Password verified! Redirecting...';
      monitorMessage.style.display = 'flex';
      monitorMessage.className = 'message success';
      monitorMessage.style.color = '#155724';
      monitorMessage.style.background = 'linear-gradient(135deg, #d4edda, #c3f4d5)';
      monitorMessage.style.border = '1px solid #c3e6cb';
      monitorMessage.style.padding = '15px';
      monitorMessage.style.borderRadius = '10px';

      setTimeout(() => {
        window.location.href = '/monitor.html';
      }, 1000);
    } else {
      showMonitorError(data.message || 'Invalid password');
    }
  } catch (error) {
    showMonitorError('Error verifying password');
    console.error('Error:', error);
  }
}

function showMonitorError(message) {
  monitorMessage.innerHTML = '✗ ' + message;
  monitorMessage.style.display = 'flex';
  monitorMessage.style.color = '#721c24';
  monitorMessage.style.background = 'linear-gradient(135deg, #f8d7da, #fde0e3)';
  monitorMessage.style.border = '1px solid #f5c6cb';
  monitorMessage.style.padding = '15px';
  monitorMessage.style.borderRadius = '10px';
  monitorMessage.style.animation = 'none';
  requestAnimationFrame(() => {
    monitorMessage.style.animation = 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both, shake 0.4s ease 0.1s both';
  });
}

// ============ CLOSE MODALS ON OUTSIDE CLICK ============
window.addEventListener('click', (e) => {
  if (e.target === adminModal) {
    closeAdminPanel();
  }
  if (e.target === monitorModal) {
    closeMonitorPanel();
  }
  if (e.target === document.getElementById('qrScannerModal')) {
    closeQRScanner();
  }
});

// ============ QR CODE SCANNER ============
let html5QrScanner = null;

function openQRScanner() {
  const modal = document.getElementById('qrScannerModal');
  modal.style.display = 'flex';
  document.getElementById('qrScanStatus').textContent = 'Starting camera...';
  startCameraScanner();
}

function startCameraScanner() {
  if (html5QrScanner) {
    html5QrScanner.stop().catch(() => {}).finally(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
      initCamera();
    });
  } else {
    initCamera();
  }
}

function initCamera() {
  html5QrScanner = new Html5Qrcode('qrScannerPreview');

  Html5Qrcode.getCameras().then(cameras => {
    if (!cameras || cameras.length === 0) {
      showUploadFallback('No camera found. Upload your QR image instead.');
      return;
    }

    // Prefer back camera, otherwise use first available
    const cam = cameras.find(c => c.label.toLowerCase().includes('back')) || cameras[0];

    html5QrScanner.start(
      { deviceId: { exact: cam.id } },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => handleQRScan(decodedText),
      () => { /* Suppress frame scan errors */ }
    ).then(() => {
      document.getElementById('qrScanStatus').textContent = '🔍 Scanning... Hold your QR code steady.';
    }).catch(err => {
      showUploadFallback('Camera unavailable. Upload your QR image instead.');
    });
  }).catch(err => {
    showUploadFallback('Camera access denied. Upload your QR image instead.');
  });
}

function showUploadFallback(message) {
  // Stop camera if running
  if (html5QrScanner) {
    html5QrScanner.stop().catch(() => {});
  }

  const statusEl = document.getElementById('qrScanStatus');
  statusEl.innerHTML = `
    <div style="color:#fbbf24; margin-bottom:12px; font-size:0.9rem;">⚠️ ${message}</div>
    <label for="qrFileUpload" style="
      display:inline-block; padding:12px 24px; border-radius:10px;
      background:linear-gradient(135deg,rgba(37,99,235,0.25),rgba(59,130,246,0.1));
      border:1px solid rgba(59,130,246,0.4); color:#93c5fd;
      font-size:0.95rem; font-weight:700; cursor:pointer;
      transition:all 0.3s ease; font-family:var(--font-body);">
      📁 Upload QR Image
    </label>
    <input type="file" id="qrFileUpload" accept="image/*"
      style="display:none;" onchange="scanUploadedQR(event)">
    <div style="color:#64748b; font-size:0.8rem; margin-top:8px;">
      Upload the QR image you downloaded from "My QR" page
    </div>
  `;
  // Clear the preview
  document.getElementById('qrScannerPreview').innerHTML = '';
}

function scanUploadedQR(event) {
  const file = event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('qrScanStatus');
  statusEl.innerHTML = '<span style="color:#93c5fd;">🔄 Reading QR code...</span>';

  const scanner = new Html5Qrcode('qrScannerPreview');
  scanner.scanFile(file, true)
    .then(decodedText => {
      scanner.clear();
      handleQRScan(decodedText);
    })
    .catch(err => {
      scanner.clear();
      statusEl.innerHTML = `
        <div style="color:#fca5a5; margin-bottom:12px;">❌ Could not read QR code from image. Make sure it's the correct QR file.</div>
        <label for="qrFileUpload" style="
          display:inline-block; padding:12px 24px; border-radius:10px;
          background:linear-gradient(135deg,rgba(37,99,235,0.25),rgba(59,130,246,0.1));
          border:1px solid rgba(59,130,246,0.4); color:#93c5fd;
          font-size:0.95rem; font-weight:700; cursor:pointer;
          font-family:var(--font-body);">
          📁 Try Another Image
        </label>
        <input type="file" id="qrFileUpload" accept="image/*"
          style="display:none;" onchange="scanUploadedQR(event)">
      `;
    });
}

function handleQRScan(decodedText) {
  let voterId = '';
  const lines = decodedText.split('\n');
  for (const line of lines) {
    const match = line.match(/^Voter ID:\s*(.+)$/i);
    if (match) { voterId = match[1].trim(); break; }
  }

  if (!voterId) {
    document.getElementById('qrScanStatus').textContent = '⚠️ QR code not recognized. Use your official Voting Machine QR.';
    return;
  }

  closeQRScanner();
  document.getElementById('voterIdInput').value = voterId;

  // Green flash on the input field
  const input = document.getElementById('voterIdInput');
  input.style.transition = 'box-shadow 0.3s ease';
  input.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.4)';
  setTimeout(() => { input.style.boxShadow = ''; }, 1500);

  // Auto-trigger verification
  setTimeout(() => verifyVoterId(), 600);
}

function closeQRScanner() {
  document.getElementById('qrScannerModal').style.display = 'none';
  if (html5QrScanner) {
    html5QrScanner.stop().catch(() => {}).finally(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    });
  }
}

