//! YouMusicFlow Tauri 2 spike.
//!
//! A feasibility prototype, not a port of the Electron app: a frameless tray wrapper around
//! music.youtube.com with only the platform glue a migration decision depends on.

/// Progress line for the spike. Debug builds print it; release builds compile it out.
macro_rules! spike_log {
    ($($arg:tt)*) => {{
        if cfg!(debug_assertions) {
            eprintln!($($arg)*);
        }
    }};
}

#[cfg(target_os = "macos")]
mod macos;
mod navigation;
#[cfg(all(debug_assertions, target_os = "macos"))]
mod selftest;
mod tray_layout;

#[cfg(all(debug_assertions, target_os = "macos"))]
use selftest::Reports;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use navigation::Route;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::webview::NewWindowResponse;
use tauri::{
    AppHandle, Manager, PhysicalPosition, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_opener::open_url;

const APP_URL: &str = "https://music.youtube.com";
const WINDOW_LABEL: &str = "main";
const TRAY_ID: &str = "main";
/// Same size as the Electron app (`src/main-process/positionWindow.ts`).
const WINDOW_WIDTH: f64 = 375.0;
const WINDOW_HEIGHT: f64 = 667.0;
/// Desktop Safari UA: Google sign-in turns away the embedded-browser UA that WKWebView
/// reports by default.
const DESKTOP_SAFARI_USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
/// Tray glyph from `assets/`, drawn as a template image so it follows light/dark menu bars.
const TRAY_ICON: &[u8] = include_bytes!("../../../assets/icon_dark@2x.png");
/// A tray click this soon after a hide counts as the hide half of a toggle: the click itself
/// took the focus and hid the window before the click event arrived.
const CLICK_AFTER_HIDE: Duration = Duration::from_millis(300);

/// When the window was last hidden, or `None` while it was never hidden.
struct HiddenAt(Mutex<Option<Instant>>);

pub fn run() {
    let builder = tauri::Builder::default()
        // The plugin's own link handler swallows every click on a `_blank` link: it has no
        // permission to open anything, and the click never reaches `on_new_window`.
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .manage(HiddenAt(Mutex::new(None)));

    #[cfg(all(debug_assertions, target_os = "macos"))]
    let builder = builder.manage(Reports(Mutex::new(Vec::new())));

    builder
        .setup(|app| {
            // No Dock icon and no taskbar button: the tray is the only way in.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            build_tray(app.handle())?;
            build_window(app.handle())?;

            #[cfg(all(debug_assertions, target_os = "macos"))]
            selftest::start(app.handle().clone());

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_, _| {});
}

fn build_tray(app: &AppHandle) -> tauri::Result<TrayIcon> {
    let toggle = MenuItem::with_id(app, "toggle", "Show / hide", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit YouMusicFlow", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &quit])?;

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(tauri::image::Image::from_bytes(TRAY_ICON)?)
        .icon_as_template(true)
        .tooltip("YouMusicFlow")
        .menu(&menu)
        // Left click toggles; the menu stays on right click.
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "toggle" => toggle_window(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_window(tray.app_handle());
            }
        })
        .build(app)
}

fn build_window(app: &AppHandle) -> tauri::Result<()> {
    // Starts blank: macOS attaches its content rules first, so they cover the first request.
    let builder = WebviewWindowBuilder::new(
        app,
        WINDOW_LABEL,
        WebviewUrl::External("about:blank".parse().unwrap()),
    )
    .title("YouMusicFlow")
    .inner_size(WINDOW_WIDTH, WINDOW_HEIGHT)
    .min_inner_size(300.0, 400.0)
    .decorations(false)
    .visible(false)
    .skip_taskbar(true)
    .user_agent(DESKTOP_SAFARI_USER_AGENT)
    .on_new_window({
        let app = app.clone();
        move |url, _features| {
            spike_log!("new window requested: {url}");
            match navigation::route(&url) {
                // Electron opened allowed hosts in a second window; the spike has only one.
                // An empty popup is not worth replacing the page for.
                Route::InWindow if url.scheme() == "about" => {}
                Route::InWindow => load_url(&app, &url),
                route => {
                    apply_route(route, &url);
                }
            }
            NewWindowResponse::Deny
        }
    });

    // Debug pages report results through `document.title`.
    #[cfg(all(debug_assertions, target_os = "macos"))]
    let builder = builder.on_document_title_changed(|app, title| {
        if let Some(report) = title.strip_prefix(selftest::TITLE_PREFIX) {
            app.state::<Reports>()
                .0
                .lock()
                .unwrap()
                .push(report.to_owned());
        }
    });

    // Debug builds name every page load: a white window needs its address in the log.
    #[cfg(all(debug_assertions, target_os = "macos"))]
    let builder = builder.on_page_load(|window, payload| {
        spike_log!(
            "page load {:?}: {} ({})",
            payload.event(),
            payload.url(),
            window.label()
        )
    });

    // macOS decides in `macos::install_main_frame_policy`, which can tell frames apart.
    #[cfg(not(target_os = "macos"))]
    let builder = builder.on_navigation(|url| decide_main_frame(url));

    let window = builder.build()?;

    // Hide as soon as the window loses focus.
    let handle = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            spike_log!("window lost focus");
            hide_window(&handle);
        }
    });

    #[cfg(target_os = "macos")]
    {
        let handle = app.clone();
        with_wkwebview(app, move |webview| {
            macos::install_main_frame_policy(
                webview,
                Box::new(|url| Url::parse(&url).map_or(true, |url| decide_main_frame(&url))),
            );
            // The debug self-test attaches the rules itself, after its control probe.
            #[cfg(all(debug_assertions, target_os = "macos"))]
            let skip_rules = selftest::enabled();
            #[cfg(not(all(debug_assertions, target_os = "macos")))]
            let skip_rules = false;
            if !skip_rules {
                macos::attach_content_rules(webview, move || load_app_page(&handle));
            }
        })?;
    }
    #[cfg(not(target_os = "macos"))]
    load_app_page(app);

    Ok(())
}

/// Runs `f` with the WKWebView behind the main window, on the main thread.
#[cfg(target_os = "macos")]
fn with_wkwebview(
    app: &AppHandle,
    f: impl FnOnce(&objc2_web_kit::WKWebView) + Send + 'static,
) -> tauri::Result<()> {
    app.get_webview_window(WINDOW_LABEL)
        .expect("the main window exists")
        .with_webview(move |webview| {
            f(unsafe { &*webview.inner().cast::<objc2_web_kit::WKWebView>() })
        })
}

/// Decides a main-frame navigation. Returns `true` to cancel the load.
fn decide_main_frame(url: &Url) -> bool {
    let route = navigation::route(url);
    spike_log!("main frame {url}: {route:?}");
    apply_route(route, url)
}

/// Acts on a route: `External` URLs go to the default browser. Returns `true` when the load
/// must be cancelled.
fn apply_route(route: Route, url: &Url) -> bool {
    match route {
        Route::InWindow => false,
        Route::External => {
            match open_url(url.as_str(), None::<&str>) {
                Ok(()) => spike_log!("opened in the default browser: {url}"),
                Err(error) => spike_log!("could not open {url}: {error}"),
            }
            true
        }
        Route::Blocked => true,
    }
}

fn load_app_page(app: &AppHandle) {
    load_url(app, &APP_URL.parse().unwrap());
}

/// Navigates the main window to a URL.
fn load_url(app: &AppHandle, url: &Url) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        if let Err(error) = window.navigate(url.clone()) {
            spike_log!("could not navigate to {url}: {error}");
        }
    }
}

fn hide_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(WINDOW_LABEL) {
        let _ = window.hide();
    }
    *app.state::<HiddenAt>().0.lock().unwrap() = Some(Instant::now());
}

/// Shows the window below the tray icon, or hides it when it is already visible.
fn toggle_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window(WINDOW_LABEL) else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        spike_log!("tray click: hide");
        hide_window(app);
        return;
    }
    if hidden_recently(app) {
        spike_log!("tray click: this click already hid the window, staying hidden");
        return;
    }
    show_window(app, &window);
}

fn hidden_recently(app: &AppHandle) -> bool {
    app.state::<HiddenAt>()
        .0
        .lock()
        .unwrap()
        .is_some_and(|at| at.elapsed() < CLICK_AFTER_HIDE)
}

fn show_window(app: &AppHandle, window: &WebviewWindow) {
    place_near_tray(app, window);
    if let Err(error) = window.show().and_then(|_| window.set_focus()) {
        spike_log!("could not show the window: {error}");
    }
    spike_log!("window shown at {:?}", window.outer_position());
}

/// Moves the window under the tray icon before it is shown.
fn place_near_tray(app: &AppHandle, window: &WebviewWindow) {
    let tray = app
        .tray_by_id(TRAY_ID)
        .and_then(|tray| tray.rect().ok().flatten());
    let (Some(tray), Ok(size), Ok(window_scale)) =
        (tray, window.outer_size(), window.scale_factor())
    else {
        return;
    };
    // `tray.rect()` is already physical on macOS, so this only normalizes other platforms.
    let origin = tray.position.to_physical(window_scale);
    let extent = tray.size.to_physical(window_scale);
    let scale = scale_at(app, origin.x as i32, origin.y as i32);
    let (x, y) = tray_layout::position_near_tray(
        [origin.x, origin.y, extent.width, extent.height],
        f64::from(size.width),
        scale,
    );
    if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
        spike_log!("could not move the window: {error}");
    }
    spike_log!("tray {tray:?}, window {size:?}, scale {scale}: moved to ({x}, {y})");
}

/// Scale factor of the display that holds the tray icon.
fn scale_at(app: &AppHandle, x: i32, y: i32) -> f64 {
    app.available_monitors()
        .unwrap_or_default()
        .into_iter()
        .find(|monitor| {
            let (origin, size) = (monitor.position(), monitor.size());
            let (width, height) = (
                i32::try_from(size.width).unwrap_or(i32::MAX),
                i32::try_from(size.height).unwrap_or(i32::MAX),
            );
            x >= origin.x && x < origin.x + width && y >= origin.y && y < origin.y + height
        })
        .map_or(1.0, |monitor| monitor.scale_factor())
}
