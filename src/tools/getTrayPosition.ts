export enum TrayPosition {
  Left = 'Left',
  Top = 'Top',
  Right = 'Right',
  Bottom = 'Bottom'
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function getTrayPosition({
  trayBounds,
  displayBounds
}: {
  trayBounds: Bounds
  displayBounds: Bounds
}): TrayPosition {
  // Check if tray is at the top of the display
  // Use a small threshold to account for potential 1px offsets
  const isTop = Math.abs(trayBounds.y - displayBounds.y) <= 5
  if (isTop) {
    return TrayPosition.Top
  }

  const displayBottom = displayBounds.y + displayBounds.height
  const trayBottom = trayBounds.y + trayBounds.height
  const isBottom = Math.abs(trayBottom - displayBottom) <= 5

  if (isBottom) {
    return TrayPosition.Bottom
  }

  const displayCenter = displayBounds.x + (displayBounds.width / 2)
  
  const isLeft = trayBounds.x < displayCenter
  
  if (isLeft) {
    return TrayPosition.Left
  }

  // If not top, bottom, or left, it must be right
  return TrayPosition.Right
}
