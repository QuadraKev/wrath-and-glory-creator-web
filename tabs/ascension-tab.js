// Ascension Tab - Slot-based ascension management

const AscensionTab = {
    init() {
        this.render();
    },

    render() {
        const container = document.getElementById('ascension-content');
        const character = State.getCharacter();
        const startingTier = character.tier || 1;
        const archetypeTier = State.getArchetypeTier();

        // Build list of ascension slots
        const slots = [];

        // Creation ascension slot: if archetype tier < starting tier
        if (archetypeTier < startingTier) {
            slots.push({
                targetTier: startingTier,
                label: `Creation Ascension (to Tier ${startingTier})`,
                isCreation: true
            });
        }

        // Experience ascension slots: tiers above starting tier, up to 5
        for (let t = startingTier + 1; t <= 5; t++) {
            slots.push({
                targetTier: t,
                label: `Ascension to Tier ${t}`,
                isCreation: false
            });
        }

        // Tier 5 starting campaign: no slots available
        if (slots.length === 0) {
            container.innerHTML = '<p class="text-muted">No ascension slots available. Your character is already at the maximum tier (Tier 5).</p>';
            return;
        }

        // Show effective tier summary
        const effectiveTier = State.getEffectiveTier();
        let html = `<div class="ascension-summary">
            <span class="ascension-tier-info">Starting Tier: <strong>${startingTier}</strong></span>
            <span class="ascension-tier-info">Effective Tier: <strong>${effectiveTier}</strong></span>
        </div>`;

        // Render each slot
        for (const slot of slots) {
            html += this.renderSlot(slot, character);
        }

        container.innerHTML = html;
        this.bindEvents(container);
    },

    // Render a single ascension slot
    renderSlot(slot, character) {
        const ascensions = character.ascensions || [];
        const current = ascensions.find(a => a.targetTier === slot.targetTier);
        const currentType = current?.type || 'none';

        let html = `<div class="ascension-slot" data-target-tier="${slot.targetTier}">
            <h3 class="ascension-slot-title">${slot.label}</h3>
            <div class="ascension-type-selector">
                <label class="ascension-radio-label">
                    <input type="radio" name="ascension-type-${slot.targetTier}" value="none" ${currentType === 'none' ? 'checked' : ''}>
                    <span>None</span>
                </label>
                <label class="ascension-radio-label">
                    <input type="radio" name="ascension-type-${slot.targetTier}" value="package" ${currentType === 'package' ? 'checked' : ''}>
                    <span>Ascension Package</span>
                </label>
                <label class="ascension-radio-label">
                    <input type="radio" name="ascension-type-${slot.targetTier}" value="archetype" ${currentType === 'archetype' ? 'checked' : ''}>
                    <span>Archetype Ascension</span>
                </label>
            </div>`;

        if (currentType === 'package') {
            html += this.renderPackageSelector(slot, current, character);
        } else if (currentType === 'archetype') {
            html += this.renderArchetypeSelector(slot, current, character);
        }

        html += `</div>`;
        return html;
    },

    // Render package selection UI for a slot
    renderPackageSelector(slot, current, character) {
        const packages = DataLoader.getAscensionPackages();
        const selectedId = current?.packageId || null;

        let html = '<div class="ascension-options">';

        for (const pkg of packages) {
            if (!State.isSourceEnabled(pkg.source)) continue;

            const isSelected = pkg.id === selectedId;
            const xpCost = pkg.costMultiplier ? pkg.costMultiplier * slot.targetTier : parseInt(pkg.cost) || 0;

            // Check prerequisites
            const prereqResult = this.checkPackagePrereqs(pkg, character);
            const prereqClass = prereqResult.met ? '' : ' ascension-prereq-unmet';

            const card = `
                <div class="card ascension-card${isSelected ? ' selected' : ''}${prereqClass}" data-type="package" data-id="${pkg.id}" data-target-tier="${slot.targetTier}">
                    <div class="card-header">
                        <span class="card-title">${pkg.name}</span>
                        <span class="card-xp">${xpCost} XP</span>
                    </div>
                    ${pkg.influenceModifier ? `<div class="ascension-influence">Influence: ${pkg.influenceModifier > 0 ? '+' : ''}${pkg.influenceModifier}</div>` : ''}
                    ${prereqResult.text ? `<div class="ascension-prereqs${prereqResult.met ? '' : ' unmet'}">${prereqResult.text}</div>` : ''}
                    <div class="card-description">${pkg.description || ''}</div>
                    ${pkg.benefits && pkg.benefits.length > 0 ? `
                        <div class="ascension-benefits">
                            <strong>Benefits:</strong>
                            <ul>${pkg.benefits.map(b => `<li>${b}</li>`).join('')}</ul>
                        </div>
                    ` : ''}
                    ${pkg.keywordsGained && pkg.keywordsGained.length > 0 ? `
                        <div class="ascension-keywords">Keywords Gained: ${pkg.keywordsGained.join(', ')}</div>
                    ` : ''}
                </div>
            `;

            html += card;
        }

        html += '</div>';
        return html;
    },

    // Render archetype selection UI for a slot
    renderArchetypeSelector(slot, current, character) {
        const allArchetypes = DataLoader.getAllArchetypes();
        const selectedId = current?.archetypeId || null;

        // Get archetypes at the target tier from compatible factions
        const characterKeywords = State.getKeywords();
        const archetype = DataLoader.getArchetype(character.archetype?.id);
        const characterFaction = archetype?.faction || null;

        // Filter: must be at target tier, from enabled sources
        const eligible = allArchetypes.filter(a => {
            if (a.tier !== slot.targetTier) return false;
            if (!State.isSourceEnabled(a.source)) return false;
            // Check species compatibility
            if (a.species && a.species.length > 0) {
                const species = DataLoader.getSpecies(character.species?.id);
                if (species) {
                    const speciesName = species.name?.toLowerCase();
                    const speciesMatch = a.species.some(s => s.toLowerCase() === speciesName);
                    if (!speciesMatch) return false;
                }
            }
            return true;
        });

        if (eligible.length === 0) {
            return '<div class="ascension-options"><p class="text-muted">No eligible archetypes found at this tier for your species. Archetype Ascension requires a higher-tier archetype compatible with your species.</p></div>';
        }

        // Group by faction
        const factionGroups = {};
        for (const a of eligible) {
            const faction = a.faction || 'Other';
            if (!factionGroups[faction]) factionGroups[faction] = [];
            factionGroups[faction].push(a);
        }

        // Sort factions, putting character's faction first
        const sortedFactions = Object.keys(factionGroups).sort((a, b) => {
            if (a === characterFaction) return -1;
            if (b === characterFaction) return 1;
            return a.localeCompare(b);
        });

        let html = '<div class="ascension-options">';
        html += '<p class="ascension-note">Archetype Ascension: You gain the archetype\'s abilities, wargear options, and influence modifier, but NOT attribute or skill bonuses. Requires Rank 3+. No XP cost.</p>';

        const rankMet = (character.rank || 1) >= 3;
        if (!rankMet) {
            html += '<p class="ascension-prereqs unmet">Requires Rank 3 or higher</p>';
        }

        for (const faction of sortedFactions) {
            const archetypes = factionGroups[faction];
            const isSameFaction = faction === characterFaction;

            html += `<h4 class="ascension-faction-header${isSameFaction ? ' same-faction' : ''}">${faction}${isSameFaction ? ' (Your Faction)' : ''}</h4>`;

            for (const a of archetypes) {
                const isSelected = a.id === selectedId;

                const abilities = (a.abilities || []).map(ab => ab.name).join(', ');

                const card = `
                    <div class="card ascension-card${isSelected ? ' selected' : ''}${!rankMet ? ' ascension-prereq-unmet' : ''}" data-type="archetype" data-id="${a.id}" data-target-tier="${slot.targetTier}">
                        <div class="card-header">
                            <span class="card-title">${a.name}</span>
                            <span class="card-xp">0 XP</span>
                        </div>
                        <div class="ascension-archetype-info">
                            <span>Tier ${a.tier} ${a.faction}</span>
                            ${a.influenceModifier ? ` | <span>Influence: ${a.influenceModifier > 0 ? '+' : ''}${a.influenceModifier}</span>` : ''}
                        </div>
                        <div class="card-description">${a.description || ''}</div>
                        ${abilities ? `<div class="ascension-benefits"><strong>Abilities:</strong> ${abilities}</div>` : ''}
                    </div>
                `;

                html += card;
            }
        }

        html += '</div>';
        return html;
    },

    // Check package prerequisites against character
    checkPackagePrereqs(pkg, character) {
        const prereqs = pkg.prerequisites;
        if (!prereqs || Object.keys(prereqs).length === 0) {
            return { met: true, text: '' };
        }

        const parts = [];
        let allMet = true;

        // Attribute prerequisites
        if (prereqs.attributes) {
            for (const [attr, val] of Object.entries(prereqs.attributes)) {
                const current = character.attributes?.[attr] || 1;
                const met = current >= val;
                if (!met) allMet = false;
                const attrName = DerivedStats.formatAttributeName(attr);
                parts.push(`${attrName} ${val}${met ? '' : ` (have ${current})`}`);
            }
        }

        // Skill prerequisites
        if (prereqs.skills) {
            if (prereqs.skillRequirement) {
                // Custom skill requirement text (e.g., "Ballistic Skill 5 or Weapon Skill 5")
                parts.push(prereqs.skillRequirement);
                // Check if at least one skill meets the requirement for OR-style
                if (prereqs.skillRequirement.includes(' or ')) {
                    const anyMet = Object.entries(prereqs.skills).some(([skill, val]) => {
                        const skillKey = skill.replace(/_/g, '').replace(/\s+/g, '');
                        const current = this.getSkillValue(character, skill);
                        return current >= val;
                    });
                    if (!anyMet) allMet = false;
                } else {
                    for (const [skill, val] of Object.entries(prereqs.skills)) {
                        const current = this.getSkillValue(character, skill);
                        if (current < val) allMet = false;
                    }
                }
            } else {
                for (const [skill, val] of Object.entries(prereqs.skills)) {
                    const current = this.getSkillValue(character, skill);
                    const met = current >= val;
                    if (!met) allMet = false;
                    const skillName = this.formatSkillKey(skill);
                    parts.push(`${skillName} ${val}${met ? '' : ` (have ${current})`}`);
                }
            }
        }

        // Keyword prerequisites
        if (prereqs.keywords && prereqs.keywords.length > 0) {
            const charKeywords = State.getKeywords();
            if (prereqs.keywordRequirement) {
                parts.push(prereqs.keywordRequirement);
                // OR logic
                const anyMet = prereqs.keywords.some(k => charKeywords.includes(k));
                if (!anyMet) allMet = false;
            } else {
                // AND logic - need all
                for (const kw of prereqs.keywords) {
                    const met = charKeywords.includes(kw);
                    if (!met) allMet = false;
                    parts.push(`${kw}${met ? '' : ' (missing)'}`);
                }
            }
        }

        // Species prerequisites
        if (prereqs.species && prereqs.species.length > 0) {
            const species = DataLoader.getSpecies(character.species?.id);
            const speciesName = species?.name || '';
            const met = prereqs.species.some(s => s.toLowerCase() === speciesName.toLowerCase());
            if (!met) allMet = false;
            parts.push(`Species: ${prereqs.species.join(' or ')}${met ? '' : ' (not matched)'}`);
        }

        // Story prerequisites
        if (prereqs.story) {
            parts.push(prereqs.story);
        }

        // Other prerequisites
        if (prereqs.other) {
            parts.push(prereqs.other);
        }

        return {
            met: allMet,
            text: parts.length > 0 ? `Prerequisites: ${parts.join(', ')}` : ''
        };
    },

    // Get skill value from character, handling snake_case skill keys from data
    getSkillValue(character, skillKey) {
        // Convert snake_case to camelCase
        const camelKey = skillKey.replace(/_([a-z])/g, (m, c) => c.toUpperCase());
        return character.skills?.[camelKey] || 0;
    },

    // Format snake_case skill key for display
    formatSkillKey(skillKey) {
        return skillKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    },

    // Bind click events for cards and radio buttons
    bindEvents(container) {
        // Radio button type selectors
        container.querySelectorAll('input[type="radio"][name^="ascension-type-"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const targetTier = parseInt(e.target.name.replace('ascension-type-', ''));
                const type = e.target.value;

                if (type === 'none') {
                    State.setAscension(targetTier, null);
                } else if (type === 'package') {
                    // Set type but no selection yet
                    State.setAscension(targetTier, { type: 'package', packageId: null, archetypeId: null });
                } else if (type === 'archetype') {
                    State.setAscension(targetTier, { type: 'archetype', packageId: null, archetypeId: null });
                }
                this.render();
            });
        });

        // Card clicks for selecting specific package/archetype
        container.querySelectorAll('.ascension-card').forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                const id = card.dataset.id;
                const targetTier = parseInt(card.dataset.targetTier);

                if (type === 'package') {
                    // Toggle: if already selected, deselect (keep type as package but clear selection)
                    const current = (State.getCharacter().ascensions || []).find(a => a.targetTier === targetTier);
                    if (current?.packageId === id) {
                        State.setAscension(targetTier, { type: 'package', packageId: null, archetypeId: null });
                    } else {
                        State.setAscension(targetTier, { type: 'package', packageId: id, archetypeId: null });
                    }
                } else if (type === 'archetype') {
                    const current = (State.getCharacter().ascensions || []).find(a => a.targetTier === targetTier);
                    if (current?.archetypeId === id) {
                        State.setAscension(targetTier, { type: 'archetype', packageId: null, archetypeId: null });
                    } else {
                        State.setAscension(targetTier, { type: 'archetype', packageId: null, archetypeId: id });
                    }
                }
                this.render();
            });
        });
    },

    refresh() {
        this.render();
    }
};
