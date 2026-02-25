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

// ============ GLOBAL VARIABLES ============
let verifiedVoterId = '';

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

// ============ VERIFY VOTER ID ============
async function verifyVoterId() {
  const voterId = voterIdInput.value.trim();

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
          document.getElementById('candidateName').focus();
        }, 400);
      }, 1200);
    } else {
      showVoterIdError(data.message || 'Invalid Voter ID');
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

// ============ SUBMIT VOTE ============
async function submitVote() {
  const candidateName = document.getElementById('candidateName').value.trim();
  const rollNo = document.getElementById('rollNo').value.trim();

  if (!candidateName || !rollNo) {
    showError('Please fill in all fields');
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
        window.location.reload();
      }, 2000);
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

// ============ CLOSE MODALS ON OUTSIDE CLICK ============
window.addEventListener('click', (e) => {
  if (e.target === adminModal) {
    closeAdminPanel();
  }
});
