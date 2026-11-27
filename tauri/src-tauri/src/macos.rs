//! macOS glue for the WKWebView: content-blocker rules and a main-frame-only navigation policy.
//!
//! Tauri's `on_navigation` callback fires for every frame, so a hidden third-party iframe on
//! music.youtube.com would pop the default browser open. `MainFramePolicyDelegate` answers
//! main-frame requests itself and forwards everything else to the delegate wry installed.

use std::sync::Mutex;

use block2::RcBlock;
use objc2::runtime::{AnyObject, NSObject, ProtocolObject, Sel};
use objc2::{define_class, msg_send, rc::Retained, DefinedClass, MainThreadMarker, MainThreadOnly};
use objc2_foundation::{NSError, NSObjectProtocol, NSString};
use objc2_web_kit::{
    WKContentRuleList, WKContentRuleListStore, WKNavigationAction, WKNavigationActionPolicy,
    WKNavigationDelegate, WKWebView,
};

/// Ad and tracker domains of the Electron app. They were dropped from `src/` in 1156f8f;
/// the list comes from the git history of `src/main.ts`.
const BLOCKED_DOMAINS: &[&str] = &[
    "doubleclick.net",
    "google-analytics.com",
    "googlesyndication.com",
    "googleadservices.com",
    "googletagservices.com",
];
const RULES_IDENTIFIER: &str = "jp.elevenback.youmusicflow.spike-ads";

/// `WKContentRuleList` JSON: block every request to a blocked domain or one of its subdomains.
fn content_rules() -> String {
    let rules = BLOCKED_DOMAINS
        .iter()
        .map(|domain| {
            let domain = domain.replace('.', "\\\\.");
            format!(
                r#"{{"trigger":{{"url-filter":"^[^:]+://+([^:/]+\\.)?{domain}[:/]"}},"action":{{"type":"block"}}}}"#
            )
        })
        .collect::<Vec<_>>()
        .join(",");
    format!("[{rules}]")
}

/// Compiles the ad rules and attaches them to the webview. `on_ready` runs afterwards on the
/// main thread, whether or not the rules compiled, so the page load is never left hanging.
pub fn attach_content_rules(webview: &WKWebView, on_ready: impl FnOnce() + 'static) {
    let main_thread = MainThreadMarker::from(webview);
    let content_controller = unsafe { webview.configuration().userContentController() };
    let store = unsafe { WKContentRuleListStore::defaultStore(main_thread) }
        .expect("WebKit always provides a default content rule store");
    let identifier = NSString::from_str(RULES_IDENTIFIER);
    let rules = NSString::from_str(&content_rules());
    // Blocks are `Fn`; the callback must run once.
    let on_ready = Mutex::new(Some(on_ready));

    let completion = RcBlock::new(
        move |rule_list: *mut WKContentRuleList, error: *mut NSError| {
            match unsafe { Retained::retain(rule_list) } {
                Some(rule_list) => unsafe { content_controller.addContentRuleList(&rule_list) },
                None => {
                    let reason = unsafe { Retained::retain(error) }
                        .map(|error| error.localizedDescription().to_string())
                        .unwrap_or_else(|| "no rule list and no error".into());
                    eprintln!("[spike] content rules did not compile: {reason}");
                }
            }
            if let Some(on_ready) = on_ready.lock().unwrap().take() {
                on_ready();
            }
        },
    );

    unsafe {
        store.compileContentRuleListForIdentifier_encodedContentRuleList_completionHandler(
            Some(&identifier),
            Some(&rules),
            Some(&completion),
        );
    }
}

/// Makes `policy` decide main-frame navigations: it receives the URL and returns `true` to
/// cancel the load. Subframes, new-window requests and every other delegate callback keep
/// going to wry's delegate.
pub fn install_main_frame_policy(webview: &WKWebView, policy: Box<dyn Fn(String) -> bool>) {
    let main_thread = MainThreadMarker::from(webview);
    let original = unsafe { webview.navigationDelegate() };
    let delegate = main_thread
        .alloc::<MainFramePolicyDelegate>()
        .set_ivars(PolicyIvars { policy, original });
    let delegate: Retained<MainFramePolicyDelegate> = unsafe { msg_send![super(delegate), init] };
    unsafe { webview.setNavigationDelegate(Some(ProtocolObject::from_ref(&*delegate))) };
    // The webview holds its delegate weakly, so the proxy has to outlive it.
    std::mem::forget(delegate);
}

struct PolicyIvars {
    policy: Box<dyn Fn(String) -> bool>,
    /// The delegate wry installed: page-load events, downloads, web-content crashes.
    original: Option<Retained<ProtocolObject<dyn WKNavigationDelegate>>>,
}

define_class!(
    #[unsafe(super(NSObject))]
    #[thread_kind = MainThreadOnly]
    #[ivars = PolicyIvars]
    struct MainFramePolicyDelegate;

    unsafe impl NSObjectProtocol for MainFramePolicyDelegate {}

    impl MainFramePolicyDelegate {
        // WebKit asks this before calling an optional method. The proxy covers a subset of
        // the original's methods, so the original's answer is the right one.
        #[unsafe(method(respondsToSelector:))]
        fn responds_to_selector(&self, selector: Sel) -> bool {
            self.ivars()
                .original
                .as_deref()
                .is_some_and(|original| original.respondsToSelector(selector))
        }

        // Anything the proxy does not implement itself goes to the original.
        #[unsafe(method(forwardingTargetForSelector:))]
        fn forwarding_target_for_selector(&self, _selector: Sel) -> Option<&AnyObject> {
            self.ivars().original.as_deref().map(AsRef::as_ref)
        }
    }

    unsafe impl WKNavigationDelegate for MainFramePolicyDelegate {
        #[unsafe(method(webView:decidePolicyForNavigationAction:decisionHandler:))]
        fn decide_policy(
            &self,
            webview: &WKWebView,
            action: &WKNavigationAction,
            handler: &block2::Block<dyn Fn(WKNavigationActionPolicy)>,
        ) {
            // No target frame means a new window; Tauri's `on_new_window` handles those.
            let main_frame = unsafe { action.targetFrame() }
                .is_some_and(|frame| unsafe { frame.isMainFrame() });
            let cancel = main_frame
                && unsafe { action.request().URL() }
                    .is_some_and(|url| (self.ivars().policy)(url.absoluteString().unwrap().to_string()));
            if cancel {
                handler.call((WKNavigationActionPolicy::Cancel,));
            } else {
                self.forward(webview, action, handler);
            }
        }
    }
);

impl MainFramePolicyDelegate {
    /// Hands the decision to wry's delegate, or allows when there is none.
    fn forward(
        &self,
        webview: &WKWebView,
        action: &WKNavigationAction,
        handler: &block2::Block<dyn Fn(WKNavigationActionPolicy)>,
    ) {
        match self.ivars().original.as_deref() {
            Some(original) => unsafe {
                original.webView_decidePolicyForNavigationAction_decisionHandler(
                    webview, action, handler,
                )
            },
            None => handler.call((WKNavigationActionPolicy::Allow,)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{content_rules, BLOCKED_DOMAINS};

    #[test]
    fn content_rules_are_valid_json_with_one_block_rule_per_domain() {
        let rules: serde_json::Value = serde_json::from_str(&content_rules()).unwrap();
        let rules = rules.as_array().unwrap();
        assert_eq!(rules.len(), BLOCKED_DOMAINS.len());
        for rule in rules {
            assert_eq!(rule["action"]["type"], "block");
            let filter = rule["trigger"]["url-filter"].as_str().unwrap();
            assert!(filter.starts_with("^[^:]+://+([^:/]+\\.)?"), "{filter}");
        }
    }

    #[test]
    fn url_filter_escapes_dots_in_the_domain() {
        let rules = content_rules();
        assert!(rules.contains(r"doubleclick\\.net[:/]"), "{rules}");
    }
}
