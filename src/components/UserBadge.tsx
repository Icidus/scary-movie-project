import { useEffect, useState } from 'react';
import { UsersService } from '@/services/users';
import type { UserProfile } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserBadgeProps {
    userId: string;
    showAvatar?: boolean;
    className?: string;
}

export function UserBadge({ userId, showAvatar = true, className = "" }: UserBadgeProps) {
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        if (!userId) return;

        // Simple client-side cache could be added here or in service,
        // but for now we just fetch. React Query would be better but keeping it simple.
        UsersService.getProfile(userId).then(setProfile);
    }, [userId]);

    if (!profile) {
        return <span className={`text-muted-foreground ${className}`}>User {userId.slice(0, 5)}...</span>;
    }

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showAvatar && (
                <Avatar className="h-5 w-5">
                    <AvatarImage src={profile.photoURL || ''} />
                    <AvatarFallback className="text-[10px]">{profile.displayName?.[0] || '?'}</AvatarFallback>
                </Avatar>
            )}
            <span className="font-medium text-sm">
                {profile.displayName || 'Unknown Member'}
            </span>
        </div>
    );
}
