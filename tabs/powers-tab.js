// Powers Tab - Psychic powers management

const PowersTab = {
    currentDiscipline: 'minor',
    searchQuery: '',

    init() {
        // Discipline tabs
        document.querySelectorAll('.discipline-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDiscipline = btn.dataset.discipline;
                document.querySelectorAll('.discipline-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderTable();
            });
        });

        // Search input
        document.getElementById('power-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTable();
        });

        this.render();
    },

    render() {
        const character = State.getCharacter();

        // Check if character is a psyker
        if (!State.isPsyker()) {
            document.getElementById('section-powers').innerHTML = `
                <h2>Manage Powers</h2>
                <div class="info-box" style="padding: 20px; background: var(--bg-card); border-radius: var(--radius-md); text-align: center;">
                    <p style="font-size: 16px; margin-bottom: 10px;">Your character does not have psychic abilities.</p>
                    <p class="text-muted">To access psychic powers, your character needs the PSYKER keyword. This can be obtained through certain archetypes (like Sanctioned Psyker) or by purchasing the Psychic Mastery skill.</p>
                </div>
            `;
            return;
        }

        // Restore full UI
        document.getElementById('section-powers').innerHTML = `
            <h2>Manage Powers</h2>

            <div id="selected-powers" class="selected-powers"></div>

            <div class="discipline-tabs">
                <button class="discipline-btn ${this.currentDiscipline === 'minor' ? 'active' : ''}" data-discipline="minor">Minor</button>
                <button class="discipline-btn ${this.currentDiscipline === 'universal' ? 'active' : ''}" data-discipline="universal">Universal</button>
                <button class="discipline-btn ${this.currentDiscipline === 'biomancy' ? 'active' : ''}" data-discipline="biomancy">Biomancy</button>
                <button class="discipline-btn ${this.currentDiscipline === 'divination' ? 'active' : ''}" data-discipline="divination">Divination</button>
                <button class="discipline-btn ${this.currentDiscipline === 'pyromancy' ? 'active' : ''}" data-discipline="pyromancy">Pyromancy</button>
                <button class="discipline-btn ${this.currentDiscipline === 'telekinesis' ? 'active' : ''}" data-discipline="telekinesis">Telekinesis</button>
                <button class="discipline-btn ${this.currentDiscipline === 'telepathy' ? 'active' : ''}" data-discipline="telepathy">Telepathy</button>
                <button class="discipline-btn ${this.currentDiscipline === 'maleficarum' ? 'active' : ''}" data-discipline="maleficarum">Maleficarum</button>
                <button class="discipline-btn ${this.currentDiscipline === 'runes of battle' ? 'active' : ''}" data-discipline="runes of battle">Runes of Battle</button>
                <button class="discipline-btn ${this.currentDiscipline === 'runes of fate' ? 'active' : ''}" data-discipline="runes of fate">Runes of Fate</button>
                <button class="discipline-btn ${this.currentDiscipline === 'runes of fortune' ? 'active' : ''}" data-discipline="runes of fortune">Runes of Fortune</button>
                <button class="discipline-btn ${this.currentDiscipline === 'bonesinging' ? 'active' : ''}" data-discipline="bonesinging">Bonesinging</button>
                <button class="discipline-btn ${this.currentDiscipline === 'phantasmancy' ? 'active' : ''}" data-discipline="phantasmancy">Phantasmancy</button>
            </div>

            <div class="powers-controls">
                <input type="text" id="power-search" placeholder="Search" value="${this.searchQuery}">
            </div>

            <div id="powers-table" class="powers-table"></div>
        `;

        // Re-attach event listeners
        document.querySelectorAll('.discipline-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.currentDiscipline = btn.dataset.discipline;
                document.querySelectorAll('.discipline-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderTable();
            });
        });

        document.getElementById('power-search').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTable();
        });

        this.renderSelected();
        this.renderTable();
    },

    renderSelected() {
        const container = document.getElementById('selected-powers');
        const character = State.getCharacter();

        if (!container) return;

        if (character.psychicPowers.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '';

        for (const powerId of character.psychicPowers) {
            const power = DataLoader.getPsychicPower(powerId);
            if (!power) continue;

            const chip = document.createElement('span');
            chip.className = 'power-chip';
            chip.innerHTML = `
                ${power.name}
                <span class="power-chip-remove" data-id="${powerId}">&times;</span>
            `;

            chip.querySelector('.power-chip-remove').addEventListener('click', () => {
                State.removePower(powerId);
                this.render();
            });

            container.appendChild(chip);
        }
    },

    renderTable() {
        const container = document.getElementById('powers-table');
        const character = State.getCharacter();
        const allPowers = DataLoader.getAllPsychicPowers();

        if (!container) return;

        if (!allPowers || allPowers.length === 0) {
            container.innerHTML = '<p class="text-muted" style="padding: 20px;">No psychic power data loaded.</p>';
            return;
        }

        // Filter powers
        const powers = allPowers.filter(p => {
            // Check source
            if (!State.isSourceEnabled(p.source)) return false;

            // Check if already owned
            if (character.psychicPowers.includes(p.id)) return false;

            // Check discipline (case-insensitive)
            if (p.discipline.toLowerCase() !== this.currentDiscipline.toLowerCase()) return false;

            // Check search query
            if (this.searchQuery) {
                const searchable = `${p.name} ${p.effect}`.toLowerCase();
                if (!searchable.includes(this.searchQuery)) return false;
            }

            return true;
        });

        // Sort by name
        powers.sort((a, b) => a.name.localeCompare(b.name));

        container.innerHTML = `
            <div class="powers-table-header">
                <span>Name</span>
                <span>DN</span>
                <span>Cost</span>
                <span>Effect</span>
                <span>Learn</span>
            </div>
        `;

        for (const power of powers) {
            const prereqCheck = PrerequisiteChecker.checkPowerPrerequisites(power, character);
            const canAfford = XPCalculator.canAfford(character, power.cost || 0);
            const canAdd = prereqCheck.met && canAfford;

            const row = document.createElement('div');
            row.className = 'power-row';
            row.innerHTML = `
                <span class="power-name">${power.name}</span>
                <span class="power-dn">${power.dn || '-'}</span>
                <span class="power-cost">${power.cost || 0}</span>
                <span class="power-effect">${power.effect || ''}</span>
                <button class="btn-add" data-id="${power.id}" ${!canAdd ? 'disabled' : ''}>ADD</button>
            `;

            row.querySelector('.btn-add').addEventListener('click', () => {
                if (State.addPower(power.id)) {
                    this.render();
                }
            });

            // Enhance power effects with glossary terms
            Glossary.enhanceElement(row.querySelector('.power-effect'));

            container.appendChild(row);
        }

        if (powers.length === 0) {
            container.innerHTML += '<p class="text-muted" style="padding: 20px;">No powers available in this discipline.</p>';
        }
    },

    formatDiscipline(discipline) {
        const names = {
            'minor': 'Minor',
            'universal': 'Universal',
            'biomancy': 'Biomancy',
            'divination': 'Divination',
            'pyromancy': 'Pyromancy',
            'telekinesis': 'Telekinesis',
            'telepathy': 'Telepathy',
            'maleficarum': 'Maleficarum',
            'runes of battle': 'Runes of Battle',
            'runes of fate': 'Runes of Fate',
            'runes of fortune': 'Runes of Fortune',
            'bonesinging': 'Bonesinging',
            'phantasmancy': 'Phantasmancy'
        };
        const key = discipline ? discipline.toLowerCase() : '';
        return names[key] || discipline;
    },

    refresh() {
        this.render();
    }
};
