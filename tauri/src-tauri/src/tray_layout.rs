//! Window placement next to the tray icon.

/// Gap between the tray icon and the window on macOS, in points
/// (`src/tools/offsetCalclator.ts` in the Electron app).
const TRAY_OFFSET: (f64, f64) = (20.0, 4.0);

/// Top-left corner for the window so it hangs under the tray icon, its right edge
/// `TRAY_OFFSET.0` points past the icon's left edge. Same math as `positionOnTrayClickMac`.
///
/// `tray` is `[x, y, width, height]` and the result is in physical pixels from the top-left of
/// the main display; `scale` turns the point offsets into pixels.
pub fn position_near_tray(tray: [f64; 4], window_width: f64, scale: f64) -> (i32, i32) {
    let [tray_x, tray_y, _tray_width, tray_height] = tray;
    (
        (tray_x - window_width + TRAY_OFFSET.0 * scale).round() as i32,
        (tray_y + tray_height + TRAY_OFFSET.1 * scale).round() as i32,
    )
}

#[cfg(test)]
mod tests {
    use super::position_near_tray;

    #[test]
    fn right_edge_sits_20_points_past_the_icon_and_window_hangs_below_it() {
        // 2x display: 375pt window is 750px, tray icon 36x44px at x=2000.
        assert_eq!(
            position_near_tray([2000.0, 0.0, 36.0, 44.0], 750.0, 2.0),
            (1290, 52)
        );
        assert_eq!(
            position_near_tray([1000.0, 0.0, 18.0, 22.0], 375.0, 1.0),
            (645, 26)
        );
    }
}
