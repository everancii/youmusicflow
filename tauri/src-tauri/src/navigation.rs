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
        .is_some_and(|host| ALLOWED_HOSTS.contains(&host) || is_country_account_host(host));
    if allowed {
        Route::InWindow
    } else {
        Route::External
    }
}

/// Google also signs in through country-specific account hosts. After a password it passes
/// the session through `accounts.google.tn/accounts/SetSID`, or `accounts.google.co.uk`,
/// `accounts.google.com.ua`, depending on the network's country. A list of them would be long
/// and always behind, so the shape is recognised instead: `accounts.google.` and a country
/// suffix of one or two labels. Anything longer is another site's subdomain.
fn is_country_account_host(host: &str) -> bool {
    let Some(suffix) = host.strip_prefix("accounts.google.") else {
        return false;
    };
    let country =
        |label: &str| label.len() == 2 && label.bytes().all(|byte| byte.is_ascii_lowercase());
    let mut labels = suffix.split('.');
    let first = labels.next().unwrap_or_default();
    match labels.next() {
        None => country(first),
        Some(second) => labels.next().is_none() && matches!(first, "com" | "co") && country(second),
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

    #[test]
    fn keeps_country_specific_account_hosts_in_the_window() {
        // Seen after a password on a Tunisian network: the session goes through SetSID there.
        for host in [
            "accounts.google.tn",
            "accounts.google.de",
            "accounts.google.com.ua",
            "accounts.google.co.uk",
        ] {
            assert_eq!(
                route_of(&format!("https://{host}/accounts/SetSID?ssdc=1")),
                Route::InWindow,
                "{host}"
            );
        }
    }

    #[test]
    fn does_not_mistake_other_sites_for_account_hosts() {
        for host in [
            "accounts.google.evil.example",
            "accounts.google.com.evil.example",
            "accounts.googleapis.com",
            "xaccounts.google.tn",
        ] {
            assert_eq!(
                route_of(&format!("https://{host}/")),
                Route::External,
                "{host}"
            );
        }
    }
}
