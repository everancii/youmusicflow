import Store from 'electron-store';

interface AppSettings {
    windowPosition: 'auto' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    startOnLogin: boolean;
    alwaysOnTop: boolean;
    hideDockIcon: boolean;
}

const schema = {
    windowPosition: {
        type: 'string',
        enum: ['auto', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
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
    }
};

const store = new Store<AppSettings>({ 
    schema: schema as any,
    name: 'youmusicflow-config'
});

export const getSettings = (): AppSettings => {
    return {
        // @ts-ignore
        windowPosition: store.get('windowPosition'),
        // @ts-ignore
        startOnLogin: store.get('startOnLogin'),
        // @ts-ignore
        alwaysOnTop: store.get('alwaysOnTop'),
        // @ts-ignore
        hideDockIcon: store.get('hideDockIcon')
    };
};

export const updateSetting = (key: keyof AppSettings, value: any) => {
    // @ts-ignore
    store.set(key, value);
};

export const getSetting = (key: keyof AppSettings) => {
    // @ts-ignore
    return store.get(key);
};
