const API_URL = '/api';
let adminSecret = '';
let currentGlobalOffers = { shopRefresh: {}, offers: [] };
let csvData = { brawlers: [], skins: [], shopTypes: [] };

document.addEventListener('DOMContentLoaded', () => {
    adminSecret = prompt("keys please:");
    if (!adminSecret) {
        showToast("no keys, bai", 'warning');
        return;
    }

    initThemeToggle();
    initNavigation();
    initModalControls();
    initOfferForm();
    initEditPlayerForm();
    initNotificationForm();
    initDurationPicker();
    initPlayerSearch();
    loadCSVData();

    document.getElementById('refreshAnalyticsBtn').addEventListener('click', fetchAnalytics);
    document.getElementById('removeAllOffersBtn').addEventListener('click', removeAllOffers);

    fetchGlobalOffers();
});


function initThemeToggle() {
    const themeBtn = document.querySelector('.theme-toggle');
    themeBtn.addEventListener('click', () => {
        const root = document.documentElement;
        if (root.getAttribute('data-theme') === 'light') {
            root.removeAttribute('data-theme');
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            root.setAttribute('data-theme', 'light');
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });
}


const pageMeta = {
    offersGrid: { title: 'Global Offers', sub: 'Modify offers.' },
    notificationsGrid: { title: 'Notifications', sub: 'Send personalized or global mails to players.' },
    playersGrid: { title: 'Players', sub: 'Search and manage player accounts.' },
    analyticsGrid: { title: 'Telemetry', sub: 'Telemetry.' }
};

function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view-section');
    const addBtn = document.getElementById('addOfferBtn');
    const removeBtn = document.getElementById('removeAllOffersBtn');
    const statsBar = document.getElementById('offersStats');

    navBtns.forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            if (!targetId) return;

            views.forEach(v => {
                v.style.display = 'none';
                v.classList.remove('active-view');
            });

            const targetView = document.getElementById(targetId);
            targetView.style.display = targetId === 'offersGrid' ? 'grid' : 'block';
            targetView.classList.add('active-view');

            const isOffers = targetId === 'offersGrid';
            addBtn.style.display = isOffers ? '' : 'none';
            removeBtn.style.display = isOffers ? '' : 'none';
            statsBar.style.display = isOffers ? '' : 'none';

            const meta = pageMeta[targetId];
            if (meta) {
                document.getElementById('pageTitle').textContent = meta.title;
                document.getElementById('pageSubtitle').textContent = meta.sub;
            }

            if (targetId === 'playersGrid') fetchPlayers();
            else if (targetId === 'analyticsGrid') fetchAnalytics();
        });
    });

    addBtn.style.display = '';
    removeBtn.style.display = '';
}


function initModalControls() {
    document.getElementById('addOfferBtn').addEventListener('click', () => {
        document.getElementById('offerForm').reset();
        updateDurationPreview();
        openModal('addOfferModal');
    });

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) closeModal(modalId);
            else document.querySelectorAll('.modal-overlay').forEach(m => closeModal(m.id));
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) closeModal(overlay.id);
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}


function initDurationPicker() {
    ['durationDays', 'durationHours', 'durationMinutes'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateDurationPreview);
    });
}

function updateDurationPreview() {
    const days = parseInt(document.getElementById('durationDays').value) || 0;
    const hours = parseInt(document.getElementById('durationHours').value) || 0;
    const minutes = parseInt(document.getElementById('durationMinutes').value) || 0;
    const preview = document.getElementById('durationPreview');

    if (days === 0 && hours === 0 && minutes === 0) {
        preview.innerHTML = '<i class="fa-solid fa-clock"></i><span>Set duration above</span>';
        return;
    }

    const expiryStr = computeExpiryTime(days, hours, minutes);
    const totalMins = days * 1440 + hours * 60 + minutes;
    let durationText = '';
    if (days > 0) durationText += `${days}d `;
    if (hours > 0) durationText += `${hours}h `;
    if (minutes > 0) durationText += `${minutes}m`;

    preview.innerHTML = `<i class="fa-solid fa-calendar-check"></i><span>Expires <strong>${durationText.trim()}</strong> from now → <code style="background:rgba(255,215,0,0.12);padding:2px 6px;border-radius:4px;">${expiryStr}</code></span>`;
}


function computeExpiryTime(days, hours, minutes) {
    const now = new Date();
    const totalMs = (days * 86400 + hours * 3600 + minutes * 60) * 1000;
    const expiry = new Date(now.getTime() + totalMs);

    const pad = n => String(n).padStart(2, '0');
    const y = expiry.getFullYear();
    const mo = pad(expiry.getMonth() + 1);
    const d = pad(expiry.getDate());
    const h = pad(expiry.getHours());
    const mi = pad(expiry.getMinutes());
    const s = pad(expiry.getSeconds());

    return `${y}/${mo}/${d} ${h}:${mi}:${s}`;
}


async function loadCSVData() {
    try {
        const response = await fetch(`${API_URL}/csvdata`);
        if (!response.ok) throw new Error('Server error');
        csvData = await response.json();
        populateOfferTypeDropdown();
        populateBrawlerGrid('');
        populateSkinList('');
    } catch (err) {
        console.warn('[CSV] Could not load CSV data:', err);
        showToast('Could not load item data from server. Manual IDs may be required.', 'warning');
    }
}

function populateOfferTypeDropdown() {
    const select = document.getElementById('offerID');
    select.innerHTML = '';
    csvData.shopTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.id;
        opt.textContent = `${t.id} - ${t.name}`;
        var unavailableOfferIDs = [
            2, 5, 7, 11, 12, 13, 15, 20, 22, 23
        ]
        if (unavailableOfferIDs.includes(t.id)) {
            return;
        } else {
            if (t.id === 1) {
                opt.textContent = "1 - Coins"
            } else if (t.id === 10) {
                opt.textContent = "10 - Mega Box"
            } else if (t.id === 3) {
                opt.textContent = "3 - Brawler"
            } else if (t.id === 8) {
                opt.textContent = "8 - Power Points"
            } else if (t.id === 14) {
                opt.textContent = "14 - Big Box"
            } else if (t.id === 0) {
                opt.textContent = "0 - Daily Box"
            } else if (t.id === 6) {
                opt.textContent = "6 - Brawl Box"
            } else if (t.id === 9) {
                opt.textContent = "9 - Token Doublers"
            } else if (t.id === 20) {
                opt.textContent = "20 - Emote Bundle"
            }
            select.appendChild(opt);
        }
    });
    select.addEventListener('change', () => updatePickerVisibility(parseInt(select.value)));
}

function updatePickerVisibility(typeId) {
    const brawlerPanel = document.getElementById('brawlerPickerPanel');
    const skinPanel = document.getElementById('skinPickerPanel');
    brawlerPanel.style.display = (typeId === 3 || typeId === 8) ? 'block' : 'none';
    skinPanel.style.display = (typeId === 4) ? 'block' : 'none';
}

function populateBrawlerGrid(query) {
    const grid = document.getElementById('brawlerGrid');
    grid.innerHTML = '';
    const q = query.toLowerCase().trim();
    const filtered = q
        ? csvData.brawlers.filter(b => b.name.toLowerCase().includes(q) || b.displayName.toLowerCase().includes(q))
        : csvData.brawlers;

    filtered.forEach(b => {
        const tile = document.createElement('div');
        tile.style.cssText = `cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border-radius:10px;border:2px solid transparent;transition:all .2s;background:rgba(255,255,255,0.03);`;
        tile.title = `${b.name} (DRID ${b.id})`;
        tile.innerHTML = `
            <img src="${b.portrait}" alt="${b.name}" style="width:48px;height:48px;object-fit:contain;" onerror="this.style.display='none'">
            <span style="font-size:10px;color:var(--text-secondary);text-align:center;text-transform:capitalize;">${b.name}</span>
        `;
        tile.addEventListener('mouseenter', () => tile.style.borderColor = 'var(--bs-gold)');
        tile.addEventListener('mouseleave', () => { if (document.getElementById('selectedBrawlerDRID').value != b.id) tile.style.borderColor = 'transparent'; });
        tile.addEventListener('click', () => selectBrawler(b, tile));
        grid.appendChild(tile);
    });
    if (filtered.length === 0) {
        grid.innerHTML = `<div style="padding:20px;color:var(--text-secondary);font-size:13px;">No brawlers found.</div>`;
    }
}

function selectBrawler(b, tile) {
    document.getElementById('selectedBrawlerDRID').value = b.id;
    document.getElementById('selectedBrawlerImg').src = b.portrait;
    document.getElementById('selectedBrawlerName').textContent = `${b.name} (${b.displayName})`;
    document.getElementById('selectedBrawlerIdText').textContent = b.id;
    const display = document.getElementById('selectedBrawlerDisplay');
    display.style.display = 'flex';
    document.getElementById('offerText').value = b.name.toUpperCase();
    document.querySelectorAll('#brawlerGrid > div').forEach(t => t.style.borderColor = 'transparent');
    if (tile) tile.style.borderColor = 'var(--bs-gold)';
}

function populateSkinList(query) {
    const list = document.getElementById('skinList');
    list.innerHTML = '';
    const q = query.toLowerCase().trim();
    const filtered = q
        ? csvData.skins.filter(s => s.name.toLowerCase().includes(q) || s.displayName.toLowerCase().includes(q))
        : csvData.skins;

    filtered.slice(0, 80).forEach(s => {
        const row = document.createElement('div');
        row.style.cssText = `cursor:pointer;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-card);transition:background .15s;`;
        row.innerHTML = `
            <span style="font-size:13px;font-weight:600;">${s.displayName}</span>
            <span style="font-size:12px;color:var(--text-secondary);">${s.costGems > 0 ? `💎 ${s.costGems}` : 'Free/Event'}</span>
        `;
        row.addEventListener('mouseenter', () => row.style.background = 'rgba(255,215,0,0.05)');
        row.addEventListener('mouseleave', () => row.style.background = 'transparent');
        row.addEventListener('click', () => selectSkin(s));
        list.appendChild(row);
    });
    if (filtered.length === 0) {
        list.innerHTML = `<div style="padding:16px;color:var(--text-secondary);font-size:13px;">No skins found.</div>`;
    }
}

function selectSkin(s) {
    document.getElementById('selectedSkinID').value = s.id;
    document.getElementById('selectedSkinName').textContent = s.displayName;
    document.getElementById('selectedSkinIdText').textContent = s.id;
    document.getElementById('selectedSkinCost').textContent = s.costGems > 0 ? s.costGems : '—';
    document.getElementById('selectedSkinDisplay').style.display = 'block';
    document.getElementById('offerText').value = s.displayName.toUpperCase();
    if (s.costGems > 0) document.getElementById('offerCost').value = s.costGems;
}


function initOfferForm() {
    document.getElementById('brawlerSearch').addEventListener('input', e => populateBrawlerGrid(e.target.value));
    document.getElementById('skinSearch').addEventListener('input', e => populateSkinList(e.target.value));
    document.getElementById('offerForm').addEventListener('submit', e => {
        e.preventDefault();
        saveNewOffer();
    });
}

async function saveNewOffer() {
    const days = parseInt(document.getElementById('durationDays').value) || 0;
    const hours = parseInt(document.getElementById('durationHours').value) || 0;
    const minutes = parseInt(document.getElementById('durationMinutes').value) || 0;

    if (days === 0 && hours === 0 && minutes === 0) {
        showToast("plis set duration", 'warning');
        return;
    }

    const typeId = parseInt(document.getElementById('offerID').value);
    const offerTime = computeExpiryTime(days, hours, minutes);

    let drid = 0;
    let itemID = 0;
    if (typeId === 3 || typeId === 8) {
        drid = parseInt(document.getElementById('selectedBrawlerDRID').value) || 0;
    } else if (typeId === 4) {
        itemID = parseInt(document.getElementById('selectedSkinID').value) || 0;
    }

    const newOffer = {
        offerHeader: [{
            ID: typeId,
            Count: parseInt(document.getElementById('offerCount').value),
            DRID: drid,
            itemID: itemID
        }],
        offerType: parseInt(document.getElementById('offerType').value),
        offerCost: parseInt(document.getElementById('offerCost').value),
        offerTime: offerTime,
        offer_isClaimed: false,
        offer_isDaily: document.getElementById('offerIsDaily').checked,
        offer_oldCost: false,
        offerText: document.getElementById('offerText').value,
        offerBGR: document.getElementById('offerBGR').value,
        offerDSC: 0,
        offerDSC_type: 0
    };

    currentGlobalOffers.offers.push(newOffer);
    const success = await pushUpdatesToServer();
    if (success) closeModal('addOfferModal');
}


async function removeAllOffers() {
    if (!confirm(`Should we remove **ALL** the offers?? ${currentGlobalOffers.offers.length} offer(s)? This cannot be undone.`)) return;

    try {
        const response = await fetch(`${API_URL}/globaloffers`, {
            method: 'DELETE',
            headers: {
                'Authorization': adminSecret,
                'x-admin-secret': adminSecret
            }
        });

        if (response.ok) {
            currentGlobalOffers.offers = [];
            renderOffers();
            updateStats();
            showToast("All offers were deleted!", 'success');
        } else {
            const err = await response.json().catch(() => ({}));
            showToast(`Error: ${err.error || response.statusText}`, 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Network error removing offers.", 'error');
    }
}

async function deleteOffer(index) {
    if (!confirm(`Remove this offer??`)) return;
    currentGlobalOffers.offers.splice(index, 1);
    await pushUpdatesToServer();
}


async function fetchGlobalOffers() {
    try {
        const response = await fetch(`${API_URL}/globaloffers`);
        if (response.ok) {
            currentGlobalOffers = await response.json();
            renderOffers();
            updateStats();
        } else {
            showToast("Failed to fetch offers from server.", 'error');
        }
    } catch (err) {
        console.error(err);
        showToast("Network error loading offers.", 'error');
    }
}

const CURRENCY_ICONS = {
    0: '<img src="Assets/UI/gem_icon.png" alt="gem" ">',
    1: '<img src="Assets/UI/coin_icon.png" alt="coin" ">',
    3: '<img src="https://cdn.brawlify.com/misc/Star-Points.png" alt="⭐"">',
};

function getBrawlerByDRID(drid) {
    return csvData.brawlers.find(b => b.id === drid) || null;
}

function renderOffers() {
    const grid = document.getElementById('offersGrid');
    grid.innerHTML = '';

    if (!currentGlobalOffers.offers || currentGlobalOffers.offers.length === 0) {
        grid.innerHTML = `
            <div class="loading-state">
                <i class="fa-solid fa-store" style="font-size:48px;opacity:0.2;"></i>
                <p>No offers in rotation. Click <strong>New Offer</strong> to add one.</p>
            </div>`;
        return;
    }

    currentGlobalOffers.offers.forEach((offer, index) => {
        const header = offer.offerHeader[0];
        const card = document.createElement('div');
        card.className = 'offer-card';

        const currencyHtml = CURRENCY_ICONS[offer.offerType] || '💎';
        const costDisplay = offer.offerCost === 0
            ? `<span class="cost free"><i class="fa-solid fa-gift"></i> FREE</span>`
            : `<span class="cost">${currencyHtml} ${offer.offerCost}</span>`;

        const expiryDisplay = offer.offerTime || 'Shop Refresh';

        const brawler = header.DRID ? getBrawlerByDRID(header.DRID) : null;
        const portraitHtml = brawler
            ? `<img src="${brawler.portrait}" alt="${brawler.name}" class="card-portrait" onerror="this.style.display='none'">`
            : '';

        const shopTypeInfo = csvData.shopTypes.find(t => t.id === header.ID);
        const itemLabel = shopTypeInfo ? shopTypeInfo.name : `Type ${header.ID}`;
        const brawlerLabel = brawler ? `<div class="details-row"><span class="label">Brawler</span><span class="value" style="text-transform:capitalize;">${brawler.name}</span></div>` : '';

        card.innerHTML = `
            <div class="card-header bgr-${offer.offerBGR}">
                ${portraitHtml}
                <div class="amount-badge">x${header.Count}</div>
                ${offer.offer_isDaily ? '<div class="daily-badge">Daily</div>' : ''}
                <div class="card-title">${offer.offerText}</div>
            </div>
            <div class="card-body">
                <div class="details-row">
                    <span class="label">Type</span>
                    <span class="value">${itemLabel}</span>
                </div>
                ${brawlerLabel}
                ${header.itemID ? `<div class="details-row"><span class="label">Skin ID</span><span class="value">${header.itemID}</span></div>` : ''}
                <div class="details-row">
                    <span class="label">Expires</span>
                    <span class="value" style="font-size:0.82rem;">${expiryDisplay}</span>
                </div>
                <div class="card-footer">
                    ${costDisplay}
                    <button class="btn btn-danger" onclick="deleteOffer(${index})" title="Remove Offer">
                        <i class="fa-solid fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateStats() {
    document.getElementById('totalOffersCount').innerText = currentGlobalOffers.offers.length;
    document.getElementById('removeAllOffersBtn').style.display =
        currentGlobalOffers.offers.length > 0 ? '' : 'none';
    fetchConfig();
}

async function fetchConfig() {
    try {
        const response = await fetch(`${API_URL}/config`, {
            headers: { 'Authorization': adminSecret }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('shopRefreshRate').innerText = `${data.shopRefreshSeconds}s`;
        }
    } catch (err) { /* shh */ }
}

async function pushUpdatesToServer() {
    try {
        const payload = {
            shopRefresh: currentGlobalOffers.shopRefresh,
            offers: currentGlobalOffers.offers
        };

        const response = await fetch(`${API_URL}/globaloffers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': adminSecret,
                'x-admin-secret': adminSecret
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const result = await response.json();
            currentGlobalOffers = result.doc;
            showToast("Offers synchronized with the server!", 'success');
            renderOffers();
            updateStats();
            return true;
        } else {
            const errData = await response.json().catch(() => ({}));
            showToast(`Error ${response.status}: ${errData.error || 'Failed to update server.'}`, 'error');
            fetchGlobalOffers(); // pervert
            return false;
        }
    } catch (err) {
        console.error(err);
        showToast("Network error syncing offers.", 'error');
        return false;
    }
}


async function fetchAnalytics() {
    document.getElementById('analyticsTotalPlayers').textContent = '…';
    document.getElementById('analyticsOnlinePlayers').textContent = '…';
    try {
        const response = await fetch(`${API_URL}/analytics`, {
            headers: { 'Authorization': adminSecret }
        });
        if (response.ok) {
            const data = await response.json();
            document.getElementById('analyticsTotalPlayers').innerText = data.totalPlayers.toLocaleString();
            document.getElementById('analyticsOnlinePlayers').innerText = data.onlinePlayers.toLocaleString();
        } else {
            showToast("Failed to fetch analytics.", 'error');
        }
    } catch (err) {
        showToast("Network error fetching analytics.", 'error');
    }
}

function initPlayerSearch() {
    document.getElementById('playerSearchBtn').addEventListener('click', () => {
        fetchPlayers(document.getElementById('playerSearchInput').value);
    });
    document.getElementById('playerSearchInput').addEventListener('keyup', e => {
        if (e.key === 'Enter') fetchPlayers(e.target.value);
    });
}

async function fetchPlayers(query = '') {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-secondary);"><div style="display:flex;align-items:center;justify-content:center;gap:10px;"><div class="spinner" style="width:20px;height:20px;margin:0;"></div> Loading...</div></td></tr>`;

    try {
        const url = query ? `${API_URL}/players?q=${encodeURIComponent(query)}` : `${API_URL}/players`;
        const response = await fetch(url, { headers: { 'Authorization': adminSecret } });

        if (response.ok) {
            renderPlayers(await response.json());
        } else {
            tbody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--bs-red);">Failed to load players.</td></tr>`;
            showToast("Failed to load player list.", 'error');
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--bs-red);">Server Error.</td></tr>`;
        showToast("Network error fetching players.", 'error');
    }
}

function renderPlayers(players) {
    const tbody = document.getElementById('playersTableBody');
    tbody.innerHTML = '';

    if (!players || players.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-secondary);">No players found.</td></tr>`;
        return;
    }

    players.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family:'Lilita One',cursive;color:var(--text-secondary);">#${p.low_id}</td>
            <td style="font-weight:700;color:var(--bs-gold);display:flex;align-items:center;gap:8px;height:52px;">
                <img src="Assets/profile-icons/280000${String(p.thumbnail || 0).padStart(2, '0')}.png" style="width:32px;height:32px;border-radius:4px;object-fit:cover;" onerror="this.style.display='none'">
                ${p.username}
            </td>
            <td><img src="Assets/UI/trophy_icon.png" style="width:16px;height:16px;vertical-align:middle;margin-top:-2px;"> ${p.trophies.toLocaleString()}</td>
            <td><img src="Assets/UI/gem_icon.png" style="width:18px;height:18px;vertical-align:middle;margin-top:-2px;"> ${p.gems.toLocaleString()}</td>
            <td style="font-size:0.85em;color:var(--text-secondary);">${p.created}</td>
            <td>
                <button class="btn btn-secondary" style="padding:6px 14px;font-size:12px;"
                    onclick="editPlayer(${p.low_id}, ${p.gems}, ${p.coins}, ${p.trophies}, ${p.starpoints})">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function initEditPlayerForm() {
    const form = document.getElementById('editPlayerForm');
    if (form) form.addEventListener('submit', async e => {
        e.preventDefault();
        await savePlayerChanges();
    });
}

function editPlayer(low_id, gems, coins, trophies, starpoints) {
    document.getElementById('editPlayerIdDisplay').innerText = `#${low_id}`;
    document.getElementById('editPlayerLowId').value = low_id;
    document.getElementById('editPlayerGems').value = gems;
    document.getElementById('editPlayerCoins').value = coins;
    document.getElementById('editPlayerTrophies').value = trophies;
    document.getElementById('editPlayerStarpoints').value = starpoints;
    openModal('editPlayerModal');
}

async function savePlayerChanges() {
    const low_id = document.getElementById('editPlayerLowId').value;
    const updateData = {
        gems: document.getElementById('editPlayerGems').value,
        coins: document.getElementById('editPlayerCoins').value,
        trophies: document.getElementById('editPlayerTrophies').value,
        starpoints: document.getElementById('editPlayerStarpoints').value
    };

    try {
        const response = await fetch(`${API_URL}/players/${low_id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': adminSecret,
                'x-admin-secret': adminSecret
            },
            body: JSON.stringify(updateData)
        });

        if (response.ok) {
            showToast("Player updated successfully!", 'success');
            closeModal('editPlayerModal');
            fetchPlayers(document.getElementById('playerSearchInput').value);
        } else {
            const err = await response.json();
            showToast(`Error: ${err.error || response.statusText}`, 'error');
        }
    } catch (err) {
        showToast("Network error saving player.", 'error');
    }
}


function initNotificationForm() {
    const notifTargetType = document.getElementById('notifTargetType');
    const targetLowIdGroup = document.getElementById('targetLowIdGroup');
    const notifType = document.getElementById('notifType');
    const notifPromoFields = document.getElementById('notifPromoFields');
    const notifGemsFields = document.getElementById('notifGemsFields');
    const notifBrawlerFields = document.getElementById('notifBrawlerFields');
    const notifSkinFields = document.getElementById('notifSkinFields');

    notifTargetType.addEventListener('change', e => {
        targetLowIdGroup.style.display = e.target.value === 'personal' ? 'flex' : 'none';
    });

    notifType.addEventListener('change', e => {
        const type = e.target.value;
        notifPromoFields.style.display = type === '83' ? 'flex' : 'none';
        notifGemsFields.style.display = (type === '85' || type === '89') ? 'flex' : 'none';
        notifBrawlerFields.style.display = (type === '92' || type === '93') ? 'flex' : 'none';
        notifSkinFields.style.display = type === '94' ? 'flex' : 'none';
    });

    document.getElementById('notificationForm').addEventListener('submit', async e => {
        e.preventDefault();
        await sendNotification();
    });
}

async function sendNotification() {
    const targetType = document.getElementById('notifTargetType').value;
    const low_id = document.getElementById('notifLowId').value;
    const typeId = parseInt(document.getElementById('notifType').value);
    const message = document.getElementById('notifMessage').value;

    if (targetType === 'personal' && !low_id) {
        showToast("Please provide a Target Player Low ID.", 'warning');
        return;
    }

    const notificationObj = { NotificationID: typeId, Message: message };

    if (typeId === 83) {
        notificationObj.PrimaryText = document.getElementById('notifPrimary').value;
        notificationObj.SecondaryText = document.getElementById('notifSecondary').value;
        notificationObj.ButtonText = document.getElementById('notifButton').value;
        notificationObj.BannerFile = document.getElementById('notifBannerFile').value;
        notificationObj.BannerHash = document.getElementById('notifBannerHash').value;
        notificationObj.EventLink = document.getElementById('notifEventLink').value;
    } else if (typeId === 85) {
        notificationObj.GemsRevoked = parseInt(document.getElementById('notifGemsAmount').value) || 0;
    } else if (typeId === 89) {
        notificationObj.GemsDonated = parseInt(document.getElementById('notifGemsAmount').value) || 0;
    } else if (typeId === 92) {
        notificationObj.BrawlerID = parseInt(document.getElementById('notifBrawlerId').value) || 0;
        notificationObj.PowerPoints = parseInt(document.getElementById('notifPowerPoints').value) || 0;
    } else if (typeId === 93) {
        notificationObj.BrawlerID = parseInt(document.getElementById('notifBrawlerId').value) || 0;
    } else if (typeId === 94) {
        notificationObj.SkinID = parseInt(document.getElementById('notifSkinId').value) || 0;
    }

    const endpoint = targetType === 'global' ? '/notifications/global' : '/notifications/personal';
    const payload = targetType === 'global' ? { notificationObj } : { low_id, notificationObj };

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': adminSecret,
                'x-admin-secret': adminSecret
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showToast(`${targetType === 'global' ? 'Global' : 'Personal'} notification sent! 📨`, 'success');
            document.getElementById('notificationForm').reset();
            document.getElementById('targetLowIdGroup').style.display = 'none';
            ['notifPromoFields', 'notifGemsFields', 'notifBrawlerFields', 'notifSkinFields'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
        } else {
            const err = await response.json();
            showToast(`Error: ${err.error || response.statusText}`, 'error');
        }
    } catch (err) {
        showToast("Network error sending notification.", 'error');
    }
}


const TOAST_ICONS = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
};

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}
