import { App, MenuItemConstructorOptions } from 'electron'

export function createContextTemplate(app: App): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Settings',
      click: () => {
        app.emit('open-settings')
      }
    },
    {
      label: 'Quit',
      accelerator: 'CmdOrCtrl+Q',
      click: () => {
        app.exit(0)
      }
    }
  ]
}
