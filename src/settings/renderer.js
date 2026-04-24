const { ipcRenderer } = require('electron');

// Load settings
document.addEventListener('DOMContentLoaded', async () => {
    const settings = await ipcRenderer.invoke('get-settings');
    const version = await ipcRenderer.invoke('get-app-version');
    const platform = await ipcRenderer.invoke('get-platform');

    if (platform === 'darwin') {
        const windowPositionSetting = document.getElementById('window-position-setting');
        if (windowPositionSetting) {
            windowPositionSetting.style.display = 'none';
        }
        const hideDockIconSetting = document.getElementById('hide-dock-icon-setting');
        if (hideDockIconSetting) {
            hideDockIconSetting.style.display = 'flex';
        }
    }

    document.getElementById('app-version').textContent = version;
    document.getElementById('window-position').value = settings.windowPosition || 'auto';
    document.getElementById('start-on-login').checked = settings.startOnLogin || false;
    document.getElementById('always-on-top').checked = settings.alwaysOnTop || false;
    document.getElementById('hide-dock-icon').checked = settings.hideDockIcon || false;

    // Listeners for changes
    document.getElementById('window-position').addEventListener('change', (e) => {
        ipcRenderer.send('update-setting', 'windowPosition', e.target.value);
    });

    document.getElementById('start-on-login').addEventListener('change', (e) => {
        ipcRenderer.send('update-setting', 'startOnLogin', e.target.checked);
    });
    
    document.getElementById('always-on-top').addEventListener('change', (e) => {
        ipcRenderer.send('update-setting', 'alwaysOnTop', e.target.checked);
    });

    document.getElementById('hide-dock-icon').addEventListener('change', (e) => {
        ipcRenderer.send('update-setting', 'hideDockIcon', e.target.checked);
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        window.close();
    });
});
