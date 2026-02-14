// Glossary Tab - Browse and search game terms

const GlossaryTab = {
    searchQuery: '',
    currentCategory: 'all',
    allEntries: [],

    init() {
        // Search input
        document.getElementById('glossary-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderEntries();
        });

        // Category filter buttons
        document.querySelectorAll('.glossary-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.glossary-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.renderEntries();
            });
        });

        // Load entries from glossary data
        this.loadEntries();
    },

    // Load all entries from the Glossary module
    loadEntries() {
        this.allEntries = [];

        if (!Glossary.data) {
            console.warn('Glossary data not loaded');
            return;
        }

        // Category display names and order
        const categories = [
            { key: 'characterTerms', name: 'Character Term', pluralName: 'Character Terms' },
            { key: 'conditions', name: 'Condition', pluralName: 'Conditions' },
            { key: 'combatTerms', name: 'Combat Rule', pluralName: 'Combat Rules and Terms' },
            { key: 'terms', name: 'Game Rule', pluralName: 'Game Rules and Terms' },
            { key: 'weaponTraits', name: 'Weapon Trait', pluralName: 'Weapon Traits' },
            { key: 'armorTraits', name: 'Armor Trait', pluralName: 'Armor Traits' },
            { key: 'keywords', name: 'Keyword', pluralName: 'Keywords' },
            { key: 'psychicPowers', name: 'Psychic Power', pluralName: 'Psychic Powers' }
        ];

        for (const cat of categories) {
            const categoryData = Glossary.data[cat.key];
            if (categoryData) {
                for (const [id, entry] of Object.entries(categoryData)) {
                    this.allEntries.push({
                        id: id,
                        name: entry.name,
                        description: entry.description,
                        category: cat.key,
                        categoryName: cat.name,
                        categoryPluralName: cat.pluralName
                    });
                }
            }
        }

        // Sort alphabetically
        this.allEntries.sort((a, b) => a.name.localeCompare(b.name));

        this.renderEntries();
    },

    // Filter entries based on search and category
    getFilteredEntries() {
        return this.allEntries.filter(entry => {
            // Category filter
            if (this.currentCategory !== 'all' && entry.category !== this.currentCategory) {
                return false;
            }

            // Search filter
            if (this.searchQuery) {
                const searchable = `${entry.name} ${entry.description}`.toLowerCase();
                if (!searchable.includes(this.searchQuery)) {
                    return false;
                }
            }

            return true;
        });
    },

    // Render the glossary entries
    renderEntries() {
        const container = document.getElementById('glossary-content');
        const entries = this.getFilteredEntries();

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="glossary-empty">
                    <p>No entries found${this.searchQuery ? ` for "${this.searchQuery}"` : ''}.</p>
                </div>
            `;
            return;
        }

        // Group entries by category if showing all
        if (this.currentCategory === 'all') {
            const grouped = this.groupByCategory(entries);
            container.innerHTML = grouped.map(group => `
                <div class="glossary-group">
                    <h3 class="glossary-group-title">${group.categoryPluralName}</h3>
                    <div class="glossary-entries">
                        ${group.entries.map(entry => this.renderEntry(entry)).join('')}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="glossary-entries">
                    ${entries.map(entry => this.renderEntry(entry)).join('')}
                </div>
            `;
        }

        // Add click handlers for expandable entries
        this.bindEntryClicks(container);

        // Enhance descriptions with glossary term popups
        this.enhanceDescriptions(container);
    },

    // Enhance entry descriptions with clickable glossary terms
    enhanceDescriptions(container) {
        if (typeof Glossary !== 'undefined' && Glossary.enhanceElement) {
            const descriptions = container.querySelectorAll('.glossary-entry-description');
            descriptions.forEach(desc => {
                Glossary.enhanceElement(desc);
            });
        }
    },

    // Group entries by category
    groupByCategory(entries) {
        const groups = new Map();
        const categoryOrder = ['characterTerms', 'conditions', 'combatTerms', 'terms', 'weaponTraits', 'armorTraits', 'keywords', 'psychicPowers'];

        for (const entry of entries) {
            if (!groups.has(entry.category)) {
                groups.set(entry.category, {
                    category: entry.category,
                    categoryPluralName: entry.categoryPluralName,
                    entries: []
                });
            }
            groups.get(entry.category).entries.push(entry);
        }

        // Sort groups by predefined order
        return categoryOrder
            .filter(cat => groups.has(cat))
            .map(cat => groups.get(cat));
    },

    // Render a single entry
    renderEntry(entry) {
        return `
            <div class="glossary-entry" data-entry-id="${entry.id}">
                <div class="glossary-entry-header">
                    <span class="glossary-entry-expand">&#9654;</span>
                    <span class="glossary-entry-name">${entry.name}</span>
                    <span class="glossary-entry-category">${entry.categoryName}</span>
                </div>
                <div class="glossary-entry-body hidden">
                    <div class="glossary-entry-description">${entry.description}</div>
                </div>
            </div>
        `;
    },

    // Bind click handlers for expandable entries
    bindEntryClicks(container) {
        container.querySelectorAll('.glossary-entry').forEach(entry => {
            const header = entry.querySelector('.glossary-entry-header');
            const body = entry.querySelector('.glossary-entry-body');
            const expand = entry.querySelector('.glossary-entry-expand');

            header.addEventListener('click', () => {
                const isExpanded = !body.classList.contains('hidden');
                body.classList.toggle('hidden');
                expand.innerHTML = isExpanded ? '&#9654;' : '&#9660;';
                entry.classList.toggle('expanded', !isExpanded);

                // Update URL hash
                const entryId = entry.dataset.entryId;
                if (!isExpanded) {
                    history.replaceState(null, '', '#glossary/' + entryId);
                } else {
                    history.replaceState(null, '', location.pathname + location.search);
                }
            });
        });
    },

    // Navigate to a specific entry by ID (for deep linking)
    navigateToEntry(entryId) {
        // Reset filters so the entry is visible
        this.currentCategory = 'all';
        this.searchQuery = '';
        document.getElementById('glossary-search').value = '';
        document.querySelectorAll('.glossary-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === 'all');
        });

        // Re-render to ensure all entries are in the DOM
        this.renderEntries();

        // Find the target entry element
        const entryEl = document.querySelector(`.glossary-entry[data-entry-id="${entryId}"]`);
        if (!entryEl) return;

        // Expand it
        const body = entryEl.querySelector('.glossary-entry-body');
        const expand = entryEl.querySelector('.glossary-entry-expand');
        body.classList.remove('hidden');
        expand.innerHTML = '&#9660;';
        entryEl.classList.add('expanded');

        // Scroll into view
        entryEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight briefly
        entryEl.classList.add('glossary-entry-highlight');
        setTimeout(() => entryEl.classList.remove('glossary-entry-highlight'), 2000);
    },

    // Refresh the tab
    refresh() {
        // Reload entries in case glossary data changed
        if (this.allEntries.length === 0) {
            this.loadEntries();
        } else {
            this.renderEntries();
        }
    }
};
