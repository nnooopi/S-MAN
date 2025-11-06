"use client"

import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "../../lib/utils"

const toggleGroupVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5",
        lg: "h-11 px-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ToggleGroup = React.forwardRef(({ className, variant, size, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-center gap-1", className)}
    {...props}
  />
))
ToggleGroup.displayName = "ToggleGroup"

const ToggleGroupItem = React.forwardRef(({ className, children, variant, size, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(toggleGroupVariants({ variant, size }), className)}
    {...props}
  >
    {children}
  </button>
))
ToggleGroupItem.displayName = "ToggleGroupItem"

export { ToggleGroup, ToggleGroupItem }
