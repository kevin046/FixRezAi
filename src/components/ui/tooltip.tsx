import * as React from "react"
import { cn } from "@/lib/utils"

// Lightweight, dependency-free tooltip implementation compatible with existing usage

interface TooltipContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null)

const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>
}

function Tooltip({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className={cn("relative inline-block", className)}>{children}</div>
    </TooltipContext.Provider>
  )
}

function TooltipTrigger({ asChild = false, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(TooltipContext)
  if (!ctx) return children

  const props = {
    onMouseEnter: (e: React.MouseEvent) => {
      ctx.setOpen(true)
      if (children.props.onMouseEnter) children.props.onMouseEnter(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      ctx.setOpen(false)
      if (children.props.onMouseLeave) children.props.onMouseLeave(e)
    }
  }

  return asChild ? React.cloneElement(children, props) : (
    <span {...props}>{children}</span>
  )
}

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { sideOffset?: number }>(
  ({ className, sideOffset = 4, style, ...props }, ref) => {
    const ctx = React.useContext(TooltipContext)
    if (!ctx) return null

    return ctx.open ? (
      <div
        ref={ref}
        className={cn(
          "z-50 absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
          className
        )}
        style={{ top: `calc(100% + ${sideOffset}px)`, ...style }}
        {...props}
      />
    ) : null
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }