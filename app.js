/* ============================================================
   Cloud Sphere — Application Logic
   ============================================================ */

(() => {
  'use strict';

  // ─── State ───────────────────────────────────────────────
  const STORAGE_KEY = 'cloudSphereUsers';
  const SESSION_KEY = 'cloudSphereSession';
  let currentUser = null;
  let uploadedFiles = [];       // Array of { id, name, type, size, dataUrl, uploadedAt }
  let pendingFiles  = [];       // Files staged for upload
  let isListView    = false;

  // ─── DOM References ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const pages = {
    login:     $('#page-login'),
    signup:    $('#page-signup'),
    dashboard: $('#page-dashboard'),
  };

  // Login
  const loginForm     = $('#login-form');
  const loginEmail    = $('#login-email');
  const loginPassword = $('#login-password');
  const loginBtn      = $('#login-btn');

  // Signup
  const signupForm     = $('#signup-form');
  const signupName     = $('#signup-name');
  const signupEmail    = $('#signup-email');
  const signupPassword = $('#signup-password');
  const signupBtn      = $('#signup-btn');

  // Dashboard
  const welcomeHeading   = $('#welcome-heading');
  const avatarInitials   = $('#avatar-initials');
  const profileNameDisp  = $('#profile-name-display');
  const logoutBtn        = $('#logout-btn');
  const statFiles        = $('#stat-files');
  const statSize         = $('#stat-size');

  // Upload
  const dropZone       = $('#drop-zone');
  const fileInput      = $('#file-input');
  const uploadPreview  = $('#upload-preview');
  const uploadBtn      = $('#upload-btn');
  const uploadToast    = $('#upload-toast');

  // Files
  const filesEmpty   = $('#files-empty');
  const filesGrid    = $('#files-grid');
  const viewGridBtn  = $('#view-grid');
  const viewListBtn  = $('#view-list');

  // Global toast
  const globalToast = $('#global-toast');

  // ─── Helpers ─────────────────────────────────────────────
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  function getSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch { return null; }
  }

  function saveSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function getFileExtension(name) {
    const parts = name.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }

  function getFileTypeClass(ext) {
    const map = {
      jpg: 'ft-image', jpeg: 'ft-image', png: 'ft-image', gif: 'ft-image',
      webp: 'ft-image', svg: 'ft-image', bmp: 'ft-image', ico: 'ft-image',
      pdf: 'ft-pdf',
      doc: 'ft-doc', docx: 'ft-doc',
      xls: 'ft-sheet', xlsx: 'ft-sheet', csv: 'ft-sheet',
      ppt: 'ft-ppt', pptx: 'ft-ppt',
      txt: 'ft-text', md: 'ft-text', rtf: 'ft-text',
    };
    return map[ext] || 'ft-other';
  }

  function getFileTypeLabel(ext) {
    const map = {
      jpg: 'JPG', jpeg: 'JPG', png: 'PNG', gif: 'GIF', webp: 'WEBP',
      svg: 'SVG', bmp: 'BMP', ico: 'ICO',
      pdf: 'PDF',
      doc: 'DOC', docx: 'DOCX',
      xls: 'XLS', xlsx: 'XLSX', csv: 'CSV',
      ppt: 'PPT', pptx: 'PPTX',
      txt: 'TXT', md: 'MD', rtf: 'RTF',
    };
    return map[ext] || ext.toUpperCase() || 'FILE';
  }

  function getFileIcon(ext) {
    const isImage = ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext);
    if (isImage) return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
    if (ext === 'pdf') return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`;
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  }

  // ─── Toast ───────────────────────────────────────────────
  let toastTimer = null;
  function showGlobalToast(message, type = 'success', duration = 3500) {
    clearTimeout(toastTimer);
    globalToast.textContent = message;
    globalToast.className = 'global-toast show ' + type;
    toastTimer = setTimeout(() => {
      globalToast.classList.remove('show');
    }, duration);
  }

  // ─── Page Navigation ────────────────────────────────────
  function showPage(pageName) {
    Object.values(pages).forEach(p => p.classList.remove('active'));
    const target = pages[pageName];
    if (target) {
      target.classList.add('active');
      // Re-trigger entrance animations
      target.querySelectorAll('.animate-in').forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; // trigger reflow
        el.style.animation = '';
      });
    }
  }

  // ─── Validation ──────────────────────────────────────────
  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => {
      el.textContent = '';
      el.classList.remove('visible');
    });
    form.querySelectorAll('.input-wrapper').forEach(el => {
      el.classList.remove('error');
    });
  }

  function showFieldError(inputId, message) {
    const errorEl = $(`#${inputId}-error`);
    const wrapper = $(`#${inputId}`).closest('.input-wrapper');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
    if (wrapper) wrapper.classList.add('error');
  }

  // ─── Login ──────────────────────────────────────────────
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(loginForm);

    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    let valid = true;

    if (!email) {
      showFieldError('login-email', 'Email is required');
      valid = false;
    } else if (!isValidEmail(email)) {
      showFieldError('login-email', 'Enter a valid email address');
      valid = false;
    }

    if (!password) {
      showFieldError('login-password', 'Password is required');
      valid = false;
    }

    if (!valid) return;

    // Simulate loading
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;

    setTimeout(() => {
      const users = getUsers();
      const user = users.find(u => u.email === email && u.password === password);

      loginBtn.classList.remove('loading');
      loginBtn.disabled = false;

      if (!user) {
        showFieldError('login-password', 'Invalid email or password');
        return;
      }

      currentUser = user;
      saveSession(user);
      loadDashboard();
      showPage('dashboard');
      showGlobalToast(`Welcome back, ${user.name}!`, 'success');
    }, 800);
  });

  // ─── Sign Up ─────────────────────────────────────────────
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors(signupForm);

    const name     = signupName.value.trim();
    const email    = signupEmail.value.trim();
    const password = signupPassword.value;
    let valid = true;

    if (!name) {
      showFieldError('signup-name', 'Name is required');
      valid = false;
    }

    if (!email) {
      showFieldError('signup-email', 'Email is required');
      valid = false;
    } else if (!isValidEmail(email)) {
      showFieldError('signup-email', 'Enter a valid email address');
      valid = false;
    }

    if (!password) {
      showFieldError('signup-password', 'Password is required');
      valid = false;
    } else if (password.length < 6) {
      showFieldError('signup-password', 'Password must be at least 6 characters');
      valid = false;
    }

    if (!valid) return;

    signupBtn.classList.add('loading');
    signupBtn.disabled = true;

    setTimeout(() => {
      const users = getUsers();

      if (users.find(u => u.email === email)) {
        signupBtn.classList.remove('loading');
        signupBtn.disabled = false;
        showFieldError('signup-email', 'An account with this email already exists');
        return;
      }

      const newUser = { id: Date.now(), name, email, password };
      users.push(newUser);
      saveUsers(users);

      signupBtn.classList.remove('loading');
      signupBtn.disabled = false;

      // Clear form
      signupForm.reset();

      // Switch to login
      showPage('login');
      loginEmail.value = email;
      showGlobalToast('Account created! Please sign in.', 'success');
    }, 800);
  });

  // ─── Nav links ───────────────────────────────────────────
  $('#goto-signup').addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.reset();
    clearErrors(loginForm);
    showPage('signup');
  });

  $('#goto-login').addEventListener('click', (e) => {
    e.preventDefault();
    signupForm.reset();
    clearErrors(signupForm);
    showPage('login');
  });

  // ─── Password toggle ────────────────────────────────────
  $$('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const wrapper = btn.closest('.input-wrapper');
      const input   = wrapper.querySelector('input');
      const open    = btn.querySelector('.eye-open');
      const closed  = btn.querySelector('.eye-closed');
      if (input.type === 'password') {
        input.type = 'text';
        open.style.display = 'none';
        closed.style.display = 'block';
      } else {
        input.type = 'password';
        open.style.display = 'block';
        closed.style.display = 'none';
      }
    });
  });

  // ─── Logout ──────────────────────────────────────────────
  logoutBtn.addEventListener('click', () => {
    currentUser = null;
    uploadedFiles = [];
    pendingFiles = [];
    clearSession();
    loginForm.reset();
    showPage('login');
    showGlobalToast('You have been logged out', 'info');
  });

  // ─── Dashboard Setup ────────────────────────────────────
  function loadDashboard() {
    if (!currentUser) return;
    welcomeHeading.textContent = `Welcome to Cloud Sphere, ${currentUser.name}`;
    avatarInitials.textContent = getInitials(currentUser.name);
    profileNameDisp.textContent = currentUser.name;

    // Load files from localStorage per user
    const storedFiles = localStorage.getItem(`csFiles_${currentUser.id}`);
    uploadedFiles = storedFiles ? JSON.parse(storedFiles) : [];
    renderFiles();
    updateStats();
    clearUploadPreview();
  }

  function saveFiles() {
    if (!currentUser) return;
    localStorage.setItem(`csFiles_${currentUser.id}`, JSON.stringify(uploadedFiles));
  }

  function updateStats() {
    statFiles.textContent = uploadedFiles.length;
    const totalBytes = uploadedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
    statSize.textContent = formatSize(totalBytes);
  }

  // ─── Drag & Drop & File Selection ───────────────────────
  dropZone.addEventListener('click', () => fileInput.click());

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = ''; // allow re-selecting same file
  });

  function handleFiles(fileList) {
    if (!fileList.length) return;
    for (const file of fileList) {
      // Prevent duplicates in pending
      if (!pendingFiles.find(f => f.name === file.name && f.size === file.size)) {
        pendingFiles.push(file);
      }
    }
    renderUploadPreview();
    uploadBtn.disabled = pendingFiles.length === 0;
  }

  function renderUploadPreview() {
    uploadPreview.innerHTML = '';
    pendingFiles.forEach((file, idx) => {
      const ext = getFileExtension(file.name);
      const chip = document.createElement('div');
      chip.className = 'preview-chip';
      chip.innerHTML = `
        <div class="file-type-badge ${getFileTypeClass(ext)}">${getFileTypeLabel(ext)}</div>
        <span>${file.name.length > 24 ? file.name.slice(0, 22) + '…' : file.name}</span>
        <span style="color:var(--text-muted);font-size:0.72rem">(${formatSize(file.size)})</span>
        <button class="remove-file" data-idx="${idx}" title="Remove">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      uploadPreview.appendChild(chip);
    });

    // Attach remove handlers
    uploadPreview.querySelectorAll('.remove-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.idx);
        pendingFiles.splice(idx, 1);
        renderUploadPreview();
        uploadBtn.disabled = pendingFiles.length === 0;
      });
    });
  }

  function clearUploadPreview() {
    pendingFiles = [];
    uploadPreview.innerHTML = '';
    uploadBtn.disabled = true;
    uploadToast.classList.remove('show');
    uploadToast.textContent = '';
  }

  // ─── Upload ──────────────────────────────────────────────
  uploadBtn.addEventListener('click', () => {
    if (pendingFiles.length === 0) return;

    uploadBtn.classList.add('loading');
    uploadBtn.disabled = true;

    const readers = pendingFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: reader.result,
            uploadedAt: new Date().toISOString(),
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newFiles => {
      // Simulate network delay
      setTimeout(() => {
        uploadedFiles.push(...newFiles);
        saveFiles();
        renderFiles();
        updateStats();

        uploadBtn.classList.remove('loading');
        clearUploadPreview();

        // Show success toast
        uploadToast.textContent = `✓ ${newFiles.length} file${newFiles.length > 1 ? 's' : ''} uploaded successfully`;
        uploadToast.classList.add('show');
        setTimeout(() => uploadToast.classList.remove('show'), 4000);

        showGlobalToast('File uploaded successfully', 'success');
      }, 600);
    });
  });

  // ─── Render Files ────────────────────────────────────────
  function renderFiles() {
    if (uploadedFiles.length === 0) {
      filesEmpty.style.display = 'block';
      filesGrid.innerHTML = '';
      return;
    }

    filesEmpty.style.display = 'none';
    filesGrid.innerHTML = '';

    uploadedFiles.forEach((file, idx) => {
      const ext = getFileExtension(file.name);
      const card = document.createElement('div');
      card.className = 'file-card';
      card.style.animationDelay = `${idx * 0.05}s`;

      card.innerHTML = `
        <div class="file-card-icon ${getFileTypeClass(ext)}">
          ${getFileIcon(ext)}
        </div>
        <div class="file-card-info">
          <div class="file-card-name" title="${file.name}">${file.name}</div>
          <div class="file-card-meta">${getFileTypeLabel(ext)} · ${formatSize(file.size)}</div>
        </div>
        <div class="file-card-actions">
          <button class="file-action-btn view-btn-action" data-idx="${idx}" title="View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button class="file-action-btn download-btn" data-idx="${idx}" title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Save
          </button>
          <button class="file-action-btn delete-btn" data-idx="${idx}" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      `;

      filesGrid.appendChild(card);
    });

    // Attach event listeners
    filesGrid.querySelectorAll('.view-btn-action').forEach(btn => {
      btn.addEventListener('click', () => openPreview(parseInt(btn.dataset.idx)));
    });

    filesGrid.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', () => downloadFile(parseInt(btn.dataset.idx)));
    });

    filesGrid.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteFile(parseInt(btn.dataset.idx)));
    });
  }

  // ─── File Actions ────────────────────────────────────────
  function downloadFile(idx) {
    const file = uploadedFiles[idx];
    if (!file) return;
    const a = document.createElement('a');
    a.href = file.dataUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showGlobalToast(`Downloading ${file.name}`, 'info');
  }

  function deleteFile(idx) {
    const file = uploadedFiles[idx];
    if (!file) return;
    uploadedFiles.splice(idx, 1);
    saveFiles();
    renderFiles();
    updateStats();
    showGlobalToast(`"${file.name}" deleted`, 'error', 2500);
  }

  function openPreview(idx) {
    const file = uploadedFiles[idx];
    if (!file) return;
    const ext = getFileExtension(file.name);
    const isImage = ['jpg','jpeg','png','gif','webp','svg','bmp','ico'].includes(ext);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${file.name}</h3>
          <button class="modal-close" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-preview">
          ${isImage
            ? `<img src="${file.dataUrl}" alt="${file.name}">`
            : `<div class="modal-no-preview">
                 <div class="file-card-icon ${getFileTypeClass(ext)}" style="width:80px;height:80px;border-radius:16px;margin:0 auto 16px;font-size:1rem;">
                   ${getFileIcon(ext)}
                 </div>
                 <p style="font-size:1rem;font-weight:500;color:var(--text-secondary);">${file.name}</p>
                 <p style="margin-top:6px;">${getFileTypeLabel(ext)} · ${formatSize(file.size)}</p>
                 <button class="btn btn-primary" style="margin-top:20px;" id="modal-download">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   Download File
                 </button>
               </div>`
          }
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    overlay.querySelector('.modal-close').addEventListener('click', () => {
      overlay.style.animation = 'fadeIn 0.2s ease reverse';
      setTimeout(() => overlay.remove(), 200);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => overlay.remove(), 200);
      }
    });

    // Modal download button
    const modalDl = overlay.querySelector('#modal-download');
    if (modalDl) {
      modalDl.addEventListener('click', () => downloadFile(idx));
    }

    // ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => overlay.remove(), 200);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // ─── View Toggle ─────────────────────────────────────────
  viewGridBtn.addEventListener('click', () => {
    isListView = false;
    viewGridBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    filesGrid.classList.remove('list-view');
  });

  viewListBtn.addEventListener('click', () => {
    isListView = true;
    viewListBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    filesGrid.classList.add('list-view');
  });

  // ─── Session Restore ────────────────────────────────────
  function init() {
    const session = getSession();
    if (session) {
      currentUser = session;
      loadDashboard();
      showPage('dashboard');
    } else {
      showPage('login');
    }
  }

  init();
})();
