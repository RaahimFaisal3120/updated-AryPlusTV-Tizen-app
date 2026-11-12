/**
 * ARY Plus TV - Samsung Tizen 6.0 High Performance Web Application
 * Features:
 * - 4 Primary Sections: Dramas, Telefilms, Shows, Streams
 * - Full Poster Wall Grid (5 columns, 280x400 poster ratio)
 * - Pagination: Exactly 20 items per page with reliable multi-page navigation
 * - Direct playback for Telefilms & Streams
 * - High-speed Episodes modal drawer for Dramas & Shows with dedicated pagination
 * - ARY Plus green brand accent (#6bfe12)
 * - Complete D-pad Remote Control
 */
const App = (function() {
    const API_BASE = 'https://be.aryplus.tv';
    const API_KEY = 'ak_37515186786306625012043079404171';
    const IMAGE_BASE = 'https://images.aryplus.tv/';
    const USER_COUNTRY = 'PK';
    const PAGE_SIZE = 20; // 20 per page

    // Sidebar navigation sections
    const SECTIONS = [
        {
            id: 'nav-dramas',
            key: 'dramas',
            title: 'Dramas',
            apiCategory: 'dramas',
            hasEpisodes: true,
            iconSvg: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>'
        },
        {
            id: 'nav-telefilms',
            key: 'telefilms',
            title: 'Telefilms',
            apiCategory: 'Telefilms',
            hasEpisodes: false, // direct play
            iconSvg: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>'
        },
        {
            id: 'nav-shows',
            key: 'shows',
            title: 'Shows',
            apiCategory: 'tv shows',
            hasEpisodes: true,
            iconSvg: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>'
        },
        {
            id: 'nav-streams',
            key: 'streams',
            title: 'Streams',
            apiCategory: 'live streaming',
            hasEpisodes: false, // direct play
            iconSvg: '<svg class="nav-icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>'
        }
    ];

    // Navigation and Focus state
    let activeSectionIndex = 0; // 0: Dramas, 1: Telefilms, 2: Shows, 3: Streams
    let currentCategoryPage = 1;
    let focusArea = 'wall';      // 'sidebar', 'wall', 'pagination', 'episodes', 'episodes-pagination'
    let sidebarFocusIndex = 0;

    // Poster Wall state
    let currentCategoryItems = [];
    let currentCategoryPagination = { currentPage: 1, totalPages: 1, totalSeries: 0 };
    let currentCardIndex = 0;
    const GRID_COLUMNS = 5;

    // Episodes Drawer state
    let activeSeries = null;
    let episodesList = [];
    let currentEpisodeIndex = 0;
    let currentEpisodesPage = 1; // Explicit stateful episode page number
    let episodesPagination = { currentPage: 1, totalPages: 1, totalEpisodes: 0 };
    const EPISODES_GRID_COLUMNS = 4;
    const EPISODES_PAGE_SIZE = 20;

    // In-memory cache for instant switching
    const categoryCache = {};
    const allEpisodesCache = {}; // seriesId -> every episode, newest first
    let episodesSlideDir = 0;    // 0 = first open, 1 = going to older, -1 = going to newer
    let episodesCloseTimer = null;

    function init() {
        console.log('[App] Initializing ARY Plus TV UI...');
        try {
            PlayerEngine.init();
        } catch (e) {
            console.error('[App] PlayerEngine init error:', e);
        }

        setupRemoteKeys();
        renderSidebar();

        if (typeof INITIAL_CATEGORIES !== 'undefined' && INITIAL_CATEGORIES) {
            if (INITIAL_CATEGORIES.dramas) categoryCache['dramas_1'] = INITIAL_CATEGORIES.dramas;
            if (INITIAL_CATEGORIES.telefilms) categoryCache['telefilms_1'] = INITIAL_CATEGORIES.telefilms;
            if (INITIAL_CATEGORIES.shows) categoryCache['shows_1'] = INITIAL_CATEGORIES.shows;
            if (INITIAL_CATEGORIES.streams) categoryCache['streams_1'] = INITIAL_CATEGORIES.streams;
        }

        switchSection(0, 1);
    }

    function renderSidebar() {
        const navList = document.getElementById('nav-list');
        if (!navList) return;
        navList.innerHTML = '';

        SECTIONS.forEach((sec, idx) => {
            const item = document.createElement('div');
            item.className = 'nav-item' + (idx === activeSectionIndex ? ' active' : '');
            item.id = sec.id;
            // Clean structure: nav-icon + gap + nav-label
            item.innerHTML = `${sec.iconSvg}<span class="nav-label">${sec.title}</span>`;
            item.addEventListener('click', () => {
                sidebarFocusIndex = idx;
                switchSection(idx, 1);
                focusArea = 'wall';
                currentCardIndex = 0;
                updateFocus();
            });
            navList.appendChild(item);
        });
    }

    function switchSection(index, page) {
        activeSectionIndex = index;
        currentCategoryPage = typeof page === 'number' && page > 0 ? page : 1;
        const currentSec = SECTIONS[activeSectionIndex];

        SECTIONS.forEach((sec, idx) => {
            const el = document.getElementById(sec.id);
            if (el) {
                if (idx === activeSectionIndex) el.classList.add('active');
                else el.classList.remove('active');
            }
        });

        const secTitle = document.getElementById('section-title');
        if (secTitle) secTitle.textContent = currentSec.title;

        loadCategoryData(currentSec.apiCategory, currentCategoryPage);
    }

    async function loadCategoryData(apiCategory, page) {
        const pageNum = parseInt(page, 10) || 1;
        const cacheKey = `${apiCategory}_${pageNum}`;
        const spinner = document.getElementById('spinner');

        if (categoryCache[cacheKey]) {
            renderPosterWall(categoryCache[cacheKey], pageNum);
            return;
        }

        if (spinner) spinner.style.display = 'block';

        try {
            const url = `${API_BASE}/api/series/byCatID/status/pg/${encodeURIComponent(apiCategory)}/${USER_COUNTRY}?limit=${PAGE_SIZE}&page=${pageNum}`;
            const resp = await fetch(url, {
                headers: {
                    'x-api-key': API_KEY,
                    'Content-Type': 'application/json'
                }
            });

            if (!resp.ok) throw new Error(`HTTP Error: ${resp.status}`);
            const data = await resp.json();
            categoryCache[cacheKey] = data;
            renderPosterWall(data, pageNum);
        } catch (err) {
            console.error('[App] Failed to fetch category:', apiCategory, err);
            renderPosterWall({ series: [], pagination: { currentPage: pageNum, totalPages: 1, totalSeries: 0 } }, pageNum);
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function renderPosterWall(data, requestedPage) {
        currentCategoryItems = (data && Array.isArray(data.series)) ? data.series : [];
        
        const apiPag = data && data.pagination ? data.pagination : {};
        currentCategoryPagination = {
            currentPage: apiPag.currentPage || requestedPage || currentCategoryPage || 1,
            totalPages: apiPag.totalPages || Math.ceil((apiPag.totalSeries || currentCategoryItems.length) / PAGE_SIZE) || 1,
            totalSeries: apiPag.totalSeries || currentCategoryItems.length
        };
        currentCategoryPage = currentCategoryPagination.currentPage;

        const secCount = document.getElementById('section-count');
        if (secCount) {
            const total = currentCategoryPagination.totalSeries || currentCategoryItems.length;
            secCount.textContent = `(${total} ${total === 1 ? 'item' : 'items'})`;
        }

        renderPaginationBar();

        const wall = document.getElementById('poster-wall');
        if (!wall) return;
        wall.innerHTML = '';
        withoutTransition(wall);
        wall.style.transform = 'translateY(0px)';

        if (currentCategoryItems.length === 0) {
            wall.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; font-size: 20px; color: #8c93a3;">No content available in this section.</div>';
            restoreTransition(wall);
            return;
        }

        const isStreamSec = SECTIONS[activeSectionIndex].key === 'streams';

        currentCategoryItems.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'poster-card enter';
            card.style.animationDelay = (Math.min(idx, 14) * 30) + 'ms';
            card.id = `poster-card-${idx}`;

            const imgPath = item.imagePoster || item.imageCoverBig || item.imageCoverDesktop || '';
            const fullImg = imgPath ? (imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE}${imgPath}`) : 'icon.png';

            let badgeText = item.isLive ? '🔴 LIVE' : (item.seriesType === 'singleVideo' ? 'TELEFILM' : (item.episodeCount ? `${item.episodeCount} EPS` : 'HD'));
            if (isStreamSec) badgeText = '🔴 LIVE';

            card.innerHTML = `
                <div class="poster-img-container">
                    <img src="${fullImg}" alt="${escapeHtml(item.title || '')}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='icon.png'">
                    <span class="badge-overlay ${item.isLive ? 'live-badge' : ''}">${badgeText}</span>
                </div>
                <div class="card-info">
                    <div class="card-title">${escapeHtml(item.title || 'Untitled')}</div>
                    <div class="card-subtitle">${escapeHtml(Array.isArray(item.genreId) ? item.genreId.join(' • ') : (item.duration || 'ARY Plus'))}</div>
                </div>
            `;

            card.addEventListener('click', () => {
                focusArea = 'wall';
                currentCardIndex = idx;
                updateFocus();
                handleItemSelection(item);
            });

            wall.appendChild(card);
        });

        if (currentCardIndex >= currentCategoryItems.length) {
            currentCardIndex = 0;
        }
        updateFocus();
        restoreTransition(wall);
        revealImagesSoon(wall);
    }

    function renderPaginationBar() {
        const pagBar = document.getElementById('pagination-bar');
        if (!pagBar) return;

        const totalPages = currentCategoryPagination.totalPages || 1;
        const totalItems = currentCategoryPagination.totalSeries || currentCategoryItems.length;

        if (totalItems > PAGE_SIZE || totalPages > 1) {
            pagBar.style.display = 'flex';
            const pageIndicator = document.getElementById('page-indicator');
            if (pageIndicator) {
                pageIndicator.textContent = `Page ${currentCategoryPagination.currentPage} of ${totalPages}`;
            }

            const prevBtn = document.getElementById('page-prev-btn');
            const nextBtn = document.getElementById('page-next-btn');

            if (prevBtn) {
                if (currentCategoryPagination.currentPage <= 1) prevBtn.classList.add('disabled');
                else prevBtn.classList.remove('disabled');
                prevBtn.onclick = (e) => {
                    e.stopPropagation();
                    paginationFocusBtn = 'prev';
                    handlePaginationClick();
                };
            }
            if (nextBtn) {
                if (currentCategoryPagination.currentPage >= totalPages) nextBtn.classList.add('disabled');
                else nextBtn.classList.remove('disabled');
                nextBtn.onclick = (e) => {
                    e.stopPropagation();
                    paginationFocusBtn = 'next';
                    handlePaginationClick();
                };
            }
        } else {
            pagBar.style.display = 'none';
        }
    }

    function handleItemSelection(item) {
        if (!item) return;
        const currentSec = SECTIONS[activeSectionIndex];

        // 1. Direct Play for Telefilms & Streams
        if (!currentSec.hasEpisodes || item.isLive || item.seriesType === 'singleVideo') {
            const streamUrl = item.seiresCDN || item.trailer;
            if (streamUrl) {
                PlayerEngine.playStream(streamUrl, item.title, item.isLive, () => {
                    restoreMainCatalog();
                });
            } else {
                fetchAndPlayDirectItem(item);
            }
            return;
        }

        // 2. Dramas and Shows: Open Episodes Drawer
        openEpisodesDrawer(item, 1);
    }

    async function fetchAndPlayDirectItem(item) {
        const spinner = document.getElementById('spinner');
        if (spinner) spinner.style.display = 'block';

        try {
            const resp = await fetch(`${API_BASE}/api/cdn/${item._id}`, {
                headers: { 'x-api-key': API_KEY }
            });
            const data = await resp.json();
            const streamUrl = (data && data.episode && data.episode[0] && data.episode[0].videoSource) || item.seiresCDN || item.trailer;
            if (streamUrl) {
                PlayerEngine.playStream(streamUrl, item.title, item.isLive, () => {
                    restoreMainCatalog();
                });
            } else {
                alert('No stream available for this title.');
            }
        } catch (e) {
            console.error('Error fetching stream:', e);
            if (item.seiresCDN || item.trailer) {
                PlayerEngine.playStream(item.seiresCDN || item.trailer, item.title, item.isLive, () => {
                    restoreMainCatalog();
                });
            }
        } finally {
            if (spinner) spinner.style.display = 'none';
        }
    }

    function restoreMainCatalog() {
        const app = document.getElementById('app');
        if (app) app.style.display = 'flex';
        const episodesModal = document.getElementById('episodes-view');
        if (episodesModal) {
            episodesModal.classList.remove('active');
            episodesModal.style.display = 'none';
        }
        focusArea = 'wall';
        updateFocus();
    }

    function restoreEpisodesView() {
        const app = document.getElementById('app');
        if (app) app.style.display = 'none';
        const episodesModal = document.getElementById('episodes-view');
        if (episodesModal) {
            episodesModal.classList.add('active');
            episodesModal.style.display = 'flex';
        }
        focusArea = 'episodes';
        updateFocus();
    }

    // --- EPISODES DRAWER MANAGEMENT ---
    async function openEpisodesDrawer(seriesItem, page) {
        activeSeries = seriesItem;
        clearTimeout(episodesCloseTimer);
        episodesSlideDir = 0;
        currentEpisodesPage = typeof page === 'number' && page > 0 ? page : 1;
        const modal = document.getElementById('episodes-view');
        const spinner = document.getElementById('spinner');
        if (spinner) spinner.style.display = 'block';

        const titleEl = document.getElementById('episodes-title');
        const descEl = document.getElementById('episodes-desc');
        const badgeEl = document.getElementById('episodes-badge');

        if (titleEl) titleEl.textContent = seriesItem.title || 'Series Episodes';
        if (descEl) descEl.textContent = seriesItem.description || seriesItem.title || 'Select an episode to watch';
        if (badgeEl) badgeEl.textContent = `${seriesItem.episodeCount || 0} Episodes`;

        if (modal) {
            modal.classList.remove('closing');
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
        focusArea = 'episodes';
        currentEpisodeIndex = 0;
        episodesList = [];
        episodesPagination = { currentPage: 1, totalPages: 1, totalEpisodes: 0, offset: 0 };

        await loadEpisodes(seriesItem._id, currentEpisodesPage);
    }

    // Fetches EVERY episode of a series once, then orders them newest-first.
    // The server lists them oldest-first in pages of 20, so we gather all pages
    // and re-page them ourselves (page 1 = the latest episodes).
    async function fetchAllEpisodes(seriesId) {
        if (allEpisodesCache[seriesId]) return allEpisodesCache[seriesId];

        const fetchPage = async (p) => {
            const resp = await fetch(`${API_BASE}/api/cdn/${seriesId}?page=${p}&limit=${EPISODES_PAGE_SIZE}`, {
                headers: { 'x-api-key': API_KEY }
            });
            return resp.json();
        };

        const first = await fetchPage(1);
        let list = (first && Array.isArray(first.episode)) ? first.episode.slice() : [];
        const firstTotal = (first && typeof first.totalEpisodes === 'number') ? first.totalEpisodes : list.length;
        const serverPages = (first && typeof first.totalPages === 'number')
            ? first.totalPages
            : (Math.ceil(firstTotal / EPISODES_PAGE_SIZE) || 1);

        if (serverPages > 1) {
            const jobs = [];
            for (let p = 2; p <= serverPages; p++) jobs.push(fetchPage(p).catch(() => null));
            const rest = await Promise.all(jobs);
            rest.forEach(d => {
                if (d && Array.isArray(d.episode)) list = list.concat(d.episode);
            });
        }

        // Remove accidental duplicates
        const seen = {};
        list = list.filter(ep => {
            const key = ep && (ep._id || ep.videoSource || ep.title);
            if (!key) return true;
            if (seen[key]) return false;
            seen[key] = true;
            return true;
        });

        // Newest first: sort by episode number when every episode has one, else just flip the order
        const nums = list.map(ep => parseInt(ep.videoEpNumber, 10));
        const allNumbered = list.length > 0 && nums.every(n => !isNaN(n));
        const allSame = allNumbered && nums.every(n => n === nums[0]);
        if (allNumbered && !allSame) {
            list.sort((a, b) => parseInt(b.videoEpNumber, 10) - parseInt(a.videoEpNumber, 10));
        } else {
            list.reverse();
        }

        if (list.length > 0) allEpisodesCache[seriesId] = list;
        return list;
    }

    async function loadEpisodes(seriesId, page, focusLast) {
        const spinner = document.getElementById('spinner');
        const needsFetch = !allEpisodesCache[seriesId];
        if (needsFetch && spinner) spinner.style.display = 'block';

        let all = [];
        try {
            all = await fetchAllEpisodes(seriesId);
        } catch (e) {
            console.error('[App] Failed to load episodes:', e);
        } finally {
            if (spinner) spinner.style.display = 'none';
        }

        // The person may have closed this drawer or opened another series meanwhile
        if (!activeSeries || activeSeries._id !== seriesId) return;

        const totalPages = Math.max(1, Math.ceil(all.length / EPISODES_PAGE_SIZE));
        const pageNum = Math.min(Math.max(parseInt(page, 10) || 1, 1), totalPages);
        const start = (pageNum - 1) * EPISODES_PAGE_SIZE;

        episodesList = all.slice(start, start + EPISODES_PAGE_SIZE);
        episodesPagination = {
            currentPage: pageNum,
            totalPages: totalPages,
            totalEpisodes: all.length,
            offset: start
        };
        currentEpisodesPage = pageNum;
        currentEpisodeIndex = focusLast ? Math.max(0, episodesList.length - 1) : 0;
        renderEpisodesGrid();
    }

    // Go to a newer (-1) or older (+1) page. Returns true if the page changed.
    function changeEpisodesPage(direction, focusLast) {
        if (!activeSeries) return false;
        const cur = currentEpisodesPage || episodesPagination.currentPage || 1;
        const total = episodesPagination.totalPages || 1;
        const target = cur + direction;
        if (target < 1 || target > total) return false;
        episodesSlideDir = direction;
        loadEpisodes(activeSeries._id, target, !!focusLast);
        return true;
    }

    // Label like "29 – 10" for the episodes on the current page
    function episodesRangeLabel() {
        if (!episodesList.length) return '';
        const total = episodesPagination.totalEpisodes || episodesList.length;
        const offset = episodesPagination.offset || 0;
        const firstEp = episodesList[0];
        const lastEp = episodesList[episodesList.length - 1];
        const hi = parseInt(firstEp.videoEpNumber, 10);
        const lo = parseInt(lastEp.videoEpNumber, 10);
        const top = !isNaN(hi) ? hi : (total - offset);
        const bottom = !isNaN(lo) ? lo : (total - offset - episodesList.length + 1);
        return top === bottom ? `${top}` : `${top} – ${bottom}`;
    }

    function renderEpisodesGrid() {
        const grid = document.getElementById('episodes-grid');
        if (!grid) return;
        grid.innerHTML = '';
        withoutTransition(grid); // jump instantly to the new page, then animate the cards in
        grid.style.transform = 'translateY(0px)';

        renderEpisodesPaginationBar();

        if (episodesList.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; padding: 40px; font-size: 20px; color: #8c93a3;">No episodes available.</div>';
            restoreTransition(grid);
            return;
        }

        episodesList.forEach((ep, idx) => {
            const epCard = document.createElement('div');
            epCard.className = 'episode-card enter' + (episodesSlideDir < 0 ? ' rev' : '');
            epCard.style.animationDelay = (Math.min(idx, 12) * 35) + 'ms';
            epCard.id = `ep-card-${idx}`;

            const imgPath = ep.imagePath || ep.imagePathV2 || (activeSeries ? activeSeries.imageCoverBig : '');
            const fullImg = imgPath ? (imgPath.startsWith('http') ? imgPath : `${IMAGE_BASE}${imgPath}`) : 'icon.png';

            const epTitle = ep.title || `Episode ${ep.videoEpNumber || ((episodesPagination.totalEpisodes || episodesList.length) - (episodesPagination.offset || 0) - idx)}`;
            const durationText = ep.videoLength ? formatDuration(ep.videoLength) : (ep.duration || 'Full Episode');

            epCard.innerHTML = `
                <img class="ep-thumb" src="${fullImg}" alt="${escapeHtml(epTitle)}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.src='icon.png'">
                <div class="ep-info">
                    <div class="ep-title">${escapeHtml(epTitle)}</div>
                    <div class="ep-duration">${escapeHtml(durationText)}</div>
                </div>
            `;

            epCard.addEventListener('click', () => {
                focusArea = 'episodes';
                currentEpisodeIndex = idx;
                updateFocus();
                playEpisode(ep);
            });

            grid.appendChild(epCard);
        });

        if (currentEpisodeIndex >= episodesList.length) {
            currentEpisodeIndex = 0;
        }
        updateFocus();
        restoreTransition(grid);
        revealImagesSoon(grid);
    }

    function renderEpisodesPaginationBar() {
        const pagBar = document.getElementById('episodes-pagination-bar');
        if (!pagBar) return;

        const totalPages = episodesPagination.totalPages || 1;
        const totalCount = episodesPagination.totalEpisodes || episodesList.length;

        if (totalCount > EPISODES_PAGE_SIZE || totalPages > 1) {
            pagBar.style.display = 'flex';
            const ind = document.getElementById('episodes-page-indicator');
            if (ind) ind.textContent = `Episodes ${episodesRangeLabel()}   (Page ${episodesPagination.currentPage} of ${totalPages})`;

            const prevBtn = document.getElementById('ep-page-prev-btn');
            const nextBtn = document.getElementById('ep-page-next-btn');
            if (prevBtn) {
                if (episodesPagination.currentPage <= 1) prevBtn.classList.add('disabled');
                else prevBtn.classList.remove('disabled');
                prevBtn.onclick = (e) => {
                    e.stopPropagation();
                    episodesPaginationFocusBtn = 'prev';
                    handleEpisodesPaginationClick();
                };
            }
            if (nextBtn) {
                if (episodesPagination.currentPage >= totalPages) nextBtn.classList.add('disabled');
                else nextBtn.classList.remove('disabled');
                nextBtn.onclick = (e) => {
                    e.stopPropagation();
                    episodesPaginationFocusBtn = 'next';
                    handleEpisodesPaginationClick();
                };
            }
        } else {
            pagBar.style.display = 'none';
        }
    }

    async function playEpisode(ep) {
        if (!ep) return;
        let streamUrl = ep.videoSource;

        if (!streamUrl && ep._id) {
            const spinner = document.getElementById('spinner');
            if (spinner) spinner.style.display = 'block';
            try {
                const resp = await fetch(`${API_BASE}/api/cdn/ep/${ep._id}`, {
                    headers: { 'x-api-key': API_KEY }
                });
                const d = await resp.json();
                if (d && d.episode && d.episode.videoSource) {
                    streamUrl = d.episode.videoSource;
                }
            } catch(e) {
                console.error('Failed to get episode detail:', e);
            } finally {
                if (spinner) spinner.style.display = 'none';
            }
        }

        if (streamUrl) {
            const seriesTitle = (activeSeries ? activeSeries.title + ' - ' : '') + (ep.title || 'Episode');
            PlayerEngine.playStream(streamUrl, seriesTitle, false, () => {
                restoreEpisodesView();
            });
        } else {
            alert('Video stream not found for this episode.');
        }
    }

    function closeEpisodesDrawer() {
        const modal = document.getElementById('episodes-view');
        if (modal) {
            // Fade the drawer out, then hide it
            modal.classList.add('closing');
            clearTimeout(episodesCloseTimer);
            episodesCloseTimer = setTimeout(() => {
                modal.classList.remove('active');
                modal.classList.remove('closing');
                modal.style.display = 'none';
            }, 260);
        }
        const app = document.getElementById('app');
        if (app) app.style.display = 'flex';
        focusArea = 'wall';
        updateFocus();
    }

    // --- FOCUS & SCROLL ENGINE ---
    function updateFocus() {
        document.querySelectorAll('.focused').forEach(el => el.classList.remove('focused'));

        if (focusArea === 'sidebar') {
            const navEl = document.getElementById(SECTIONS[sidebarFocusIndex].id);
            if (navEl) navEl.classList.add('focused');
            return;
        }

        if (focusArea === 'pagination') {
            const btn = paginationFocusBtn === 'prev' ? document.getElementById('page-prev-btn') : document.getElementById('page-next-btn');
            if (btn) btn.classList.add('focused');
            return;
        }

        if (focusArea === 'episodes-pagination') {
            const btn = episodesPaginationFocusBtn === 'prev' ? document.getElementById('ep-page-prev-btn') : document.getElementById('ep-page-next-btn');
            if (btn) btn.classList.add('focused');
            return;
        }

        if (focusArea === 'wall') {
            const card = document.getElementById(`poster-card-${currentCardIndex}`);
            if (card) {
                card.classList.add('focused');
                scrollPosterWall();
            }
            return;
        }

        if (focusArea === 'episodes') {
            const epCard = document.getElementById(`ep-card-${currentEpisodeIndex}`);
            if (epCard) {
                epCard.classList.add('focused');
                scrollEpisodesGrid();
            }
            return;
        }
    }

    // --- SMOOTH MOTION HELPERS ---
    // Lets a grid jump to a new position instantly (new page) before animations resume
    function withoutTransition(el) { el.style.transition = 'none'; }
    function restoreTransition(el) { void el.offsetHeight; el.style.transition = ''; }
    // Images fade in when loaded; this makes sure none stay hidden if a load event is missed
    function revealImagesSoon(container) {
        setTimeout(() => {
            container.querySelectorAll('img:not(.loaded)').forEach(i => i.classList.add('loaded'));
        }, 4000);
    }

    let paginationFocusBtn = 'next';
    let episodesPaginationFocusBtn = 'next';

    function scrollPosterWall() {
        const wall = document.getElementById('poster-wall');
        if (!wall) return;
        const row = Math.floor(currentCardIndex / GRID_COLUMNS);
        const targetScroll = row > 1 ? (row - 1) * 508 : 0;
        wall.style.transform = `translateY(-${targetScroll}px)`;
    }

    function scrollEpisodesGrid() {
        const grid = document.getElementById('episodes-grid');
        if (!grid) return;
        const row = Math.floor(currentEpisodeIndex / EPISODES_GRID_COLUMNS);
        const targetScroll = row > 1 ? (row - 1) * 338 : 0;
        grid.style.transform = `translateY(-${targetScroll}px)`;
    }

    // --- REMOTE D-PAD & KEY CONTROLS ---
    function setupRemoteKeys() {
        window.addEventListener('keydown', handleKeyDown);

        if (typeof tizen !== 'undefined' && tizen.tvinputdevice) {
            try {
                const keys = ['MediaPlay', 'MediaPause', 'MediaPlayPause', 'MediaStop', 'MediaFastForward', 'MediaRewind', 'ChannelUp', 'ChannelDown', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                keys.forEach(k => {
                    try { tizen.tvinputdevice.registerKey(k); } catch (e) {}
                });
            } catch (e) {
                console.warn('[Remote Keys] registerKey failed', e);
            }
        }
    }

    function handleKeyDown(e) {
        const keyCode = e.keyCode;

        // 1. If Video Player is active, redirect keys to Player
        if (PlayerEngine.isActive()) {
            handlePlayerKeys(keyCode, e);
            return;
        }

        // 2. Episodes Modal Navigation
        if (focusArea === 'episodes' || focusArea === 'episodes-pagination') {
            handleEpisodesKeys(keyCode, e);
            return;
        }

        // 3. Main Catalog (Sidebar, Poster Wall, Pagination)
        switch (keyCode) {
            case 38: // UP
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    if (sidebarFocusIndex > 0) {
                        sidebarFocusIndex--;
                        updateFocus();
                    }
                } else if (focusArea === 'wall') {
                    if (currentCardIndex >= GRID_COLUMNS) {
                        currentCardIndex -= GRID_COLUMNS;
                        updateFocus();
                    } else {
                        const totalItems = currentCategoryPagination.totalSeries || currentCategoryItems.length;
                        if (totalItems > PAGE_SIZE || currentCategoryPagination.totalPages > 1) {
                            focusArea = 'pagination';
                            updateFocus();
                        }
                    }
                }
                break;

            case 40: // DOWN
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    if (sidebarFocusIndex < SECTIONS.length - 1) {
                        sidebarFocusIndex++;
                        updateFocus();
                    }
                } else if (focusArea === 'pagination') {
                    focusArea = 'wall';
                    currentCardIndex = 0;
                    updateFocus();
                } else if (focusArea === 'wall') {
                    if (currentCardIndex + GRID_COLUMNS < currentCategoryItems.length) {
                        currentCardIndex += GRID_COLUMNS;
                        updateFocus();
                    }
                }
                break;

            case 37: // LEFT
                e.preventDefault();
                if (focusArea === 'wall') {
                    if (currentCardIndex % GRID_COLUMNS === 0) {
                        focusArea = 'sidebar';
                        sidebarFocusIndex = activeSectionIndex;
                        updateFocus();
                    } else {
                        currentCardIndex--;
                        updateFocus();
                    }
                } else if (focusArea === 'pagination') {
                    if (paginationFocusBtn === 'next') {
                        paginationFocusBtn = 'prev';
                        updateFocus();
                    } else {
                        focusArea = 'sidebar';
                        sidebarFocusIndex = activeSectionIndex;
                        updateFocus();
                    }
                }
                break;

            case 39: // RIGHT
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    if (sidebarFocusIndex !== activeSectionIndex) {
                        switchSection(sidebarFocusIndex, 1);
                    }
                    focusArea = 'wall';
                    currentCardIndex = 0;
                    updateFocus();
                } else if (focusArea === 'wall') {
                    if (currentCardIndex < currentCategoryItems.length - 1) {
                        currentCardIndex++;
                        updateFocus();
                    }
                } else if (focusArea === 'pagination') {
                    if (paginationFocusBtn === 'prev') {
                        paginationFocusBtn = 'next';
                        updateFocus();
                    }
                }
                break;

            case 13: // ENTER / OK
                e.preventDefault();
                if (focusArea === 'sidebar') {
                    switchSection(sidebarFocusIndex, 1);
                    focusArea = 'wall';
                    currentCardIndex = 0;
                    updateFocus();
                } else if (focusArea === 'wall') {
                    const item = currentCategoryItems[currentCardIndex];
                    handleItemSelection(item);
                } else if (focusArea === 'pagination') {
                    handlePaginationClick();
                }
                break;

            case 10009: // Tizen Return / Back
            case 27:    // ESC
                e.preventDefault();
                if (focusArea === 'wall' || focusArea === 'pagination') {
                    focusArea = 'sidebar';
                    sidebarFocusIndex = activeSectionIndex;
                    updateFocus();
                } else if (focusArea === 'sidebar') {
                    try {
                        tizen.application.getCurrentApplication().exit();
                    } catch (err) {
                        console.log('App exit');
                    }
                }
                break;
        }
    }

    function handlePaginationClick() {
        const curPage = currentCategoryPagination.currentPage || currentCategoryPage || 1;
        const totalPages = currentCategoryPagination.totalPages || 1;

        if (paginationFocusBtn === 'prev') {
            if (curPage > 1) {
                currentCardIndex = 0;
                switchSection(activeSectionIndex, curPage - 1);
            }
        } else if (paginationFocusBtn === 'next') {
            if (curPage < totalPages) {
                currentCardIndex = 0;
                switchSection(activeSectionIndex, curPage + 1);
            }
        }
    }

    function handleEpisodesKeys(keyCode, e) {
        switch (keyCode) {
            case 38: // UP
                e.preventDefault();
                if (focusArea === 'episodes') {
                    if (currentEpisodeIndex >= EPISODES_GRID_COLUMNS) {
                        currentEpisodeIndex -= EPISODES_GRID_COLUMNS;
                        updateFocus();
                    } else if (!changeEpisodesPage(-1, true) && episodesPagination.totalPages > 1) {
                        // Already on the newest page: go up to the page buttons
                        focusArea = 'episodes-pagination';
                        updateFocus();
                    }
                }
                break;

            case 40: // DOWN
                e.preventDefault();
                if (focusArea === 'episodes-pagination') {
                    focusArea = 'episodes';
                    currentEpisodeIndex = 0;
                    updateFocus();
                } else if (focusArea === 'episodes') {
                    const lastRow = Math.floor((episodesList.length - 1) / EPISODES_GRID_COLUMNS);
                    const curRow = Math.floor(currentEpisodeIndex / EPISODES_GRID_COLUMNS);
                    if (curRow < lastRow) {
                        currentEpisodeIndex = Math.min(currentEpisodeIndex + EPISODES_GRID_COLUMNS, episodesList.length - 1);
                        updateFocus();
                    } else {
                        // Bottom of the page: keep going down into older episodes
                        changeEpisodesPage(1, false);
                    }
                }
                break;

            case 37: // LEFT
                e.preventDefault();
                if (focusArea === 'episodes') {
                    if (currentEpisodeIndex > 0) {
                        currentEpisodeIndex--;
                        updateFocus();
                    }
                } else if (focusArea === 'episodes-pagination') {
                    if (episodesPaginationFocusBtn === 'next') {
                        episodesPaginationFocusBtn = 'prev';
                        updateFocus();
                    }
                }
                break;

            case 39: // RIGHT
                e.preventDefault();
                if (focusArea === 'episodes') {
                    if (currentEpisodeIndex < episodesList.length - 1) {
                        currentEpisodeIndex++;
                        updateFocus();
                    }
                } else if (focusArea === 'episodes-pagination') {
                    if (episodesPaginationFocusBtn === 'prev') {
                        episodesPaginationFocusBtn = 'next';
                        updateFocus();
                    }
                }
                break;

            case 13: // ENTER / OK
                e.preventDefault();
                if (focusArea === 'episodes') {
                    const ep = episodesList[currentEpisodeIndex];
                    playEpisode(ep);
                } else if (focusArea === 'episodes-pagination') {
                    handleEpisodesPaginationClick();
                }
                break;

            case 427: // Channel Up   -> newer episodes
            case 33:  // Page Up
                e.preventDefault();
                changeEpisodesPage(-1, false);
                break;

            case 428: // Channel Down -> older episodes
            case 34:  // Page Down
                e.preventDefault();
                changeEpisodesPage(1, false);
                break;

            case 10009: // Tizen Return / Back
            case 27:    // ESC
                e.preventDefault();
                closeEpisodesDrawer();
                break;
        }
    }

    function handleEpisodesPaginationClick() {
        // "prev" = newer episodes, "next" = older episodes
        if (episodesPaginationFocusBtn === 'prev') changeEpisodesPage(-1, false);
        else if (episodesPaginationFocusBtn === 'next') changeEpisodesPage(1, false);
    }

    function handlePlayerKeys(keyCode, e) {
        e.preventDefault();

        // The settings panel (quality / speed) takes over the remote while it is open
        if (PlayerEngine.isSettingsOpen()) {
            PlayerEngine.handleSettingsKey(keyCode);
            return;
        }

        switch (keyCode) {
            case 10009: // Return / Back
            case 27:    // ESC
                PlayerEngine.closePlayer();
                break;

            case 13:   // Enter
            case 10252: // MediaPlayPause
            case 415:  // MediaPlay
            case 19:   // MediaPause
                PlayerEngine.togglePlayPause();
                break;

            case 37:   // Left (Seek back)
            case 412:  // Rewind
                PlayerEngine.seek(-10);
                break;

            case 39:   // Right (Seek forward)
            case 417:  // FastForward
                PlayerEngine.seek(10);
                break;

            case 38:   // UP (Show HUD)
                PlayerEngine.showHUD();
                break;

            case 40:   // DOWN (Open Settings: quality + speed)
                PlayerEngine.openSettings();
                break;
        }
    }

    function formatDuration(sec) {
        const s = parseInt(sec, 10);
        if (isNaN(s)) return sec;
        const m = Math.floor(s / 60);
        const remS = s % 60;
        return `${m}:${remS < 10 ? '0' : ''}${remS} mins`;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    return {
        init: init
    };
})();

// Bootstrap
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
