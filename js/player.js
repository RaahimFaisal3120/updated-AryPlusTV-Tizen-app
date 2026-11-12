/**
 * ARY Plus TV - High-Performance Video Player Engine
 * Robust AVPlay Lifecycle and Resource Handling for Tizen 6.0
 */
const PlayerEngine = (function() {
    let videoElement = null;
    let isPlaying = false;
    let isLiveStream = false;
    let duration = 0;
    let currentTime = 0;
    let hudTimer = null;
    let hlsInstance = null;
    let onCloseCallback = null;
    let isClosing = false;

    // --- Player settings: picture quality + playback speed ---
    let baseUrl = '';
    let playToken = 0;            // identifies the current video (ignores late answers for an old one)
    let playbackSpeed = 1;
    let speedIndex = 0;
    let variants = [];            // [{ label, url }] picture qualities found in the stream
    let qualityIndex = 0;         // 0 = Auto
    let settingsOpen = false;
    let settingsCol = 0;          // 0 = Quality list, 1 = Speed list
    let settingsRow = 0;
    // The TV's hardware player only takes whole-number speeds; the browser player takes fine steps.
    const SPEEDS_AVPLAY = [1, 2, 4];
    const SPEEDS_HTML5 = [0.5, 0.75, 1, 1.25, 1.5, 2];

    function getAVPlay() {
        if (typeof webapis !== 'undefined' && webapis.avplay) {
            return webapis.avplay;
        }
        return null;
    }

    function init() {
        videoElement = document.getElementById('html5-player');
        const gear = document.getElementById('hud-settings-btn');
        if (gear) gear.onclick = function() { openSettings(); };
    }

    function playStream(url, title, isLive, onClose) {
        if (!url) {
            console.error('[PlayerEngine] No stream URL provided');
            return;
        }

        isClosing = false;
        isLiveStream = Boolean(isLive);
        onCloseCallback = onClose;
        resetSettingsForNewStream(url);

        const app = document.getElementById('app');
        const episodesView = document.getElementById('episodes-view');
        const playerContainer = document.getElementById('player-container');
        const hudTitle = document.getElementById('hud-title');
        const hudStatus = document.getElementById('hud-status');
        const hudProgress = document.getElementById('hud-progress-bar');
        const spinner = document.getElementById('spinner');

        // AVPLAY HARDWARE UNDERLAY RULES:
        // 1. Hide DOM trees so video plane shines through
        if (app) app.style.display = 'none';
        if (episodesView) episodesView.style.display = 'none';

        // 2. Set transparency
        document.documentElement.style.backgroundColor = 'transparent';
        document.body.style.backgroundColor = 'transparent';

        playerContainer.style.backgroundColor = 'transparent';
        playerContainer.style.display = 'block';

        hudTitle.textContent = title || 'ARY Plus Stream';
        hudStatus.textContent = isLiveStream ? '🔴 LIVE STREAM' : 'VOD PLAYBACK';
        hudProgress.style.display = isLiveStream ? 'none' : 'block';
        if (spinner) spinner.style.display = 'block';
        showHUD();

        console.log('[PlayerEngine] Playing:', url, 'Live:', isLiveStream);

        const avplay = getAVPlay();
        if (avplay) {
            playAVPlay(url, avplay);
        } else {
            playHTML5(url);
        }
        loadVariants(url, playToken);
    }

    function playAVPlay(url, avplay, resumeMs) {
        // Safe reset before opening new stream
        try {
            const state = avplay.getState();
            if (state !== 'NONE' && state !== 'IDLE') {
                try { avplay.stop(); } catch(e){}
                try { avplay.close(); } catch(e){}
            }
        } catch (e) {}

        try {
            avplay.open(url);
            avplay.setDisplayRect(0, 0, 1920, 1080);
            avplay.setDisplayMethod('PLAYER_DISPLAY_MODE_LETTER_BOX');

            try {
                avplay.setStreamingProperty("USER_AGENT", "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/537.36");
            } catch (e) {}

            const listener = {
                onbufferingstart: function() {
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'block';
                },
                onbufferingcomplete: function() {
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'none';
                },
                oncurrentplaytime: function(time) {
                    currentTime = time;
                    updateTimeDisplay(time, duration);
                },
                onerror: function(eventType) {
                    console.error('[AVPlay Error]', eventType);
                    const st = document.getElementById('hud-status');
                    if (st) st.textContent = 'Stream Error';
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'none';
                },
                onstreamcompleted: function() {
                    console.log('[AVPlay] Stream Completed');
                    closePlayer();
                }
            };

            avplay.setListener(listener);

            avplay.prepareAsync(function() {
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
                try {
                    duration = avplay.getDuration();
                } catch(e) {
                    duration = 0;
                }
                const startPlayback = function() {
                    try {
                        avplay.play();
                        isPlaying = true;
                    } catch (e) {
                        console.error('[AVPlay play exception]', e);
                    }
                    if (playbackSpeed !== 1) applySpeed();
                };
                if (resumeMs && resumeMs > 1000 && !isLiveStream) {
                    // Picture quality changed: continue from the same moment
                    try { avplay.seekTo(resumeMs, startPlayback, startPlayback); }
                    catch (e) { startPlayback(); }
                } else {
                    startPlayback();
                }
            }, function(err) {
                console.error('[AVPlay Prepare Failed]', err);
                if (fallbackToAuto()) return;
                const st = document.getElementById('hud-status');
                if (st) st.textContent = 'Playback error';
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
            });

        } catch (e) {
            console.error('[AVPlay Exception]', e);
            const sp = document.getElementById('spinner');
            if (sp) sp.style.display = 'none';
        }
    }

    function playHTML5(url, resumeMs) {
        if (!videoElement) return;

        const onMeta = function() {
            videoElement.removeEventListener('loadedmetadata', onMeta);
            if (resumeMs && resumeMs > 1000 && !isLiveStream) videoElement.currentTime = resumeMs / 1000;
            applySpeed();
        };
        videoElement.addEventListener('loadedmetadata', onMeta);

        if (hlsInstance) {
            try { hlsInstance.destroy(); } catch(e){}
            hlsInstance = null;
        }

        if (window.Hls && Hls.isSupported()) {
            hlsInstance = new Hls({
                enableWorker: true,
                lowLatencyMode: true
            });
            hlsInstance.loadSource(url);
            hlsInstance.attachMedia(videoElement);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
                videoElement.play().catch(e => console.log('Autoplay caught:', e));
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
                isPlaying = true;
            });
            hlsInstance.on(Hls.Events.ERROR, function(event, data) {
                if (data.fatal) {
                    console.error('[HLS.js Fatal Error]', data);
                    const sp = document.getElementById('spinner');
                    if (sp) sp.style.display = 'none';
                }
            });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            videoElement.src = url;
            videoElement.play().then(() => {
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
                isPlaying = true;
            }).catch(err => {
                console.warn('[HTML5 Fallback Play error]', err);
                const sp = document.getElementById('spinner');
                if (sp) sp.style.display = 'none';
            });
        } else {
            videoElement.src = url;
            videoElement.play().catch(() => {});
        }

        videoElement.ontimeupdate = () => {
            currentTime = videoElement.currentTime * 1000;
            duration = (videoElement.duration || 0) * 1000;
            updateTimeDisplay(currentTime, duration);
        };
    }

    function updateTimeDisplay(curMs, durMs) {
        if (isLiveStream || !durMs || isNaN(durMs)) return;
        const fill = document.getElementById('hud-progress-fill');
        const timeLabel = document.getElementById('hud-time');
        const pct = Math.min(100, Math.max(0, (curMs / durMs) * 100));
        if (fill) fill.style.width = pct + '%';

        const curSec = Math.floor(curMs / 1000);
        const durSec = Math.floor(durMs / 1000);
        if (timeLabel) timeLabel.textContent = formatTime(curSec) + ' / ' + formatTime(durSec);
    }

    function formatTime(totalSeconds) {
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function togglePlayPause() {
        const avplay = getAVPlay();
        if (!isPlaying) {
            if (avplay) {
                try { avplay.play(); } catch(e){}
            } else if (videoElement) {
                videoElement.play();
            }
            isPlaying = true;
            showHUD();
        } else {
            if (avplay) {
                try { avplay.pause(); } catch(e){}
            } else if (videoElement) {
                videoElement.pause();
            }
            isPlaying = false;
            showHUD();
        }
    }

    function seek(offsetSeconds) {
        if (isLiveStream) return;
        const offsetMs = offsetSeconds * 1000;
        const target = Math.max(0, Math.min(duration, currentTime + offsetMs));
        const avplay = getAVPlay();
        if (avplay) {
            try { avplay.seekTo(target); } catch(e){}
        } else if (videoElement) {
            videoElement.currentTime = target / 1000;
        }
        showHUD();
    }

    function showHUD() {
        const hud = document.getElementById('player-hud');
        if (!hud) return;
        hud.classList.add('visible');
        clearTimeout(hudTimer);
        hudTimer = setTimeout(() => {
            if (isPlaying && !settingsOpen) {
                hud.classList.remove('visible');
            }
        }, 4000);
    }

    function closePlayer() {
        if (isClosing) return;
        isClosing = true;

        clearTimeout(hudTimer);
        isPlaying = false;
        closeSettings(true);

        // 1. Safe shutdown of AVPlay hardware pipeline
        const avplay = getAVPlay();
        if (avplay) {
            try {
                const state = avplay.getState();
                if (state === 'PLAYING' || state === 'PAUSED') {
                    avplay.stop();
                }
            } catch (e) {
                console.warn('[AVPlay stop err]', e);
            }
            try {
                avplay.close();
            } catch (e) {
                console.warn('[AVPlay close err]', e);
            }
        }

        // 2. Cleanup HTML5 video fallback
        if (videoElement) {
            try { videoElement.pause(); } catch(e){}
            videoElement.removeAttribute('src');
            try { videoElement.load(); } catch(e){}
            if (hlsInstance) {
                try { hlsInstance.destroy(); } catch(e){}
                hlsInstance = null;
            }
        }

        // 3. Hide HUD and Player overlay
        const hud = document.getElementById('player-hud');
        if (hud) hud.classList.remove('visible');
        const pContainer = document.getElementById('player-container');
        if (pContainer) pContainer.style.display = 'none';
        const sp = document.getElementById('spinner');
        if (sp) sp.style.display = 'none';

        // 4. Restore background colors for Web view
        document.documentElement.style.backgroundColor = '#0a0c10';
        document.body.style.backgroundColor = '#0a0c10';

        // 5. Fire callback cleanly
        const cb = onCloseCallback;
        onCloseCallback = null;
        if (typeof cb === 'function') {
            try {
                cb();
            } catch (err) {
                console.error('[onCloseCallback Error]', err);
            }
        }
        isClosing = false;
    }

    // ===================== SETTINGS: QUALITY + SPEED =====================
    function speedOptions() {
        return getAVPlay() ? SPEEDS_AVPLAY : SPEEDS_HTML5;
    }

    function speedLabel(s) {
        return s === 1 ? '1x  (Normal)' : s + 'x';
    }

    function qualityOptions() {
        const list = [{ label: 'Auto', url: baseUrl }];
        variants.forEach(function(v) { list.push(v); });
        return list;
    }

    function resetSettingsForNewStream(url) {
        playToken++;
        baseUrl = url;
        playbackSpeed = 1;
        speedIndex = Math.max(0, speedOptions().indexOf(1));
        variants = [];
        qualityIndex = 0;
        closeSettings(true);
        renderSettings();
        updateBadges();
    }

    function flashStatus(msg) {
        const st = document.getElementById('hud-status');
        if (!st) return;
        const original = isLiveStream ? '🔴 LIVE STREAM' : 'VOD PLAYBACK';
        st.textContent = msg;
        setTimeout(function() {
            if (st.textContent === msg) st.textContent = original;
        }, 3500);
    }

    function updateBadges() {
        const el = document.getElementById('hud-badges');
        if (!el) return;
        const q = qualityOptions()[qualityIndex];
        const parts = [q ? q.label : 'Auto'];
        if (!isLiveStream) parts.push(playbackSpeed + 'x');
        el.textContent = parts.join('  \u2022  ');
    }

    function applySpeed() {
        const avplay = getAVPlay();
        try {
            if (avplay) {
                avplay.setSpeed(playbackSpeed);
            } else if (videoElement) {
                videoElement.playbackRate = playbackSpeed;
            }
            return true;
        } catch (e) {
            console.warn('[Player] Speed change failed', e);
            return false;
        }
    }

    function chooseSpeed(idx) {
        const opts = speedOptions();
        if (isLiveStream || idx < 0 || idx >= opts.length) return;
        const previous = playbackSpeed;
        playbackSpeed = opts[idx];
        if (applySpeed()) {
            speedIndex = idx;
        } else {
            playbackSpeed = previous;
            applySpeed();
            flashStatus('This speed is not supported for this video');
        }
        updateBadges();
        renderSettings();
    }

    function isHlsUrl(url) {
        return /\.m3u8(\?|$)/i.test(url || '');
    }

    function resolveVariantUrl(uri, base) {
        let full = uri;
        try { full = new URL(uri, base).href; } catch (e) {}
        const q = base.indexOf('?');
        // keep the access token of the main playlist if the quality link has none
        if (full.indexOf('?') === -1 && q !== -1) full += base.substring(q);
        return full;
    }

    // Reads the stream's main playlist and lists the picture qualities it offers
    async function loadVariants(url, token) {
        if (!isHlsUrl(url)) return;
        try {
            const resp = await fetch(url);
            const text = await resp.text();
            if (token !== playToken) return;
            if (text.indexOf('#EXT-X-STREAM-INF') === -1) return;
            // Separate audio track: picking one picture quality could silence the video, so keep Auto only
            if (/#EXT-X-MEDIA:[^\n]*TYPE=AUDIO[^\n]*URI=/i.test(text)) return;

            const lines = text.split(/\r?\n/);
            const byKey = {};
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line.indexOf('#EXT-X-STREAM-INF:') !== 0) continue;
                let uri = '';
                for (let j = i + 1; j < lines.length; j++) {
                    const next = lines[j].trim();
                    if (next && next.charAt(0) !== '#') { uri = next; break; }
                }
                if (!uri) continue;
                const res = /RESOLUTION=(\d+)x(\d+)/i.exec(line);
                const bw = /(?:^|[:,])BANDWIDTH=(\d+)/i.exec(line);
                const height = res ? parseInt(res[2], 10) : 0;
                const bandwidth = bw ? parseInt(bw[1], 10) : 0;
                const key = height || bandwidth;
                if (!key) continue;
                if (!byKey[key] || bandwidth > byKey[key].bandwidth) {
                    byKey[key] = { height: height, bandwidth: bandwidth, uri: uri };
                }
            }
            const found = Object.keys(byKey).map(function(k) { return byKey[k]; });
            if (found.length < 2) return;
            found.sort(function(a, b) {
                return (b.height - a.height) || (b.bandwidth - a.bandwidth);
            });
            variants = found.map(function(v) {
                return {
                    label: v.height ? (v.height + 'p') : (Math.round(v.bandwidth / 1000) + ' kbps'),
                    url: resolveVariantUrl(v.uri, url)
                };
            });
            renderSettings();
        } catch (e) {
            console.warn('[Player] Could not read quality list', e);
        }
    }

    // Restart the same video (another quality) and carry on from the same moment
    function restartStream(url) {
        const resumeMs = isLiveStream ? 0 : currentTime;
        const sp = document.getElementById('spinner');
        if (sp) sp.style.display = 'block';
        const avplay = getAVPlay();
        if (avplay) {
            try { avplay.stop(); } catch (e) {}
            try { avplay.close(); } catch (e) {}
            isPlaying = false;
            playAVPlay(url, avplay, resumeMs);
        } else {
            playHTML5(url, resumeMs);
        }
    }

    function fallbackToAuto() {
        if (qualityIndex === 0) return false;
        qualityIndex = 0;
        updateBadges();
        renderSettings();
        flashStatus('That quality is not available - back to Auto');
        restartStream(baseUrl);
        return true;
    }

    function chooseQuality(idx) {
        const list = qualityOptions();
        if (idx < 0 || idx >= list.length || idx === qualityIndex) return;
        qualityIndex = idx;
        updateBadges();
        renderSettings();
        restartStream(list[idx].url);
    }

    // ---------- Settings panel ----------
    function renderSettings() {
        const qCol = document.getElementById('settings-col-quality');
        const sCol = document.getElementById('settings-col-speed');
        if (!qCol || !sCol) return;

        function build(col, colIndex, title, labels, activeIdx, note) {
            col.innerHTML = '';
            const head = document.createElement('div');
            head.className = 'settings-head';
            head.textContent = title;
            col.appendChild(head);
            labels.forEach(function(label, i) {
                const row = document.createElement('div');
                row.className = 'settings-item' + (i === activeIdx ? ' active' : '') +
                    ((settingsOpen && settingsCol === colIndex && settingsRow === i) ? ' focused' : '');
                const check = document.createElement('span');
                check.className = 'set-check';
                check.textContent = i === activeIdx ? '\u2713' : '';
                const text = document.createElement('span');
                text.textContent = label;
                row.appendChild(check);
                row.appendChild(text);
                row.onclick = function() {
                    settingsCol = colIndex;
                    settingsRow = i;
                    applySettingsSelection();
                };
                col.appendChild(row);
            });
            if (note) {
                const n = document.createElement('div');
                n.className = 'settings-note';
                n.textContent = note;
                col.appendChild(n);
            }
        }

        const q = qualityOptions();
        build(qCol, 0, 'Quality', q.map(function(o) { return o.label; }), qualityIndex,
              q.length < 2 ? 'Only Auto is available for this video' : '');
        if (isLiveStream) {
            build(sCol, 1, 'Speed', [], -1, 'Speed is not available for live streams');
        } else {
            build(sCol, 1, 'Speed', speedOptions().map(speedLabel), speedIndex, '');
        }
    }

    function applySettingsSelection() {
        if (settingsCol === 0) chooseQuality(settingsRow);
        else chooseSpeed(settingsRow);
        showHUD();
    }

    function openSettings() {
        const panel = document.getElementById('settings-panel');
        if (!panel) return;
        settingsOpen = true;
        settingsCol = 0;
        settingsRow = qualityIndex;
        renderSettings();
        panel.classList.add('visible');
        showHUD();
    }

    function closeSettings(silent) {
        settingsOpen = false;
        const panel = document.getElementById('settings-panel');
        if (panel) panel.classList.remove('visible');
        if (!silent) showHUD();
    }

    function isSettingsOpen() {
        return settingsOpen;
    }

    function handleSettingsKey(keyCode) {
        const counts = [qualityOptions().length, isLiveStream ? 0 : speedOptions().length];
        switch (keyCode) {
            case 38: // UP
                settingsRow = Math.max(0, settingsRow - 1);
                break;
            case 40: // DOWN
                settingsRow = Math.min(Math.max(0, counts[settingsCol] - 1), settingsRow + 1);
                break;
            case 37: // LEFT -> Quality list
                if (settingsCol !== 0 && counts[0] > 0) {
                    settingsCol = 0;
                    settingsRow = qualityIndex;
                }
                break;
            case 39: // RIGHT -> Speed list
                if (settingsCol !== 1 && counts[1] > 0) {
                    settingsCol = 1;
                    settingsRow = speedIndex;
                }
                break;
            case 13: // OK
                applySettingsSelection();
                return;
            case 10009: // Back
            case 27:
                closeSettings();
                return;
            default:
                return;
        }
        renderSettings();
        showHUD();
    }

    function isActive() {
        const pContainer = document.getElementById('player-container');
        return pContainer && pContainer.style.display === 'block';
    }

    return {
        init: init,
        playStream: playStream,
        togglePlayPause: togglePlayPause,
        seek: seek,
        showHUD: showHUD,
        closePlayer: closePlayer,
        isActive: isActive,
        openSettings: openSettings,
        closeSettings: closeSettings,
        isSettingsOpen: isSettingsOpen,
        handleSettingsKey: handleSettingsKey
    };
})();
