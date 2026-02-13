// Wargear Tab - Equipment management with improved UI

const WargearTab = {
    currentCategory: 'all',
    searchQuery: '',
    selectedWargearIndex: null, // For upgrade management

    init() {
        // Initialize the upgrade modal
        this.initUpgradeModal();
        this.render();
    },

    // Initialize the weapon upgrade modal
    initUpgradeModal() {
        if (!document.getElementById('upgrade-modal')) {
            const modal = document.createElement('div');
            modal.id = 'upgrade-modal';
            modal.className = 'modal hidden';
            modal.innerHTML = `
                <div class="modal-content modal-large">
                    <div class="modal-header">
                        <h3 id="upgrade-modal-title">Manage Weapon Upgrades</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div id="upgrade-modal-content"></div>
                    </div>
                    <div class="modal-footer">
                        <button id="btn-close-upgrades" class="btn-primary">Done</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.modal-close').addEventListener('click', () => this.hideUpgradeModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.hideUpgradeModal();
            });
            document.getElementById('btn-close-upgrades').addEventListener('click', () => this.hideUpgradeModal());
        }
    },

    render() {
        this.renderCurrentWargear();
        this.renderWargearBrowser();
    },

    // Render currently owned wargear
    renderCurrentWargear() {
        const container = document.getElementById('current-wargear');
        const character = State.getCharacter();

        document.getElementById('wargear-count').textContent = character.wargear.length;

        if (character.wargear.length === 0) {
            container.innerHTML = '<p class="text-muted">No wargear equipped.</p>';
            return;
        }

        // Group wargear by type
        const grouped = {
            weapons: [],
            armor: [],
            equipment: []
        };

        for (let i = 0; i < character.wargear.length; i++) {
            const item = character.wargear[i];
            const wargear = DataLoader.getWargearItem(item.id);
            if (!wargear) continue;

            const entry = { ...wargear, wargearIndex: i, isStarting: item.isStarting, upgrades: item.upgrades || [] };

            if (DataLoader.getWeapon(item.id)) {
                grouped.weapons.push(entry);
            } else if (DataLoader.getArmor(item.id)) {
                grouped.armor.push(entry);
            } else {
                grouped.equipment.push(entry);
            }
        }

        let html = '';

        // Weapons
        if (grouped.weapons.length > 0) {
            html += '<div class="wargear-group"><h4>Weapons</h4>';
            html += grouped.weapons.map(w => this.renderOwnedWeapon(w)).join('');
            html += '</div>';
        }

        // Armor
        if (grouped.armor.length > 0) {
            html += '<div class="wargear-group"><h4>Armor</h4>';
            html += grouped.armor.map(a => this.renderOwnedItem(a, 'armor')).join('');
            html += '</div>';
        }

        // Equipment
        if (grouped.equipment.length > 0) {
            html += '<div class="wargear-group"><h4>Equipment</h4>';
            html += grouped.equipment.map(e => this.renderOwnedItem(e, 'equipment')).join('');
            html += '</div>';
        }

        container.innerHTML = html;

        // Bind event handlers
        container.querySelectorAll('.btn-remove-wargear').forEach(btn => {
            btn.addEventListener('click', () => {
                State.removeWargearByIndex(parseInt(btn.dataset.index, 10));
                this.render();
            });
        });

        container.querySelectorAll('.btn-manage-upgrades').forEach(btn => {
            btn.addEventListener('click', () => {
                this.showUpgradeModal(parseInt(btn.dataset.index, 10));
            });
        });
    },

    // Render an owned weapon with upgrade info
    renderOwnedWeapon(weapon) {
        const upgradeNames = weapon.upgrades.map(id => {
            const upgrade = DataLoader.getWeaponUpgrade(id);
            return upgrade ? upgrade.name : id;
        });

        const upgradeText = upgradeNames.length > 0
            ? `<div class="wargear-upgrades">Upgrades: ${upgradeNames.join(', ')}</div>`
            : '';

        const typeLabel = weapon.type === 'melee' ? 'Melee' : 'Ranged';
        const startingBadge = weapon.isStarting ? '<span class="badge-starting">Starting</span>' : '';

        return `
            <div class="wargear-item wargear-item-owned">
                <div class="wargear-info">
                    <div class="wargear-name">${weapon.name} ${startingBadge}</div>
                    <div class="wargear-type">${typeLabel} Weapon${weapon.category ? ' • ' + weapon.category : ''}</div>
                    ${upgradeText}
                </div>
                <div class="wargear-actions">
                    <button class="btn-small btn-manage-upgrades" data-index="${weapon.wargearIndex}">Upgrades</button>
                    <button class="btn-small btn-remove-wargear" data-index="${weapon.wargearIndex}">Remove</button>
                </div>
            </div>
        `;
    },

    // Render an owned non-weapon item
    renderOwnedItem(item, type) {
        const startingBadge = item.isStarting ? '<span class="badge-starting">Starting</span>' : '';
        const typeLabel = type === 'armor' ? 'Armor' : (item.category || 'Equipment');

        return `
            <div class="wargear-item wargear-item-owned">
                <div class="wargear-info">
                    <div class="wargear-name">${item.name} ${startingBadge}</div>
                    <div class="wargear-type">${typeLabel}</div>
                </div>
                <div class="wargear-actions">
                    <button class="btn-small btn-remove-wargear" data-index="${item.wargearIndex}">Remove</button>
                </div>
            </div>
        `;
    },

    // Render the wargear browser with categories
    renderWargearBrowser() {
        const container = document.getElementById('additional-wargear');
        const character = State.getCharacter();
        const archetype = DataLoader.getArchetype(character.archetype?.id);

        // Check starting wargear status
        const hasStartingGear = character.wargear.some(w => w.isStarting);
        let startingGearHtml = '';

        if (archetype && archetype.startingWargear && archetype.startingWargear.length > 0 && !hasStartingGear) {
            startingGearHtml = `
                <div class="starting-wargear-notice">
                    <h4>Starting Wargear</h4>
                    <p>Your archetype (${archetype.name}) provides starting wargear:</p>
                    <ul>
                        ${archetype.startingWargear.map(id => {
                            const item = DataLoader.getWargearItem(id);
                            return `<li>${item?.name || id}</li>`;
                        }).join('')}
                    </ul>
                    <button class="btn-primary" id="btn-add-starting">Add Starting Wargear</button>
                </div>
            `;
        }

        container.innerHTML = `
            ${startingGearHtml}
            <div class="wargear-browser">
                <div class="wargear-browser-controls">
                    <input type="text" id="wargear-search" class="search-input" placeholder="Search wargear..." value="${this.escapeHtml(this.searchQuery)}">
                    <div class="wargear-category-tabs">
                        <button class="wargear-tab-btn ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all">All</button>
                        <button class="wargear-tab-btn ${this.currentCategory === 'melee' ? 'active' : ''}" data-category="melee">Melee</button>
                        <button class="wargear-tab-btn ${this.currentCategory === 'ranged' ? 'active' : ''}" data-category="ranged">Ranged</button>
                        <button class="wargear-tab-btn ${this.currentCategory === 'armor' ? 'active' : ''}" data-category="armor">Armor</button>
                        <button class="wargear-tab-btn ${this.currentCategory === 'equipment' ? 'active' : ''}" data-category="equipment">Equipment</button>
                    </div>
                </div>
                <div id="wargear-browser-list" class="wargear-browser-list">
                    ${this.renderBrowserItems()}
                </div>
            </div>
        `;

        // Bind events
        if (document.getElementById('btn-add-starting')) {
            document.getElementById('btn-add-starting').addEventListener('click', () => {
                for (const itemId of archetype.startingWargear) {
                    State.addWargear(itemId, true);
                }
                this.render();
            });
        }

        document.getElementById('wargear-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            document.getElementById('wargear-browser-list').innerHTML = this.renderBrowserItems();
            this.bindBrowserItemEvents();
        });

        container.querySelectorAll('.wargear-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.wargear-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                document.getElementById('wargear-browser-list').innerHTML = this.renderBrowserItems();
                this.bindBrowserItemEvents();
            });
        });

        this.bindBrowserItemEvents();
    },

    // Render browser items based on current category and search
    renderBrowserItems() {
        const weapons = DataLoader.getAllWeapons() || [];
        const armor = DataLoader.getAllArmor() || [];
        const equipment = DataLoader.getAllEquipment() || [];
        const character = State.getCharacter();

        // Count how many of each item is owned
        const ownedCounts = {};
        for (const item of character.wargear) {
            ownedCounts[item.id] = (ownedCounts[item.id] || 0) + 1;
        }

        // Filter by enabled sources first
        const filterBySource = (items) => items.filter(item => State.isSourceEnabled(item.source));

        // Filter by search
        const filterBySearch = (items) => {
            if (!this.searchQuery) return items;
            return items.filter(item => {
                const searchable = `${item.name} ${item.category || ''} ${(item.traits || []).join(' ')} ${(item.keywords || []).join(' ')}`.toLowerCase();
                return searchable.includes(this.searchQuery);
            });
        };

        let html = '';

        // Render Melee Weapons
        if (this.currentCategory === 'all' || this.currentCategory === 'melee') {
            const meleeWeapons = filterBySearch(filterBySource(weapons.filter(w => w.type === 'melee')));
            if (meleeWeapons.length > 0) {
                html += this.renderMeleeWeaponsTable(meleeWeapons, ownedCounts);
            }
        }

        // Render Ranged Weapons
        if (this.currentCategory === 'all' || this.currentCategory === 'ranged') {
            const rangedWeapons = filterBySearch(filterBySource(weapons.filter(w => w.type === 'ranged')));
            if (rangedWeapons.length > 0) {
                html += this.renderRangedWeaponsTable(rangedWeapons, ownedCounts);
            }
        }

        // Render Armor
        if (this.currentCategory === 'all' || this.currentCategory === 'armor') {
            const armorItems = filterBySearch(filterBySource(armor));
            if (armorItems.length > 0) {
                html += this.renderArmorTable(armorItems, ownedCounts);
            }
        }

        // Render Equipment
        if (this.currentCategory === 'all' || this.currentCategory === 'equipment') {
            const equipmentItems = filterBySearch(filterBySource(equipment));
            if (equipmentItems.length > 0) {
                html += this.renderEquipmentTable(equipmentItems, ownedCounts);
            }
        }

        if (html === '') {
            return '<p class="text-muted">No items found.</p>';
        }

        return html;
    },

    // Render melee weapons table
    renderMeleeWeaponsTable(weapons, ownedCounts) {
        weapons.sort((a, b) => a.name.localeCompare(b.name));

        const rows = weapons.map(w => {
            const ownedCount = ownedCounts[w.id] || 0;
            const damage = this.formatMeleeDamage(w);
            const traits = (w.traits || []).join(', ') || '-';
            const keywords = (w.keywords || []).join(', ') || '-';
            // Melee range/reach - some weapons have reach (2, 4, etc.), most are "-"
            const reach = w.reach || '-';
            const rarityClass = this.getRarityClass(w.rarity);
            const ownedBadge = ownedCount > 0 ? `<span class="owned-count">${ownedCount}</span>` : '';

            return `
                <tr>
                    <td class="wargear-table-name">${w.name}</td>
                    <td class="wargear-table-center">${damage}</td>
                    <td class="wargear-table-center">${w.ed || 0}</td>
                    <td class="wargear-table-center">${w.ap ? w.ap : '-'}</td>
                    <td class="wargear-table-center">${reach}</td>
                    <td class="wargear-table-traits">${traits}</td>
                    <td class="wargear-table-center">${w.value || '-'}</td>
                    <td class="wargear-table-rarity ${rarityClass}">${w.rarity || 'Common'}</td>
                    <td class="wargear-table-keywords">${keywords}</td>
                    <td class="wargear-table-action">
                        ${ownedBadge}
                        <button class="btn-small btn-add-wargear" data-id="${w.id}">Add</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="wargear-table-section">
                <h4>Melee Weapons</h4>
                <div class="wargear-table-wrapper">
                    <table class="wargear-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Damage</th>
                                <th>ED</th>
                                <th>AP</th>
                                <th>Reach</th>
                                <th>Traits</th>
                                <th>Value</th>
                                <th>Rarity</th>
                                <th>Keywords</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Render ranged weapons table
    renderRangedWeaponsTable(weapons, ownedCounts) {
        weapons.sort((a, b) => a.name.localeCompare(b.name));

        const rows = weapons.map(w => {
            const ownedCount = ownedCounts[w.id] || 0;
            const traits = (w.traits || []).join(', ') || '-';
            const keywords = (w.keywords || []).join(', ') || '-';
            const range = w.range ? `${w.range.short}/${w.range.medium}/${w.range.long}` : '-';
            const rarityClass = this.getRarityClass(w.rarity);
            const ownedBadge = ownedCount > 0 ? `<span class="owned-count">${ownedCount}</span>` : '';

            return `
                <tr>
                    <td class="wargear-table-name">${w.name}</td>
                    <td class="wargear-table-center">${w.damage?.base || 0}</td>
                    <td class="wargear-table-center">${w.ed || 0}</td>
                    <td class="wargear-table-center">${w.ap ? w.ap : '-'}</td>
                    <td class="wargear-table-range">${range}</td>
                    <td class="wargear-table-center">${w.salvo || '-'}</td>
                    <td class="wargear-table-traits">${traits}</td>
                    <td class="wargear-table-center">${w.value || '-'}</td>
                    <td class="wargear-table-rarity ${rarityClass}">${w.rarity || 'Common'}</td>
                    <td class="wargear-table-keywords">${keywords}</td>
                    <td class="wargear-table-action">
                        ${ownedBadge}
                        <button class="btn-small btn-add-wargear" data-id="${w.id}">Add</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="wargear-table-section">
                <h4>Ranged Weapons</h4>
                <div class="wargear-table-wrapper">
                    <table class="wargear-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Damage</th>
                                <th>ED</th>
                                <th>AP</th>
                                <th>Range</th>
                                <th>Salvo</th>
                                <th>Traits</th>
                                <th>Value</th>
                                <th>Rarity</th>
                                <th>Keywords</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Render armor table
    renderArmorTable(armorItems, ownedCounts) {
        armorItems.sort((a, b) => a.name.localeCompare(b.name));

        const rows = armorItems.map(a => {
            const ownedCount = ownedCounts[a.id] || 0;
            const traits = (a.traits || []).join(', ') || '-';
            const keywords = (a.keywords || []).join(', ') || '-';
            const rarityClass = this.getRarityClass(a.rarity);
            const ownedBadge = ownedCount > 0 ? `<span class="owned-count">${ownedCount}</span>` : '';

            return `
                <tr>
                    <td class="wargear-table-name">${a.name}</td>
                    <td class="wargear-table-center">${a.ar || 0}</td>
                    <td class="wargear-table-traits">${traits}</td>
                    <td class="wargear-table-center">${a.value || '-'}</td>
                    <td class="wargear-table-rarity ${rarityClass}">${a.rarity || 'Common'}</td>
                    <td class="wargear-table-keywords">${keywords}</td>
                    <td class="wargear-table-action">
                        ${ownedBadge}
                        <button class="btn-small btn-add-wargear" data-id="${a.id}">Add</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="wargear-table-section">
                <h4>Armor</h4>
                <div class="wargear-table-wrapper">
                    <table class="wargear-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>AR</th>
                                <th>Traits</th>
                                <th>Value</th>
                                <th>Rarity</th>
                                <th>Keywords</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Render equipment table
    renderEquipmentTable(equipmentItems, ownedCounts) {
        equipmentItems.sort((a, b) => a.name.localeCompare(b.name));

        const rows = equipmentItems.map(e => {
            const ownedCount = ownedCounts[e.id] || 0;
            const keywords = (e.keywords || []).join(', ') || '-';
            const effect = e.effect || e.description || '-';
            const rarityClass = this.getRarityClass(e.rarity);
            const ownedBadge = ownedCount > 0 ? `<span class="owned-count">${ownedCount}</span>` : '';

            return `
                <tr>
                    <td class="wargear-table-name">${e.name}</td>
                    <td class="wargear-table-effect">${effect}</td>
                    <td class="wargear-table-center">${e.value || '-'}</td>
                    <td class="wargear-table-rarity ${rarityClass}">${e.rarity || 'Common'}</td>
                    <td class="wargear-table-keywords">${keywords}</td>
                    <td class="wargear-table-action">
                        ${ownedBadge}
                        <button class="btn-small btn-add-wargear" data-id="${e.id}">Add</button>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="wargear-table-section">
                <h4>Equipment</h4>
                <div class="wargear-table-wrapper">
                    <table class="wargear-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Effect</th>
                                <th>Value</th>
                                <th>Rarity</th>
                                <th>Keywords</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `;
    },

    // Format melee damage like the book: (S) +X
    formatMeleeDamage(weapon) {
        const base = weapon.damage?.base || 0;
        const bonus = weapon.damage?.bonus || 0;
        const total = base + bonus;

        if (weapon.damage?.attribute === 'strength') {
            return `(S) +${total}`;
        }
        return `${total}`;
    },

    // Get CSS class for rarity
    getRarityClass(rarity) {
        if (!rarity) return 'rarity-common';
        return 'rarity-' + rarity.toLowerCase().replace(' ', '-');
    },

    // Bind events to browser items
    bindBrowserItemEvents() {
        const container = document.getElementById('wargear-browser-list');
        if (!container) return;

        container.querySelectorAll('.btn-add-wargear').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                State.addWargear(btn.dataset.id, false);
                this.render();
            });
        });
    },

    // Show the upgrade modal for a weapon
    showUpgradeModal(wargearIndex) {
        this.selectedWargearIndex = wargearIndex;
        const character = State.getCharacter();
        const item = character.wargear[wargearIndex];
        const weapon = DataLoader.getWeapon(item.id);

        if (!weapon) return;

        const currentUpgrades = item.upgrades || [];
        const validUpgrades = DataLoader.getValidUpgradesForWeapon(weapon, currentUpgrades);

        const modal = document.getElementById('upgrade-modal');
        const title = document.getElementById('upgrade-modal-title');
        const content = document.getElementById('upgrade-modal-content');

        title.textContent = `Upgrades: ${weapon.name}`;

        // Count non-distinction upgrades
        const upgradeCount = currentUpgrades.filter(id => {
            const upgrade = DataLoader.getWeaponUpgrade(id);
            return upgrade && !upgrade.doesNotCountTowardLimit;
        }).length;

        let html = `
            <div class="upgrade-info">
                <p>Upgrades: ${upgradeCount}/3 (Distinction doesn't count toward limit)</p>
                <p class="text-muted">A weapon may have only one upgrade of each type.</p>
            </div>
        `;

        // Current upgrades
        if (currentUpgrades.length > 0) {
            html += '<div class="upgrade-section"><h4>Current Upgrades</h4>';
            html += '<div class="upgrade-list">';
            for (const upgradeId of currentUpgrades) {
                const upgrade = DataLoader.getWeaponUpgrade(upgradeId);
                if (!upgrade) continue;

                html += `
                    <div class="upgrade-item upgrade-owned">
                        <div class="upgrade-info">
                            <span class="upgrade-name">${upgrade.name}</span>
                            <span class="upgrade-type">${upgrade.type}</span>
                        </div>
                        <div class="upgrade-effect">${upgrade.effect}</div>
                        <button class="btn-small btn-remove-upgrade" data-id="${upgrade.id}">Remove</button>
                    </div>
                `;
            }
            html += '</div></div>';
        }

        // Available upgrades
        html += '<div class="upgrade-section"><h4>Available Upgrades</h4>';
        if (validUpgrades.length === 0) {
            html += '<p class="text-muted">No more upgrades available for this weapon.</p>';
        } else {
            html += '<div class="upgrade-list">';
            for (const upgrade of validUpgrades) {
                html += `
                    <div class="upgrade-item">
                        <div class="upgrade-header">
                            <span class="upgrade-name">${upgrade.name}</span>
                            <span class="upgrade-type">${upgrade.type}</span>
                            <span class="upgrade-rarity">${upgrade.rarity}</span>
                        </div>
                        <div class="upgrade-effect">${upgrade.effect}</div>
                        <div class="upgrade-meta">
                            <span>Value: ${upgrade.value}</span>
                        </div>
                        <button class="btn-small btn-add-upgrade" data-id="${upgrade.id}">Add Upgrade</button>
                    </div>
                `;
            }
            html += '</div>';
        }
        html += '</div>';

        content.innerHTML = html;

        // Bind events
        content.querySelectorAll('.btn-add-upgrade').forEach(btn => {
            btn.addEventListener('click', () => {
                State.addWeaponUpgrade(this.selectedWargearIndex, btn.dataset.id);
                this.showUpgradeModal(this.selectedWargearIndex); // Refresh modal
                this.renderCurrentWargear(); // Update main display
            });
        });

        content.querySelectorAll('.btn-remove-upgrade').forEach(btn => {
            btn.addEventListener('click', () => {
                State.removeWeaponUpgrade(this.selectedWargearIndex, btn.dataset.id);
                this.showUpgradeModal(this.selectedWargearIndex); // Refresh modal
                this.renderCurrentWargear(); // Update main display
            });
        });

        modal.classList.remove('hidden');
    },

    // Hide the upgrade modal
    hideUpgradeModal() {
        const modal = document.getElementById('upgrade-modal');
        modal.classList.add('hidden');
        this.selectedWargearIndex = null;
    },

    refresh() {
        this.render();
    },

    // Helper: Escape HTML for safe insertion
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
