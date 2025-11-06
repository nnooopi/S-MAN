"use client"

import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"

export function NavMain({
  items,
  onTabChange,
  sectionTitle,
  activeTab,
}) {
  return (
    <SidebarGroup>
      {sectionTitle && (
        <div className="px-2 py-1 text-xs font-bold text-sidebar-foreground uppercase tracking-wider" style={{color: '#ffffff', letterSpacing: '0.1em'}}>
          {sectionTitle}
        </div>
      )}
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            let id = item.title.toLowerCase().replace(/\s+/g, '-');
            // Handle special cases
            if (id === 'assign-to-do') id = 'assign-todo';
            if (id === 'my-to-do') id = 'my-todo';
            if (id === 'join-requests') id = 'join-requests';
            if (id === 'course-settings') id = 'course-settings';
            if (id === 'deliverables-submission') id = 'deliverables-submission';
            if (id === 'task-assignment') id = 'task-assignment';
            if (id === 'submission-checking') id = 'submission-checking';
            
            const isActive = activeTab === id;
            
            return (
              <SidebarMenuItem key={item.title} data-active={isActive} className={isActive ? 'active' : ''}>
                <SidebarMenuButton 
                  tooltip={item.title}
                  onClick={() => {
                    if (onTabChange) {
                      onTabChange(id);
                    }
                  }}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
