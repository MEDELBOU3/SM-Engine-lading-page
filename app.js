/* === app.js (Complete Rewrite) === */

document.addEventListener('DOMContentLoaded', function() {

    // --- Firebase Configuration ---
    // IMPORTANT: REPLACE WITH YOUR ACTUAL FIREBASE CONFIGURATION
    const firebaseConfig = {
        apiKey: "AIzaSyDp2V0ULE-32AcIJ92a_e3mhMe6f6yZ_H4",
        authDomain: "sm4movies.firebaseapp.com",
        projectId: "sm4movies",
        storageBucket: "sm4movies.firebasestorage.app",
        messagingSenderId: "277353836953",
        appId: "1:277353836953:web:85e02783526c7cb58de308",
        measurementId: "G-690RSNJ2Q2"
    };

    // --- Initialize Firebase (V8 Syntax) ---
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
    const DEFAULT_AVATAR_URL = 'images/default-avatar.png'; // Path to default avatar

    // --- DOM Element References ---
    // Navbar & Auth
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const userProfileDiv = document.getElementById('userProfile');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userAvatarNav = document.getElementById('userAvatarNav');
    const mobileAuthLinks = document.getElementById('mobileAuthLinks');
    const mobileSettingsLink = document.getElementById('mobileSettingsLink');
    const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');

    // Modals & Controls
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const settingsModal = document.getElementById('settingsModal');
    const closeLogin = document.getElementById('closeLogin');
    const closeSignup = document.getElementById('closeSignup');
    const closeSettings = document.getElementById('closeSettings');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    // Forms & Errors
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    const googleSignInBtnLogin = document.getElementById('googleSignInBtnLogin');
    const googleSignInBtnSignup = document.getElementById('googleSignInBtnSignup');

    // Settings Modal Elements
    const settingsAvatarPreview = document.getElementById('settingsAvatarPreview');
    const avatarUploadInput = document.getElementById('avatarUploadInput');
    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    const avatarUploadStatus = document.getElementById('avatarUploadStatus');
    const settingsDisplayNameText = document.getElementById('settingsDisplayNameText');

    // Chat Elements
    const chatArea = document.getElementById('chatArea');
    const chatMessagesDiv = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatInputAvatar = document.getElementById('chatInputAvatar');
    const chatLoginPrompt = document.getElementById('chatLoginPrompt');
    const chatLoginLink = document.getElementById('chatLoginLink');
    const chatSignupLink = document.getElementById('chatSignupLink');
    const chatError = document.getElementById('chatError');

    // Other
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const currentYearSpan = document.getElementById('currentYear');
    const body = document.body;

    // --- State Variables ---
    let currentUser = null;         // Holds the firebase auth user object when logged in
    let messagesListener = null;    // Holds the function to unsubscribe from Firestore listener
    let isUploadingAvatar = false;  // Flag to prevent simultaneous avatar uploads

    // --- Helper Functions ---

    // Escapes HTML to prevent XSS attacks when displaying user-generated content
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str || '')); // Ensure input is treated as text
        return div.innerHTML;
    }

    // Formats Firebase Timestamps (or JS Dates) into a readable time string
    function formatTimestamp(timestamp) {
        if (!timestamp?.toDate) return ''; // Return empty if invalid
        try {
            const date = timestamp.toDate();
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (e) {
            console.error("Error formatting timestamp:", e);
            return '';
        }
    }

    // Shows a modal with a fade/scale effect
    function showModal(modal) {
        clearErrorMessages(); // Clear any previous errors
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10); // Short delay for CSS transition
    }

    // Hides a modal with a fade/scale effect
    function hideModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset(); // Reset form fields
            if (modal === settingsModal) { // Clear settings modal specifics
                avatarUploadStatus.textContent = '';
                avatarUploadStatus.className = 'upload-status';
                avatarUploadInput.value = '';
            }
        }, 300); // Match CSS transition duration (0.3s)
    }

    // Clears all error message fields
    function clearErrorMessages() {
        loginError.textContent = '';
        signupError.textContent = '';
        chatError.textContent = '';
        avatarUploadStatus.textContent = '';
        avatarUploadStatus.className = 'upload-status';
    }

    // Provides user-friendly error messages based on Firebase error codes
    function getFriendlyAuthErrorMessage(error) {
        console.log("Auth Error Code:", error.code); // Log the code for debugging
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
            case 'auth/popup-closed-by-user':
            case 'auth/cancelled-popup-request':
                return ''; // Return empty string for user cancellations (no error shown)
            case 'auth/popup-blocked':
                return 'Google Sign-in popup blocked. Please allow popups for this site.';
            case 'storage/unauthorized':
                return 'Permission denied. Please check storage rules.';
            case 'storage/object-not-found':
                return 'File not found during upload.';
            case 'storage/canceled':
                return 'Upload cancelled.';
            default:
                console.warn("Unhandled error:", error); // Log unexpected errors
                return 'An unexpected error occurred. Please try again.';
        }
    }

    // Closes the mobile navigation menu
    function closeMobileNav() {
        if (mobileNav.classList.contains('active')) {
            mobileNav.classList.remove('active');
            mobileMenuToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
        }
    }

    // Disables/Enables a button and optionally changes its text
    function setButtonLoading(button, isLoading, loadingText = 'Loading...') {
        if (!button) return;
        button.disabled = isLoading;
        if (isLoading) {
            button.dataset.originalText = button.textContent; // Store original text
            button.textContent = loadingText;
        } else {
            button.textContent = button.dataset.originalText || button.textContent; // Restore original text
        }
    }

    // --- UI Update Functions ---

    // Updates the navigation bar based on login state
    function updateNavUI(user) {
        if (user) {
            // Logged In State
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            userProfileDiv.style.display = 'flex';
            userNameDisplay.textContent = user.displayName || 'User'; // Use display name or fallback
            userAvatarNav.src = user.photoURL || DEFAULT_AVATAR_URL; // Use photo URL or default
            userAvatarNav.onerror = () => { userAvatarNav.src = DEFAULT_AVATAR_URL; }; // Handle image load error
        } else {
            // Logged Out State
            loginBtn.style.display = 'inline-block';
            signupBtn.style.display = 'inline-block';
            userProfileDiv.style.display = 'none';
        }

        // Update Mobile Navigation Links
        mobileAuthLinks.innerHTML = ''; // Clear previous mobile links
        mobileSettingsLink.style.display = user ? 'list-item' : 'none'; // Toggle settings link visibility

        if (user) {
            // Add user info and logout to mobile nav
            const mobileProfile = document.createElement('li');
            mobileProfile.className = 'mobile-user-info';
            mobileProfile.innerHTML = `
                <img src="${escapeHTML(user.photoURL || DEFAULT_AVATAR_URL)}" alt="Avatar" class="mobile-nav-avatar" onerror="this.src='${DEFAULT_AVATAR_URL}'">
                <span>Hi, ${escapeHTML(user.displayName || 'User')}</span>`;
            mobileAuthLinks.appendChild(mobileProfile);

            const mobileLogoutLi = document.createElement('li');
            const mobileLogoutBtn = document.createElement('button');
            mobileLogoutBtn.id = 'mobileLogoutBtn';
            mobileLogoutBtn.className = 'btn btn-secondary btn-block';
            mobileLogoutBtn.textContent = 'Logout';
            mobileLogoutLi.appendChild(mobileLogoutBtn);
            mobileAuthLinks.appendChild(mobileLogoutLi);
             // Ensure event listener is attached correctly
             mobileLogoutBtn.addEventListener('click', handleLogout);

        } else {
            // Add login/signup buttons to mobile nav
            const mobileLoginLi = document.createElement('li');
            mobileLoginLi.innerHTML = `<button id="mobileLoginBtn" class="btn btn-secondary btn-block">Login</button>`;
            mobileAuthLinks.appendChild(mobileLoginLi);
            document.getElementById('mobileLoginBtn').addEventListener('click', () => { showModal(loginModal); closeMobileNav(); });

            const mobileSignupLi = document.createElement('li');
            mobileSignupLi.innerHTML = `<button id="mobileSignupBtn" class="btn btn-primary btn-block">Sign Up</button>`;
            mobileAuthLinks.appendChild(mobileSignupLi);
            document.getElementById('mobileSignupBtn').addEventListener('click', () => { showModal(signupModal); closeMobileNav(); });
        }
    }

    // Updates the chat area based on login state
    function updateChatUI(user) {
        if (user) {
            chatArea.style.display = 'flex'; // Show chat (flex container)
            chatLoginPrompt.style.display = 'none'; // Hide prompt
            chatInputAvatar.src = user.photoURL || DEFAULT_AVATAR_URL; // Set input avatar
            chatInputAvatar.onerror = () => { chatInputAvatar.src = DEFAULT_AVATAR_URL; };
            fetchAndDisplayMessages(); // Fetch messages
        } else {
            chatArea.style.display = 'none'; // Hide chat
            chatLoginPrompt.style.display = 'block'; // Show prompt
            chatInputAvatar.src = DEFAULT_AVATAR_URL; // Reset input avatar
            if (messagesListener) {
                messagesListener(); // Unsubscribe from previous listener
                messagesListener = null;
            }
            chatMessagesDiv.innerHTML = '<p class="loading-chat">Login to see chat history.</p>'; // Reset message area
        }
        chatSendBtn.disabled = !chatInput.value.trim(); // Initial send button state
    }

    // Updates the content of the settings modal if the user is logged in
    function updateSettingsUI(user) {
        if (user && settingsModal.style.display === 'flex') { // Only update if visible
            settingsAvatarPreview.src = user.photoURL || DEFAULT_AVATAR_URL;
            settingsAvatarPreview.onerror = () => { settingsAvatarPreview.src = DEFAULT_AVATAR_URL; };
            settingsDisplayNameText.textContent = user.displayName || 'Not Set';
        }
    }

    // --- Authentication Handlers ---

    // Handles Email/Password Signup
    function handleSignup(event) {
        event.preventDefault();
        clearErrorMessages();
        const displayName = signupForm.signupName.value.trim();
        const email = signupForm.signupEmail.value;
        const password = signupForm.signupPassword.value;
        const signupButton = signupForm.querySelector('button[type="submit"]');

        // Validation
        if (!displayName || displayName.length < 3) { signupError.textContent = 'Display name must be at least 3 characters.'; return; }
        if (password.length < 6) { signupError.textContent = 'Password must be at least 6 characters.'; return; }

        setButtonLoading(signupButton, true, 'Creating Account...');

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Set display name and default avatar *immediately* after creation
                return userCredential.user.updateProfile({
                    displayName: displayName,
                    photoURL: DEFAULT_AVATAR_URL
                });
            })
            .then(() => {
                console.log('User signed up and profile updated.');
                hideModal(signupModal); // Close modal on success
                // Auth state listener will handle UI updates
            })
            .catch((error) => {
                signupError.textContent = getFriendlyAuthErrorMessage(error);
            })
            .finally(() => {
                setButtonLoading(signupButton, false); // Restore button state
            });
    }

    // Handles Email/Password Login
    function handleLogin(event) {
        event.preventDefault();
        clearErrorMessages();
        const email = loginForm.loginEmail.value;
        const password = loginForm.loginPassword.value;
        const loginButton = loginForm.querySelector('button[type="submit"]');

        setButtonLoading(loginButton, true, 'Logging In...');

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('User logged in.');
                hideModal(loginModal); // Close modal on success
                // Auth state listener handles UI updates
            })
            .catch((error) => {
                loginError.textContent = getFriendlyAuthErrorMessage(error);
            })
            .finally(() => {
                setButtonLoading(loginButton, false); // Restore button state
            });
    }

    // Handles Google Sign-In Popup
    function handleGoogleSignIn() {
        clearErrorMessages();
        const googleButtons = [googleSignInBtnLogin, googleSignInBtnSignup];
        googleButtons.forEach(btn => setButtonLoading(btn, true)); // Disable buttons

        auth.signInWithPopup(googleProvider)
            .then((result) => {
                console.log('Google Sign-In successful.');
                 // Check if new user needs a default avatar (if Google didn't provide one)
                 if (result.additionalUserInfo?.isNewUser && !result.user.photoURL) {
                     result.user.updateProfile({ photoURL: DEFAULT_AVATAR_URL })
                         .catch(err => console.error("Failed to set default avatar for new Google user:", err));
                 }
                 hideModal(loginModal); // Close modals
                 hideModal(signupModal);
                 // Auth state listener handles UI updates
            }).catch((error) => {
                const friendlyMsg = getFriendlyAuthErrorMessage(error);
                if (friendlyMsg) { // Only show error if it's not a user cancellation
                    loginError.textContent = friendlyMsg;
                    signupError.textContent = friendlyMsg;
                } else {
                    console.log("Google Sign-in cancelled by user.");
                }
            })
            .finally(() => {
                googleButtons.forEach(btn => setButtonLoading(btn, false)); // Re-enable buttons
            });
    }

    // Handles User Logout
    function handleLogout() {
        if (messagesListener) { // Unsubscribe from chat messages
            messagesListener();
            messagesListener = null;
        }
        auth.signOut()
            .then(() => {
                console.log('User signed out successfully.');
                currentUser = null; // Clear local state
                closeMobileNav(); // Close mobile nav if open
                // Auth state listener handles UI updates
            })
            .catch((error) => {
                console.error("Logout Error:", error);
                alert('An error occurred while signing out.'); // Simple alert for logout error
            });
    }

    // --- Avatar Upload Functionality ---

    // Handles the avatar file upload process
    function uploadAvatar(file) {
        if (!currentUser || isUploadingAvatar) return; // Check login and upload status

        // Basic client-side validation
        if (!file.type.startsWith('image/')) { displayUploadStatus('Please select an image file.', true); return; }
        if (file.size > 5 * 1024 * 1024) { displayUploadStatus('File too large (Max 5MB).', true); return; }

        isUploadingAvatar = true;
        displayUploadStatus('Uploading...'); // Show progress
        setButtonLoading(changeAvatarBtn, true); // Disable button

        const filePath = `avatars/${currentUser.uid}/${Date.now()}_${file.name}`; // Unique file path
        const storageRef = storage.ref(filePath); // V8 storage ref syntax

        // Upload file
        storageRef.put(file)
            .then(snapshot => snapshot.ref.getDownloadURL()) // Get download URL after upload
            .then(downloadURL => {
                // Update the user's profile in Firebase Auth
                return auth.currentUser.updateProfile({ photoURL: downloadURL });
            })
            .then(() => {
                console.log('Avatar updated successfully in Auth.');
                displayUploadStatus('Avatar updated!', false); // Show success message

                // Update UI immediately with the new URL
                const newPhotoURL = auth.currentUser.photoURL;
                userAvatarNav.src = newPhotoURL;
                settingsAvatarPreview.src = newPhotoURL;
                chatInputAvatar.src = newPhotoURL;

                // Update local currentUser state for consistency
                if (currentUser) { currentUser.photoURL = newPhotoURL; }

                // Clear success message after a delay
                setTimeout(clearUploadStatus, 3000);
            })
            .catch(error => {
                console.error("Avatar Upload/Update Error:", error);
                displayUploadStatus(getFriendlyAuthErrorMessage(error) || 'Upload failed.', true); // Show specific error
            })
            .finally(() => {
                isUploadingAvatar = false; // Reset upload flag
                setButtonLoading(changeAvatarBtn, false); // Re-enable button
                avatarUploadInput.value = ''; // Clear the file input
            });
    }

    // Helper to display status messages in the settings modal
    function displayUploadStatus(message, isError = false) {
        avatarUploadStatus.textContent = message;
        avatarUploadStatus.className = `upload-status ${isError ? 'error' : 'success'}`;
    }
    // Helper to clear the upload status message
    function clearUploadStatus() {
        avatarUploadStatus.textContent = '';
        avatarUploadStatus.className = 'upload-status';
    }

    // --- Chat Functionality ---

    // Fetches messages and sets up real-time listener
    function fetchAndDisplayMessages() {
        if (messagesListener) messagesListener(); // Unsubscribe from previous listener

        const messagesQuery = db.collection('messages').orderBy('createdAt', 'asc').limit(50); // Get last 50 messages

        chatMessagesDiv.innerHTML = '<p class="loading-chat">Loading messages...</p>'; // Show loading state

        let initialDataLoaded = false; // Track initial load

        messagesListener = messagesQuery.onSnapshot(snapshot => {
            const wasNearBottom = chatMessagesDiv.scrollHeight - chatMessagesDiv.scrollTop <= chatMessagesDiv.clientHeight + 100; // Check scroll position BEFORE updates

            if (snapshot.empty) {
                chatMessagesDiv.innerHTML = '<p class="no-messages">No messages yet. Say hello!</p>';
                return;
            }

            if (!initialDataLoaded) {
                chatMessagesDiv.innerHTML = ''; // Clear loading state only on first data
                initialDataLoaded = true;
            }

            // Process changes efficiently
            snapshot.docChanges().forEach(change => {
                const messageId = change.doc.id;
                const messageData = change.doc.data();
                const existingElement = document.getElementById(`msg-${messageId}`);

                if (change.type === "added") {
                    if (!existingElement) { // Add only if it doesn't exist
                        displayMessage(messageId, messageData);
                    }
                } else if (change.type === "modified") {
                    if (existingElement) { // Update existing message element
                        const textElement = existingElement.querySelector('.message-text');
                        const timestampElement = existingElement.querySelector('.message-timestamp');
                        if (textElement) textElement.textContent = messageData.text;
                        if (timestampElement) timestampElement.textContent = formatTimestamp(messageData.createdAt);
                        // Potentially update avatar/name if those can change (less common)
                    }
                } else if (change.type === "removed") {
                    if (existingElement) {
                        existingElement.remove(); // Remove deleted message
                    }
                }
            });

            // Scroll to bottom only if user was near bottom before update, or on initial load
            if (initialDataLoaded && wasNearBottom) {
                 // Use setTimeout to ensure DOM has updated after adding messages
                 setTimeout(() => { chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; }, 0);
            } else if (!initialDataLoaded && chatMessagesDiv.innerHTML !== ''){ // Scroll on very first load
                 setTimeout(() => { chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; }, 0);
            }


        }, error => {
            console.error("Error fetching messages: ", error);
            chatMessagesDiv.innerHTML = '<p class="error-message">Could not load messages. Please try again later.</p>';
            messagesListener = null; // Stop listening on error
        });
    }

    // Creates and appends a single chat message element
    function displayMessage(id, message) {
        const isSelf = currentUser && message.userId === currentUser.uid;

        const wrapper = document.createElement('div');
        wrapper.id = `msg-${id}`;
        wrapper.className = `chat-message ${isSelf ? 'chat-message-self' : 'chat-message-other'}`;

        const avatar = document.createElement('img');
        avatar.className = 'chat-avatar';
        avatar.src = message.userPhotoURL || DEFAULT_AVATAR_URL;
        avatar.alt = 'Avatar';
        avatar.onerror = () => { avatar.src = DEFAULT_AVATAR_URL; };

        const content = document.createElement('div');
        content.className = 'message-content';

        if (!isSelf) {
            const username = document.createElement('strong');
            username.className = 'message-username';
            username.textContent = message.userName || 'Anonymous';
            content.appendChild(username);
        }

        const text = document.createElement('p');
        text.className = 'message-text';
        text.textContent = message.text; // Use textContent to prevent XSS
        content.appendChild(text);

        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp';
        timestamp.textContent = formatTimestamp(message.createdAt);
        content.appendChild(timestamp);

        // Append elements in correct order based on sender
        if (isSelf) {
            wrapper.appendChild(content);
            wrapper.appendChild(avatar);
        } else {
            wrapper.appendChild(avatar);
            wrapper.appendChild(content);
        }

        chatMessagesDiv.appendChild(wrapper);
    }

    // Handles sending a new chat message
    function handleSendMessage(event) {
        event.preventDefault();
        const messageText = chatInput.value.trim();
        chatError.textContent = ''; // Clear previous errors

        if (!messageText || !currentUser) return; // Basic validation

        setButtonLoading(chatSendBtn, true); // Disable send button

        // Add message to Firestore
        db.collection('messages').add({
            text: messageText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use server time
            userId: currentUser.uid,
            userName: currentUser.displayName || 'User', // Store current profile info
            userPhotoURL: currentUser.photoURL || DEFAULT_AVATAR_URL
        })
        .then(() => {
            chatInput.value = ''; // Clear input field
            // Firestore listener will add the message to the UI
            // Scroll down after a short delay to ensure DOM update
            setTimeout(() => { chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; }, 50);
        })
        .catch((error) => {
            console.error("Error sending message: ", error);
            chatError.textContent = 'Failed to send message.'; // Show user-friendly error
        })
        .finally(() => {
            setButtonLoading(chatSendBtn, false); // Re-enable send button
            chatSendBtn.disabled = !chatInput.value.trim(); // Ensure correct state based on input
        });
    }

    // --- Event Listeners Setup ---

    // Navbar Scroll Effect
    window.addEventListener('scroll', () => {
        body.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true }); // Improve scroll performance

    // Authentication Buttons & Modals
    loginBtn.addEventListener('click', () => showModal(loginModal));
    signupBtn.addEventListener('click', () => showModal(signupModal));
    logoutBtn.addEventListener('click', handleLogout); // Listener for desktop logout
    settingsBtn.addEventListener('click', () => { // Listener for desktop settings icon
        if (currentUser) {
            updateSettingsUI(currentUser);
            showModal(settingsModal);
        }
    });

    // Modal Close Buttons
    closeLogin.addEventListener('click', () => hideModal(loginModal));
    closeSignup.addEventListener('click', () => hideModal(signupModal));
    closeSettings.addEventListener('click', () => hideModal(settingsModal));

    // Close Modals on Backdrop Click
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) hideModal(loginModal);
        if (event.target === signupModal) hideModal(signupModal);
        if (event.target === settingsModal) hideModal(settingsModal);
    });

    // Switch Between Login/Signup Modals
    switchToSignup.addEventListener('click', (e) => { e.preventDefault(); hideModal(loginModal); showModal(signupModal); });
    switchToLogin.addEventListener('click', (e) => { e.preventDefault(); hideModal(signupModal); showModal(loginModal); });

    // Chat Prompt Links
    chatLoginLink.addEventListener('click', (e) => { e.preventDefault(); showModal(loginModal); });
    chatSignupLink.addEventListener('click', (e) => { e.preventDefault(); showModal(signupModal); });

    // Form Submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Google Sign-In Buttons
    googleSignInBtnLogin.addEventListener('click', handleGoogleSignIn);
    googleSignInBtnSignup.addEventListener('click', handleGoogleSignIn);

    // Settings Modal - Avatar Upload
    changeAvatarBtn.addEventListener('click', () => avatarUploadInput.click()); // Trigger file input
    avatarUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadAvatar(file); // Call upload function
        }
    });

    // Chat Form
    chatForm.addEventListener('submit', handleSendMessage);
    // Enable/disable send button based on input content
    chatInput.addEventListener('input', () => {
        chatSendBtn.disabled = !chatInput.value.trim();
    });

    // Mobile Menu Toggle
    mobileMenuToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        mobileMenuToggle.querySelector('i').classList.toggle('fa-bars');
        mobileMenuToggle.querySelector('i').classList.toggle('fa-times');
    });

    // Mobile Menu Links (Close menu on click)
    mobileNav.addEventListener('click', (e) => {
        // Close if a direct link or a button that opens a modal is clicked
        if (e.target.tagName === 'A' || (e.target.tagName === 'BUTTON' && !e.target.id.includes('Logout'))) {
            closeMobileNav();
        }
    });
    // Mobile settings button listener
    mobileSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentUser) {
            updateSettingsUI(currentUser);
            showModal(settingsModal);
        }
        closeMobileNav();
    });


    // --- Authentication State Observer ---
    // This is the core listener that reacts to login/logout events
    auth.onAuthStateChanged(user => {
        console.log("Auth state changed. User:", user ? user.uid : 'None');
        if (user) {
            // User is signed in. Create/Update the local currentUser object.
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'User', // Provide fallback
                photoURL: user.photoURL || DEFAULT_AVATAR_URL // Provide fallback
            };
            // If displayName or photoURL were just updated, they might be reflected here
            // or might need a slight delay/refresh, but this covers most cases.
        } else {
            // User is signed out.
            currentUser = null;
        }

        // Update all relevant parts of the UI based on the new auth state
        updateNavUI(currentUser);
        updateChatUI(currentUser);
        updateSettingsUI(currentUser); // Update settings modal preview if open

    });

    // --- Footer Year ---
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- Initial Checks ---
    // The onAuthStateChanged listener handles the initial UI setup.
    console.log("Landing Page Initialized.");

}); // End DOMContentLoaded
