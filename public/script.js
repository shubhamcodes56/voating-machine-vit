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

// ============ EVENT LISTENERS ============
verifyBtn.addEventListener('click', verifyVoterId);
voterIdInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyVoterId();
});
submitBtn.addEventListener('click', submitVote);
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

  try {
    const response = await fetch('/api/verify-voter-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ voterId })
    });

    const data = await response.json();

    if (response.ok) {
      // Store verified voter ID
      verifiedVoterId = voterId;
      showVoterIdSuccess('Voter ID verified! Proceeding to voting...');
      
      setTimeout(() => {
        // Hide voter ID section and show voting form
        voterIdSection.style.display = 'none';
        votingSection.style.display = 'block';
        document.getElementById('candidateName').focus();
      }, 1500);
    } else {
      showVoterIdError(data.message || 'Invalid Voter ID');
    }
  } catch (error) {
    showVoterIdError('Error verifying Voter ID');
    console.error('Error:', error);
  }
}

function showVoterIdSuccess(message) {
  voterIdSuccessMessage.textContent = '✓ ' + message;
  voterIdSuccessMessage.style.display = 'block';
  voterIdErrorMessage.style.display = 'none';
}

function showVoterIdError(message) {
  voterIdErrorMessage.textContent = '✗ ' + message;
  voterIdErrorMessage.style.display = 'block';
  voterIdSuccessMessage.style.display = 'none';
}

// ============ SUBMIT VOTE ============
async function submitVote() {
  // Get candidate name and roll no
  const candidateName = document.getElementById('candidateName').value.trim();
  const rollNo = document.getElementById('rollNo').value.trim();
  
  if (!candidateName || !rollNo) {
    showError('Please fill in all fields');
    return;
  }

  try {
    const response = await fetch('/api/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        option: candidateName,
        name: rollNo,
        voterId: verifiedVoterId
      })
    });

    const data = await response.json();

    if (response.ok) {
      showSuccess('Vote recorded successfully!');
      
      // Reset form
      document.getElementById('candidateName').value = '';
      document.getElementById('rollNo').value = '';
      document.getElementById('candidateName').focus();
    } else {
      showError(data.message || 'Error submitting vote');
    }
  } catch (error) {
    showError('Error: Unable to submit vote');
    console.error('Error:', error);
  }
}

// ============ SHOW SUCCESS MESSAGE ============
function showSuccess(message) {
  successMessage.textContent = '✓ ' + message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';
  
  setTimeout(() => {
    successMessage.style.display = 'none';
  }, 4000);
}

// ============ SHOW ERROR MESSAGE ============
function showError(message) {
  errorMessage.textContent = '✗ ' + message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';
  
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 4000);
}

// ============ ADMIN AUTHENTICATION ============
function showAdminPanel() {
  adminModal.style.display = 'flex';
  adminPassword.focus();
  adminPassword.value = '';
  adminMessage.style.display = 'none';
}

function closeAdminPanel() {
  adminModal.style.display = 'none';
  adminPassword.value = '';
  adminMessage.style.display = 'none';
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
      // Password is correct, save it to session and redirect
      sessionStorage.setItem('adminPassword', password);
      adminMessage.textContent = '✓ Password verified! Redirecting...';
      adminMessage.style.display = 'block';
      adminMessage.style.color = '#155724';
      adminMessage.style.background = '#d4edda';
      
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
  adminMessage.style.display = 'block';
  adminMessage.style.color = '#721c24';
  adminMessage.style.background = '#f8d7da';
  adminMessage.style.border = '1px solid #f5c6cb';
  adminMessage.style.padding = '15px';
  adminMessage.style.borderRadius = '8px';
}

// ============ CLOSE MODALS ON OUTSIDE CLICK ============
window.addEventListener('click', (e) => {
  if (e.target === adminModal) {
    closeAdminPanel();
  }
});
