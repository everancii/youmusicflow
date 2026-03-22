# Release and distribution

## Building for Windows

From the project root, run:

- **Full build (NSIS + Microsoft Store package):** `npm run dist` or `yarn dist`

Output is written to the `release/` directory.

### Microsoft Store (AppX) build

The Windows build produces an AppX package for Microsoft Store submission in addition to the NSIS installer.

- **Store submission package path:**  
  `release/<ProductName> <version>.appx`  
  Example: `release/Minimal YouTube Music Player 1.0.0.appx`

- **Build requirement:** The Store (AppX) package can only be built on **Windows**. Use a Windows host or a Windows runner in CI.

- **Production signing:** Signing for Store submission is **not** performed by the in-repo build. Use [Microsoft Partner Center](https://partner.microsoft.com/dashboard) or your own signing tooling to sign the `.appx` before submission. The build may produce an unsigned or dev-signed package; production signing is a separate step.

- **Store listing metadata:** Screenshots, description, and other store listing content are uploaded separately in Partner Center. The build does not require or produce these assets.

### NSIS installer

The same build produces the NSIS installer (e.g. `release/Minimal YouTube Music Player Setup 1.0.0.exe`) for direct distribution. Existing behavior is unchanged.
