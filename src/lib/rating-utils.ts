import type { Ratings } from "@/types";

export const RATING_KEYS: { key: keyof Ratings; label: string; description?: string; color?: string }[] = [
    {
        key: 'enjoyment',
        label: '⭐ Overall Rating',
        description: 'Your overall “did I like it?” score, regardless of how scary it was.'
    },
    {
        key: 'overall',
        label: '😱 Scare Level',
        description: 'How scary it felt overall (intensity, fear, lingering unease).'
    },
    {
        key: 'dread',
        label: '😬 Dread / Tension',
        description: 'Slow-burn tension, suspense, and anxiety.'
    },
    {
        key: 'atmosphere',
        label: '🌫️ Atmosphere',
        description: 'Mood + ambience (sound, lighting, creepiness of the world).'
    },
    {
        key: 'jump',
        label: '💥 Jump Scares',
        description: 'How many/strong the jump scares were.'
    },
    {
        key: 'gore',
        label: '🩸 Gore / Visceral',
        description: 'Graphic violence, blood, and body-horror intensity.'
    },
    {
        key: 'story',
        label: '📚 Story',
        description: 'Plot/writing quality and how well it holds together.'
    },
    {
        key: 'wtf',
        label: '🤯 WTF Factor',
        description: 'How weird, surprising, or bonkers it gets.'
    },
    {
        key: 'cozy',
        label: '✨ Vibe / Fun Factor',
        description: 'Comfort/fun vibe—watch-with-friends energy vs. harsh/bleak.'
    },
    {
        key: 'rewatch',
        label: '🔁 Rewatchability',
        description: 'How likely you are to watch it again.'
    },
];

export function getFunLabel(key: keyof Ratings, value: number): string {
    const v = Math.round(value);

    switch (key) {
        case 'overall':
            if (v === 0) return "Could watch this alone in a cemetery.";
            if (v === 1) return "Mild spooky seasoning.";
            if (v === 2) return "A few goosebumps trying their best.";
            if (v === 3) return "Noticeably creepy but manageable.";
            if (v === 4) return "Some legit “hmm… what was that?” moments.";
            if (v === 5) return "Solidly scary; lights-on trip to the bathroom.";
            if (v === 6) return "Several “NOPE” beats.";
            if (v === 7) return "My heartbeat had opinions.";
            if (v === 8) return "Actually affected my nervous system.";
            if (v === 9) return "Absolutely rattled.";
            return "Sleeping with a lamp on. And maybe the TV.";

        case 'enjoyment':
            if (v === 0) return "I did not have a good time.";
            if (v === 1) return "Not for me.";
            if (v === 2) return "A struggle to finish.";
            if (v === 3) return "Some good moments, overall meh.";
            if (v === 4) return "Fine, but forgettable.";
            if (v === 5) return "Enjoyable enough.";
            if (v === 6) return "Pretty fun.";
            if (v === 7) return "Really liked it.";
            if (v === 8) return "Loved it.";
            if (v === 9) return "Instant favorite.";
            return "All-timer. Recommending immediately.";

        case 'jump':
            if (v === 0) return "Zero booms. Zero bangs. Zero flinches.";
            if (v === 1) return "A polite “boo” from another room.";
            if (v === 2) return "One mild startle.";
            if (v === 3) return "A couple predictable jumps.";
            if (v === 4) return "Enough jolts to keep you alert.";
            if (v === 5) return "Classic popcorn-spiller tier.";
            if (v === 6) return "Several sneaky jumps that landed.";
            if (v === 7) return "Body jerked. Almost dropped the remote.";
            if (v === 8) return "Full-body spasm.";
            if (v === 9) return "Practically levitated.";
            return "“I hate this movie for doing that to me.”";

        case 'dread':
            if (v === 0) return "Zero unease. Felt like a beach day.";
            if (v === 1) return "Gentle breeze of anxiety.";
            if (v === 2) return "A little simmering suspicion.";
            if (v === 3) return "Soft background hum of doom.";
            if (v === 4) return "Something is definitely off.";
            if (v === 5) return "Steady “I don’t like where this is going.”";
            if (v === 6) return "Palpable tension in my shoulders.";
            if (v === 7) return "Stomach slowly turned into a knot.";
            if (v === 8) return "Felt watched. In my own house.";
            if (v === 9) return "Genuine existential discomfort.";
            return "Dread so thick it’s a character in the movie.";

        case 'gore':
            if (v === 0) return "Barely a paper cut.";
            if (v === 1) return "Cartoon-level bumps and bruises.";
            if (v === 2) return "Minor blood, PG-13 energy.";
            if (v === 3) return "Occasional splatter.";
            if (v === 4) return "Some juicy hits.";
            if (v === 5) return "Noticeably gnarly.";
            if (v === 6) return "“Why did the camera linger on that?!”";
            if (v === 7) return "Gore fans will clap. Others will squint.";
            if (v === 8) return "Full body cringe moments.";
            if (v === 9) return "I watched through my fingers.";
            return "“I need a shower and possibly therapy.”";

        case 'atmosphere':
            if (v === 0) return "Bright as a sitcom.";
            if (v === 1) return "Softly spooky but harmless.";
            if (v === 2) return "A couple eerie shots.";
            if (v === 3) return "Creepy edges on the mood.";
            if (v === 4) return "Good use of shadows + sound.";
            if (v === 5) return "Solidly immersive vibes.";
            if (v === 6) return "Very moody; whole film feels haunted.";
            if (v === 7) return "Thick atmosphere you can practically inhale.";
            if (v === 8) return "Masterclass in eerie visuals + sound.";
            if (v === 9) return "Unease baked into every frame.";
            return "The air in this movie felt cursed.";

        case 'story':
            if (v === 0) return "What story?";
            if (v === 1) return "Loose vibes held by duct tape.";
            if (v === 2) return "“Okay, technically something happened.”";
            if (v === 3) return "Basic but coherent.";
            if (v === 4) return "Concept shows promise.";
            if (v === 5) return "Decent and enjoyable narrative.";
            if (v === 6) return "Good story with memorable beats.";
            if (v === 7) return "Strong, clever, or emotional writing.";
            if (v === 8) return "Really well-crafted plot.";
            if (v === 9) return "Excellent storytelling; sticks with you.";
            return "Could teach a class on this script.";

        case 'rewatch':
            if (v === 0) return "Never again, even with money.";
            if (v === 1) return "Watched once out of curiosity.";
            if (v === 2) return "Maybe if someone forced me.";
            if (v === 3) return "Forgettable but fine.";
            if (v === 4) return "I’d put it on in the background.";
            if (v === 5) return "Would watch again someday.";
            if (v === 6) return "Fun enough for repeat viewing.";
            if (v === 7) return "I’d show this to friends.";
            if (v === 8) return "A great October staple.";
            if (v === 9) return "Comfort horror.";
            return "I rewatch this like a seasonal ritual.";

        case 'wtf':
            if (v === 0) return "Perfectly normal. Almost suspiciously normal.";
            if (v === 1) return "One weird little moment.";
            if (v === 2) return "Some odd creative choices.";
            if (v === 3) return "A bit strange but not wild.";
            if (v === 4) return "A few eyebrow-raising twists.";
            if (v === 5) return "Gets weird in a fun way.";
            if (v === 6) return "“Wait… what did I just see?”";
            if (v === 7) return "Delightfully deranged.";
            if (v === 8) return "Straight-up unhinged energy.";
            if (v === 9) return "Brain-melting chaos.";
            return "“I need someone else to watch this immediately.”";

        case 'cozy':
            if (v === 0) return "Zero vibe. Pure discomfort.";
            if (v === 1) return "Bleak and not in a fun way.";
            if (v === 2) return "Pretty harsh vibes.";
            if (v === 3) return "A little fun, mostly grim.";
            if (v === 4) return "Neutral vibe.";
            if (v === 5) return "Good snack-movie energy.";
            if (v === 6) return "Fun spooky vibe.";
            if (v === 7) return "Great watch-with-friends energy.";
            if (v === 8) return "Comfort horror vibes.";
            if (v === 9) return "Cozy rewatch vibes.";
            return "Maximum comfort horror.";

        default:
            return `${value}/10`;
    }
}
