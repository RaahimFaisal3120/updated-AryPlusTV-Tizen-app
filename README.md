# ARY Plus for Samsung Tizen TV

An unofficial Samsung Tizen TV app for the ARY Plus website, built for TV remotes and designed to be easy for older family members to use.

> Made by **punkidow x RaahimFaisal3120**

---

## What's new

### 📺 Episodes: latest first
- Drama episode lists now open on the **newest episode** (for example 29, 28, 27…) instead of episode 1.
- The app loads all episodes of a drama once, sorts them newest-first, and pages them 20 at a time, so page 1 is always the latest.

### 🧭 Easier page navigation
- **Keep pressing Down** at the bottom of the list to continue to older episodes. Press **Up** at the top to go back to newer ones.
- **CH+ / CH−** on the remote switch pages from anywhere in the list.
- Larger **Newer / Older** buttons that show the episode range (for example "Episodes 29 – 10") instead of just "Page 1 of 2".
- A short hint line explains how to reach older episodes.

### ✨ Smooth animations
- Posters and episode cards smoothly grow when focused, with a soft image zoom.
- Grids scroll smoothly instead of jumping.
- Cards rise in one after another when a page or section loads. The direction follows whether you go to older or newer episodes.
- The episode screen fades and slides in and out. Posters and thumbnails fade in as they load.
- Only transform and opacity are animated, to keep it light on TV hardware.

### ⚙️ Player settings: quality and speed
- Press **Down** while playing (or click **⚙ Settings**) to open the settings panel.
- **Quality:** lists the resolutions found in the stream (for example 1080p, 720p, 360p) plus **Auto**. Changing quality continues from the same moment, and it falls back to Auto if a quality fails.
- **Speed:** 1x, 2x and 4x on the TV's built-in player. The browser-style player supports 0.5x to 2x. Not available on live streams.
- The player bar shows the active setting, for example `720p • 1x`.
- Use ◀ ▶ to switch lists, ▲ ▼ to choose, OK to apply and Back to close.

### 🎬 Animated-style startup
- A cinematic splash with the ARY Plus logo, green glow, light streak and a zoom-through into the app.
- A soft synthesized "ta-dum" sound. Set `BOOT_SOUND = false` in the boot script in `index.html` for a silent start.
- Press any button to skip.

### 🏷️ Other
- Package renamed to **ARY_Plus Updated Version .wgt**
- Credit line and "Only Exclusive for Samsung Users" note at the bottom of the main page.

---

## Remote control

| Key | Action |
|---|---|
| ▲ ▼ ◀ ▶ | Move around |
| OK | Select / play / pause |
| Down (in player) | Open settings |
| ◀ ▶ (in player) | Seek |
| CH+ / CH− (episode list) | Newer / older episodes |
| Back | Close the current screen |

## Notes and limitations
- Speed options on the TV's hardware player are whole numbers only (1x, 2x, 4x). Fractional speeds such as 1.25x are only possible on the browser-style player.
- Quality choices depend on how each stream is set up. If a stream has a separate audio track or an unreadable playlist, only **Auto** is shown.
- Settings reset to Auto and 1x for each new video.

## Installation via Apps2Samsung (Easiest Method - No Tizen Studio Required)
## Apps2Samsung allows sideloading custom .wgt apps directly onto your Samsung TV from Windows, macOS, Linux, or even an Android phone.

### Step 1: Enable Developer Mode on your Samsung TV

Turn on your Samsung TV.

Press the Home button on your remote and navigate to Apps.

Go down and open App Settings.

On your remote, press the numeric sequence 1 2 3 4 5 (use the remote number buttons or the on-screen 123 keypad).

The Developer Mode popup will appear:
Toggle Developer Mode to ON.

In the Host PC IP field, enter your PC's or mobile phone's local network IP address (e.g., 192.168.1.xxx). 

**Windows**
1. Press the Windows key, type `cmd`, and press Enter.
2. Type `ipconfig` and press Enter.
3. Read the **IPv4 Address** under your Wi-Fi or Ethernet adapter.

**Mac**
1. Open **System Settings → Wi-Fi** (older macOS: **System Preferences → Network**).
2. Click **Details** next to your network.
3. Read the **IP address**.

**Android**
1. Open **Settings → Wi-Fi** (or **Network & internet**).
2. Tap your connected network.
3. Read the **IP address** (it may be under **Advanced**).

> Use the computer's IP for Tizen Studio installs. The computer(device u using) and the TV must be on the same network, and the address can change if the router restarts.

### Step 2: Turn on Developer Mode on the TV
1. On the TV, open **Apps**.
2. Using the remote, enter **1 2 3 4 5**.
3. Switch **Developer mode** to **On**.
4. In **Host PC IP**, enter the IP address from Step 1.
5. Click **OK** and **restart the TV**.

Restart your TV: Hold down the Power button on your Samsung remote for 5 seconds until the TV turns off and reboots with the Samsung logo.
If this method doesn't work, then you can try punkidow version --> https://github.com/punkidow/AryPlusTV-Tizen
## Credits
**punkidow x RaahimFaisal3120 x Samsung Pakistan**
