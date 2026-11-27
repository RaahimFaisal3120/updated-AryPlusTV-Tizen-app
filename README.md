# ARY Plus for Samsung Tizen TV

An unofficial Samsung Tizen TV app for the ARY Plus website, built for TV remotes and designed to be easy for older family members to use.

> Made by **punkidow x RaahimFaisal3120**

---

## What's new: Netflix-style rework

### 🏠 One home page
- A large hero banner for dramas and shows. It shows only the show's logo, which fades in once loaded. Logos are cached in advance so switching is instant.
- Rows for **Continue Watching**, **New Episodes**, dramas, shows and more.

### 📄 Series page
- **Watch Episode N** starts the latest episode. When an episode is in progress, **Resume** takes the place of **View all episodes**.
- Episodes are always listed newest first. **CH+ / CH−** move between newer and older episodes.

### ▶️ Player (YouTube TV style)
- Large play/pause, previous and next controls in the center of the screen, with a green focus ring.
- Previous and next are always shown and dimmed when not available.
- The timeline always shows the total length on the right.
- **Skip Intro** appears only when the show reports a realistic intro (10 seconds to 3 minutes).
- Quality and speed are inside the settings panel instead of the main bar.
- Fixed audio-only playback on the TV's hardware player.

### 📺 Smart Hub home-bar tiles
- With the app on the TV home bar, focusing it shows **Continue Watching**, **New Episodes** and **Dramas** tiles without opening the app.
- Dramas you watched recently come first, followed by all other dramas.
- Selecting a drama tile plays its latest episode. Other tiles open the show.
- A small background service (`service/service.js`) sends the tiles to the TV.
- ARY images are WebP, which the home bar cannot show, so tile images go through the public `images.weserv.nl` converter to JPG.

### ⚡ Faster on TV hardware
- Lighter animations: fades only, with no zoom, shadow or shimmer effects.
- Spacing uses margins instead of flex `gap`, which older TV browsers do not support.

## Notes and limitations
- Speed options on the TV's hardware player are whole numbers only (1x, 2x, 4x). Fractional speeds such as 1.25x are only possible on the browser-style player.
- Quality choices depend on how each stream is set up. If a stream has a separate audio track or an unreadable playlist, only **Auto** is shown.
- Settings reset to Auto and 1x for each new video.

## Installation via Apps2Samsung (Easiest Method - No Tizen Studio Required)
## Apps2Samsung allows sideloading custom .wgt apps directly onto your Samsung TV from Windows, macOS, Linux, or even an Android phone.

### Step 1: Enable Developer Mode on your Samsung TV

1._ Turn on your Samsung TV.

2._ Press the Home button on your remote and navigate to Apps.

3._ Go down and open App Settings.

4._ On your remote, press the numeric sequence 1 2 3 4 5 (use the remote number buttons or the on-screen 123 keypad).

The Developer Mode popup will appear:
Toggle Developer Mode to ON.

In the Host PC IP field, enter your PC's or mobile phone's local network IP address (e.g., **192.168.1.xxx**) . You can find the IP address by choosing your desired device below.

----------------------------------------------------
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
----------------------------------------------------

> Note: The computer(device u using) and the TV must be on the same network, and the address can change if the wifi router restarts.

5._ Restart your TV: Hold down the Power button on your Samsung remote for 5 seconds until the TV turns off and reboots with the Samsung logo.

## Step 2: Download the ARY Plus TV Package
Download the ARY_Plus Updated Version .wgt from the Releases section of this repository (above).

## Step 3: Install using Apps2Samsung

1._ Download and run Apps2Samsung on your PC or Android device (ensure your device is on the same Wi-Fi/local network as your TV).

2._ Select your TV from the discovered device list (or manually enter your TV's IP address).

3._ If prompted, sign in with a Samsung account to let Apps2Samsung generate the required developer certificate.

4._ Choose Install Custom WGT (or drag & drop the downloaded AryPlusTV.wgt / AryPlusTV_signed.wgt file into Apps2Samsung).

5._ Click Install. Once finished, ARY Plus will appear in your TV's home launcher bar and Apps drawer!



If this method doesn't work, then you can try punkidow version --> https://github.com/punkidow/AryPlusTV-Tizen
## Credits
**punkidow x RaahimFaisal3120 x Samsung Pakistan**
