import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';

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
    }
};
