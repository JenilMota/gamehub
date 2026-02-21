/* ========================================
   auth.js — Firebase Authentication & Data Sync
   GameHub — Email/Password + Google Sign-In
   ======================================== */

(function () {
    'use strict';

    const firebaseConfig = {
        apiKey: "AIzaSyC-6ZC3Hji7dFIcIy77BvvBJvhXpDKdHaE",
        authDomain: "gamehub-arcade-app.firebaseapp.com",
        projectId: "gamehub-arcade-app",
        storageBucket: "gamehub-arcade-app.firebasestorage.app",
        messagingSenderId: "931192441649",
        appId: "1:931192441649:web:3cda0233fec35795347e10",
    };

    let app, auth, db;
    let currentUser = null;
    let authStateCallbacks = [];
    let initPromise = null;

    // Firebase module references
    let fbAuth = null;
    let fbFirestore = null;

    // --- Initialize Firebase (only once) ---
    function initFirebase() {
        if (initPromise) return initPromise;

        initPromise = (async () => {
            try {
                const appMod = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js');
                fbAuth = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js');
                fbFirestore = await import('https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js');

                app = appMod.initializeApp(firebaseConfig);
                auth = fbAuth.getAuth(app);
                db = fbFirestore.getFirestore(app);

                console.log('[GameHub] Firebase initialized successfully');

                fbAuth.onAuthStateChanged(auth, async (user) => {
                    currentUser = user;
                    console.log('[GameHub] Auth state:', user ? user.email : 'signed out');
                    if (user) {
                        await syncUserProfile(user);
                    }
                    authStateCallbacks.forEach(cb => cb(user));
                });
            } catch (e) {
                console.error('[GameHub] Firebase init failed:', e);
                initPromise = null;
                throw e;
            }
        })();

        return initPromise;
    }

    // Ensure Firebase is ready before any auth operation
    async function ensureReady() {
        if (!initPromise) await initFirebase();
        await initPromise;
        if (!auth) throw new Error('Firebase auth not initialized');
    }

    // --- User Profile Sync ---
    async function syncUserProfile(user) {
        if (!db || !user) return;
        try {
            const userRef = fbFirestore.doc(db, 'users', user.uid);
            const snap = await fbFirestore.getDoc(userRef);
            if (!snap.exists()) {
                await fbFirestore.setDoc(userRef, {
                    displayName: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    photoURL: user.photoURL || null,
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                });
            } else {
                await fbFirestore.setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
            }
        } catch (e) {
            console.warn('[GameHub] Profile sync error:', e);
        }
    }

    // --- Save High Scores to Firestore ---
    async function saveScoresToCloud(scores) {
        await ensureReady();
        if (!currentUser) return;
        try {
            await fbFirestore.setDoc(fbFirestore.doc(db, 'highscores', currentUser.uid), {
                scores,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        } catch (e) {
            console.warn('[GameHub] Score save error:', e);
        }
    }

    // --- Load High Scores from Firestore ---
    async function loadScoresFromCloud() {
        await ensureReady();
        if (!currentUser) return null;
        try {
            const snap = await fbFirestore.getDoc(fbFirestore.doc(db, 'highscores', currentUser.uid));
            if (snap.exists()) return snap.data().scores || {};
            return {};
        } catch (e) {
            console.warn('[GameHub] Score load error:', e);
            return null;
        }
    }

    // --- Auth Actions ---
    async function loginWithEmail(email, password) {
        await ensureReady();
        console.log('[GameHub] Attempting email login:', email);
        return fbAuth.signInWithEmailAndPassword(auth, email, password);
    }

    async function signupWithEmail(email, password, displayName) {
        await ensureReady();
        console.log('[GameHub] Attempting email signup:', email);
        const cred = await fbAuth.createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
            await fbAuth.updateProfile(cred.user, { displayName });
        }
        return cred;
    }

    async function loginWithGoogle() {
        await ensureReady();
        console.log('[GameHub] Attempting Google login');
        const provider = new fbAuth.GoogleAuthProvider();
        return fbAuth.signInWithPopup(auth, provider);
    }

    async function logout() {
        await ensureReady();
        return fbAuth.signOut(auth);
    }

    // -- Public API --
    window.GameHubAuth = {
        init: initFirebase,
        onAuthStateChanged: (cb) => { authStateCallbacks.push(cb); if (currentUser !== null) cb(currentUser); },
        getCurrentUser: () => currentUser,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        saveScoresToCloud,
        loadScoresFromCloud,
    };
})();
