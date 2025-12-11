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
                                    <span className={`text-xl font-black w-12 text-right ${ratings[key] >= 8 ? 'text-red-500 animate-pulse' : 'text-primary'}`}>
                                        {ratings[key]}
                                    </span>
                                </div>

                                <Slider
                                    id={key}
                                    min={0}
                                    max={10}
                                    step={0.5}
                                    value={[ratings[key]]}
                                    disabled={readOnly}
                                    onValueChange={(vals: number[]) => onChange(key, vals[0])}
                                    className={readOnly ? "opacity-90 cursor-default" : "py-2 cursor-grab active:cursor-grabbing"}
                                />

                                <div className="text-xs text-center font-medium text-muted-foreground bg-secondary/30 py-1.5 rounded-md animate-in fade-in slide-in-from-bottom-1 duration-500">
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
