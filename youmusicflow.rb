cask "youmusicflow" do
  version "1.0.0"
  sha256 "2e2a52d9bfa99031b9e9fd085bdb304aa785d2e770d9db74461025eac5b05420"

  # Replace the URL below with your actual GitHub Release download link once uploaded
  url "https://github.com/everancii/youmusicflow/releases/download/v#{version}/YouMusicFlow-#{version}-arm64.dmg"
  name "YouMusicFlow"
  desc "Compact tray-based YouTube Music player"
  homepage "https://github.com/everancii/youmusicflow"

  app "YouMusicFlow.app"

  zap trash: [
    "~/Library/Application Support/youmusicflow-config",
    "~/Library/Preferences/jp.elevenback.youmusicflow.plist",
  ]
end
