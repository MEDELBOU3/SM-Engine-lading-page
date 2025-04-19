document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    // IMPORTANT: NEVER expose your API keys directly in client-side code
    // for production applications. Use environment variables and backend functions
    // or secure configuration methods. This is for DEMO purposes only.
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
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        alert("Application could not start: Firebase initialization failed.");
        return; // Stop script execution if Firebase fails
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // --- DOM Element Selectors ---
    const Selectors = {
        themeToggle: '#themeToggle',
        authModal: '#authModal',
        loginBtn: '#loginBtn',
        signupBtn: '#signupBtn',
        loginBtnMobile: '#loginBtnMobile',
        signupBtnMobile: '#signupBtnMobile',
        communityLoginBtn: '#communityLoginBtn',
        authButtons: '.auth-buttons',
        authButtonsInline: '.auth-buttons-inline',
        userMenu: '#userMenu',
        menuUserAvatar: '#menuUserAvatar',
        menuUserName: '#menuUserName',
        profileMenuItem: '#profileMenuItem',
        settingsMenuItem: '#settingsMenuItem',
        logoutMenuItem: '#logoutMenuItem',
        // Auth Modal Elements
        authModalInstance: null, // Will hold Bootstrap modal instance
        loginTab: '#login-tab',
        signupTab: '#signup-tab',
        loginForm: '#loginForm',
        signupForm: '#signupForm',
        googleLoginBtn: '#googleLoginBtn',
        googleSignupBtn: '#googleSignupBtn',
        loginEmail: '#loginEmail',
        loginPassword: '#loginPassword',
        signupName: '#signupName',
        signupEmail: '#signupEmail',
        signupPassword: '#signupPassword',
        loginError: '#loginError',
        signupError: '#signupError',
        // Profile Modal Elements
        profileModal: '#profileModal',
        profileModalInstance: null,
        profileModalAvatar: '#profileModalAvatar',
        profileModalName: '#profileModalName',
        profileModalEmail: '#profileModalEmail',
        profileModalBio: '#profileModalBio',
        editProfileBtn: '#editProfileBtn',
        // Settings Modal Elements
        settingsModal: '#settingsModal',
        settingsModalInstance: null,
        settingsForm: '#settingsForm',
        avatarPreview: '#avatarPreview',
        avatarInput: '#avatarInput',
        uploadAvatarBtn: '#uploadAvatarBtn',
        removeAvatarBtn: '#removeAvatarBtn',
        settingsName: '#settingsName',
        settingsEmail: '#settingsEmail',
        settingsBio: '#settingsBio',
        saveSettingsBtn: '#saveSettingsBtn',
        settingsSpinner: '#settingsSpinner',
        settingsSuccess: '#settingsSuccess',
        settingsError: '#settingsError',
        // Community Elements
        communityLoginPrompt: '#communityLoginPrompt',
        communityContainer: '#communityContainer',
        channelList: '#channelList',
        chatMessages: '#chatMessages',
        messageInput: '#messageInput',
        sendMessageBtn: '#sendMessageBtn',
        // Footer
        currentYear: '#currentYear',
        // Default Avatar
        defaultAvatar: 'placeholder-avatar.png' // Add a placeholder image in your project folder
    };

    const DOMElements = {};
    for (const key in Selectors) {
        if (!key.endsWith('Instance')) { // Don't query for modal instances yet
            DOMElements[key] = document.querySelector(Selectors[key]);
        }
    }

    // Initialize Bootstrap Modals
    if (DOMElements.authModal) {
        DOMElements.authModalInstance = new bootstrap.Modal(DOMElements.authModal);
    }
    if (DOMElements.profileModal) {
        DOMElements.profileModalInstance = new bootstrap.Modal(DOMElements.profileModal);
    }
     if (DOMElements.settingsModal) {
        DOMElements.settingsModalInstance = new bootstrap.Modal(DOMElements.settingsModal);
    }

    // --- State ---
    let currentUser = null;
    let currentUserData = null;
    let currentChannel = 'general';
    let messageListenerUnsubscribe = null;
    let avatarFile = null; // To store selected avatar file for upload

    // --- Utility Functions ---
    const showElement = (el) => el?.classList.remove('d-none');
    const hideElement = (el) => el?.classList.add('d-none');
    const enableElement = (el) => el?.removeAttribute('disabled');
    const disableElement = (el) => el?.setAttribute('disabled', 'true');

    const displayAuthError = (formType, error) => {
        const errorElement = (formType === 'login') ? DOMElements.loginError : DOMElements.signupError;
        if (errorElement) {
            errorElement.textContent = error.message || 'An unknown error occurred.';
            showElement(errorElement);
        }
        console.error(`${formType} Error:`, error);
    };

    const clearAuthErrors = () => {
        hideElement(DOMElements.loginError);
        hideElement(DOMElements.signupError);
        DOMElements.loginError.textContent = '';
        DOMElements.signupError.textContent = '';
    };

     const displaySettingsFeedback = (type, message) => {
        const successEl = DOMElements.settingsSuccess;
        const errorEl = DOMElements.settingsError;
        hideElement(successEl);
        hideElement(errorEl); // Hide both first

        if (type === 'success') {
            successEl.textContent = message || 'Changes saved successfully!';
            showElement(successEl);
        } else if (type === 'error') {
            errorEl.textContent = message || 'Failed to save changes. Please try again.';
            showElement(errorEl);
        }
        // Automatically hide after a few seconds
        setTimeout(() => {
             hideElement(successEl);
             hideElement(errorEl);
        }, 5000);
    };

    // --- Theme Management ---
    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (DOMElements.themeToggle) {
            DOMElements.themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        }
        localStorage.setItem('theme', theme);
    };

    const toggleTheme = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    };

    // --- UI Updates ---
    const updateUIAfterAuthStateChange = async (user) => {
        currentUser = user; // Update global state
        if (user) {
            hideElement(DOMElements.authButtons);
            hideElement(DOMElements.authButtonsInline);
            showElement(DOMElements.userMenu);
            showElement(DOMElements.communityContainer);
            hideElement(DOMElements.communityLoginPrompt);

            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUserData = userDoc.data();
                } else {
                     // Handle case where user exists in Auth but not Firestore (e.g., error during signup)
                     console.warn("User document not found in Firestore for UID:", user.uid);
                     // Create a basic entry if needed
                     currentUserData = await createUserProfile(user, user.displayName);
                }
                DOMElements.menuUserName.textContent = currentUserData.displayName || user.displayName || 'User';
                DOMElements.menuUserAvatar.src = currentUserData.avatar || user.photoURL || Selectors.defaultAvatar;

                 // Update message input placeholder
                updateMessageInputPlaceholder();
                // Load messages for the current channel
                loadMessages();

            } catch (error) {
                console.error("Error fetching user data:", error);
                // Use default values
                DOMElements.menuUserName.textContent = user.displayName || 'User';
                DOMElements.menuUserAvatar.src = user.photoURL || Selectors.defaultAvatar;
                currentUserData = { displayName: user.displayName, avatar: user.photoURL || Selectors.defaultAvatar, email: user.email }; // Basic fallback
                loadMessages(); // Still try to load messages
            }
        } else {
            showElement(DOMElements.authButtons);
            showElement(DOMElements.authButtonsInline);
            hideElement(DOMElements.userMenu);
            hideElement(DOMElements.communityContainer);
            showElement(DOMElements.communityLoginPrompt);
            DOMElements.menuUserName.textContent = 'User';
            DOMElements.menuUserAvatar.src = Selectors.defaultAvatar;
            currentUserData = null;
            // Clear chat and unsubscribe listener
            clearMessages();
            unsubscribeMessageListener();
        }
    };

    // --- Authentication ---
    const createUserProfile = async (user, displayName = null) => {
        const userData = {
            displayName: displayName || user.displayName || user.email?.split('@')[0] || 'Anonymous User', // Best effort for name
            email: user.email,
            avatar: user.photoURL || '',
            bio: '',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            await db.collection('users').doc(user.uid).set(userData, { merge: true });
            console.log("User profile created/merged in Firestore for UID:", user.uid);
            return userData;
        } catch (error) {
             console.error("Error creating/merging user profile in Firestore:", error);
             return { ...userData, createdAt: new Date() }; // Return local data on error
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const email = DOMElements.loginEmail.value.trim();
        const password = DOMElements.loginPassword.value;

        if (!email || !password) {
            displayAuthError('login', { message: "Please enter both email and password." });
            return;
        }

        try {
            await auth.signInWithEmailAndPassword(email, password);
            DOMElements.authModalInstance.hide();
            DOMElements.loginForm.reset();
        } catch (error) {
            displayAuthError('login', error);
        }
    };

    const handleEmailSignup = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const name = DOMElements.signupName.value.trim();
        const email = DOMElements.signupEmail.value.trim();
        const password = DOMElements.signupPassword.value;

        if (!name || !email || !password) {
            displayAuthError('signup', { message: "Please fill in all fields." });
            return;
        }
        if (password.length < 6) {
            displayAuthError('signup', { message: "Password must be at least 6 characters long." });
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            await createUserProfile(userCredential.user, name); // Create Firestore doc
            DOMElements.authModalInstance.hide();
            DOMElements.signupForm.reset();
        } catch (error) {
            displayAuthError('signup', error);
        }
    };

    const handleGoogleAuth = async () => {
        clearAuthErrors();
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            // Create or update user profile in Firestore on successful Google sign-in
            await createUserProfile(user);
            DOMElements.authModalInstance.hide();
        } catch (error) {
            // Handle different Google auth errors (popup closed, account exists, etc.)
            if (error.code === 'auth/popup-closed-by-user') {
                 console.log("Google sign-in cancelled by user.");
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                 displayAuthError('login', {message: "An account already exists with this email. Try logging in."});
                 displayAuthError('signup', {message: "An account already exists with this email. Try logging in."});
            } else {
                console.error("Google Sign-in Error:", error);
                displayAuthError('login', error);
                displayAuthError('signup', error);
            }
        }
    };

    const handleLogout = async (e) => {
        e?.preventDefault(); // Prevent default if called from link click
        try {
            await auth.signOut();
            // Auth state listener will handle UI updates
            console.log("User logged out successfully.");
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Logout failed. Please try again.");
        }
    };

    // --- Modals ---
    const showAuthModal = (mode = 'login') => {
        clearAuthErrors();
        if (DOMElements.authModalInstance) {
            // Activate the correct tab programmatically
            const tabElement = (mode === 'login') ? DOMElements.loginTab : DOMElements.signupTab;
            if (tabElement) {
                const tab = new bootstrap.Tab(tabElement);
                tab.show();
            }
            DOMElements.authModalInstance.show();
        }
    };

    const showProfileModal = () => {
        if (currentUser && currentUserData && DOMElements.profileModalInstance) {
            DOMElements.profileModalAvatar.src = currentUserData.avatar || currentUser.photoURL || Selectors.defaultAvatar;
            DOMElements.profileModalName.textContent = currentUserData.displayName || currentUser.displayName || 'User';
            DOMElements.profileModalEmail.textContent = currentUserData.email || currentUser.email || 'No email';
            DOMElements.profileModalBio.textContent = currentUserData.bio || 'No bio provided yet.';
            // TODO: Fetch and display stats (projects, followers, following) if available
            // DOMElements.statProjects.textContent = currentUserData.projectCount || 0;
            // DOMElements.statFollowers.textContent = currentUserData.followerCount || 0;
            // DOMElements.statFollowing.textContent = currentUserData.followingCount || 0;
            DOMElements.profileModalInstance.show();
        } else {
             console.warn("Cannot show profile modal: No user data available.");
             showAuthModal('login'); // Prompt login if trying to view profile while logged out
        }
    };

     const showSettingsModal = () => {
        if (currentUser && currentUserData && DOMElements.settingsModalInstance) {
            hideElement(DOMElements.settingsSuccess);
            hideElement(DOMElements.settingsError);
            DOMElements.settingsName.value = currentUserData.displayName || '';
            DOMElements.settingsEmail.value = currentUserData.email || currentUser.email || ''; // Email usually not editable
            DOMElements.settingsBio.value = currentUserData.bio || '';
            DOMElements.avatarPreview.src = currentUserData.avatar || currentUser.photoURL || Selectors.defaultAvatar;
            avatarFile = null; // Reset selected file
            DOMElements.avatarInput.value = ''; // Clear file input
            DOMElements.settingsModalInstance.show();
        } else {
            console.warn("Cannot show settings modal: No user data available.");
             showAuthModal('login');
        }
    };

    // --- Settings & Profile Update ---
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Basic validation (type and size)
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            const maxSize = 2 * 1024 * 1024; // 2MB

            if (!allowedTypes.includes(file.type)) {
                displaySettingsFeedback('error', 'Invalid file type. Please upload JPG, PNG, or GIF.');
                avatarFile = null;
                DOMElements.avatarInput.value = '';
                return;
            }
            if (file.size > maxSize) {
                displaySettingsFeedback('error', 'File size exceeds 2MB limit.');
                avatarFile = null;
                DOMElements.avatarInput.value = '';
                return;
            }

            avatarFile = file; // Store file for upload
            // Display preview
            const reader = new FileReader();
            reader.onload = (event) => {
                DOMElements.avatarPreview.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        avatarFile = null; // Clear stored file
        DOMElements.avatarInput.value = ''; // Clear file input
        DOMElements.avatarPreview.src = Selectors.defaultAvatar; // Reset to default
        // Optional: Mark for removal on save if you want to delete existing avatar
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        showElement(DOMElements.settingsSpinner);
        disableElement(DOMElements.saveSettingsBtn);
        hideElement(DOMElements.settingsSuccess);
        hideElement(DOMElements.settingsError);

        const newName = DOMElements.settingsName.value.trim();
        const newBio = DOMElements.settingsBio.value.trim();
        let newAvatarURL = currentUserData.avatar || ''; // Start with current avatar URL

        try {
            // 1. Upload new avatar if selected
            if (avatarFile) {
                const storageRef = storage.ref(`avatars/${currentUser.uid}/${avatarFile.name}`);
                const uploadTask = await storageRef.put(avatarFile);
                newAvatarURL = await uploadTask.ref.getDownloadURL();
                console.log("Avatar uploaded:", newAvatarURL);
            } else if (DOMElements.avatarPreview.src === Selectors.defaultAvatar && currentUserData.avatar) {
                 // If preview is default and there WAS an avatar, user removed it
                 newAvatarURL = ''; // Set to empty to remove avatar
                 // Optionally: Delete the old avatar from storage here
                 // try { await storage.refFromURL(currentUserData.avatar).delete(); } catch(delErr) { console.warn("Could not delete old avatar", delErr); }
            }

            // 2. Prepare data for Firestore update
            const updates = {
                displayName: newName,
                bio: newBio,
                avatar: newAvatarURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 3. Update Auth profile (only displayName and photoURL can be updated)
            await currentUser.updateProfile({
                displayName: newName,
                photoURL: newAvatarURL // Update Auth photoURL as well
            });
            console.log("Auth profile updated.");

            // 4. Update Firestore document
            await db.collection('users').doc(currentUser.uid).update(updates);
            console.log("Firestore profile updated.");

            // 5. Update local state and UI immediately
            currentUserData = { ...currentUserData, ...updates }; // Update local cache
            DOMElements.menuUserName.textContent = newName;
            DOMElements.menuUserAvatar.src = newAvatarURL || Selectors.defaultAvatar;

            displaySettingsFeedback('success');
            setTimeout(() => DOMElements.settingsModalInstance.hide(), 1500); // Hide modal after success

        } catch (error) {
            console.error("Settings update failed:", error);
            displaySettingsFeedback('error', `Update failed: ${error.message}`);
        } finally {
            hideElement(DOMElements.settingsSpinner);
            enableElement(DOMElements.saveSettingsBtn);
            avatarFile = null; // Reset file state
        }
    };

    // --- Community Chat ---
    const clearMessages = () => {
        DOMElements.chatMessages.innerHTML = '<div class="text-center text-muted p-5">Select a channel to view messages.</div>';
    };

    const unsubscribeMessageListener = () => {
        if (messageListenerUnsubscribe) {
            messageListenerUnsubscribe();
            messageListenerUnsubscribe = null;
            console.log("Unsubscribed from previous channel:", currentChannel);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp?.toDate) return ''; // Check if it's a Firestore timestamp
        const date = timestamp.toDate();
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };

    const createMessageElement = (msgData, msgId) => {
        const isMyMessage = msgData.uid === currentUser?.uid;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message animate-fade-in ${isMyMessage ? 'my-message' : ''}`;
        messageDiv.dataset.messageId = msgId;

        const avatarSrc = msgData.avatar || Selectors.defaultAvatar;
        const displayName = msgData.displayName || 'Anonymous';
        const timeString = formatTimestamp(msgData.timestamp);

        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarSrc}" alt="${displayName} Avatar">
            </div>
            <div class="message-content">
                <div class="message-header">
                    ${!isMyMessage ? `<span class="message-username">${displayName}</span>` : ''}
                    <span class="message-time">${timeString}</span>
                </div>
                <div class="message-text">${msgData.text}</div>
            </div>
        `;
        return messageDiv;
    };

    const scrollToBottom = () => {
        // Use setTimeout to allow the DOM to update before scrolling
        setTimeout(() => {
            DOMElements.chatMessages.scrollTop = DOMElements.chatMessages.scrollHeight;
        }, 50);
    };


    const loadMessages = () => {
        if (!currentUser || !DOMElements.chatMessages) {
            clearMessages();
            return; // Don't load if not logged in or element doesn't exist
        }

        unsubscribeMessageListener(); // Unsubscribe from the previous channel first
        DOMElements.chatMessages.innerHTML = '<div class="text-center text-muted p-5"><span class="spinner-border spinner-border-sm"></span> Loading messages...</div>'; // Loading indicator

        const messagesRef = db.collection('channels')
            .doc(currentChannel)
            .collection('messages')
            .orderBy('timestamp', 'asc')
            .limit(100); // Limit messages loaded initially

        console.log(`Subscribing to channel: ${currentChannel}`);

        messageListenerUnsubscribe = messagesRef.onSnapshot(snapshot => {
            console.log(`Received snapshot for ${currentChannel} with ${snapshot.docChanges().length} changes.`);
            if (snapshot.empty && DOMElements.chatMessages.querySelector('.spinner-border')) {
                 DOMElements.chatMessages.innerHTML = `<div class="text-center text-muted p-5">No messages in #${currentChannel} yet. Start the conversation!</div>`;
            } else if (snapshot.docChanges().length > 0 && DOMElements.chatMessages.querySelector('.spinner-border, .text-muted')) {
                // Clear loading/empty message only when first real messages arrive
                DOMElements.chatMessages.innerHTML = '';
            }

            snapshot.docChanges().forEach(change => {
                const msgData = change.doc.data();
                const msgId = change.doc.id;

                if (change.type === "added") {
                    // Check if message already exists (prevents duplicates on initial load/reconnect)
                    if (!DOMElements.chatMessages.querySelector(`[data-message-id="${msgId}"]`)) {
                        const messageElement = createMessageElement(msgData, msgId);
                        DOMElements.chatMessages.appendChild(messageElement);
                    }
                }
                // TODO: Handle modified or removed messages if needed
                // if (change.type === "modified") { ... }
                // if (change.type === "removed") { ... }
            });
            scrollToBottom(); // Scroll after processing changes

        }, error => {
            console.error(`Error fetching messages for channel ${currentChannel}:`, error);
            DOMElements.chatMessages.innerHTML = `<div class="text-center text-danger p-5">Error loading messages. Please try again later.</div>`;
            unsubscribeMessageListener(); // Stop listening on error
        });
    };

     const updateMessageInputPlaceholder = () => {
        if (DOMElements.messageInput) {
             DOMElements.messageInput.placeholder = `Type your message in #${currentChannel}...`;
        }
    };

    const handleChannelSwitch = (e) => {
        e.preventDefault();
        const target = e.target.closest('.sidebar-item');
        if (!target || target.classList.contains('active')) return; // Ignore clicks outside items or on active item

        // Remove active class from all items
        document.querySelectorAll('#channelList .sidebar-item').forEach(item => item.classList.remove('active'));

        // Add active class to clicked item
        target.classList.add('active');

        // Update current channel and load messages
        currentChannel = target.dataset.channel || 'general';
        console.log("Switched to channel:", currentChannel);
        updateMessageInputPlaceholder();
        loadMessages();
    };

    const handleSendMessage = async () => {
        const text = DOMElements.messageInput.value.trim();
        if (!text || !currentUser || !currentUserData) {
            console.warn("Cannot send message: Empty message or user not logged in/data not loaded.");
            return;
        }

        const messageData = {
            text: text,
            uid: currentUser.uid,
            displayName: currentUserData.displayName || currentUser.displayName || 'Anonymous',
            avatar: currentUserData.avatar || currentUser.photoURL || '', // Use stored data first
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            await db.collection('channels').doc(currentChannel).collection('messages').add(messageData);
            DOMElements.messageInput.value = ''; // Clear input on success
            console.log("Message sent to channel:", currentChannel);
            // scrollToBottom(); // Let the listener handle scrolling
        } catch (error) {
            console.error("Error sending message:", error);
            alert(`Failed to send message: ${error.message}`);
        }
    };


    // --- Initialization ---
    const initApp = () => {
        // Set initial theme
        const preferredTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
        applyTheme(preferredTheme);

        // Set current year in footer
        if (DOMElements.currentYear) {
            DOMElements.currentYear.textContent = new Date().getFullYear();
        }

        // Add Event Listeners
        DOMElements.themeToggle?.addEventListener('click', toggleTheme);

        // Auth Modal Triggers
        DOMElements.loginBtn?.addEventListener('click', () => showAuthModal('login'));
        DOMElements.signupBtn?.addEventListener('click', () => showAuthModal('signup'));
        DOMElements.loginBtnMobile?.addEventListener('click', () => showAuthModal('login'));
        DOMElements.signupBtnMobile?.addEventListener('click', () => showAuthModal('signup'));
        DOMElements.communityLoginBtn?.addEventListener('click', () => showAuthModal('login'));

        // Auth Form Submissions
        DOMElements.loginForm?.addEventListener('submit', handleEmailLogin);
        DOMElements.signupForm?.addEventListener('submit', handleEmailSignup);
        DOMElements.googleLoginBtn?.addEventListener('click', handleGoogleAuth);
        DOMElements.googleSignupBtn?.addEventListener('click', handleGoogleAuth); // Same handler for both

        // User Menu Actions
        DOMElements.logoutMenuItem?.addEventListener('click', handleLogout);
        DOMElements.profileMenuItem?.addEventListener('click', (e) => { e.preventDefault(); showProfileModal(); });
        DOMElements.settingsMenuItem?.addEventListener('click', (e) => { e.preventDefault(); showSettingsModal(); });
        DOMElements.editProfileBtn?.addEventListener('click', () => { // Button within Profile Modal
            DOMElements.profileModalInstance?.hide();
            showSettingsModal();
        });

        // Settings Modal Actions
        DOMElements.settingsForm?.addEventListener('submit', handleSettingsSave);
        DOMElements.uploadAvatarBtn?.addEventListener('click', () => DOMElements.avatarInput?.click());
        DOMElements.avatarInput?.addEventListener('change', handleAvatarChange);
        DOMElements.removeAvatarBtn?.addEventListener('click', handleRemoveAvatar);

        // Chat Actions
        DOMElements.channelList?.addEventListener('click', handleChannelSwitch);
        DOMElements.sendMessageBtn?.addEventListener('click', handleSendMessage);
        DOMElements.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
                e.preventDefault(); // Prevent default newline insertion
                handleSendMessage();
            }
        });

        // Firebase Auth State Listener (triggers UI updates)
        auth.onAuthStateChanged(updateUIAfterAuthStateChange);

        console.log("3D Craft App Initialized");
    };

    // Start the application
    initApp();
});
