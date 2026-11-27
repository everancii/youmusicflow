//! Navigation policy. Mirrors `src/tools/navigationPolicy.ts`: Google auth hosts must stay
//! in the window or sign-in breaks, everything else belongs to the default browser.

use tauri::Url;

const ALLOWED_HOSTS: &[&str] = &[
    "music.youtube.com",
    "accounts.google.com",
    "accounts.youtube.com",
    "consent.youtube.com",
    "consent.google.com",
    "www.youtube.com",
    "myaccount.google.com",
];

/// What happens to a top-level navigation attempt.
#[derive(Debug, PartialEq, Eq)]
pub enum Route {
    /// Load it inside the app window.
    InWindow,
    /// Cancel the load and hand the URL to the default browser.
    External,
    /// Cancel the load and do nothing: `http`/`https` only, so a page cannot launch other apps.
    Blocked,
}

pub fn route(url: &Url) -> Route {
    // The webview starts on its own empty page.
    if url.scheme() == "about" {
        return Route::InWindow;
    }
    if !matches!(url.scheme(), "http" | "https") {
        return Route::Blocked;
    }
    let allowed = url
        .host_str()
        .is_some_and(|host| ALLOWED_HOSTS.contains(&host));
    if allowed {
        Route::InWindow
    } else {
        Route::External
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn route_of(url: &str) -> Route {
        route(&url.parse().unwrap())
    }

    #[test]
    fn keeps_youtube_and_google_auth_hosts_in_the_window() {
        for url in [
            "https://music.youtube.com/",
            "https://accounts.google.com/ServiceLogin",
            "https://consent.youtube.com/m",
            "about:blank",
        ] {
            assert_eq!(route_of(url), Route::InWindow, "{url}");
        }
    }

    #[test]
    fn sends_other_hosts_to_the_default_browser() {
        for url in [
            "https://support.google.com/youtubemusic/",
            "http://music.youtube.com.evil.example/",
            "https://youtube.com/",
        ] {
            assert_eq!(route_of(url), Route::External, "{url}");
        }
    }

    #[test]
    fn blocks_non_http_schemes() {
        for url in ["itms-apps://apps.apple.com", "javascript:void(0)"] {
            assert_eq!(route_of(url), Route::Blocked, "{url}");
        }
    }
}
