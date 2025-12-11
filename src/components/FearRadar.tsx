
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { Ratings } from '@/types';

interface FearRadarProps {
    ratings: Ratings; // or average ratings
}

export function FearRadar({ ratings }: FearRadarProps) {
    const data = [
        { subject: 'Jump', A: ratings.jump, fullMark: 10 },
        { subject: 'Dread', A: ratings.dread, fullMark: 10 },
        { subject: 'Gore', A: ratings.gore, fullMark: 10 },
        { subject: 'Atmo', A: ratings.atmosphere, fullMark: 10 },
        { subject: 'Story', A: ratings.story, fullMark: 10 },
        { subject: 'WTF', A: ratings.wtf, fullMark: 10 },
    ];

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar
                        name="Fear Fingerprint"
                        dataKey="A"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.4}
                    />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
