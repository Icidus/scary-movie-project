import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp,
    limit
} from 'firebase/firestore';
import type { Viewing } from '@/types';

export const ViewingsService = {
    async add(viewing: Omit<Viewing, 'id' | 'insertedAt'>) {
        // Client-side validation is assumed to fail-fast before calling this, 
        // but the rules will strictly enforce it.

        const docRef = await addDoc(collection(db, 'viewings'), {
            ...viewing,
            insertedAt: serverTimestamp()
        });

        // Recalculate Average for the Movie
        // We do this here to ensure the "Home" page cards have data without fetching viewings N times.
        try {
            const allViewings = await ViewingsService.listByMovie(viewing.movieId);
            const total = allViewings.reduce((sum, v) => sum + v.ratings.overall, 0);
            const overallAverage = total / allViewings.length;

            const { doc, updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'movies', viewing.movieId), {
                overallAverage
            });
        } catch (e) {
            console.error("Failed to update movie stats", e);
        }

        return docRef.id;
    },

    async listByMovie(movieId: string): Promise<Viewing[]> {
        const q = query(
            collection(db, 'viewings'),
            where('movieId', '==', movieId),
            orderBy('watchedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Viewing));
    },

    async listByUser(userId: string): Promise<Viewing[]> {
        const q = query(
            collection(db, 'viewings'),
            where('userId', '==', userId),
            orderBy('watchedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Viewing));
    },

    async getAllViewings(): Promise<Viewing[]> {
        // For homepage aggregation (might be heavy later, but okay for MVP)
        // Ideally we would have a 'movies' aggregation or fetch only recent,
        // but to calculate averages we need raw data or aggregated data.
        // MVP: fetch all to compute averages client side or fetch per movie.
        // The requirement says "Home: grid of rated movies with average scores".
        // Better strategy: Query viewings doesn't scale well.
        // But requirement says "Collections are flat".
        // We can fetch all viewings (up to a limit) or maybe fetch movies and then viewings.
        // Let's implement a 'getAll' with a reasonable limit for MVP.
        const q = query(collection(db, 'viewings'), orderBy('watchedAt', 'desc'), limit(1000));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Viewing));
    }
};
