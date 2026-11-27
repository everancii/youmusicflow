cask "youmusicflow" do
  version "1.1.0"
  sha256 "276d54a06343080e5354a9764a8cb2efdd90b38e9e4522cc62e2595369a71b9a"

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
