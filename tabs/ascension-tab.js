// Ascension Tab - Ascension package selection

const AscensionTab = {
    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('ascension-list');
        const packages = DataLoader.getAscensionPackages();
        const character = State.getCharacter();

        if (!packages || packages.length === 0) {
            container.innerHTML = '<p class="text-muted">No ascension packages available. Ascension packages will be added in future updates.</p>';
            return;
        }

        container.innerHTML = '';

        for (const pkg of packages) {
            if (!State.isSourceEnabled(pkg.source)) continue;

            const isSelected = character.ascensionPackages.includes(pkg.id);

            const card = document.createElement('div');
            card.className = `card ${isSelected ? 'selected' : ''}`;
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${pkg.name}</span>
                    <span class="card-xp">${pkg.cost || 0} XP</span>
                </div>
                <div class="card-description">${pkg.description || ''}</div>
            `;

            card.addEventListener('click', () => {
                if (isSelected) {
                    State.removeAscensionPackage(pkg.id);
                } else {
                    State.addAscensionPackage(pkg.id);
                }
                this.render();
            });

            container.appendChild(card);
        }
    },

    refresh() {
        this.render();
    }
};
