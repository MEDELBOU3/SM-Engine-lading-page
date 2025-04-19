document.addEventListener('DOMContentLoaded', function() {

    // --- Firebase Configuration ---
     const firebaseConfig = {
       apiKey: "AIzaSyDp2V0ULE-32AcIJ92a_e3mhMe6f6yZ_H4",
       authDomain: "sm4movies.firebaseapp.com",
       projectId: "sm4movies",
       storageBucket: "sm4movies.firebasestorage.app",
       messagingSenderId: "277353836953",
       appId: "1:277353836953:web:85e02783526c7cb58de308",
       measurementId: "G-690RSNJ2Q2"
    };

    // --- Initialize Firebase ---
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app();
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage(); // Initialize Storage
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // --- Constants ---
    const DEFAULT_AVATAR_URL = 'images/default-avatar.png'; // Path to your default avatar

    // --- DOM Element References ---
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const settingsBtn = document.getElementById('settingsBtn'); // Navbar settings button
    const userProfileDiv = document.getElementById('userProfile');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatarNav = document.getElementById('userAvatarNav');
    const mobileAuthLinks = document.getElementById('mobileAuthLinks');
    const mobileSettingsLink = document.getElementById('mobileSettingsLink');
    const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');

    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const settingsModal = document.getElementById('settingsModal'); // Settings modal
    const closeLogin = document.getElementById('closeLogin');
    const closeSignup = document.getElementById('closeSignup');
    const closeSettings = document.getElementById('closeSettings'); // Close settings modal
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    const googleSignInBtnLogin = document.getElementById('googleSignInBtnLogin');
    const googleSignInBtnSignup = document.getElementById('googleSignInBtnSignup');

    // Settings Modal Elements
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
    const avatarUploadStatus = document.getElementById('avatarUploadStatus');
    const settingsDisplayNameInput = document.getElementById('settingsDisplayName');

    // Chat Elements
    const chatAreaWrapper = document.getElementById('chatAreaWrapper');
    const chatArea = document.getElementById('chatArea');
    const chatMessagesDiv = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInputAvatar = document.getElementById('chatInputAvatar');
    const chatLoginPrompt = document.getElementById('chatLoginPrompt');
    const chatLoginLinkBtn = document.getElementById('chatLoginLinkBtn'); // Button in prompt
    const chatSignupLinkBtn = document.getElementById('chatSignupLinkBtn'); // Button in prompt
    const chatError = document.getElementById('chatError');


    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const currentYearSpan = document.getElementById('currentYear');

    // --- State Variables ---
    let currentUser = null;
    let messagesListener = null;
    let isUploadingAvatar = false;

    // --- Helper Functions ---
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str || '')); // Handle null/undefined input
        return div.innerHTML;
    }

    function formatTimestamp(timestamp) {
        if (!timestamp?.toDate) return 'Sending...';
        const date = timestamp.toDate();
        // Optional: Use date-fns if included via CDN
        if (typeof dateFns !== 'undefined') {
             const now = new Date();
             const diffHours = dateFns.differenceInHours(now, date);
             if (diffHours < 24) {
                 return dateFns.formatDistanceToNowStrict(date, { addSuffix: true });
             } else {
                 return dateFns.format(date, 'PPp'); // e.g., Sep 21, 2023, 1:30 PM
             }
        } else {
            // Basic fallback formatting
            const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            const day = date.toLocaleDateString();
            return `${time}, ${day}`;
        }
    }

     // --- UI Update Functions ---
    function showModal(modal) {
        clearErrorMessages(); // Clear errors when showing any modal
        modal.classList.add('show');
        // Trigger AOS animation for modal content if AOS is used
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent && typeof AOS !== 'undefined') {
            AOS.refreshHard([modalContent]); // Re-trigger animation for this specific element
        }
    }

    function hideModal(modal) {
        modal.classList.remove('show');
        // Optional: Reset forms when hiding
        const form = modal.querySelector('form');
        if (form) form.reset();
        // Clear avatar upload status on close
         if (modal === settingsModal) {
             avatarUploadStatus.textContent = '';
             avatarUploadStatus.className = 'upload-status-message';
             avatarUploadInput.value = ''; // Reset file input
         }
    }

    function clearErrorMessages() {
        loginError.textContent = '';
        signupError.textContent = '';
        chatError.textContent = ''; // Clear chat error too
        avatarUploadStatus.textContent = ''; // Clear upload status
         avatarUploadStatus.className = 'upload-status-message';
    }

     function updateNavUI(user) {
        // Desktop Nav
        if (user) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            userProfileDiv.style.display = 'flex';
            // Use displayName, fallback to 'User' if somehow null/empty after signup logic
            userNameDisplay.textContent = user.displayName || 'User';
            // Use photoURL, fallback to default
            userAvatarNav.src = user.photoURL || DEFAULT_AVATAR_URL;
             userAvatarNav.onerror = () => { userAvatarNav.src = DEFAULT_AVATAR_URL; }; // Fallback if image load fails
        } else {
            loginBtn.style.display = 'inline-block';
            signupBtn.style.display = 'inline-block';
            userProfileDiv.style.display = 'none';
        }

        // Mobile Nav
        mobileAuthLinks.innerHTML = ''; // Clear previous
         mobileSettingsLink.style.display = user ? 'block' : 'none'; // Show/hide settings link

        if (user) {
             // Display user info in mobile nav
            const mobileProfile = document.createElement('li');
            mobileProfile.className = 'mobile-user-info'; // Add class for potential styling
            mobileProfile.innerHTML = `
                <img src="${user.photoURL || DEFAULT_AVATAR_URL}" alt="Avatar" class="mobile-nav-avatar">
                <span>Hi, ${escapeHTML(user.displayName || 'User')}</span>
            `;
            mobileProfile.querySelector('img').onerror = (e) => { e.target.src = DEFAULT_AVATAR_URL; };
             mobileAuthLinks.appendChild(mobileProfile);


            const mobileLogoutBtn = document.createElement('li');
            mobileLogoutBtn.innerHTML = `<button id="mobileLogoutBtn" class="btn btn-secondary btn-block">Logout</button>`;
            mobileAuthLinks.appendChild(mobileLogoutBtn);
            document.getElementById('mobileLogoutBtn').addEventListener('click', handleLogout);

        } else {
             // Add login/signup buttons
            const mobileLoginBtn = document.createElement('li');
            mobileLoginBtn.innerHTML = `<button id="mobileLoginBtn" class="btn btn-secondary btn-block">Login</button>`;
            mobileAuthLinks.appendChild(mobileLoginBtn);
            document.getElementById('mobileLoginBtn').addEventListener('click', () => {
                showModal(loginModal);
                closeMobileNav(); // Close nav after clicking
            });

            const mobileSignupBtn = document.createElement('li');
            mobileSignupBtn.innerHTML = `<button id="mobileSignupBtn" class="btn btn-primary btn-block">Sign Up</button>`;
            mobileAuthLinks.appendChild(mobileSignupBtn);
            document.getElementById('mobileSignupBtn').addEventListener('click', () => {
                showModal(signupModal);
                closeMobileNav(); // Close nav after clicking
            });
        }
    }

    function updateChatUI(user) {
        if (user) {
            chatLoginPrompt.style.display = 'none'; // Hide login prompt
            chatArea.classList.add('active'); // Show chat interface (using class for display:flex)
            chatInputAvatar.src = user.photoURL || DEFAULT_AVATAR_URL; // Update input area avatar
             chatInputAvatar.onerror = () => { chatInputAvatar.src = DEFAULT_AVATAR_URL; };
            fetchAndDisplayMessages();
        } else {
            chatLoginPrompt.style.display = 'block'; // Show login prompt
            chatArea.classList.remove('active'); // Hide chat interface
             chatInputAvatar.src = DEFAULT_AVATAR_URL; // Reset input avatar
            if (messagesListener) {
                messagesListener();
                messagesListener = null;
            }
            // Clear messages or show placeholder in the messages div
            chatMessagesDiv.innerHTML = '<div class="chat-loading-placeholder">Login to see messages</div>';
        }
        // Update send button state based on input
        chatSendBtn.disabled = !chatInput.value.trim();
    }

     // Update Settings Modal UI
    function updateSettingsUI(user) {
        if (user && settingsModal.classList.contains('show')) {
             settingsAvatarPreview.src = user.photoURL || DEFAULT_AVATAR_URL;
             settingsAvatarPreview.onerror = () => { settingsAvatarPreview.src = DEFAULT_AVATAR_URL; };
             settingsDisplayNameInput.value = user.displayName || '';
        }
    }


    // --- Authentication Handlers ---
    function handleSignup(event) {
        event.preventDefault();
        clearErrorMessages();
        const displayName = signupForm.signupName.value.trim();
        const email = signupForm.signupEmail.value;
        const password = signupForm.signupPassword.value;

        if (!displayName || displayName.length < 3) {
            signupError.textContent = 'Display name must be at least 3 characters.';
            return;
        }
        if (password.length < 6) {
             signupError.textContent = 'Password must be at least 6 characters long.';
            return;
        }

        // Disable button during signup
        const signupButton = signupForm.querySelector('button[type="submit"]');
        signupButton.disabled = true;
        signupButton.textContent = 'Signing Up...';


        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Update profile with display name AND default avatar
                 return userCredential.user.updateProfile({
                    displayName: displayName,
                    photoURL: DEFAULT_AVATAR_URL // Set default avatar here
                });
            })
             .then(() => {
                console.log('User signed up and profile updated:', auth.currentUser);
                hideModal(signupModal);
                // Auth state listener will handle UI update
            })
            .catch((error) => {
                console.error("Signup Error:", error);
                signupError.textContent = getFriendlyAuthErrorMessage(error);
            })
            .finally(() => {
                // Re-enable button
                signupButton.disabled = false;
                 signupButton.textContent = 'Sign Up';
            });
    }

    function handleLogin(event) {
        event.preventDefault();
        clearErrorMessages();
        const email = loginForm.loginEmail.value;
        const password = loginForm.loginPassword.value;

        const loginButton = loginForm.querySelector('button[type="submit"]');
        loginButton.disabled = true;
        loginButton.textContent = 'Logging In...';

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('User logged in:', userCredential.user);
                hideModal(loginModal);
            })
            .catch((error) => {
                console.error("Login Error:", error);
                loginError.textContent = getFriendlyAuthErrorMessage(error);
            })
             .finally(() => {
                loginButton.disabled = false;
                 loginButton.textContent = 'Login';
            });
    }

    function handleGoogleSignIn() {
        clearErrorMessages();
         // Disable buttons temporarily
         googleSignInBtnLogin.disabled = true;
         googleSignInBtnSignup.disabled = true;

        auth.signInWithPopup(googleProvider)
            .then((result) => {
                // result.user should have displayName and photoURL from Google
                console.log('Google Sign-In successful:', result.user);
                 // Ensure local currentUser state is updated immediately if needed,
                 // though onAuthStateChanged should handle the main update.
                currentUser = {
                    ...result.user,
                    displayName: result.user.displayName || 'User', // Add fallbacks just in case
                    photoURL: result.user.photoURL || DEFAULT_AVATAR_URL
                 };
                 updateSettingsUI(currentUser); // Update settings preview if open

                 hideModal(loginModal);
                 hideModal(signupModal);
                 // UI updates will be primarily handled by onAuthStateChanged
            }).catch((error) => {
                // --- Handle Google Sign-in Cancellation ---
                if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                    console.log('Google Sign-in cancelled by user.');
                    // No error message needed for cancellation
                } else {
                    console.error("Google Sign-In Error:", error);
                    const friendlyError = getFriendlyAuthErrorMessage(error);
                    loginError.textContent = friendlyError;
                    signupError.textContent = friendlyError; // Show in both modals
                }
            })
             .finally(() => {
                 // Re-enable buttons
                 googleSignInBtnLogin.disabled = false;
                 googleSignInBtnSignup.disabled = false;
             });
    }

    function handleLogout() {
        if (messagesListener) {
            messagesListener(); // Unsubscribe from chat listener
            messagesListener = null;
        }
        auth.signOut().then(() => {
            console.log('User signed out');
            currentUser = null;
             closeMobileNav(); // Close mobile nav on logout
            // Auth state listener handles UI update
        }).catch((error) => {
            console.error("Logout Error:", error);
            alert('Error signing out. Please try again.');
        });
    }

     // Function to upload avatar
    function uploadAvatar(file) {
        if (!currentUser || isUploadingAvatar) return;
        if (!file) {
            avatarUploadStatus.textContent = 'No file selected.';
            avatarUploadStatus.className = 'upload-status-message error';
            return;
        }
         if (!file.type.startsWith('image/')) {
            avatarUploadStatus.textContent = 'Please select an image file.';
            avatarUploadStatus.className = 'upload-status-message error';
             return;
         }
        if (file.size > 5 * 1024 * 1024) { // 5MB Limit
            avatarUploadStatus.textContent = 'File too large (Max 5MB).';
             avatarUploadStatus.className = 'upload-status-message error';
            return;
        }

        isUploadingAvatar = true;
        avatarUploadStatus.textContent = 'Uploading...';
        avatarUploadStatus.className = 'upload-status-message';
        changeAvatarBtn.disabled = true;

        const filePath = `avatars/${currentUser.uid}/${Date.now()}_${file.name}`;
        const storageRef = storage.ref(filePath);

        storageRef.put(file)
            .then(snapshot => snapshot.ref.getDownloadURL())
            .then(downloadURL => {
                // Update Auth profile
                return auth.currentUser.updateProfile({ photoURL: downloadURL });
            })
            .then(() => {
                console.log('Avatar updated successfully.');
                avatarUploadStatus.textContent = 'Avatar updated!';
                 avatarUploadStatus.className = 'upload-status-message success';
                // Update UI immediately (nav bar, settings preview)
                userAvatarNav.src = auth.currentUser.photoURL;
                settingsAvatarPreview.src = auth.currentUser.photoURL;
                chatInputAvatar.src = auth.currentUser.photoURL; // Update chat input avatar too
                 // Update local state (important if other components rely on currentUser directly)
                 currentUser.photoURL = auth.currentUser.photoURL;

                 // Clear success message after a delay
                 setTimeout(() => {
                    avatarUploadStatus.textContent = '';
                    avatarUploadStatus.className = 'upload-status-message';
                 }, 3000);
            })
            .catch(error => {
                console.error("Avatar Upload Error:", error);
                avatarUploadStatus.textContent = 'Upload failed. Please try again.';
                avatarUploadStatus.className = 'upload-status-message error';
            })
            .finally(() => {
                isUploadingAvatar = false;
                changeAvatarBtn.disabled = false;
                avatarUploadInput.value = ''; // Reset file input
            });
    }


    function getFriendlyAuthErrorMessage(error) {
        // ... (keep the previous switch statement)
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'This email address is already registered.';
            case 'auth/weak-password':
                return 'Password must be at least 6 characters.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/popup-closed-by-user': // Already handled, but keep for completeness
            case 'auth/cancelled-popup-request':
                 return 'Google Sign-in cancelled.'; // Can return empty string if preferred
             case 'auth/popup-blocked':
                 return 'Google Sign-in popup blocked. Please enable popups.';
            // Firebase Storage errors (if needed elsewhere, add cases)
            case 'storage/unauthorized':
                return 'You do not have permission to upload this file.';
            case 'storage/canceled':
                return 'Upload cancelled.';
            case 'storage/unknown':
                return 'An unknown storage error occurred.';
            default:
                 console.warn("Unhandled auth error code:", error.code); // Log unhandled codes
                return error.message || 'An unexpected error occurred. Please try again.';
        }
    }


    // --- Chat Functionality ---
    function fetchAndDisplayMessages() {
        if (messagesListener) messagesListener(); // Unsubscribe previous

        const messagesCol = db.collection('messages').orderBy('createdAt', 'asc').limit(100); // Limit history

        chatMessagesDiv.innerHTML = '<div class="chat-loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Loading Messages...</div>';

        let initialLoad = true; // Flag to check if it's the first batch

        messagesListener = messagesCol.onSnapshot(snapshot => {
             const initialScrollHeight = chatMessagesDiv.scrollHeight;
             const initialScrollTop = chatMessagesDiv.scrollTop;
             const isScrolledToBottom = initialScrollHeight - initialScrollTop <= chatMessagesDiv.clientHeight + 50; // Check if user is near the bottom

            if (snapshot.empty) {
                chatMessagesDiv.innerHTML = '<div class="chat-no-messages-placeholder">No messages yet. Start the conversation!</div>';
                return;
            }

            // Clear only if it's the first load, otherwise append smartly (more complex)
            // For simplicity here, we redraw all on each update from the limited query
             if(initialLoad) {
                chatMessagesDiv.innerHTML = ''; // Clear placeholder on first data
             }


            snapshot.docChanges().forEach(change => {
                 if (change.type === "added") {
                     displayMessage(change.doc.id, change.doc.data());
                 }
                 // Handle 'modified' or 'removed' if needed (e.g., message editing/deletion)
             });


            // Smart scrolling: Scroll down only if user was already at the bottom or it's the initial load
             if (initialLoad || isScrolledToBottom) {
                  chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
             }

             initialLoad = false; // Mark initial load as complete


        }, error => {
            console.error("Error fetching messages: ", error);
            chatMessagesDiv.innerHTML = '<div class="chat-error-message"><i class="fas fa-exclamation-triangle"></i> Could not load messages.</div>';
        });
    }

    // --- Rewritten displayMessage function ---
    function displayMessage(id, message) {
         // Check if message element already exists (to avoid duplicates on redraws)
         if (document.getElementById(`msg-${id}`)) {
             return;
         }

        const isCurrentUser = currentUser && message.userId === currentUser.uid;

        const wrapper = document.createElement('div');
        wrapper.id = `msg-${id}`; // Add ID for potential updates/removal
        wrapper.classList.add('message-wrapper', isCurrentUser ? 'message-self' : 'message-other');
        wrapper.setAttribute('data-aos', isCurrentUser ? 'fade-left' : 'fade-right'); // Add AOS effect
         wrapper.setAttribute('data-aos-duration', '300');
         wrapper.setAttribute('data-aos-offset', '0'); // Trigger immediately


        const avatarImg = document.createElement('img');
        avatarImg.src = message.userPhotoURL || DEFAULT_AVATAR_URL;
        avatarImg.alt = `${message.userName || 'User'}'s avatar`;
        avatarImg.classList.add('chat-avatar');
        avatarImg.onerror = () => { avatarImg.src = DEFAULT_AVATAR_URL; }; // Fallback

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');

        if (!isCurrentUser) {
            const usernameStrong = document.createElement('strong');
            usernameStrong.classList.add('message-username');
            usernameStrong.textContent = message.userName || 'Anonymous';
            bubble.appendChild(usernameStrong);
        }

        const textP = document.createElement('p');
        textP.classList.add('message-text');
        textP.textContent = message.text; // Use textContent for security (like escapeHTML)
        bubble.appendChild(textP);

        const timestampSpan = document.createElement('span');
        timestampSpan.classList.add('message-timestamp');
        timestampSpan.textContent = formatTimestamp(message.createdAt);
        bubble.appendChild(timestampSpan);

        // Assemble the message structure
        wrapper.appendChild(avatarImg);
        wrapper.appendChild(bubble);

         // Append and potentially trigger AOS refresh for the new element
         chatMessagesDiv.appendChild(wrapper);
         // AOS might pick it up automatically, but can force refresh if needed:
         // if (typeof AOS !== 'undefined') { AOS.refreshHard([wrapper]); }

    }

    function handleSendMessage(event) {
        event.preventDefault();
        const messageText = chatInput.value.trim();

        if (!messageText || !currentUser) return;

         chatError.textContent = ''; // Clear previous errors
         chatSendBtn.disabled = true; // Disable temporarily

        db.collection('messages').add({
            text: messageText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            userId: currentUser.uid,
            // Store current display name and photo URL at time of sending
            userName: currentUser.displayName || 'User',
            userPhotoURL: currentUser.photoURL || DEFAULT_AVATAR_URL
        })
        .then(() => {
            console.log("Message sent!");
            chatInput.value = ''; // Clear input
             // Listener will display the message
             // Scroll to bottom after sending
             chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
        })
        .catch((error) => {
            console.error("Error sending message: ", error);
            chatError.textContent = 'Failed to send message.'; // Show error
        })
        .finally(() => {
            chatSendBtn.disabled = !chatInput.value.trim(); // Re-evaluate disabled state
        });
    }

    // --- Event Listeners Setup ---

    // Navbar Scroll Effect
     window.addEventListener('scroll', () => {
        if (window.scrollY > 50) { // Add class after scrolling 50px
             document.body.classList.add('scrolled');
        } else {
             document.body.classList.remove('scrolled');
        }
     });


    // Auth Buttons & Modals
    loginBtn.addEventListener('click', () => showModal(loginModal));
    signupBtn.addEventListener('click', () => showModal(signupModal));
    logoutBtn.addEventListener('click', handleLogout);
    settingsBtn.addEventListener('click', () => {
        if (currentUser) {
            updateSettingsUI(currentUser); // Populate settings modal before showing
            showModal(settingsModal);
        }
     });

    // Close Modal Buttons
    closeLogin.addEventListener('click', () => hideModal(loginModal));
    closeSignup.addEventListener('click', () => hideModal(signupModal));
    closeSettings.addEventListener('click', () => hideModal(settingsModal));


    // Close modal on outside click
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) hideModal(loginModal);
        if (event.target === signupModal) hideModal(signupModal);
         if (event.target === settingsModal) hideModal(settingsModal);
    });

    // Switch Modals
    switchToSignup.addEventListener('click', (e) => { e.preventDefault(); hideModal(loginModal); showModal(signupModal); });
    switchToLogin.addEventListener('click', (e) => { e.preventDefault(); hideModal(signupModal); showModal(loginModal); });

    // Chat Login/Signup Prompt Buttons
    chatLoginLinkBtn.addEventListener('click', () => showModal(loginModal));
    chatSignupLinkBtn.addEventListener('click', () => showModal(signupModal));

    // Form Submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Google Sign-In
    googleSignInBtnLogin.addEventListener('click', handleGoogleSignIn);
    googleSignInBtnSignup.addEventListener('click', handleGoogleSignIn);

    // Chat Form
    chatForm.addEventListener('submit', handleSendMessage);
    // Enable/disable send button based on input
     chatInput.addEventListener('input', () => {
        chatSendBtn.disabled = !chatInput.value.trim();
    });

    // Settings - Avatar Upload
    changeAvatarBtn.addEventListener('click', () => avatarUploadInput.click()); // Trigger hidden file input
    avatarUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadAvatar(file);
        }
    });

    // Mobile Menu
    mobileMenuToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        const icon = mobileMenuToggle.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

     // Close mobile nav function
     function closeMobileNav() {
        if (mobileNav.classList.contains('active')) {
             mobileNav.classList.remove('active');
             mobileMenuToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
         }
     }

    // Close mobile menu when a link inside it is clicked
    mobileNav.addEventListener('click', (e) => {
        // Close if a link (A) or a button initiating an action (like login/signup) is clicked
        if (e.target.tagName === 'A' || (e.target.tagName === 'BUTTON' && e.target.id !== 'mobileLogoutBtn')) { // Don't close for logout immediately
            closeMobileNav();
        }
    });
     // Mobile settings button
    mobileSettingsBtn.addEventListener('click', (e) => {
         e.preventDefault();
         if (currentUser) {
            updateSettingsUI(currentUser);
            showModal(settingsModal);
         }
         closeMobileNav();
     });


    // --- Authentication State Observer ---
    auth.onAuthStateChanged(user => {
        console.log("Auth state changed:", user);
         if (user) {
            // Ensure the user object has expected properties with fallbacks
             currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'User', // Fallback
                photoURL: user.photoURL || DEFAULT_AVATAR_URL // Fallback
            };
         } else {
            currentUser = null;
         }

        updateNavUI(currentUser);
        updateChatUI(currentUser);
        updateSettingsUI(currentUser); // Update settings modal preview if it happens to be open

    });

     // --- Footer Year ---
    if(currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

}); // End DOMContentLoaded
     
