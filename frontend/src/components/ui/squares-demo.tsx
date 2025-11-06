import { Squares } from "@/components/ui/squares-background"

export function SquaresDemo() {
  return (
    <div className="space-y-8">
      <div className="relative h-[400px] rounded-lg overflow-hidden bg-gradient-to-br from-[#F8F3D9] to-[#EBE5C2]">
        <Squares 
          direction="diagonal"
          speed={0.1}
          squareSize={40}
          borderColor="rgba(80, 75, 56, 0.1)" 
          hoverFillColor="rgba(185, 178, 138, 0.15)"
        />
      </div>
    </div>
  )
}
