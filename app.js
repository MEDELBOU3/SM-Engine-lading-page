document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Configuration ---
    // WARNING: Exposing API keys client-side is insecure for production.
    // Use environment variables and/or a backend function for secure handling.
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
        if (!firebase.apps.length) { // Prevent re-initialization
             firebase.initializeApp(firebaseConfig);
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        alert("Application could not start: Firebase initialization failed. Check console and API keys.");
        return; // Stop script execution
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
        authButtons: '.auth-buttons', // Desktop container
        authButtonsInline: '.auth-buttons-inline', // Mobile container
        userMenuDesktopContainer: '#userMenuDesktopContainer',
        userMenuMobileContainer: '#userMenuMobileContainer',
        menuUserAvatarDesktop: '#menuUserAvatarDesktop',
        menuUserNameDesktop: '#menuUserNameDesktop',
        menuUserAvatarMobile: '#menuUserAvatarMobile',
        menuUserNameMobile: '#menuUserNameMobile',
        profileMenuItemDesktop: '#profileMenuItemDesktop',
        settingsMenuItemDesktop: '#settingsMenuItemDesktop',
        logoutMenuItemDesktop: '#logoutMenuItemDesktop',
        profileMenuItemMobile: '#profileMenuItemMobile',
        settingsMenuItemMobile: '#settingsMenuItemMobile',
        logoutMenuItemMobile: '#logoutMenuItemMobile',
        // Auth Modal Elements
        authModalInstance: null,
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
        bioCharCount: '#bioCharCount',
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
        defaultAvatar: 'placeholder-avatar.png' // Path to your default avatar image
    };

    const DOMElements = {};
    for (const key in Selectors) {
        if (!key.endsWith('Instance')) {
            try {
                DOMElements[key] = document.querySelector(Selectors[key]);
                if (!DOMElements[key] && key !== 'bioCharCount') { // Allow bioCharCount to be optional initially
                    // console.warn(`DOM Element not found for selector: ${Selectors[key]} (key: ${key})`);
                }
            } catch (e) {
                console.error(`Error selecting element for key ${key} with selector ${Selectors[key]}:`, e);
            }
        }
    }

    // Initialize Bootstrap Modals & Tooltips
    try {
        if (DOMElements.authModal) DOMElements.authModalInstance = new bootstrap.Modal(DOMElements.authModal);
        if (DOMElements.profileModal) DOMElements.profileModalInstance = new bootstrap.Modal(DOMElements.profileModal);
        if (DOMElements.settingsModal) DOMElements.settingsModalInstance = new bootstrap.Modal(DOMElements.settingsModal);

        // Initialize tooltips (optional, like for the community settings button)
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
    } catch (e) {
        console.error("Error initializing Bootstrap components:", e);
    }


    // --- State ---
    let currentUser = null;
    let currentUserData = null; // Holds Firestore user data
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
        if (DOMElements.loginError) DOMElements.loginError.textContent = '';
        if (DOMElements.signupError) DOMElements.signupError.textContent = '';
    };

    const displaySettingsFeedback = (type, message) => {
        const successEl = DOMElements.settingsSuccess;
        const errorEl = DOMElements.settingsError;
        hideElement(successEl);
        hideElement(errorEl);

        if (type === 'success' && successEl) {
            successEl.textContent = message || 'Changes saved successfully!';
            showElement(successEl);
        } else if (type === 'error' && errorEl) {
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

    // --- UI Updates based on Auth State ---
    const updateUIAfterAuthStateChange = async (user) => {
        currentUser = user; // Update global state

        if (user) {
            // --- User is Logged In ---
            hideElement(DOMElements.authButtons); // Hide desktop login/signup
            hideElement(DOMElements.authButtonsInline); // Hide mobile login/signup
            showElement(DOMElements.userMenuDesktopContainer); // Show desktop user menu
            showElement(DOMElements.userMenuMobileContainer); // Show mobile user menu
            hideElement(DOMElements.communityLoginPrompt); // Hide login prompt for community
            showElement(DOMElements.communityContainer); // Show community chat interface

            try {
                // Fetch user data from Firestore
                const userDocRef = db.collection('users').doc(user.uid);
                const userDoc = await userDocRef.get();

                if (userDoc.exists) {
                    currentUserData = userDoc.data();
                    console.log("User data fetched from Firestore:", currentUserData);
                } else {
                     // User exists in Auth but not Firestore (e.g., incomplete signup, direct Google sign in before profile creation)
                     console.warn("User document not found in Firestore for UID:", user.uid, "Attempting to create one.");
                     // Create a profile document using Auth info
                     currentUserData = await createUserProfile(user, user.displayName); // Pass displayName from Auth
                }

                // Update User Menu (Desktop & Mobile)
                const userName = currentUserData?.displayName || user.displayName || 'User';
                const userAvatar = currentUserData?.avatar || user.photoURL || Selectors.defaultAvatar;

                if (DOMElements.menuUserNameDesktop) DOMElements.menuUserNameDesktop.textContent = userName;
                if (DOMElements.menuUserAvatarDesktop) DOMElements.menuUserAvatarDesktop.src = userAvatar;
                if (DOMElements.menuUserNameMobile) DOMElements.menuUserNameMobile.textContent = userName;
                if (DOMElements.menuUserAvatarMobile) DOMElements.menuUserAvatarMobile.src = userAvatar;


                // Update message input placeholder with current channel
                updateMessageInputPlaceholder();
                // Load messages for the default/current channel
                loadMessages();

            } catch (error) {
                console.error("Error fetching or creating user data:", error);
                // Use basic fallback data from Auth
                currentUserData = { displayName: user.displayName, avatar: user.photoURL, email: user.email };
                 const userName = user.displayName || 'User';
                 const userAvatar = user.photoURL || Selectors.defaultAvatar;
                 if (DOMElements.menuUserNameDesktop) DOMElements.menuUserNameDesktop.textContent = userName;
                 if (DOMElements.menuUserAvatarDesktop) DOMElements.menuUserAvatarDesktop.src = userAvatar;
                 if (DOMElements.menuUserNameMobile) DOMElements.menuUserNameMobile.textContent = userName;
                 if (DOMElements.menuUserAvatarMobile) DOMElements.menuUserAvatarMobile.src = userAvatar;

                // Still try to load messages, but user might not be able to send if data is incomplete
                loadMessages();
            }
        } else {
            // --- User is Logged Out ---
            currentUserData = null; // Clear user data
            showElement(DOMElements.authButtons); // Show desktop login/signup
            showElement(DOMElements.authButtonsInline); // Show mobile login/signup
            hideElement(DOMElements.userMenuDesktopContainer); // Hide desktop user menu
            hideElement(DOMElements.userMenuMobileContainer); // Hide mobile user menu
            showElement(DOMElements.communityLoginPrompt); // Show login prompt for community
            hideElement(DOMElements.communityContainer); // Hide community chat interface

            // Reset User Menu placeholders (optional)
            if (DOMElements.menuUserNameDesktop) DOMElements.menuUserNameDesktop.textContent = 'User';
            if (DOMElements.menuUserAvatarDesktop) DOMElements.menuUserAvatarDesktop.src = Selectors.defaultAvatar;
            if (DOMElements.menuUserNameMobile) DOMElements.menuUserNameMobile.textContent = 'User';
            if (DOMElements.menuUserAvatarMobile) DOMElements.menuUserAvatarMobile.src = Selectors.defaultAvatar;

            // Clear chat messages and unsubscribe listener
            clearMessages();
            unsubscribeMessageListener();
        }
    };

    // --- Authentication ---

    // Creates or updates user profile in Firestore
    const createUserProfile = async (user, displayName = null) => {
        if (!user) return null;
        const userDocRef = db.collection('users').doc(user.uid);

        // Prepare base data, prioritizing provided displayName, then Auth displayName, then email part
        const userData = {
            displayName: displayName?.trim() || user.displayName?.trim() || user.email?.split('@')[0] || 'Anonymous User',
            email: user.email,
            avatar: user.photoURL || '', // Default to Auth photoURL or empty
            bio: '', // Default empty bio
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Timestamp on creation
            lastLogin: firebase.firestore.FieldValue.serverTimestamp() // Update on login/creation
        };

        try {
            // Use set with merge: true to create if not exists, or update if exists
            // This updates lastLogin every time and merges other fields if they already exist
             await userDocRef.set(userData, { merge: true });
            console.log("User profile created/updated in Firestore for UID:", user.uid);
            // Return the data we attempted to save (fetch latest in updateUIAfterAuthStateChange if needed)
            // Add a non-server timestamp locally for immediate use if needed
            return { ...userData, createdAt: new Date(), lastLogin: new Date() };
        } catch (error) {
             console.error("Error creating/updating user profile in Firestore:", error);
             // Return local data as fallback
             return { ...userData, createdAt: new Date(), lastLogin: new Date() };
        }
    };

    const handleEmailLogin = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const email = DOMElements.loginEmail?.value.trim();
        const password = DOMElements.loginPassword?.value;

        if (!email || !password) {
            displayAuthError('login', { message: "Please enter both email and password." });
            return;
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            // Optionally update lastLogin time on successful login
            await db.collection('users').doc(userCredential.user.uid).set({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            DOMElements.authModalInstance?.hide();
            DOMElements.loginForm?.reset();
        } catch (error) {
            displayAuthError('login', error);
        }
    };

    const handleEmailSignup = async (e) => {
        e.preventDefault();
        clearAuthErrors();
        const name = DOMElements.signupName?.value.trim();
        const email = DOMElements.signupEmail?.value.trim();
        const password = DOMElements.signupPassword?.value;

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
            // Update Auth profile immediately (especially displayName)
            await userCredential.user.updateProfile({ displayName: name });
            // Create the Firestore document using the provided name
            await createUserProfile(userCredential.user, name);
            DOMElements.authModalInstance?.hide();
            DOMElements.signupForm?.reset();
        } catch (error) {
             // Handle specific errors like email-already-in-use
             if (error.code === 'auth/email-already-in-use') {
                 displayAuthError('signup', { message: "This email address is already registered. Please log in." });
             } else {
                displayAuthError('signup', error);
             }
        }
    };

    const handleGoogleAuth = async () => {
        clearAuthErrors();
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            // Create or update user profile in Firestore after successful Google sign-in
            // This handles both new users and existing users logging in via Google
            await createUserProfile(user);
            DOMElements.authModalInstance?.hide();
        } catch (error) {
            if (error.code === 'auth/popup-closed-by-user') {
                 console.log("Google sign-in cancelled by user.");
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                 // This error means the email is already linked to a different provider (e.g., Email/Password)
                 // You might want to guide the user to link accounts or log in with the original method.
                 const message = "An account already exists with this email using a different sign-in method. Try logging in with your original method.";
                 displayAuthError('login', {message: message});
                 displayAuthError('signup', {message: message});
            } else {
                console.error("Google Sign-in Error:", error);
                displayAuthError('login', error); // Show error on both tabs potentially
                displayAuthError('signup', error);
            }
        }
    };

    const handleLogout = async (e) => {
        e?.preventDefault(); // Prevent default if called from link click
        try {
            await auth.signOut();
            // Auth state listener (updateUIAfterAuthStateChange) will handle UI updates
            console.log("User logged out successfully.");
            // Close mobile navbar if open
            const navbarCollapse = document.getElementById('navbarNav');
            if (navbarCollapse?.classList.contains('show')) {
                const toggler = document.querySelector('.navbar-toggler');
                toggler?.click(); // Simulate click to close
            }
        } catch (error) {
            console.error("Logout failed:", error);
            alert("Logout failed. Please try again.");
        }
    };

    // --- Modals ---
    const showAuthModal = (mode = 'login') => {
        clearAuthErrors();
        if (DOMElements.authModalInstance) {
            const tabElement = (mode === 'login') ? DOMElements.loginTab : DOMElements.signupTab;
            if (tabElement) {
                try {
                    const tab = bootstrap.Tab.getOrCreateInstance(tabElement);
                    tab.show();
                } catch (e) {
                    console.error("Error showing auth tab:", e);
                }
            }
            DOMElements.authModalInstance.show();
        } else {
             console.error("Auth modal instance not found.");
        }
    };

    const showProfileModal = () => {
        if (currentUser && currentUserData && DOMElements.profileModalInstance) {
            DOMElements.profileModalAvatar.src = currentUserData.avatar || Selectors.defaultAvatar;
            DOMElements.profileModalName.textContent = currentUserData.displayName || 'User';
            DOMElements.profileModalEmail.textContent = currentUserData.email || currentUser.email || 'No email provided';
            DOMElements.profileModalBio.textContent = currentUserData.bio || 'No bio provided yet. Edit your profile in settings!';
            // Placeholder stats - replace with actual data if you track it
            // DOMElements.statProjects.textContent = currentUserData.projectCount || 0;
            // DOMElements.statFollowers.textContent = currentUserData.followerCount || 0;
            // DOMElements.statFollowing.textContent = currentUserData.followingCount || 0;
            DOMElements.profileModalInstance.show();
        } else {
             console.warn("Cannot show profile modal: User not logged in or data not available.");
             showAuthModal('login'); // Prompt login if trying to view profile while logged out
        }
    };

     const showSettingsModal = () => {
        if (currentUser && currentUserData && DOMElements.settingsModalInstance) {
            hideElement(DOMElements.settingsSuccess);
            hideElement(DOMElements.settingsError);
            DOMElements.settingsName.value = currentUserData.displayName || '';
            DOMElements.settingsEmail.value = currentUserData.email || currentUser.email || '';
            DOMElements.settingsBio.value = currentUserData.bio || '';
            DOMElements.avatarPreview.src = currentUserData.avatar || Selectors.defaultAvatar;
            avatarFile = null; // Reset selected file state
            if(DOMElements.avatarInput) DOMElements.avatarInput.value = ''; // Clear file input visually
            updateBioCharCount(); // Update char count on open
            DOMElements.settingsModalInstance.show();
        } else {
            console.warn("Cannot show settings modal: User not logged in or data not available.");
             showAuthModal('login');
        }
    };

    // --- Settings & Profile Update ---

    // Update character count for Bio
    const updateBioCharCount = () => {
        if (DOMElements.settingsBio && DOMElements.bioCharCount) {
            const currentLength = DOMElements.settingsBio.value.length;
            DOMElements.bioCharCount.textContent = currentLength;
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file && DOMElements.avatarPreview) {
            // Basic validation (type and size)
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            const maxSize = 2 * 1024 * 1024; // 2MB

            if (!allowedTypes.includes(file.type)) {
                displaySettingsFeedback('error', 'Invalid file type. Please upload JPG, PNG, or GIF.');
                avatarFile = null;
                e.target.value = ''; // Clear input
                return;
            }
            if (file.size > maxSize) {
                displaySettingsFeedback('error', `File size exceeds ${maxSize / 1024 / 1024}MB limit.`);
                avatarFile = null;
                e.target.value = ''; // Clear input
                return;
            }

            avatarFile = file; // Store file object for upload
            // Display preview
            const reader = new FileReader();
            reader.onload = (event) => {
                DOMElements.avatarPreview.src = event.target.result;
            };
            reader.onerror = (error) => {
                 console.error("FileReader error:", error);
                 displaySettingsFeedback('error', 'Error reading file for preview.');
                 avatarFile = null;
                 e.target.value = '';
            };
            reader.readAsDataURL(file);
             hideElement(DOMElements.settingsSuccess); // Hide any previous success message
             hideElement(DOMElements.settingsError); // Hide any previous error message
        }
    };

    const handleRemoveAvatar = () => {
        avatarFile = 'REMOVE'; // Special flag to indicate removal on save
        if(DOMElements.avatarInput) DOMElements.avatarInput.value = ''; // Clear file input visually
        if(DOMElements.avatarPreview) DOMElements.avatarPreview.src = Selectors.defaultAvatar; // Reset preview
        hideElement(DOMElements.settingsSuccess);
        hideElement(DOMElements.settingsError);
        console.log("Avatar marked for removal.");
    };

    const handleSettingsSave = async (e) => {
        e.preventDefault();
        if (!currentUser || !currentUserData) {
             console.error("Cannot save settings: User not logged in or data missing.");
             return;
        }

        showElement(DOMElements.settingsSpinner);
        disableElement(DOMElements.saveSettingsBtn);
        hideElement(DOMElements.settingsSuccess);
        hideElement(DOMElements.settingsError);

        const newName = DOMElements.settingsName?.value.trim();
        const newBio = DOMElements.settingsBio?.value.trim();
        let newAvatarURL = currentUserData.avatar || ''; // Start with current Firestore avatar URL

        if (!newName) {
            displaySettingsFeedback('error', 'Display Name cannot be empty.');
            hideElement(DOMElements.settingsSpinner);
            enableElement(DOMElements.saveSettingsBtn);
            return;
        }

        try {
            // 1. Handle Avatar Upload/Removal
            if (avatarFile === 'REMOVE') {
                 // User clicked remove - set URL to empty
                 newAvatarURL = '';
                 console.log("Removing avatar.");
                 // Optional: Delete old avatar from storage if it exists
                 if (currentUserData.avatar) {
                     try {
                         const oldAvatarRef = storage.refFromURL(currentUserData.avatar);
                         await oldAvatarRef.delete();
                         console.log("Old avatar deleted from storage.");
                     } catch (deleteError) {
                         // Non-critical error if deletion fails (e.g., already deleted, permissions)
                         console.warn("Could not delete old avatar from storage:", deleteError);
                     }
                 }
            } else if (avatarFile instanceof File) {
                // New file selected for upload
                const filePath = `avatars/${currentUser.uid}/${Date.now()}_${avatarFile.name}`;
                const storageRef = storage.ref(filePath);
                const uploadTask = await storageRef.put(avatarFile);
                newAvatarURL = await uploadTask.ref.getDownloadURL();
                console.log("New avatar uploaded:", newAvatarURL);
                // Optional: Delete previous avatar if it existed and is different
                if (currentUserData.avatar && currentUserData.avatar !== newAvatarURL) {
                     try {
                         const oldAvatarRef = storage.refFromURL(currentUserData.avatar);
                         await oldAvatarRef.delete();
                         console.log("Replaced old avatar deleted from storage.");
                     } catch (deleteError) {
                         console.warn("Could not delete replaced avatar:", deleteError);
                     }
                }
            }
            // If avatarFile is null, newAvatarURL remains the current URL (no change)

            // 2. Prepare data for Firestore update
            const updates = {
                displayName: newName,
                bio: newBio,
                avatar: newAvatarURL, // This will be the new URL or empty string if removed
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // 3. Update Auth profile (displayName and photoURL)
            // Important: Only update Auth if values actually changed to avoid unnecessary operations
            const authUpdates = {};
            if (currentUser.displayName !== newName) {
                authUpdates.displayName = newName;
            }
            if (currentUser.photoURL !== newAvatarURL) {
                 authUpdates.photoURL = newAvatarURL;
            }
            if (Object.keys(authUpdates).length > 0) {
                 await currentUser.updateProfile(authUpdates);
                 console.log("Firebase Auth profile updated:", authUpdates);
            }


            // 4. Update Firestore document
            await db.collection('users').doc(currentUser.uid).update(updates);
            console.log("Firestore profile updated.");

            // 5. Update local state and UI immediately
            // Fetch the updated document to ensure consistency, especially with server timestamps
             const updatedDoc = await db.collection('users').doc(currentUser.uid).get();
             if (updatedDoc.exists) {
                currentUserData = updatedDoc.data(); // Update local cache with latest data
             } else {
                 // Fallback: Update local cache with the data we sent
                 currentUserData = { ...currentUserData, ...updates, updatedAt: new Date() };
             }

            // Update header menus
            if (DOMElements.menuUserNameDesktop) DOMElements.menuUserNameDesktop.textContent = newName;
            if (DOMElements.menuUserAvatarDesktop) DOMElements.menuUserAvatarDesktop.src = newAvatarURL || Selectors.defaultAvatar;
            if (DOMElements.menuUserNameMobile) DOMElements.menuUserNameMobile.textContent = newName;
            if (DOMElements.menuUserAvatarMobile) DOMElements.menuUserAvatarMobile.src = newAvatarURL || Selectors.defaultAvatar;


            displaySettingsFeedback('success');
            setTimeout(() => DOMElements.settingsModalInstance?.hide(), 1500); // Hide modal after success

        } catch (error) {
            console.error("Settings update failed:", error);
            // Provide more specific error message if possible
            let errorMessage = `Update failed: ${error.message}`;
            if (error.code === 'storage/unauthorized') {
                errorMessage = "Update failed: You do not have permission to upload this file. Check storage rules.";
            } else if (error.code === 'storage/canceled') {
                 errorMessage = "Update failed: File upload was cancelled.";
            }
            displaySettingsFeedback('error', errorMessage);
        } finally {
            hideElement(DOMElements.settingsSpinner);
            enableElement(DOMElements.saveSettingsBtn);
            avatarFile = null; // Reset file state after save attempt
        }
    };

    // --- Community Chat ---
    const clearMessages = () => {
        if (DOMElements.chatMessages) {
            DOMElements.chatMessages.innerHTML = `<div class="text-center text-muted p-5 h-100 d-flex align-items-center justify-content-center">
                                                    <div>Select a channel or log in to view messages.</div>
                                                </div>`;
        }
    };

    const unsubscribeMessageListener = () => {
        if (messageListenerUnsubscribe) {
            messageListenerUnsubscribe(); // Execute the unsubscribe function returned by onSnapshot
            messageListenerUnsubscribe = null;
            console.log("Unsubscribed from message listener for channel:", currentChannel);
        }
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp?.toDate) return ''; // Check if it's a Firestore timestamp
        const date = timestamp.toDate();
        // Simple HH:MM format
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // Creates the HTML element for a single message
    const createMessageElement = (msgData, msgId) => {
        if (!msgData || !msgData.uid) {
            console.warn("Skipping message render due to missing data:", msgData);
            return null; // Don't render incomplete messages
        }

        const isMyMessage = msgData.uid === currentUser?.uid;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isMyMessage ? 'my-message' : ''}`;
        messageDiv.dataset.messageId = msgId; // Store Firestore doc ID

        // Sanitize text content before inserting (basic protection)
        const safeText = msgData.text?.replace(/</g, "&lt;").replace(/>/g, "&gt;") || '';

        const avatarSrc = msgData.avatar || Selectors.defaultAvatar; // Use sender's avatar or default
        const displayName = msgData.displayName || 'Anonymous';
        const timeString = formatTimestamp(msgData.timestamp);

        // Structure based on updated CSS
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <img src="${avatarSrc}" alt="${displayName}'s Avatar" class="rounded-circle">
            </div>
            <div class="message-content">
                <div class="message-header">
                    ${!isMyMessage ? `<span class="message-username">${displayName}</span>` : ''}
                    <span class="message-time">${timeString}</span>
                </div>
                <div class="message-text">
                    ${safeText}
                    <!-- Placeholder for reactions/reply button -->
                    <!--
                    <div class="message-actions mt-1">
                        <button class="btn btn-sm btn-icon btn-outline-secondary" title="React"><i class="far fa-smile"></i></button>
                        <button class="btn btn-sm btn-icon btn-outline-secondary" title="Reply"><i class="fas fa-reply"></i></button>
                    </div>
                    -->
                </div>
            </div>
        `;

        // Add fade-in animation class after creation
        requestAnimationFrame(() => {
             messageDiv.classList.add('animate-fade-in');
        });

        return messageDiv;
    };

    // Scrolls the chat window to the bottom
    const scrollToBottom = (force = false) => {
         if (!DOMElements.chatMessages) return;
         const el = DOMElements.chatMessages;
         // Scroll only if user is near the bottom or forced
         const threshold = 100; // Pixels from bottom
         const shouldScroll = force || (el.scrollHeight - el.scrollTop - el.clientHeight < threshold);

        // Use setTimeout to allow the DOM to update before scrolling
        if(shouldScroll) {
             setTimeout(() => {
                 el.scrollTop = el.scrollHeight;
             }, 50); // Small delay
        }
    };


    // Loads messages for the currentChannel and listens for real-time updates
    const loadMessages = () => {
        if (!currentUser || !DOMElements.chatMessages) {
            clearMessages(); // Clear if not logged in or chat area doesn't exist
            unsubscribeMessageListener(); // Make sure we're not listening
            return;
        }

        unsubscribeMessageListener(); // Unsubscribe from the previous channel first
        DOMElements.chatMessages.innerHTML = `<div class="text-center text-muted p-5 h-100 d-flex align-items-center justify-content-center">
                                                <div><span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Loading #${currentChannel}...</div>
                                              </div>`; // Loading indicator

        const messagesRef = db.collection('channels')
            .doc(currentChannel) // Use the currentChannel state variable
            .collection('messages')
            .orderBy('timestamp', 'asc') // Get messages in chronological order
            .limit(50); // Limit the number of messages loaded initially for performance

        console.log(`Subscribing to messages in channel: ${currentChannel}`);

        // onSnapshot listens for real-time updates
        messageListenerUnsubscribe = messagesRef.onSnapshot(snapshot => {
            console.log(`Received snapshot for ${currentChannel} with ${snapshot.docChanges().length} changes.`);

            // Check if it's the initial load or subsequent updates
            const isInitialLoad = DOMElements.chatMessages.querySelector('.spinner-border') !== null || DOMElements.chatMessages.innerHTML.trim() === '';

            if (snapshot.empty && isInitialLoad) {
                 DOMElements.chatMessages.innerHTML = `<div class="text-center text-muted p-5 h-100 d-flex align-items-center justify-content-center">
                                                        <div>No messages in #${currentChannel} yet. Be the first!</div>
                                                      </div>`;
                 return; // Stop if no messages and it was the initial load
            }

            let messagesAdded = false;
            snapshot.docChanges().forEach(change => {
                const msgData = change.doc.data();
                const msgId = change.doc.id;

                if (change.type === "added") {
                    // If it's the first message being added in this batch, clear loading/empty message
                    if (isInitialLoad && !messagesAdded) {
                        DOMElements.chatMessages.innerHTML = ''; // Clear loading/placeholder
                    }
                    // Check if message element already exists (prevents duplicates on reconnect/local latency)
                    if (!DOMElements.chatMessages.querySelector(`[data-message-id="${msgId}"]`)) {
                        const messageElement = createMessageElement(msgData, msgId);
                        if(messageElement) {
                            DOMElements.chatMessages.appendChild(messageElement);
                            messagesAdded = true;
                        }
                    }
                }
                // TODO: Handle modified messages (e.g., edited text, reactions)
                // if (change.type === "modified") {
                //    const existingElement = DOMElements.chatMessages.querySelector(`[data-message-id="${msgId}"]`);
                //    if (existingElement) { /* Update existing element content */ }
                // }
                // TODO: Handle removed messages
                // if (change.type === "removed") {
                //     const elementToRemove = DOMElements.chatMessages.querySelector(`[data-message-id="${msgId}"]`);
                //     elementToRemove?.remove();
                // }
            });

            // Scroll to bottom only if messages were actually added in this snapshot
            if (messagesAdded) {
                scrollToBottom();
            }

        }, error => {
            console.error(`Error fetching messages for channel ${currentChannel}:`, error);
            DOMElements.chatMessages.innerHTML = `<div class="text-center text-danger p-5">Error loading messages. Please check console or try again later.</div>`;
            unsubscribeMessageListener(); // Stop listening on error
        });
    };

     const updateMessageInputPlaceholder = () => {
        if (DOMElements.messageInput) {
             DOMElements.messageInput.placeholder = currentUser ? `Message #${currentChannel}...` : 'Log in to chat...';
             DOMElements.messageInput.disabled = !currentUser; // Disable input if logged out
             DOMElements.sendMessageBtn.disabled = !currentUser; // Disable send button if logged out
        }
    };

    // Handles switching between chat channels
    const handleChannelSwitch = (e) => {
        e.preventDefault();
        const targetLink = e.target.closest('.sidebar-item'); // Find the anchor tag
        if (!targetLink || targetLink.classList.contains('active') || !currentUser) return; // Ignore clicks outside links, on active link, or if logged out

        // Remove active class from all channel links
        DOMElements.channelList?.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));

        // Add active class to the clicked link
        targetLink.classList.add('active');

        // Update the current channel state
        currentChannel = targetLink.dataset.channel || 'general'; // Get channel name from data attribute
        console.log("Switched to channel:", currentChannel);

        // Update the input placeholder
        updateMessageInputPlaceholder();

        // Load messages for the newly selected channel (this will also unsubscribe from the old one)
        loadMessages();
    };

    // Handles sending a new chat message
    const handleSendMessage = async () => {
        const text = DOMElements.messageInput?.value.trim();

        // Ensure user is logged in, data is loaded, and message is not empty
        if (!text || !currentUser || !currentUserData) {
            console.warn("Cannot send message: User not logged in, data missing, or message empty.");
             if (!text && DOMElements.messageInput) { // Visual feedback for empty message
                 DOMElements.messageInput.focus();
                 DOMElements.messageInput.classList.add('is-invalid');
                 setTimeout(()=> DOMElements.messageInput.classList.remove('is-invalid'), 1500);
             }
            return;
        }

        // Construct the message object to save in Firestore
        const messageData = {
            text: text,
            uid: currentUser.uid,
            displayName: currentUserData.displayName || 'Anonymous', // Use Firestore display name
            avatar: currentUserData.avatar || '', // Use Firestore avatar URL
            timestamp: firebase.firestore.FieldValue.serverTimestamp() // Use server timestamp
        };

        // Disable input/button while sending
        disableElement(DOMElements.messageInput);
        disableElement(DOMElements.sendMessageBtn);

        try {
            // Add the message to the 'messages' subcollection of the current channel document
            await db.collection('channels').doc(currentChannel).collection('messages').add(messageData);

            // Clear the input field on successful send
            if(DOMElements.messageInput) DOMElements.messageInput.value = '';
            console.log("Message sent to channel:", currentChannel);
            scrollToBottom(true); // Force scroll after sending own message

        } catch (error) {
            console.error("Error sending message:", error);
            // Provide feedback to the user
            alert(`Failed to send message: ${error.message}. Please try again.`);
        } finally {
            // Re-enable input/button regardless of success/failure
             enableElement(DOMElements.messageInput);
             enableElement(DOMElements.sendMessageBtn);
             DOMElements.messageInput?.focus(); // Put focus back in input
        }
    };


    // --- Initialization ---
    const initApp = () => {
        console.log("Initializing SM Engine App...");

        // Set initial theme based on preference or default
        const preferredTheme = localStorage.getItem('theme') || 'dark';
        applyTheme(preferredTheme);

        // Set current year in footer
        if (DOMElements.currentYear) {
            DOMElements.currentYear.textContent = new Date().getFullYear();
        }

        // --- Add Event Listeners ---

        // Theme Toggle
        DOMElements.themeToggle?.addEventListener('click', toggleTheme);

        // Auth Modal Triggers (Desktop, Mobile, Community Prompt)
        [DOMElements.loginBtn, DOMElements.loginBtnMobile, DOMElements.communityLoginBtn].forEach(btn => {
            btn?.addEventListener('click', () => showAuthModal('login'));
        });
        [DOMElements.signupBtn, DOMElements.signupBtnMobile].forEach(btn => {
             btn?.addEventListener('click', () => showAuthModal('signup'));
        });

        // Auth Form Submissions & Google Auth
        DOMElements.loginForm?.addEventListener('submit', handleEmailLogin);
        DOMElements.signupForm?.addEventListener('submit', handleEmailSignup);
        DOMElements.googleLoginBtn?.addEventListener('click', handleGoogleAuth);
        DOMElements.googleSignupBtn?.addEventListener('click', handleGoogleAuth); // Same handler

        // User Menu Actions (Desktop & Mobile) - Use event delegation if elements are dynamic
        [DOMElements.logoutMenuItemDesktop, DOMElements.logoutMenuItemMobile].forEach(item => {
            item?.addEventListener('click', handleLogout);
        });
         [DOMElements.profileMenuItemDesktop, DOMElements.profileMenuItemMobile].forEach(item => {
            item?.addEventListener('click', (e) => { e.preventDefault(); showProfileModal(); });
        });
         [DOMElements.settingsMenuItemDesktop, DOMElements.settingsMenuItemMobile].forEach(item => {
            item?.addEventListener('click', (e) => { e.preventDefault(); showSettingsModal(); });
        });

        // Profile Modal -> Settings Modal Trigger
        DOMElements.editProfileBtn?.addEventListener('click', () => {
            DOMElements.profileModalInstance?.hide();
            // Use timeout to ensure profile modal is fully hidden before showing settings
            setTimeout(showSettingsModal, 200);
        });

        // Settings Modal Actions
        DOMElements.settingsForm?.addEventListener('submit', handleSettingsSave);
        DOMElements.uploadAvatarBtn?.addEventListener('click', () => DOMElements.avatarInput?.click());
        DOMElements.avatarInput?.addEventListener('change', handleAvatarChange);
        DOMElements.removeAvatarBtn?.addEventListener('click', handleRemoveAvatar);
        DOMElements.settingsBio?.addEventListener('input', updateBioCharCount); // Live char count update

        // Community Chat Actions
        DOMElements.channelList?.addEventListener('click', handleChannelSwitch); // Channel switching
        DOMElements.sendMessageBtn?.addEventListener('click', handleSendMessage); // Send button click
        DOMElements.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter (but not Shift+Enter)
                e.preventDefault(); // Prevent default newline insertion
                handleSendMessage();
            }
        });

        // Firebase Auth State Listener - This is crucial!
        // It triggers UI updates when the user logs in or out.
        auth.onAuthStateChanged(updateUIAfterAuthStateChange);

        console.log("SM Engine App Initialized and Auth Listener Attached.");
    };

    // Start the application initialization
    initApp();
});


