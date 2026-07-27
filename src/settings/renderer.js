// Load settings
document.addEventListener('DOMContentLoaded', async () => {
    const settings = await window.settingsAPI.getSettings();
    const version = await window.settingsAPI.getAppVersion();
    const platform = await window.settingsAPI.getPlatform();

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
    document.getElementById('enable-media-keys').checked = settings.enableMediaKeys !== false;
    document.getElementById('show-notifications').checked = settings.showNotifications !== false;
    document.getElementById('hide-dock-icon').checked = settings.hideDockIcon || false;

    // Listeners for changes
    document.getElementById('window-position').addEventListener('change', (e) => {
        window.settingsAPI.updateSetting('windowPosition', e.target.value);
    });

    document.getElementById('start-on-login').addEventListener('change', (e) => {
        window.settingsAPI.updateSetting('startOnLogin', e.target.checked);
    });

    document.getElementById('always-on-top').addEventListener('change', (e) => {
        window.settingsAPI.updateSetting('alwaysOnTop', e.target.checked);
    });

    document.getElementById('enable-media-keys').addEventListener('change', (e) => {
        window.settingsAPI.updateSetting('enableMediaKeys', e.target.checked);
    });

    document.getElementById('show-notifications').addEventListener('change', (e) => {
        window.settingsAPI.updateSetting('showNotifications', e.target.checked);
    });

    document.getElementById('hide-dock-icon').addEventListener('change', (e) => {
        window.settingsAPI.updateSetting('hideDockIcon', e.target.checked);
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        window.close();
    });
});
