'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProps {
  avatar?: string;
  userName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function UserAvatar({ 
  avatar, 
  userName, 
  size = 'md',
  className = '' 
}: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={avatar || undefined} 
        alt={`${userName}的头像`}
        className="object-cover"
      />
      <AvatarFallback className={`${textSizes[size]} font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white`}>
        {userName.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
} 