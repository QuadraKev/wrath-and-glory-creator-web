// Powers Tab - Psychic powers management

const PowersTab = {
    currentDiscipline: 'minor',
    searchQuery: '',

    init() {
        this.render();
    },

    // Get all disciplines from the data, sorted alphabetically with Minor and Universal first
    getDisciplines() {
        const allPowers = DataLoader.getAllPsychicPowers();
        const disciplineSet = new Set();
        for (const p of allPowers) {
            if (p.discipline && State.isSourceEnabled(p.source)) {
                disciplineSet.add(p.discipline);
            }
        }

        const disciplines = Array.from(disciplineSet);

        // Sort alphabetically, but pin Minor and Universal to the front
        const pinned = ['Minor', 'Universal'];
        disciplines.sort((a, b) => {
            const aPin = pinned.indexOf(a);
            const bPin = pinned.indexOf(b);
            if (aPin !== -1 && bPin !== -1) return aPin - bPin;
            if (aPin !== -1) return -1;
            if (bPin !== -1) return 1;
            return a.localeCompare(b);
        });

        return disciplines;
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

        // Build discipline tabs dynamically from data
        const disciplines = this.getDisciplines();

        // If current discipline no longer exists in the filtered list, reset to first
        if (!disciplines.some(d => d.toLowerCase() === this.currentDiscipline.toLowerCase())) {
            this.currentDiscipline = disciplines.length > 0 ? disciplines[0].toLowerCase() : 'minor';
        }

        const disciplineButtons = disciplines.map(d => {
            const key = d.toLowerCase();
            const isActive = key === this.currentDiscipline.toLowerCase();
            return `<button class="discipline-btn ${isActive ? 'active' : ''}" data-discipline="${key}">${d}</button>`;
        }).join('\n                ');

        // Restore full UI
        document.getElementById('section-powers').innerHTML = `
            <h2>Manage Powers</h2>

            <div id="selected-powers" class="selected-powers"></div>

            <div class="discipline-tabs">
                ${disciplineButtons}
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
        if (!discipline) return '';
        // Look up the original casing from the data
        const allPowers = DataLoader.getAllPsychicPowers();
        const match = allPowers.find(p => p.discipline && p.discipline.toLowerCase() === discipline.toLowerCase());
        return match ? match.discipline : discipline;
    },

    refresh() {
        this.render();
    }
};
