import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    type User,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { UsersService } from '@/services/users';

const ALLOWED_EMAILS = [
    "robert.e.oconnell@gmail.com",
    "karima.rizk@gmail.com",
    "lily.i.oconnell@gmail.com"
];

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signIn: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsubscribe: (() => void) | null = null;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Check allowlist
                if (!currentUser.email || !ALLOWED_EMAILS.includes(currentUser.email)) {
                    await signOut(auth);
                    alert("Access Denied: This app is for the O'Connell/Rizk family only 👻");
                    return;
                }

                setUser(currentUser);

                // Fetch or create user profile
                const userRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    setUserProfile(userSnap.data() as UserProfile);
                } else {
                    // Create new user profile
                    const newProfile: UserProfile = {
                        uid: currentUser.uid,
                        displayName: currentUser.displayName,
                        photoURL: currentUser.photoURL,
                        email: currentUser.email,
                        role: 'member',
                        createdAt: serverTimestamp(),
                    };
                    await setDoc(userRef, newProfile);
                    setUserProfile(newProfile);
                }

                // Assign a stable, unique colorKey for this user (once)
                // so charts can stay consistent and avoid collisions.
                await UsersService.ensureColorKey(currentUser.uid);

                // Keep profile in sync in real-time (e.g., after Edit Profile)
                if (profileUnsubscribe) profileUnsubscribe();
                profileUnsubscribe = onSnapshot(userRef, (snap) => {
                    if (snap.exists()) {
                        setUserProfile(snap.data() as UserProfile);
                    }
                });
            } else {
                setUser(null);
                setUserProfile(null);

                if (profileUnsubscribe) {
                    profileUnsubscribe();
                    profileUnsubscribe = null;
                }
            }
            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (profileUnsubscribe) profileUnsubscribe();
        };
    }, []);

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const logout = async () => {
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, signIn, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
