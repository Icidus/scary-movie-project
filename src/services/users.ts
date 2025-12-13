import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import type { UserColorKey, UserProfile } from '@/types';
import { getStableColorKey, USER_COLOR_KEYS } from '@/lib/user-colors';

export const UsersService = {
    async getProfile(uid: string): Promise<UserProfile | null> {
        if (!uid) return null;
        try {
            const snap = await getDoc(doc(db, 'users', uid));
            if (snap.exists()) {
                return snap.data() as UserProfile;
            }
            return null;
        } catch (error) {
            console.error("Error fetching user profile", error);
            return null;
        }
    },

    async updateProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
        if (!uid) return;
        const ref = doc(db, 'users', uid);
        // data contains updates (displayName, photoURL)
        // using set with merge: true to handle case where doc doesn't exist yet but it should
        await setDoc(ref, { ...data, uid }, { merge: true });
    },

    async ensureColorKey(uid: string): Promise<UserColorKey> {
        if (!uid) return getStableColorKey(uid);

        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        const existing = snap.exists() ? (snap.data() as Partial<UserProfile>) : null;

        const existingKey = (existing?.colorKey ?? null) as UserColorKey | null;
        if (existingKey && USER_COLOR_KEYS.includes(existingKey)) {
            return existingKey;
        }

        // Prefer an unused key across current users to avoid collisions.
        const used = new Set<UserColorKey>();
        const allUsersSnap = await getDocs(collection(db, 'users'));
        allUsersSnap.forEach((d) => {
            if (d.id === uid) return;
            const data = d.data() as Partial<UserProfile>;
            const key = (data.colorKey ?? null) as UserColorKey | null;
            if (key && USER_COLOR_KEYS.includes(key)) used.add(key);
        });

        const start = USER_COLOR_KEYS.indexOf(getStableColorKey(uid));
        let picked: UserColorKey = USER_COLOR_KEYS[Math.max(0, start)];
        for (let offset = 0; offset < USER_COLOR_KEYS.length; offset += 1) {
            const candidate = USER_COLOR_KEYS[(Math.max(0, start) + offset) % USER_COLOR_KEYS.length];
            if (!used.has(candidate)) {
                picked = candidate;
                break;
            }
        }

        await setDoc(userRef, { uid, colorKey: picked }, { merge: true });
        return picked;
    }
};
