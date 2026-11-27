//! Debug-only scripted run: `YMFSPIKE_SELFTEST=1` drives the app without a person and logs
//! every step to stderr, so the ad rules, link routing and placement can be checked from a shell.

use std::sync::Mutex;
use std::thread::{sleep, spawn};
use std::time::Duration;

use tauri::{AppHandle, Manager};

use crate::{
    load_app_page, load_url, toggle_window, with_wkwebview, APP_URL, TRAY_ID, WINDOW_LABEL,
};

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

const PLAYTEST: &str = "YMFSPIKE_PLAYTEST";

/// Adds a `_blank` link to an allowed host at a fixed place and reports its centre.
/// The target is a plain file, so the page keeps the address that was asked for.
/// The report goes out several times: the start page rewrites its own title.
const LINK_PROBE: &str = r#"(() => {
  const a = document.createElement('a');
  a.target = '_blank';
  a.href = 'https://music.youtube.com/robots.txt?spike-link';
  a.textContent = 'spike link';
  a.style.cssText = 'position:fixed;left:8px;top:200px;z-index:2147483647;padding:12px;background:#fff;color:#000;font-size:16px';
  document.body.appendChild(a);
  const r = a.getBoundingClientRect();
  const state = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  const report = 'spike:' + JSON.stringify({ label: '{label}', result: state });
  for (const delay of [0, 300, 600, 1000, 1500]) setTimeout(() => { document.title = report; }, delay);
})()"#;

/// A long-standing public upload, so the run needs no account.
const TRACK_URL: &str = "https://music.youtube.com/watch?v=dQw4w9WgXcQ";

/// Google's YouTube sign-in form. Whether it takes an account is for a person to try.
const SIGNIN_URL: &str = "https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=https%3A%2F%2Fmusic.youtube.com%2F&hl=en";

/// The player as the page sees it: the `<video>` element, the Media Session, the page.
const PLAYER_PROBE: &str = r#"(() => {
  const v = document.querySelector('video');
  const ms = navigator.mediaSession;
  const state = {
    t: v ? Math.round(v.currentTime * 10) / 10 : 'no-video',
    paused: v ? v.paused : null,
    volume: v ? v.volume : null,
    muted: v ? v.muted : null,
    ready: v ? v.readyState : null,
    session: ms ? ms.playbackState : 'no-media-session',
    track: ms && ms.metadata ? ms.metadata.title : null,
    visibility: document.visibilityState,
    videoId: new URLSearchParams(location.search).get('v'),
    popup: (document.querySelector('ytmusic-popup-container')?.innerText || '').slice(0, 120),
  };
  document.title = 'spike:' + JSON.stringify({ label: '{label}', result: state });
})()"#;

/// `play()` from a script: whether WebKit lets the page start sound without a click.
const AUTOPLAY_PROBE: &str = r#"(() => {
  const done = result => { document.title = 'spike:' + JSON.stringify({ label: '{label}', result }); };
  const v = document.querySelector('video');
  if (!v) return done('no-video');
  const timer = setTimeout(() => done('pending'), 6000);
  v.play().then(() => { clearTimeout(timer); done('allowed'); },
                error => { clearTimeout(timer); done('blocked:' + error.name); });
})()"#;

/// The play button's centre, in CSS pixels from the window's top-left corner.
const PLAY_BUTTON_PROBE: &str = r#"(() => {
  const button = document.querySelector('#play-pause-button');
  const r = button ? button.getBoundingClientRect() : null;
  const state = { x: r ? r.x + r.width / 2 : null, y: r ? r.y + r.height / 2 : null,
                  label: button ? button.getAttribute('aria-label') : 'no-button' };
  document.title = 'spike:' + JSON.stringify({ label: '{label}', result: state });
})()"#;

/// What Google shows this webview: the form, or a page that turns the browser away.
const SIGNIN_PROBE: &str = r#"(() => {
  const text = (document.body ? document.body.innerText : '').slice(0, 4000).toLowerCase();
  const refusal = ['not be secure', 'outdated', 'no longer supported', 'unsupported']
    .filter(phrase => text.includes(phrase));
  // No page text leaves the page: it could hold an account.
  const inputs = [...document.querySelectorAll('input')].map(i => i.type + '/' + i.name);
  const state = { page: location.origin + location.pathname, title: document.title, inputs,
                  emailHint: text.includes('email or phone') || text.includes('enter your email'),
                  chooseAccount: text.includes('choose an account'), refusal };
  document.title = 'spike:' + JSON.stringify({ label: '{label}', result: state });
})()"#;

pub fn enabled() -> bool {
    std::env::var_os("YMFSPIKE_SELFTEST").is_some()
}

/// Runs a scenario on a background thread: `YMFSPIKE_PLAYTEST=1` plays a track,
/// `YMFSPIKE_LINKTEST=1` clicks a `_blank` link, `YMFSPIKE_SHOW=1` opens the window once
/// the start page is in, `YMFSPIKE_SIGNIN=1` goes to the password page, `YMFSPIKE_SELFTEST=1`
/// runs the checks below. Nothing runs when none is set.
pub fn start(app: AppHandle) {
    if std::env::var_os(PLAYTEST).is_some() {
        spawn(move || playtest(app));
    } else if std::env::var_os("YMFSPIKE_LINKTEST").is_some() {
        spawn(move || linktest(app));
    } else if std::env::var_os("YMFSPIKE_SIGNIN").is_some() {
        spawn(move || signin(app));
    } else if std::env::var_os("YMFSPIKE_SHOW").is_some() {
        spawn(move || show_once(app));
    } else if enabled() {
        spawn(move || scenario(app));
    }
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

/// `YMFSPIKE_PLAYTEST=1`: plays a track, hides the window and samples the player around
/// media key presses. A shell clicks and presses where the log says `PLAYTEST`.
fn playtest(app: AppHandle) {
    // The page loads once the content rules are ready; a navigation now would be replaced.
    for _ in 0..30 {
        if page_url(&app).starts_with(APP_URL) {
            break;
        }
        wait(1);
    }
    wait(10);
    load_url(&app, &TRACK_URL.parse().unwrap());
    wait(20);
    sample(&app, "loaded");

    probe(&app, "autoplay", AUTOPLAY_PROBE);
    wait(8);
    spike_log!("PLAYTEST autoplay: {}", last_report(&app, "autoplay"));
    // The way a person uses it: the player is open while the track plays, then it closes.
    if sample(&app, "after-play-call").contains(r#""paused":false"#) {
        toggle_window(&app);
    } else {
        show_and_click(&app);
    }
    spike_log!("PLAYTEST shown");
    wait(10);
    sample(&app, "shown-playing");

    if is_visible(&app) {
        toggle_window(&app);
    }
    wait(15);
    sample(&app, "hidden-15s");
    wait(30);
    let hidden = sample(&app, "hidden-45s");

    // Keys go only to a player that plays: one that does not would hand them to another app.
    if hidden.contains(r#""paused":false"#) {
        for key in ["play", "play", "next", "prev"] {
            spike_log!("PLAYTEST key {key}");
            wait(12);
            sample(&app, &format!("after-{key}-key"));
        }
    }

    load_url(&app, &SIGNIN_URL.parse().unwrap());
    wait(15);
    probe(&app, "signin", SIGNIN_PROBE);
    wait(3);
    spike_log!("PLAYTEST sign-in: {}", last_report(&app, "signin"));
    if !is_visible(&app) {
        toggle_window(&app);
    }
    spike_log!("PLAYTEST sign-in shown");
    wait(10);
    load_app_page(&app);
    spike_log!("PLAYTEST finished");
}

/// Asks the page for the player and returns what came back.
fn sample(app: &AppHandle, label: &str) -> String {
    probe(app, label, PLAYER_PROBE);
    wait(3);
    let report = last_report(app, label);
    spike_log!("PLAYTEST {label}: {report}");
    report
}

/// A script cannot start sound: WebKit waits for a real click.
fn show_and_click(app: &AppHandle) {
    announce_click(app, "button", PLAY_BUTTON_PROBE);
    wait(12);
    sample(app, "after-click");
}

/// `YMFSPIKE_LINKTEST=1`: a `_blank` link to an allowed host must open in the window,
/// whatever a page or a plugin does with links.
fn linktest(app: AppHandle) {
    for _ in 0..30 {
        if page_url(&app).starts_with(APP_URL) {
            break;
        }
        wait(1);
    }
    wait(10);
    announce_click(&app, "link", LINK_PROBE);
    wait(12);
    let url = page_url(&app);
    spike_log!(
        "PLAYTEST linktest {}",
        if url.contains("spike-link") {
            format!("PASS: the link opened in the window, page {url}")
        } else {
            format!("FAIL: page {url}")
        }
    );
}

/// `YMFSPIKE_SHOW=1`: opens the window once the start page is in, for a shell to watch
/// the navigation log while a person uses the app. `YMFSPIKE_NAV=<url>` then goes there.
fn show_once(app: AppHandle) {
    for _ in 0..30 {
        if page_url(&app).starts_with(APP_URL) {
            break;
        }
        wait(1);
    }
    wait(10);
    if !is_visible(&app) {
        toggle_window(&app);
    }
    if let Some(url) = std::env::var_os("YMFSPIKE_NAV")
        .and_then(|url| url.to_str().and_then(|url| url.parse().ok()))
    {
        spike_log!("selftest: navigating to {url}");
        load_url(&app, &url);
    }
    // `YMFSPIKE_EVAL=<script>`: runs the script on the shown page and logs what it returns.
    if let Some(script) = std::env::var_os("YMFSPIKE_EVAL") {
        wait(5);
        run(&app, &script.to_string_lossy());
    }
}

/// The address the start page's own sign-in button opens.
const YTM_SIGNIN_URL: &str = "https://accounts.google.com/ServiceLogin?ltmpl=music&service=youtube&uilel=3&passive=true&continue=https%3A%2F%2Fwww.youtube.com%2Fsignin%3Faction_handle_signin%3Dtrue%26app%3Ddesktop%26hl%3Den-GB%26next%3Dhttps%253A%252F%252Fmusic.youtube.com%252F%26feature%253D__FEATURE__&hl=en-GB";

/// `YMFSPIKE_SIGNIN=1`: signs out and goes to the password page of the first known account,
/// so a person only types the password while the navigation log runs.
fn signin(app: AppHandle) {
    for _ in 0..30 {
        if page_url(&app).starts_with(APP_URL) {
            break;
        }
        wait(1);
    }
    wait(10);
    if !is_visible(&app) {
        toggle_window(&app);
    }
    load_url(&app, &"https://music.youtube.com/logout".parse().unwrap());
    wait(15);
    spike_log!("PLAYTEST signin: after sign-out, page {}", page_url(&app));
    load_url(&app, &YTM_SIGNIN_URL.parse().unwrap());
    wait(12);
    spike_log!("PLAYTEST signin: sign-in page {}", page_url(&app));
    run(
        &app,
        r#"(() => { const row = document.querySelector('[data-identifier]'); if (!row) return 'no account row'; row.click(); return 'clicked ' + row.tagName; })()"#,
    );
    wait(8);
    spike_log!("PLAYTEST signin: password page {}", page_url(&app));
}

/// Runs a script on the page and logs what it returns. `await` works; the script returns.
fn run(app: &AppHandle, script: &str) {
    probe(
        app,
        "eval",
        &format!(
            r#"(async () => {{
  let result;
  try {{ result = await (async () => {{ {script} }})(); }}
  catch (error) {{ result = 'threw: ' + error; }}
  document.title = 'spike:' + JSON.stringify({{ label: '{{label}}', result: String(result) }});
}})()"#
        ),
    );
    wait(4);
    spike_log!("PLAYTEST eval: {}", last_report(app, "eval"));
}

/// Shows the window and says where a probed element is, for the shell to click.
fn announce_click(app: &AppHandle, label: &str, script: &str) -> Option<(f64, f64)> {
    if !is_visible(app) {
        toggle_window(app);
        wait(3);
    }
    probe(app, label, script);
    wait(3);
    let report = last_report(app, label);
    let window = app.get_webview_window(WINDOW_LABEL)?;
    let (Ok(position), Ok(scale)) = (window.outer_position(), window.scale_factor()) else {
        return None;
    };
    let Some((x, y)) = number(&report, "x").zip(number(&report, "y")) else {
        spike_log!("selftest: nothing to click: {report}");
        return None;
    };
    // Screen points: the frameless window's corner plus the element's CSS pixels.
    let point = (
        f64::from(position.x) / scale + x,
        f64::from(position.y) / scale + y,
    );
    spike_log!("PLAYTEST click {} {}", point.0, point.1);
    Some(point)
}
/// The number after `"name":` in a report, up to the next character that is not part of it.
fn number(report: &str, name: &str) -> Option<f64> {
    let rest = report.split_once(&format!("\"{name}\":"))?.1;
    let end = rest
        .find(|c: char| !(c.is_ascii_digit() || c == '.' || c == '-'))
        .unwrap_or(rest.len());
    rest[..end].parse().ok()
}

/// The newest report with this label.
fn last_report(app: &AppHandle, label: &str) -> String {
    app.state::<Reports>()
        .0
        .lock()
        .unwrap()
        .iter()
        .filter(|report| report.contains(&format!(r#""label":"{label}""#)))
        .next_back()
        .cloned()
        .unwrap_or_else(|| format!("{label} probe reported nothing"))
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
    let (control, blocked) = (last_report(app, "control"), last_report(app, "blocked"));
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
