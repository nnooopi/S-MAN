"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  CreditCard,
  MoreVertical,
  LogOut,
  Bell,
  UserCircle,
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

export function NavUser({
  user,
}) {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()

  const handleSignOut = () => {
    // Clear authentication token
    localStorage.removeItem('token')
    // Clear any other stored user data if needed
    localStorage.removeItem('userType')
    localStorage.removeItem('userId')
    // Navigate to login page
    navigate('/login')
  }

  // Get initials from name for fallback
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format avatar URL if it exists
  const getAvatarUrl = (avatar) => {
    if (!avatar) return null;
    // If it's already a full URL, return it
    if (avatar.startsWith('http') || avatar.startsWith('/api/')) {
      return avatar;
    }
    // Otherwise, construct the URL (remove leading slash if present)
    const cleanPath = avatar.startsWith('/') ? avatar.substring(1) : avatar;
    return `/api/files/${cleanPath}`;
  };

  const avatarUrl = getAvatarUrl(user.avatar);
  const initials = getInitials(user.name);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarUrl} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-[#BE3144] text-white font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold" style={{color: '#ffffff'}}>{user.name}</span>
                <span className="truncate text-xs" style={{color: 'rgba(255, 255, 255, 0.7)'}}>
                  {user.email}
                </span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg"
            side="top"
            align="start"
            sideOffset={8}
            style={{
              backgroundColor: '#872341',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              minWidth: '200px'
            }}
          >
            <DropdownMenuItem 
              className="focus:bg-transparent"
              onClick={handleSignOut}
              style={{
                color: 'white',
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#BE3144'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <LogOut style={{ marginRight: '0.5rem' }} />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}