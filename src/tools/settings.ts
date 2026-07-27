import Store, { Schema } from 'electron-store';

export interface AppSettings {
    windowPosition: 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    startOnLogin: boolean;
    alwaysOnTop: boolean;
    hideDockIcon: boolean;
    enableMediaKeys: boolean;
    showNotifications: boolean;
}

const WINDOW_POSITIONS = ['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

const schema: Schema<AppSettings> = {
    windowPosition: {
        type: 'string',
        enum: WINDOW_POSITIONS,
        default: 'auto'
    },
    startOnLogin: {
        type: 'boolean',
        default: false
    },
    alwaysOnTop: {
        type: 'boolean',
        default: false
    },
    hideDockIcon: {
        type: 'boolean',
        default: false
    },
    enableMediaKeys: {
        type: 'boolean',
        default: true
    },
    showNotifications: {
        type: 'boolean',
        default: true
    }
};

const store = new Store<AppSettings>({
    schema,
    name: 'youmusicflow-config'
});

export const getSettings = (): AppSettings => {
    return {
        windowPosition: store.get('windowPosition'),
        startOnLogin: store.get('startOnLogin'),
        alwaysOnTop: store.get('alwaysOnTop'),
        hideDockIcon: store.get('hideDockIcon'),
        enableMediaKeys: store.get('enableMediaKeys'),
        showNotifications: store.get('showNotifications')
    };
};

export const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    store.set(key, value);
};

export const getSetting = <K extends keyof AppSettings>(key: K): AppSettings[K] => {
    return store.get(key);
};

// Guards untrusted renderer input before it reaches the store
export const isValidSetting = (key: unknown, value: unknown): key is keyof AppSettings => {
    switch (key) {
        case 'windowPosition':
            return typeof value === 'string' && WINDOW_POSITIONS.includes(value);
        case 'startOnLogin':
        case 'alwaysOnTop':
        case 'hideDockIcon':
        case 'enableMediaKeys':
        case 'showNotifications':
            return typeof value === 'boolean';
        default:
            return false;
    }
};
