document.addEventListener('DOMContentLoaded', function() {

    // --- Firebase Configuration ---
    // IMPORTANT: Replace with your actual Firebase config object
    // Get this from your Firebase project settings:
    // Project settings > General > Your apps > SDK setup and configuration > Config
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
    // Check if Firebase is already initialized to avoid errors on potential fast reloads
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // if already initialized, use that app
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // --- DOM Element References ---
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const userProfileDiv = document.getElementById('userProfile');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const mobileAuthLinks = document.getElementById('mobileAuthLinks');

    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    const closeLogin = document.getElementById('closeLogin');
    const closeSignup = document.getElementById('closeSignup');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    const googleSignInBtnLogin = document.getElementById('googleSignInBtnLogin');
    const googleSignInBtnSignup = document.getElementById('googleSignInBtnSignup');

    const chatArea = document.getElementById('chatArea');
    const chatMessagesDiv = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatLoginPrompt = document.getElementById('chatLoginPrompt');
    const chatLoginLink = document.getElementById('chatLoginLink');
    const chatSignupLink = document.getElementById('chatSignupLink');

    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');

    const currentYearSpan = document.getElementById('currentYear');

    // --- State Variables ---
    let currentUser = null;
    let messagesListener = null; // To unsubscribe when logged out

    // --- UI Update Functions ---
    function showModal(modal) {
        clearErrorMessages();
        modal.classList.add('show');
    }

    function hideModal(modal) {
        modal.classList.remove('show');
        clearErrorMessages();
        // Reset forms if needed (optional)
        // modal.querySelector('form')?.reset();
    }

    function clearErrorMessages() {
        loginError.textContent = '';
        signupError.textContent = '';
    }

    function updateNavUI(user) {
        // Desktop Nav
        if (user) {
            loginBtn.style.display = 'none';
            signupBtn.style.display = 'none';
            userProfileDiv.style.display = 'flex'; // Use flex for inline display
             userNameDisplay.textContent = user.displayName || user.email.split('@')[0]; // Use displayName or part of email
            logoutBtn.style.display = 'inline-block';
        } else {
            loginBtn.style.display = 'inline-block';
            signupBtn.style.display = 'inline-block';
            userProfileDiv.style.display = 'none';
            logoutBtn.style.display = 'none';
        }

        // Mobile Nav - Clear existing and add appropriate buttons
        mobileAuthLinks.innerHTML = ''; // Clear previous links/buttons
        if (user) {
             const mobileProfile = document.createElement('li');
             mobileProfile.innerHTML = `<span style="color: var(--text-muted); display: block; padding: 10px;">Hi, ${user.displayName || user.email.split('@')[0]}</span>`;
             mobileAuthLinks.appendChild(mobileProfile);

            const mobileLogoutBtn = document.createElement('li');
            mobileLogoutBtn.innerHTML = `<button id="mobileLogoutBtn" class="btn btn-secondary">Logout</button>`;
            mobileAuthLinks.appendChild(mobileLogoutBtn);
            document.getElementById('mobileLogoutBtn').addEventListener('click', handleLogout); // Add listener dynamically
        } else {
            const mobileLoginBtn = document.createElement('li');
            mobileLoginBtn.innerHTML = `<button id="mobileLoginBtn" class="btn btn-secondary">Login</button>`;
            mobileAuthLinks.appendChild(mobileLoginBtn);
             document.getElementById('mobileLoginBtn').addEventListener('click', () => showModal(loginModal));

            const mobileSignupBtn = document.createElement('li');
            mobileSignupBtn.innerHTML = `<button id="mobileSignupBtn" class="btn btn-primary">Sign Up</button>`;
            mobileAuthLinks.appendChild(mobileSignupBtn);
             document.getElementById('mobileSignupBtn').addEventListener('click', () => showModal(signupModal));
        }
    }

    function updateChatUI(user) {
        if (user) {
            chatArea.style.display = 'block';
            chatLoginPrompt.style.display = 'none';
            fetchAndDisplayMessages(); // Start listening for messages
        } else {
            chatArea.style.display = 'none';
            chatLoginPrompt.style.display = 'block';
            if (messagesListener) {
                messagesListener(); // Unsubscribe from previous listener
                messagesListener = null;
            }
            chatMessagesDiv.innerHTML = '<p class="loading-chat">Please log in to see the chat.</p>'; // Clear messages
        }
    }

    // --- Authentication Handlers ---
    function handleSignup(event) {
        event.preventDefault();
        clearErrorMessages();
        const displayName = signupForm.signupName.value.trim();
        const email = signupForm.signupEmail.value;
        const password = signupForm.signupPassword.value;

         if (!displayName) {
            signupError.textContent = 'Please enter a display name.';
            return;
        }
        if (password.length < 6) {
             signupError.textContent = 'Password must be at least 6 characters long.';
            return;
        }


        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                // Update profile with display name
                 return userCredential.user.updateProfile({
                    displayName: displayName
                });
            })
             .then(() => {
                console.log('User signed up and display name set:', auth.currentUser);
                hideModal(signupModal);
                // UI will update via onAuthStateChanged
            })
            .catch((error) => {
                console.error("Signup Error:", error);
                signupError.textContent = error.message;
            });
    }

    function handleLogin(event) {
        event.preventDefault();
        clearErrorMessages();
        const email = loginForm.loginEmail.value;
        const password = loginForm.loginPassword.value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in
                console.log('User logged in:', userCredential.user);
                hideModal(loginModal);
                // UI will update via onAuthStateChanged
            })
            .catch((error) => {
                console.error("Login Error:", error);
                loginError.textContent = getFriendlyAuthErrorMessage(error);
            });
    }

     function handleGoogleSignIn() {
        clearErrorMessages();
        auth.signInWithPopup(googleProvider)
            .then((result) => {
                console.log('Google Sign-In successful:', result.user);
                // If it's a new user via Google, their profile might not have displayName initially from email/pass signup
                // No need to manually set displayName here as Google provides it
                 hideModal(loginModal);
                 hideModal(signupModal);
                 // UI will update via onAuthStateChanged
            }).catch((error) => {
                console.error("Google Sign-In Error:", error);
                 loginError.textContent = getFriendlyAuthErrorMessage(error); // Show error in both modals
                 signupError.textContent = getFriendlyAuthErrorMessage(error);
            });
    }

    function handleLogout() {
        auth.signOut().then(() => {
            console.log('User signed out');
            currentUser = null; // Explicitly clear current user state
             // UI updates handled by onAuthStateChanged
             if (mobileNav.classList.contains('active')) {
                mobileNav.classList.remove('active'); // Close mobile nav on logout
                mobileMenuToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
             }
        }).catch((error) => {
            console.error("Logout Error:", error);
            alert('Error signing out. Please try again.');
        });
    }

    function getFriendlyAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'This email address is already registered.';
            case 'auth/weak-password':
                return 'Password is too weak. It must be at least 6 characters.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/popup-closed-by-user':
                return 'Google Sign-in cancelled.';
             case 'auth/cancelled-popup-request':
             case 'auth/popup-blocked':
                 return 'Google Sign-in popup blocked. Please enable popups for this site.';
            default:
                return 'An error occurred. Please try again.';
        }
    }


    // --- Chat Functionality ---
    function fetchAndDisplayMessages() {
        if (messagesListener) {
            messagesListener(); // Unsubscribe from any previous listener first
        }

        const messagesCol = db.collection('messages').orderBy('createdAt', 'asc').limit(100); // Get latest 100

        chatMessagesDiv.innerHTML = '<p class="loading-chat">Loading messages...</p>'; // Show loading state

        messagesListener = messagesCol.onSnapshot(snapshot => {
            if (snapshot.empty) {
                 chatMessagesDiv.innerHTML = '<p class="no-messages">No messages yet. Be the first!</p>';
                return;
            }

            chatMessagesDiv.innerHTML = ''; // Clear previous messages or loading state
            snapshot.docs.forEach(doc => {
                const message = doc.data();
                 displayMessage(message);
            });

            // Scroll to bottom
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

        }, error => {
            console.error("Error fetching messages: ", error);
            chatMessagesDiv.innerHTML = '<p class="error-message">Could not load messages.</p>';
        });
    }

    function displayMessage(message) {
        const msgElement = document.createElement('p');
        const timestamp = message.createdAt?.toDate ? message.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; // Format time

        // Check if the message is from the currently logged-in user
        const isCurrentUser = currentUser && message.userId === currentUser.uid;

         if (isCurrentUser) {
            msgElement.classList.add('user-message'); // Add class for potential styling
            msgElement.innerHTML = `<strong>You:</strong> ${escapeHTML(message.text)} <span class="message-meta">${timestamp}</span>`;
        } else {
            msgElement.innerHTML = `<strong>${escapeHTML(message.userName || 'Anonymous')}:</strong> ${escapeHTML(message.text)} <span class="message-meta">${timestamp}</span>`;
        }

        chatMessagesDiv.appendChild(msgElement);
    }

    // Simple HTML escaping function to prevent XSS
    function escapeHTML(str) {
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }


    function handleSendMessage(event) {
        event.preventDefault();
        const messageText = chatInput.value.trim();

        if (!messageText) return; // Don't send empty messages
        if (!currentUser) {
            alert('You must be logged in to send messages.');
            return;
        }

        // Add message to Firestore
        db.collection('messages').add({
            text: messageText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use server time
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email.split('@')[0] // Use display name or part of email
        })
        .then(() => {
            console.log("Message sent!");
            chatInput.value = ''; // Clear input field
            // Message will appear automatically due to the onSnapshot listener
        })
        .catch((error) => {
            console.error("Error sending message: ", error);
            alert('Could not send message. Please try again.');
        });
    }


    // --- Event Listeners Setup ---

    // Auth Buttons & Modals
    loginBtn.addEventListener('click', () => showModal(loginModal));
    signupBtn.addEventListener('click', () => showModal(signupModal));
    logoutBtn.addEventListener('click', handleLogout);

    closeLogin.addEventListener('click', () => hideModal(loginModal));
    closeSignup.addEventListener('click', () => hideModal(signupModal));

    // Close modal if clicked outside the content
    window.addEventListener('click', (event) => {
        if (event.target === loginModal) hideModal(loginModal);
        if (event.target === signupModal) hideModal(signupModal);
    });

    // Switch between login/signup modals
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal(loginModal);
        showModal(signupModal);
    });
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        hideModal(signupModal);
        showModal(loginModal);
    });

     // Link in chat prompt to open modals
    chatLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(loginModal);
    });
     chatSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(signupModal);
    });


    // Form Submissions
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Google Sign-In Buttons
    googleSignInBtnLogin.addEventListener('click', handleGoogleSignIn);
    googleSignInBtnSignup.addEventListener('click', handleGoogleSignIn);

    // Chat Form Submission
    chatForm.addEventListener('submit', handleSendMessage);

    // Mobile Menu Toggle
    mobileMenuToggle.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        // Toggle hamburger/close icon
        const icon = mobileMenuToggle.querySelector('i');
        if (mobileNav.classList.contains('active')) {
            icon.classList.replace('fa-bars', 'fa-times');
        } else {
            icon.classList.replace('fa-times', 'fa-bars');
        }
    });

    // Close mobile menu when a link is clicked (optional)
    mobileNav.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
            mobileNav.classList.remove('active');
             mobileMenuToggle.querySelector('i').classList.replace('fa-times', 'fa-bars');
        }
    });


    // --- Authentication State Observer ---
    auth.onAuthStateChanged(user => {
        console.log("Auth state changed:", user);
        currentUser = user; // Update global user state
        updateNavUI(user);
        updateChatUI(user);

        // If logged in, maybe fetch extra profile data from Firestore if you store it there
        // if (user) { /* fetchProfileData(user.uid); */ }
    });

     // --- Footer ---
    if(currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // --- Initial Load ---
    // The onAuthStateChanged listener handles the initial UI setup based on login state.

}); // End DOMContentLoaded
