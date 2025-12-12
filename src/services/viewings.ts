import { db } from '@/lib/firebase';
import { removeUndefined } from '@/lib/utils';
import {
    collection,
    addDoc,
    doc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp,
    limit,
    setDoc,
    onSnapshot,
    type Unsubscribe
} from 'firebase/firestore';
import type { Viewing } from '@/types';

function normalizeViewing(raw: Viewing): Viewing {
    const r: any = raw.ratings || {};
    const toNumber = (val: unknown, fallback: number) => {
        const n = typeof val === 'number' ? val : Number(val);
        return Number.isFinite(n) ? n : fallback;
    };

    const story = toNumber(r.story, 5);
    const rewatch = toNumber(r.rewatch, 5);
    const cozy = toNumber(r.cozy, 5);
    const derivedEnjoyment = (story + rewatch + cozy) / 3;

    return {
        ...raw,
        ratings: {
            overall: toNumber(r.overall, 5),
            enjoyment: toNumber(r.enjoyment, derivedEnjoyment),
            jump: toNumber(r.jump, 5),
            dread: toNumber(r.dread, 5),
            gore: toNumber(r.gore, 5),
            atmosphere: toNumber(r.atmosphere, 5),
            story,
            rewatch,
            wtf: toNumber(r.wtf, 5),
            cozy,
        },
    };
}

export const ViewingsService = {
    async add(viewing: Omit<Viewing, 'id' | 'insertedAt'>) {
        // Client-side validation is assumed to fail-fast before calling this, 
        // but the rules will strictly enforce it.

        const sanitizedViewing = removeUndefined({
            ...viewing,
            insertedAt: serverTimestamp()
        });

        const docRef = await addDoc(collection(db, 'viewings'), sanitizedViewing);

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

    async upsert(viewing: Omit<Viewing, 'id' | 'insertedAt'> & { id?: string }) {
        const sanitizedViewing = removeUndefined({
            ...viewing,
            insertedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        // If we were given an explicit doc id (edit flow), update that record directly.
        if (viewing.id) {
            await setDoc(doc(db, 'viewings', viewing.id), sanitizedViewing, { merge: true });
            return viewing.id;
        }

        // Otherwise, find an existing viewing for this user+movie(+episode) and update it.
        const q = query(
            collection(db, 'viewings'),
            where('movieId', '==', viewing.movieId),
            where('userId', '==', viewing.userId),
            orderBy('watchedAt', 'desc'),
            limit(25)
        );

        const snapshot = await getDocs(q);
        const candidates = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Array<{ id: string } & Viewing>;

        const isEpisode = viewing.mediaType === 'episode' || viewing.seasonNumber != null || viewing.episodeNumber != null;
        const match = candidates.find(v => {
            if (isEpisode) {
                return v.seasonNumber === viewing.seasonNumber && v.episodeNumber === viewing.episodeNumber;
            }
            return v.seasonNumber == null && v.episodeNumber == null;
        });

        const id = match?.id ?? `${viewing.movieId}_${viewing.userId}${isEpisode ? `_s${viewing.seasonNumber}e${viewing.episodeNumber}` : ''}`;
        await setDoc(doc(db, 'viewings', id), sanitizedViewing, { merge: true });

        // Recalculate Average for the Movie (kept consistent with add())
        try {
            const allViewings = await ViewingsService.listByMovie(viewing.movieId);
            const total = allViewings.reduce((sum, v) => sum + v.ratings.overall, 0);
            const overallAverage = total / allViewings.length;

            const { doc: movieDoc, updateDoc } = await import('firebase/firestore');
            await updateDoc(movieDoc(db, 'movies', viewing.movieId), {
                overallAverage
            });
        } catch (e) {
            console.error("Failed to update movie stats", e);
        }

        return id;
    },

    async listByMovie(movieId: string): Promise<Viewing[]> {
        const q = query(
            collection(db, 'viewings'),
            where('movieId', '==', movieId),
            orderBy('watchedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => normalizeViewing({ id: d.id, ...d.data() } as Viewing));
    },

    subscribeByMovie(movieId: string, onChange: (viewings: Viewing[]) => void): Unsubscribe {
        const q = query(
            collection(db, 'viewings'),
            where('movieId', '==', movieId),
            orderBy('watchedAt', 'desc')
        );

        return onSnapshot(q, (snapshot) => {
            onChange(snapshot.docs.map(d => normalizeViewing({ id: d.id, ...d.data() } as Viewing)));
        });
    },

    async listByUser(userId: string): Promise<Viewing[]> {
        const q = query(
            collection(db, 'viewings'),
            where('userId', '==', userId),
            orderBy('watchedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => normalizeViewing({ id: d.id, ...d.data() } as Viewing));
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
        return snapshot.docs.map(d => normalizeViewing({ id: d.id, ...d.data() } as Viewing));
    },

    async listAll(limitCount = 1000): Promise<Viewing[]> {
        const q = query(collection(db, 'viewings'), orderBy('watchedAt', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => normalizeViewing({ id: d.id, ...d.data() } as Viewing));
    }
};
