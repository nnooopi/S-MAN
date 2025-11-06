# Header "Notch" Implementation Pattern Analysis

## Overview
The "notch" is a curved dropdown container that appears below the header bar in three sidebar options:
1. **Project Dashboard** (Task Dashboard)
2. **My Group** (My Group)
3. **Deliverables Submission**

---

## Similarities Identified

### 1. **Outer Header Structure** ✅
All three use the same **outer header wrapper**:
```jsx
<header className="flex h-10 shrink-0 items-center gap-2 px-6" 
  style={{backgroundColor: '#872341', border: 'none'}}>
  
  <div className="project-dashboard-header" 
    style={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: 0, margin: 0}}>
    
    {/* Left side - Sidebar toggle + title */}
    {/* Center area - Notch dropdown */}
    {/* Right side - Optional content */}
  </div>
</header>
```

**Key Properties:**
- `backgroundColor: '#872341'` (burgundy/maroon)
- `border: 'none'`
- Fixed height with flexbox layout
- Sidebar trigger on the left with separator

---

### 2. **Left Section (Sidebar & Title)** ✅
All three have identical left sections:
```jsx
<div className="project-dashboard-sidebar-section" 
  style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
  
  <SidebarTrigger className="-ml-1" style={{color: '#ffffff'}} />
  
  <Separator
    orientation="vertical"
    className="mx-2 data-[orientation=vertical]:h-4"
    style={{backgroundColor: '#BE3144'}}
  />
  
  <h1 className="text-base font-semibold site-header-title" 
    style={{color: '#ffffff', fontWeight: '600', WebkitTextFillColor: '#ffffff', textShadow: 'none'}}>
    {pageTitle}
  </h1>
</div>
```

**Consistent Elements:**
- SidebarTrigger for menu toggle
- Vertical separator with darker burgundy color (#BE3144)
- White text title with font-weight 600
- Fixed left alignment

---

### 3. **Center Notch Container** ✅✅✅
This is the **main "notch" element** - IDENTICAL across all three:

```jsx
<div className="project-dashboard-center-section" style={{ 
  position: 'absolute',
  top: '40px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '400px',
  height: '42px',
  backgroundColor: '#872341',
  borderRadius: '0 0 28px 28px',  // ⬅️ Creates the curved notch at bottom
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  padding: '0 12px',
  gap: '12px' OR '20px'  // Slight variation
}}>
```

**Key Features:**
| Property | Value | Purpose |
|----------|-------|---------|
| `position: 'absolute'` | - | Positions outside normal flow |
| `top: '40px'` | - | Places it below the header bar |
| `left: '50%'` + `transform: 'translateX(-50%)'` | - | Centers horizontally |
| `width: '400px'` | - | Standard width for dropdown area |
| `height: '42px'` | - | Matches button height |
| `backgroundColor: '#872341'` | - | Matches header background (seamless) |
| `borderRadius: '0 0 28px 28px'` | - | **Bottom curve only** (creates notch effect) |
| `zIndex: 10` | - | Ensures visibility above content |
| `gap: '12px'` or `'20px'` | - | Space between internal elements |

---

### 4. **Dropdown Button Inside Notch** ✅
All three have a **project/item selector button** inside the notch:

```jsx
<button
  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
  style={{
    padding: '8px 24px',
    minWidth: '336px',
    marginTop: '-30px',  // ⬅️ Extends up into header
    backgroundColor: '#ffffff',
    color: '#872341',
    border: '2px solid #ffffff',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }}>
  {selectedItem?.name || 'Select...'}
  <FaChevronDown style={{marginLeft: '8px'}} />
</button>
```

**Critical Property:** `marginTop: '-30px'`
- Extends the button **up into the header bar**
- Creates visual integration with the notch
- Makes the button appear to "pop out" of the header

**Consistent Styling:**
- White background (#ffffff)
- Burgundy text and border (#872341)
- 8px horizontal padding, 24px vertical padding
- Border-radius: 8px (rounded corners)
- Minimum width: 336px (accommodates dropdown content)

---

## Variations by Section

### Project Dashboard (Task Dashboard)
```jsx
gap: '20px'  // Larger gap between elements
```
- Has both **project selector** and **phase circle** indicator
- More spacing needed

### My Group
- Similar structure with project/group dropdown
- May have different right-side controls

### Deliverables Submission
```jsx
gap: '12px'  // Smaller gap
```
- More compact layout
- Mainly project selector

---

## CSS Class Pattern

All three use the same class structure:
```
<header> 
  └─ project-dashboard-header (flex container)
     ├─ project-dashboard-sidebar-section (left)
     └─ project-dashboard-center-section (center notch)
        └─ project-dropdown-wrapper (button wrapper)
           └─ <button> (selector button)
```

---

## Visual Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  ☰  | Separator | Page Title                                    │  ← Header (h-10)
│     ├── Toggle  │ (e.g., "Task Dashboard")                      │
├─────────────────────────────────────────────────────────────────┤
│                         ┌─────────────────┐                     │
│                         │ [Select Project ▼]                    │
│                    ┌────┴─────────────────┴────┐               │
└────────────────────┤  Notch Area (#872341)   ├────────────────┘
                     │  borderRadius: 0 0 28px 28px│
                     └────────────────────────────┘
```

---

## Implementation Checklist

When creating a similar header notch pattern, ensure:

✅ **Header Container**
- [ ] Use burgundy background (#872341)
- [ ] Apply flexbox layout with full width
- [ ] Set border: none

✅ **Left Section**
- [ ] Include SidebarTrigger component
- [ ] Add Separator (vertical, color #BE3144)
- [ ] Display page title in white (fontWeight: 600)

✅ **Center Notch**
- [ ] Position: absolute with top: 40px
- [ ] Center using left: 50% + transform: translateX(-50%)
- [ ] Set width: 400px, height: 42px
- [ ] Apply backgroundColor matching header (#872341)
- [ ] Use borderRadius: 0 0 28px 28px (bottom curve only)
- [ ] Set zIndex: 10
- [ ] Adjust gap based on content (12px or 20px)

✅ **Dropdown Button**
- [ ] minWidth: 336px
- [ ] marginTop: -30px (critical for pop-out effect)
- [ ] White background with burgundy text/border
- [ ] Include chevron icon with proper alignment

---

## Reusable Component Opportunity 🎯

All three sections follow the same pattern. Consider creating a **reusable component**:

```jsx
const HeaderNotch = ({ 
  title, 
  selectedItem, 
  onItemClick, 
  dropdownOpen, 
  items, 
  gap = '12px' 
}) => {
  return (
    <header className="flex h-10 shrink-0 items-center gap-2 px-6" 
      style={{backgroundColor: '#872341', border: 'none'}}>
      
      <div className="project-dashboard-header" 
        style={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: 0, margin: 0}}>
        
        {/* Left Section */}
        <div className="project-dashboard-sidebar-section" 
          style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
          <SidebarTrigger className="-ml-1" style={{color: '#ffffff'}} />
          <Separator orientation="vertical" style={{backgroundColor: '#BE3144'}} />
          <h1 style={{color: '#ffffff', fontWeight: '600'}}>{title}</h1>
        </div>
        
        {/* Center Notch - Reusable */}
        <div className="project-dashboard-center-section" style={{ 
          position: 'absolute', top: '40px', left: '50%',
          transform: 'translateX(-50%)', width: '400px', height: '42px',
          backgroundColor: '#872341', borderRadius: '0 0 28px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, padding: '0 12px', gap
        }}>
          <button 
            onClick={onItemClick}
            style={{
              padding: '8px 24px', minWidth: '336px', marginTop: '-30px',
              backgroundColor: '#ffffff', color: '#872341',
              border: '2px solid #ffffff', borderRadius: '8px',
              fontSize: '14px', fontWeight: '600', cursor: 'pointer'
            }}>
            {selectedItem?.name || 'Select...'}
            <FaChevronDown style={{marginLeft: '8px'}} />
          </button>
          
          {/* Dropdown menu goes here */}
          {dropdownOpen && renderDropdown(items)}
        </div>
      </div>
    </header>
  );
};
```

**Benefits:**
- DRY principle (Don't Repeat Yourself)
- Consistent styling across all pages
- Easier maintenance
- Single source of truth for header design

---

## Summary Table

| Section | Project Dashboard | My Group | Deliverables |
|---------|-------------------|----------|--------------|
| Header Background | #872341 | #872341 | #872341 |
| Sidebar Toggle | ✅ Yes | ✅ Yes | ✅ Yes |
| Separator Color | #BE3144 | #BE3144 | #BE3144 |
| Notch Width | 400px | 400px | 400px |
| Notch Height | 42px | 42px | 42px |
| Notch BorderRadius | 0 0 28px 28px | 0 0 28px 28px | 0 0 28px 28px |
| Button marginTop | -30px | -30px | -30px |
| Gap Inside Notch | 20px | ? | 12px |
| Button minWidth | 336px | 336px | 336px |

---

## Color Reference

- **Primary Burgundy (Header):** #872341
- **Secondary Burgundy (Separator):** #BE3144
- **Button Text/Border:** #872341 (matches header)
- **Button Background:** #ffffff
- **Text Color:** #ffffff (in header)

---

*Last Updated: November 1, 2025*
*Pattern Type: UI Component Similarity Analysis*
