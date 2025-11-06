import { Separator } from "./ui/separator"
import { SidebarTrigger } from "./ui/sidebar"

export function SiteHeader({ title = "Course Dashboard" }) {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 border-b px-6" style={{backgroundColor: '#872341', borderBottomColor: '#BE3144', borderBottom: '1px solid #BE3144'}}>
      <SidebarTrigger 
        className="-ml-1 sidebar-trigger-professor-unique" 
        style={{
          color: '#ffffff',
          backgroundColor: 'transparent !important',
          border: 'none',
          padding: '4px'
        }} 
      />
      <Separator
        orientation="vertical"
        className="mx-2 data-[orientation=vertical]:h-4"
        style={{backgroundColor: '#BE3144'}}
      />
      <h1 className="text-base font-semibold site-header-title professor-header-title-unique" style={{color: '#ffffff', fontWeight: '600', WebkitTextFillColor: '#ffffff', textShadow: 'none', backgroundColor: 'transparent !important'}}>{title}</h1>
    </header>
  )
}
