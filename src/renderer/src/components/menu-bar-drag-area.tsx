export default function MenuBarDragArea() {
  return (
    <div
      className="h-10 w-full flex items-center justify-center"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <p className="text-xs text-foreground/50">Shrink X</p>
    </div>
  )
}
