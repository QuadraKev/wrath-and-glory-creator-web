// Setting Tab - Character name, tier, rank, and source book selection

const SettingTab = {
    init() {
        // Character name input
        document.getElementById('character-name').addEventListener('input', (e) => {
            State.setName(e.target.value);
        });

        // Additional XP input
        document.getElementById('additional-xp').addEventListener('change', (e) => {
            State.setAdditionalXP(e.target.value);
        });

        // Rank input
        document.getElementById('character-rank').addEventListener('change', (e) => {
            State.setRank(e.target.value);
        });

        // Tier select
        document.getElementById('tier-select').addEventListener('change', (e) => {
            State.setTier(e.target.value);
        });

        // Setting description
        document.getElementById('setting-desc').addEventListener('input', (e) => {
            State.setSetting(e.target.value);
        });

        // Source book checkboxes
        this.initSourceBooks();
    },

    initSourceBooks() {
        const sourceMap = {
            'source-core': 'core',
            'source-forsaken': 'fspg',
            'source-redacted1': 'redacted1',
            'source-redacted2': 'redacted2',
            'source-church': 'church',
            'source-vow': 'voa',
            'source-aeldari': 'aeldari',
            'source-apocrypha': 'apocrypha',
            'source-dh': 'dh',
            'source-shotguns': 'shotguns'
        };

        for (const [elementId, sourceId] of Object.entries(sourceMap)) {
            const checkbox = document.getElementById(elementId);
            if (checkbox && !checkbox.disabled) {
                checkbox.addEventListener('change', () => {
                    this.updateEnabledSources();
                });
            }
        }
    },

    updateEnabledSources() {
        const sources = ['core']; // Core is always enabled

        const sourceMap = {
            'source-forsaken': 'fspg',
            'source-redacted1': 'redacted1',
            'source-redacted2': 'redacted2',
            'source-church': 'church',
            'source-vow': 'voa',
            'source-aeldari': 'aeldari',
            'source-apocrypha': 'apocrypha',
            'source-dh': 'dh',
            'source-shotguns': 'shotguns'
        };

        for (const [elementId, sourceId] of Object.entries(sourceMap)) {
            const checkbox = document.getElementById(elementId);
            if (checkbox && checkbox.checked) {
                sources.push(sourceId);
            }
        }

        State.setEnabledSources(sources);
    },

    refresh() {
        const character = State.getCharacter();

        // Update form values
        document.getElementById('character-name').value = character.name || '';
        document.getElementById('additional-xp').value = character.additionalXp || 0;
        document.getElementById('character-rank').value = character.rank || 1;
        document.getElementById('tier-select').value = character.tier || 1;
        document.getElementById('setting-desc').value = character.setting || '';

        // Update source book checkboxes
        const sources = State.enabledSources;
        const sourceMap = {
            'source-forsaken': 'fspg',
            'source-redacted1': 'redacted1',
            'source-redacted2': 'redacted2',
            'source-church': 'church',
            'source-vow': 'voa',
            'source-aeldari': 'aeldari',
            'source-apocrypha': 'apocrypha',
            'source-dh': 'dh',
            'source-shotguns': 'shotguns'
        };

        for (const [elementId, sourceId] of Object.entries(sourceMap)) {
            const checkbox = document.getElementById(elementId);
            if (checkbox) {
                checkbox.checked = sources.includes(sourceId);
            }
        }
    }
};
