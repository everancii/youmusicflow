export function playPause(document: any) {
  const btn = document.querySelector('#play-pause-button')
  if (btn) {
    btn.click()
    return true
  }
  return false
}

function clickPlayerBarButton(document: any, buttonClass: string) {
  const btn =
    document.querySelector(`ytmusic-player-bar .${buttonClass}`) ||
    document.querySelector(`.${buttonClass}`)
  if (btn) {
    ;(btn as HTMLElement).click()
    return true
  }
  return false
}

export function prevTrack(document: any) {
  // Primary: player-bar transport button (always rendered once player is active)
  if (clickPlayerBarButton(document, 'previous-button')) {
    return true
  }
  // Last resort: walk the queue DOM (breaks if queue panel is not rendered)
  const selectedItem = document.querySelector(
    'ytmusic-player-queue-item[selected]'
  )
  if (selectedItem) {
    const prevItem = selectedItem.previousElementSibling
    if (prevItem) {
      const prevItemPlayButton = prevItem.querySelector(
        'ytmusic-play-button-renderer'
      )
      if (prevItemPlayButton) {
        ;(prevItemPlayButton as HTMLElement).click()
        return true
      }
    }
  }
  return false
}

export function nextTrack(document: any) {
  // Primary: player-bar transport button (always rendered once player is active)
  if (clickPlayerBarButton(document, 'next-button')) {
    return true
  }
  // Last resort: walk the queue DOM (breaks if queue panel is not rendered)
  const selectedItem = document.querySelector(
    'ytmusic-player-queue-item[selected]'
  )
  if (selectedItem) {
    const nextItem = selectedItem.nextElementSibling
    if (nextItem) {
      const nextItemPlayButton = nextItem.querySelector(
        'ytmusic-play-button-renderer'
      )
      if (nextItemPlayButton) {
        ;(nextItemPlayButton as HTMLElement).click()
        return true
      }
    }
  }
  return false
}
