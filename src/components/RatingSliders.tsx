import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import type { Ratings } from "@/types";

interface RatingSlidersProps {
    ratings: Ratings;
    onChange: (key: keyof Ratings, value: number) => void;
    readOnly?: boolean;
}

import { RATING_KEYS, getFunLabel } from "@/lib/rating-utils";

export function RatingSliders({ ratings, onChange, readOnly = false }: RatingSlidersProps) {
    // Group keys into pairs for the "card" layout
    const groupedKeys: (typeof RATING_KEYS)[] = [];
    for (let i = 0; i < RATING_KEYS.length; i += 2) {
        groupedKeys.push(RATING_KEYS.slice(i, i + 2));
    }

    return (
        <div className="space-y-6">
            {groupedKeys.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-card/50 p-4 rounded-xl border border-secondary/20 shadow-sm space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                        {group.map(({ key, label }) => (
                            <div key={key} className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor={key} className="text-base font-bold flex items-center gap-2">
                                        {label}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="sr-only">{label} rating</span>
                                        <span className={`min-w-12 rounded-full px-3 py-1 text-right text-base font-black tabular-nums ${ratings[key] >= 8 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                            {ratings[key].toFixed(1)}
                                        </span>
                                    </div>
                                </div>

                                <Slider
                                    id={key}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    value={[ratings[key]]}
                                    disabled={readOnly}
                                    onValueChange={(vals: number[]) => onChange(key, vals[0])}
                                    className={readOnly ? "opacity-95" : "py-3 cursor-grab active:cursor-grabbing"}
                                />

                                <div className="text-sm text-center font-medium text-foreground/80 bg-muted/60 border border-border/60 py-2 px-3 rounded-lg">
                                    {getFunLabel(key, ratings[key])}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
