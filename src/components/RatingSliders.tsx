import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Ratings } from "@/types";
import { Minus, Plus } from "lucide-react";

import { RATING_KEYS, getFunLabel } from "@/lib/rating-utils";

interface RatingSlidersProps {
    ratings: Ratings;
    onChange: (key: keyof Ratings, value: number) => void;
    readOnly?: boolean;
}

const clampAndSnap = (value: number, min: number, max: number, step: number) => {
    const snapped = Math.round(value / step) * step;
    const clamped = Math.min(max, Math.max(min, snapped));
    return Number(clamped.toFixed(2));
};

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

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            disabled={readOnly || ratings[key] <= 0}
                                            aria-label={`Decrease ${label}`}
                                            onClick={() => onChange(key, clampAndSnap(ratings[key] - 0.5, 0, 10, 0.5))}
                                        >
                                            <Minus />
                                        </Button>

                                        <span className={`min-w-12 rounded-full px-3 py-1 text-right text-base font-black tabular-nums ${ratings[key] >= 8 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                            {ratings[key].toFixed(1)}
                                        </span>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 rounded-full"
                                            disabled={readOnly || ratings[key] >= 10}
                                            aria-label={`Increase ${label}`}
                                            onClick={() => onChange(key, clampAndSnap(ratings[key] + 0.5, 0, 10, 0.5))}
                                        >
                                            <Plus />
                                        </Button>
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
