//! Debug-only scripted run: `YMFSPIKE_SELFTEST=1` drives the app without a person and logs
//! every step to stderr, so the ad rules, link routing and placement can be checked from a shell.

use std::sync::Mutex;
use std::thread::{sleep, spawn};
use std::time::Duration;

use tauri::{AppHandle, Manager};

use crate::{load_app_page, load_url, toggle_window, with_wkwebview, TRAY_ID, WINDOW_LABEL};

/// Debug pages report results through `document.title` with this prefix.
pub const TITLE_PREFIX: &str = "spike:";

/// Page reports, newest last.
pub struct Reports(pub Mutex<Vec<String>>);

/// A real link from the YouTube Music Help menu: outside the allowlist.
const EXTERNAL_LINK: &str = "https://support.google.com/youtubemusic/";

/// Reports where it runs, to prove the start page runs scripts and the title channel works.
const PING_PROBE: &str = r#"document.title = "spike:" + JSON.stringify({ label: "{label}", result: location.href + " " + document.readyState });"#;

/// Fetches a blocked domain without CORS. `fetched` means the request went out,
/// `blocked:*` means a content rule stopped it.
const FETCH_PROBE: &str = r#"(() => {
  const done = result => { document.title = "spike:" + JSON.stringify({ label: "{label}", result }); };
  const timer = setTimeout(() => done("timeout"), 8000);
  fetch("https://www.doubleclick.net/", { mode: "no-cors", cache: "no-store" })
    .then(() => { clearTimeout(timer); done("fetched"); },
          error => { clearTimeout(timer); done("blocked:" + error.message); });
})();"#;

pub fn enabled() -> bool {
    std::env::var_os("YMFSPIKE_SELFTEST").is_some()
}

/// Runs the scenario on a background thread, only when the self-test is enabled.
pub fn start(app: AppHandle) {
    if !enabled() {
        return;
    }
    spawn(move || scenario(app));
}

fn scenario(app: AppHandle) {
    wait(1);
    let tray = app
        .tray_by_id(TRAY_ID)
        .and_then(|tray| tray.rect().ok().flatten());
    spike_log!("selftest: tray {tray:?}");

    // 0. Load a real blank document: title changes in the webview's implicit start document
    //    never reach `on_document_title_changed`. Then prove scripts run and report back.
    load_url(&app, &"about:blank".parse().unwrap());
    wait(1);
    probe(&app, "ping", PING_PROBE);
    wait(1);
    spike_log!(
        "selftest: start page {} reports {:?}",
        page_url(&app),
        reports(&app)
    );

    // 1. Control: the request must go out while no rules are attached.
    probe(&app, "control", FETCH_PROBE);
    wait(5);

    // 2. The same request with the rules attached.
    let _ = with_wkwebview(&app, |webview| {
        crate::macos::attach_content_rules(webview, || {})
    });
    wait(1);
    probe(&app, "blocked", FETCH_PROBE);
    wait(5);
    spike_log!("selftest: ad rules {}", ad_rules_verdict(&app));

    // 3. The real page.
    load_app_page(&app);
    wait(20);
    spike_log!("selftest: page url {}", page_url(&app));
    // Gives a shell time to measure the loaded page before the browser comes up.
    wait(5);

    // 4. A link outside the allowlist must cancel and open the default browser instead.
    load_url(&app, &EXTERNAL_LINK.parse().unwrap());
    wait(3);
    spike_log!("selftest: page url after external link {}", page_url(&app));

    // 5. What a tray click runs: the first call shows the window for a screenshot, a later
    //    one hides it again. Hide-on-blur stays armed in between.
    toggle_window(&app);
    spike_log!("selftest: visible after first toggle {}", is_visible(&app));
    wait(40);
    toggle_window(&app);
    spike_log!("selftest: visible after second toggle {}", is_visible(&app));
}

fn wait(seconds: u64) {
    sleep(Duration::from_secs(seconds));
}

fn is_visible(app: &AppHandle) -> bool {
    app.get_webview_window(WINDOW_LABEL)
        .is_some_and(|window| window.is_visible().unwrap_or(false))
}

fn reports(app: &AppHandle) -> Vec<String> {
    app.state::<Reports>().0.lock().unwrap().clone()
}

fn probe(app: &AppHandle, label: &str, script: &str) {
    let Some(window) = app.get_webview_window(WINDOW_LABEL) else {
        return;
    };
    if let Err(error) = window.eval(script.replace("{label}", label)) {
        spike_log!("selftest: {label} probe could not run: {error}");
    }
}

/// `PASS` when the control request went out and the request under the rules was blocked.
fn ad_rules_verdict(app: &AppHandle) -> String {
    let reports = app.state::<Reports>();
    let reports = reports.0.lock().unwrap();
    let last = |label: &str| {
        reports
            .iter()
            .filter(|report| report.contains(&format!(r#""label":"{label}""#)))
            .next_back()
            .cloned()
            .unwrap_or_else(|| format!("{label} probe reported nothing"))
    };
    let (control, blocked) = (last("control"), last("blocked"));
    if control.contains("fetched") && blocked.contains("blocked") {
        format!("PASS control={control} rules={blocked}")
    } else {
        format!("FAIL control={control} rules={blocked}")
    }
}

fn page_url(app: &AppHandle) -> String {
    app.get_webview_window(WINDOW_LABEL)
        .and_then(|window| window.url().ok())
        .map_or("unknown".into(), |url| url.to_string())
}
