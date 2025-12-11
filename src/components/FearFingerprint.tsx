import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, Legend } from 'recharts';
import type { Ratings } from '@/types';

interface Dataset {
    label: string;
    ratings: Ratings;
    color: string;
}

interface FearFingerprintProps {
    datasets: Dataset[];
    height?: number;
    showLegend?: boolean;
}

const KEYS: (keyof Ratings)[] = ['jump', 'dread', 'gore', 'atmosphere', 'story', 'rewatch', 'wtf', 'cozy'];
const LABELS: Record<string, string> = {
    jump: 'Jump',
    dread: 'Dread',
    gore: 'Gore',
    atmosphere: 'Vibe',
    story: 'Story',
    rewatch: 'Re-?s',
    wtf: 'WTF',
    cozy: 'Cozy'
};

export function FearFingerprint({ datasets, height = 300, showLegend = true }: FearFingerprintProps) {
    // Transform data for Recharts
    // Recharts radar needs an array of objects where each object is an axis point (e.g. { subject: 'Jump', A: 5, B: 8 })
    const data = KEYS.map(key => {
        const point: any = { subject: LABELS[key] || key };
        datasets.forEach(ds => {
            point[ds.label] = ds.ratings[key];
        });
        return point;
    });

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />

                    {datasets.map((ds) => (
                        <Radar
                            key={ds.label}
                            name={ds.label}
                            dataKey={ds.label}
                            stroke={ds.color}
                            fill={ds.color}
                            fillOpacity={0.2}
                            isAnimationActive={true}
                        />
                    ))}

                    <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    {showLegend && <Legend />}
                </RadarChart>
            </ResponsiveContainer>
        </div>
    );
}
