"use client"

import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Home,
  FileText,
  CheckSquare,
  Users,
  BarChart3,
  MessageSquare,
  Bell,
  ClipboardList,
  Database,
  FileBarChart,
  File,
  Settings,
  HelpCircle,
  Search,
  UserPlus,
  GraduationCap,
  FileCheck,
  Lock,
} from "lucide-react"

import { NavDocuments } from "./nav-documents"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"

const studentData = {
  user: {
    name: "Student User",
    email: "student@example.com",
    avatar: "/avatars/student.jpg",
  },
  navMain: [
    {
      title: "Course Overview",
      url: "/course/student/1",
      icon: Home,
    },
    {
      title: "Announcements",
      url: "/course/student/1",
      icon: MessageSquare,
    },
    {
      title: "Notifications",
      url: "/course/student/1",
      icon: Bell,
    },
  ],
  navProjects: [
    {
      title: "Project Dashboard",
      url: "/course/student/1",
      icon: FileText,
    },
    {
      title: "My Group",
      url: "/course/student/1",
      icon: Users,
    },
    {
      title: "My Grades",
      url: "/course/student/1",
      icon: BarChart3,
    },
    {
      title: "Evaluations",
      url: "/course/student/1",
      icon: ClipboardList,
    },
  ],
  navLeader: [
    {
      title: "Submission Checking",
      url: "/course/student/1",
      icon: FileCheck,
    },
    {
      title: "Task Assignment",
      url: "/course/student/1",
      icon: UserPlus,
    },
    {
      title: "Deliverables Submission",
      url: "/course/student/1",
      icon: File,
    },
  ],
}

const professorData = {
  user: {
    name: "Professor",
    email: "professor@example.com",
    avatar: "/avatars/professor.jpg",
  },
  navMain: [
    {
      title: "Course Overview",
      url: "#",
      icon: Home,
    },
    {
      title: "Students",
      url: "#",
      icon: Users,
    },
    {
      title: "Groups",
      url: "#",
      icon: Users,
    },
    {
      title: "Projects",
      url: "#",
      icon: FileText,
    },
    {
      title: "Grade Submissions",
      url: "#",
      icon: FileCheck,
    },
    {
      title: "Grade Sheet",
      url: "#",
      icon: ClipboardList,
    },
    {
      title: "Announcements",
      url: "#",
      icon: MessageSquare,
    },
    {
      title: "Join Requests",
      url: "#",
      icon: UserPlus,
    },
  ],
  navAdmin: [
    {
      title: "Course Settings",
      url: "#",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ onTabChange, userRole, userType = 'student', activeTab, professorData: customProfessorData, userProfile, courseInfo, ...props }) {
  // Use custom professor data if provided, otherwise use default
  const data = userType === 'professor' ? {
    ...professorData,
    user: customProfessorData || professorData.user
  } : {
    ...studentData,
    user: userProfile ? {
      name: userProfile.full_name || `${userProfile.first_name} ${userProfile.last_name}`,
      email: userProfile.email,
      avatar: userProfile.profile_image_url
    } : studentData.user
  };
  const dashboardLink = userType === 'professor' ? '/professor-dashboard' : '/student-dashboard';
  
  return (
    <Sidebar 
      collapsible="icon" 
      {...props}
      className="professor-dashboard-sidebar-ultra-unique-v2024"
      style={{
        backgroundColor: '#09122C !important',
        borderColor: '#872341 !important'
      }}
    >
      <SidebarHeader style={{ backgroundColor: '#09122C !important', borderColor: '#872341 !important' }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to={dashboardLink} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
                <img 
                  src="/S-MAN-LOGO-WHITE.png" 
                  alt="S-MAN Logo" 
                  style={{height: '32px', width: 'auto', objectFit: 'contain'}}
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Course Information Section */}
        {courseInfo && (
          <div style={{
            padding: '0.75rem 1rem',
            margin: '0.5rem 0.75rem',
            background: 'rgba(135, 35, 65, 0.15)',
            border: '1px solid rgba(135, 35, 65, 0.3)',
            borderRadius: '8px',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.6)',
              marginBottom: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '600'
            }}>
              Current Course
            </div>
            <div style={{
              fontSize: '0.875rem',
              color: 'white',
              fontWeight: '700',
              marginBottom: '0.25rem',
              lineHeight: '1.2'
            }}>
              {courseInfo.course_name}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.125rem'
            }}>
              <div>{courseInfo.course_code} - {courseInfo.section}</div>
              <div>{courseInfo.semester} {courseInfo.school_year}</div>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} onTabChange={onTabChange} activeTab={activeTab} />
        {userType === 'student' && (
          <NavMain items={studentData.navProjects} onTabChange={onTabChange} activeTab={activeTab} sectionTitle="Project Tools" />
        )}
        {userType === 'student' && userRole === 'leader' && (
          <NavMain items={studentData.navLeader} onTabChange={onTabChange} activeTab={activeTab} sectionTitle="Leader Tools" />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}