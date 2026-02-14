// Character Sheet Tab - Renders a comprehensive character summary

const CharacterSheetTab = {
    // Initialize the tab
    init() {
        // Print button
        document.getElementById('btn-print').addEventListener('click', () => {
            this.print();
        });

        // Export PDF button
        document.getElementById('btn-export-pdf').addEventListener('click', () => {
            this.exportPDF();
        });
    },

    // Refresh the character sheet
    refresh() {
        this.render();
    },

    // Render the full character sheet
    render() {
        const character = State.getCharacter();

        // Repair any background selections missing bonusType
        this.repairBackgroundBonusTypes(character);

        const species = DataLoader.getSpecies(character.species?.id);
        const archetype = DataLoader.getArchetype(character.archetype?.id);
        const keywords = State.getKeywords();
        const armorRating = DerivedStats.getTotalArmorRating(character);
        const derivedStats = DerivedStats.getAllDerivedStats(character, armorRating);

        const container = document.getElementById('character-sheet-content');

        container.innerHTML = `
            ${this.renderHeader(character, species, archetype, keywords)}
            <div class="sheet-columns">
                <div class="sheet-column">
                    ${this.renderAttributes(character)}
                    ${this.renderTraits(derivedStats)}
                </div>
                <div class="sheet-column">
                    ${this.renderSkills(character)}
                </div>
            </div>
            ${this.renderWeapons(character)}
            ${this.renderArmor(character)}
            ${this.renderEquipment(character)}
            ${this.renderSpeciesAbilities(character, species)}
            ${this.renderArchetypeAbilities(archetype)}
            ${this.renderTalents(character)}
            ${this.renderPsychicPowers(character)}
            ${this.renderBackground(character)}
            ${this.renderNotes(character)}
        `;

        // Apply glossary enhancement to the character sheet
        this.enhanceWithGlossary(container);

        // Bind weapon equip checkboxes
        this.bindWeaponEquipCheckboxes(container);

        // Bind tap-to-show tooltip for stat cells (Dice, Damage, ED, AP)
        this.bindStatTooltips(container);

        // Bind session tracking controls
        this.bindSessionTrackingControls(container);
    },

    // Bind event handlers for session tracking (boxes and +/- buttons)
    bindSessionTrackingControls(container) {
        // Clickable boxes for wounds and shock
        container.querySelectorAll('.tracking-box').forEach(box => {
            box.addEventListener('click', () => {
                const type = box.dataset.type;
                const index = parseInt(box.dataset.index, 10);
                const isFilled = box.classList.contains('filled');

                // Clicking a filled box clears it and all after it
                // Clicking an empty box fills it and all before it
                if (type === 'wounds') {
                    if (isFilled) {
                        State.setCurrentWounds(index);
                    } else {
                        State.setCurrentWounds(index + 1);
                    }
                } else if (type === 'shock') {
                    if (isFilled) {
                        State.setCurrentShock(index);
                    } else {
                        State.setCurrentShock(index + 1);
                    }
                }

                this.render();
            });
        });

        // Plus/minus buttons for wealth, wrath, and faith
        container.querySelectorAll('.tracker-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const isPlus = btn.classList.contains('tracker-plus');
                const delta = isPlus ? 1 : -1;

                if (type === 'wealth') {
                    State.modifyCurrentWealth(delta);
                } else if (type === 'wrath') {
                    State.modifyCurrentWrath(delta);
                } else if (type === 'faith') {
                    State.modifyCurrentFaith(delta);
                }

                this.render();
            });
        });
    },

    // Bind event handlers for weapon equip checkboxes
    bindWeaponEquipCheckboxes(container) {
        const checkboxes = container.querySelectorAll('.weapon-equip-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const wargearIndex = parseInt(e.target.dataset.wargearIndex, 10);
                State.toggleWeaponEquipped(wargearIndex);
                // Re-render to update damage calculations
                this.render();
            });
        });
    },

    // Enhance the character sheet with glossary functionality
    enhanceWithGlossary(container) {
        if (typeof Glossary !== 'undefined' && Glossary.data) {
            // Process trait cells
            const traitCells = container.querySelectorAll('.sheet-traits-cell');
            traitCells.forEach(cell => {
                Glossary.enhanceElement(cell);
            });

            // Process ability EFFECT text only (not flavor text or descriptions)
            const effectDescriptions = container.querySelectorAll('.sheet-ability-effect, .sheet-talent-effect, .sheet-power-desc');
            effectDescriptions.forEach(desc => {
                Glossary.enhanceElement(desc);
            });

            // Process keywords in header
            const headerKeywords = container.querySelectorAll('.sheet-keyword');
            headerKeywords.forEach(kw => {
                Glossary.enhanceElement(kw);
            });

            // Process mini keywords in tables and item details
            const miniKeywords = container.querySelectorAll('.sheet-mini-keyword');
            miniKeywords.forEach(kw => {
                Glossary.enhanceElement(kw);
            });

            // Process equipment effects only (not descriptions - those are flavor)
            const equipEffects = container.querySelectorAll('.sheet-equip-effect');
            equipEffects.forEach(eff => {
                Glossary.enhanceElement(eff);
            });

            // NOTE: .sheet-item-description is intentionally NOT processed - these are flavor text
        }
    },

    // Render the header section
    renderHeader(character, species, archetype, keywords) {
        const name = character.name || 'Unnamed Character';
        let speciesName = species?.name || '-';

        // Add chapter/path info to species name if applicable
        if (species?.subOptions && character.species?.subOptions) {
            const subOptionsConfig = Array.isArray(species.subOptions) ? species.subOptions : [species.subOptions];
            const subOptionNames = [];

            for (const config of subOptionsConfig) {
                // Only add chapter or single-select options to the header
                if (!config.countByTier) {
                    const selected = character.species.subOptions.find(opt => opt.type === config.type);
                    if (selected) {
                        const option = config.options?.find(o => o.id === selected.optionId);
                        if (option) {
                            subOptionNames.push(option.name);
                        }
                    }
                }
            }

            if (subOptionNames.length > 0) {
                speciesName = `${speciesName} (${subOptionNames.join(', ')})`;
            }
        }

        const archetypeName = character.archetype?.id === 'custom'
            ? (character.customArchetype?.name || 'Custom Archetype')
            : (archetype?.name || '-');
        const tier = character.tier || 1;
        const rank = character.rank || 1;

        const keywordHtml = keywords.length > 0
            ? keywords.map(k => `<span class="sheet-keyword">${k}</span>`).join('')
            : '<span class="sheet-keyword">-</span>';

        return `
            <div class="sheet-section sheet-header-section">
                <h1 class="sheet-character-name">${this.escapeHtml(name)}</h1>
                <div class="sheet-subtitle">
                    ${speciesName} &bull; ${archetypeName} &bull; Tier ${tier} &bull; Rank ${rank}
                </div>
                <div class="sheet-keywords">
                    ${keywordHtml}
                </div>
            </div>
        `;
    },

    // Render traits (formerly derived stats) in compact 2-column grid
    renderTraits(stats) {
        // Get current session values (wounds/shock count UP from 0)
        const currentWounds = State.getCurrentWounds();
        const currentShock = State.getCurrentShock();
        const currentWealth = State.getCurrentWealth();

        // Static traits (non-editable)
        const staticTraits = [
            { name: 'Defence', value: stats.defence },
            { name: 'Resilience', value: stats.resilience },
            { name: 'Determination', value: stats.determination },
            { name: 'Speed', value: stats.speed },
            { name: 'Conviction', value: stats.conviction },
            { name: 'Resolve', value: stats.resolve },
            { name: 'Pass. Aware.', value: stats.passiveAwareness },
            { name: 'Influence', value: stats.influence }
        ];

        const staticItems = staticTraits.map(stat => `
            <div class="sheet-compact-item">
                <span class="sheet-compact-name">${stat.name}</span>
                <span class="sheet-compact-value">${stat.value}</span>
            </div>
        `).join('');

        // Generate wound boxes
        const woundBoxes = this.renderTrackingBoxes('wounds', currentWounds, stats.maxWounds);

        // Generate shock boxes
        const shockBoxes = this.renderTrackingBoxes('shock', currentShock, stats.maxShock);

        // Get Wrath and Faith values
        const currentWrath = State.getCurrentWrath();
        const currentFaith = State.getCurrentFaith();
        const maxFaith = State.getMaxFaith();

        // Wrath tracker (always shown)
        const wrathTracker = `
            <div class="tracker-column">
                <span class="tracker-label">Wrath</span>
                <div class="tracker-controls">
                    <button class="tracker-btn tracker-minus" data-type="wrath">−</button>
                    <span class="tracker-value">${currentWrath}</span>
                    <button class="tracker-btn tracker-plus" data-type="wrath">+</button>
                </div>
            </div>
        `;

        // Faith tracker (only shown if character has Faith)
        const faithTracker = maxFaith > 0 ? `
            <div class="tracker-column">
                <span class="tracker-label">Faith</span>
                <div class="tracker-controls">
                    <button class="tracker-btn tracker-minus" data-type="faith">−</button>
                    <span class="tracker-value">${currentFaith}</span>
                    <button class="tracker-btn tracker-plus" data-type="faith">+</button>
                </div>
            </div>
        ` : '';

        // Wealth tracker
        const wealthTracker = `
            <div class="tracker-column">
                <span class="tracker-label">Wealth</span>
                <div class="tracker-controls">
                    <button class="tracker-btn tracker-minus" data-type="wealth">−</button>
                    <span class="tracker-value">${currentWealth}</span>
                    <button class="tracker-btn tracker-plus" data-type="wealth">+</button>
                </div>
            </div>
        `;

        return `
            <div class="sheet-section sheet-derived-section">
                <h2 class="sheet-section-title">Traits</h2>
                <div class="sheet-compact-grid sheet-traits-grid">
                    ${staticItems}
                </div>
                <div class="sheet-tracking-section">
                    <div class="tracker-row">
                        <span class="tracker-label">Wounds</span>
                        <div class="tracking-boxes">${woundBoxes}</div>
                    </div>
                    <div class="tracker-row">
                        <span class="tracker-label">Shock</span>
                        <div class="tracking-boxes">${shockBoxes}</div>
                    </div>
                    <div class="tracker-row-horizontal">
                        ${wrathTracker}
                        ${faithTracker}
                        ${wealthTracker}
                    </div>
                </div>
            </div>
        `;
    },

    // Render clickable tracking boxes for wounds/shock
    renderTrackingBoxes(type, current, max) {
        let boxes = '';
        for (let i = 0; i < max; i++) {
            const filled = i < current ? 'filled' : '';
            boxes += `<span class="tracking-box ${filled}" data-type="${type}" data-index="${i}"></span>`;
        }
        return boxes;
    },

    // Render attributes in compact 2-column grid
    renderAttributes(character) {
        const attributes = [
            { key: 'strength', name: 'Strength', abbrev: 'STR' },
            { key: 'toughness', name: 'Toughness', abbrev: 'TOU' },
            { key: 'agility', name: 'Agility', abbrev: 'AGI' },
            { key: 'initiative', name: 'Initiative', abbrev: 'INI' },
            { key: 'willpower', name: 'Willpower', abbrev: 'WIL' },
            { key: 'intellect', name: 'Intellect', abbrev: 'INT' },
            { key: 'fellowship', name: 'Fellowship', abbrev: 'FEL' }
        ];

        const items = attributes.map(attr => {
            const value = character.attributes?.[attr.key] || 1;
            return `
                <div class="sheet-compact-item">
                    <span class="sheet-compact-name">${attr.name}</span>
                    <span class="sheet-compact-value">${value}</span>
                    <span class="sheet-compact-abbrev">[${attr.abbrev}]</span>
                </div>
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Attributes</h2>
                <div class="sheet-compact-grid sheet-attributes-grid">
                    ${items}
                </div>
            </div>
        `;
    },

    // Render skills
    renderSkills(character) {
        const skills = [
            { key: 'athletics', name: 'Athletics', attr: 'strength' },
            { key: 'awareness', name: 'Awareness', attr: 'intellect' },
            { key: 'ballisticSkill', name: 'Ballistic Skill', attr: 'agility' },
            { key: 'cunning', name: 'Cunning', attr: 'fellowship' },
            { key: 'deception', name: 'Deception', attr: 'fellowship' },
            { key: 'insight', name: 'Insight', attr: 'fellowship' },
            { key: 'intimidation', name: 'Intimidation', attr: 'willpower' },
            { key: 'investigation', name: 'Investigation', attr: 'intellect' },
            { key: 'leadership', name: 'Leadership', attr: 'willpower' },
            { key: 'medicae', name: 'Medicae', attr: 'intellect' },
            { key: 'persuasion', name: 'Persuasion', attr: 'fellowship' },
            { key: 'pilot', name: 'Pilot', attr: 'agility' },
            { key: 'psychicMastery', name: 'Psychic Mastery', attr: 'willpower' },
            { key: 'scholar', name: 'Scholar', attr: 'intellect' },
            { key: 'stealth', name: 'Stealth', attr: 'agility' },
            { key: 'survival', name: 'Survival', attr: 'willpower' },
            { key: 'tech', name: 'Tech', attr: 'intellect' },
            { key: 'weaponSkill', name: 'Weapon Skill', attr: 'initiative' }
        ];

        const attrAbbrevs = {
            strength: 'STR',
            toughness: 'TOU',
            agility: 'AGI',
            initiative: 'INI',
            willpower: 'WIL',
            intellect: 'INT',
            fellowship: 'FEL'
        };

        const rows = skills.map(skill => {
            const rating = character.skills?.[skill.key] || 0;
            const attrValue = character.attributes?.[skill.attr] || 1;
            const subOptionBonus = DerivedStats.getSpeciesSubOptionSkillBonus(character, skill.key);
            const total = rating + attrValue + subOptionBonus;
            const abbrev = attrAbbrevs[skill.attr];

            // Show bonus indicator if there's a species sub-option bonus
            const bonusIndicator = subOptionBonus > 0
                ? `<span class="sheet-skill-bonus" title="+${subOptionBonus} from Path">+${subOptionBonus}</span>`
                : '';

            return `
                <tr>
                    <td class="sheet-skill-name">${skill.name}</td>
                    <td class="sheet-skill-rating">${rating}</td>
                    <td class="sheet-skill-attr">${abbrev}</td>
                    <td class="sheet-skill-total">${total}${bonusIndicator}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Skills</h2>
                <table class="sheet-table sheet-skills-table">
                    <thead>
                        <tr>
                            <th>Skill</th>
                            <th>Rating</th>
                            <th>Attr</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Render weapons
    renderWeapons(character) {
        const weapons = [];
        const simultaneousStrike = this.getSimultaneousStrikeInfo(character);
        const equippedWeapons = State.getEquippedWeapons();

        for (let i = 0; i < (character.wargear || []).length; i++) {
            const item = character.wargear[i];
            const weapon = DataLoader.getWeapon(item.id);
            if (weapon) {
                const isEquipped = State.isWeaponEquipped(i);
                const upgrades = item.upgrades || [];
                const upgradeDetails = upgrades.map(id => DataLoader.getWeaponUpgrade(id)).filter(u => u);
                const damageInfo = this.calculateWeaponDamageDetailed(weapon, character, i, simultaneousStrike, equippedWeapons, upgradeDetails);
                const attackDice = this.calculateAttackDice(weapon, character, upgradeDetails);
                weapons.push({
                    ...weapon,
                    wargearIndex: i,
                    isEquipped: isEquipped,
                    calculatedDamage: damageInfo,
                    upgradeDetails: upgradeDetails,
                    attackDice: attackDice
                });
            }
        }

        if (weapons.length === 0) {
            return `
                <div class="sheet-section">
                    <h2 class="sheet-section-title">Weapons</h2>
                    <p class="sheet-empty">No weapons equipped</p>
                </div>
            `;
        }

        // Check if Simultaneous Strike is active
        const hasSimultaneousStrike = simultaneousStrike !== null;
        const rows = weapons.map(weapon => {
            // Combine base traits with upgrade-added traits
            let allTraits = [...(weapon.traits || [])];
            for (const upgrade of weapon.upgradeDetails) {
                if (upgrade.addsTraits) {
                    allTraits = allTraits.concat(upgrade.addsTraits);
                }
                if (upgrade.removesTraits) {
                    allTraits = allTraits.filter(t => !upgrade.removesTraits.includes(t));
                }
            }
            // Filter out "Power Field" - it's a keyword, not a trait
            allTraits = allTraits.filter(t => t.toUpperCase() !== 'POWER FIELD');
            const traits = allTraits.length > 0
                ? `<span class="sheet-traits-cell">${allTraits.join(', ')}</span>`
                : '-';

            const range = weapon.type === 'ranged' && weapon.range
                ? `${weapon.range.short}/${weapon.range.medium}/${weapon.range.long}m`
                : '-';

            // Build upgrade names display
            const upgradeNames = weapon.upgradeDetails.map(u => u.name).join(', ');
            const upgradesDisplay = upgradeNames
                ? `<div class="sheet-weapon-upgrades">${upgradeNames}</div>`
                : '';

            // Only show equip checkbox for compatible weapons when Simultaneous Strike is active
            let equipCell = '';
            if (hasSimultaneousStrike) {
                const isCompatible = this.isWeaponCompatibleWithSimultaneousStrike(weapon, simultaneousStrike);
                if (isCompatible) {
                    const checked = weapon.isEquipped ? 'checked' : '';
                    equipCell = `<td class="sheet-weapon-equip" rowspan="2"><input type="checkbox" class="weapon-equip-checkbox" data-wargear-index="${weapon.wargearIndex}" ${checked}></td>`;
                } else {
                    equipCell = '<td class="sheet-weapon-equip" rowspan="2">-</td>';
                }
            }

            // Build tooltip-enabled cells for Dice, ED, and AP
            const diceTooltip = weapon.attackDice.tooltip ? ` title="${this.escapeHtml(weapon.attackDice.tooltip)}"` : '';
            const edTooltip = weapon.calculatedDamage.edTooltip ? ` title="${this.escapeHtml(weapon.calculatedDamage.edTooltip)}"` : '';
            const apTooltip = weapon.calculatedDamage.apTooltip ? ` title="${this.escapeHtml(weapon.calculatedDamage.apTooltip)}"` : '';
            const damageTooltip = weapon.calculatedDamage.damageTooltip ? ` title="${this.escapeHtml(weapon.calculatedDamage.damageTooltip)}"` : '';

            // Build description and keywords row
            const description = weapon.description || '';
            const keywords = weapon.keywords?.length > 0
                ? weapon.keywords.map(k => `<span class="sheet-mini-keyword">${k}</span>`).join(' ')
                : '';
            const hasDescOrKeywords = description || keywords;
            const colSpan = hasSimultaneousStrike ? 7 : 6;

            const descRow = hasDescOrKeywords ? `
                <tr class="sheet-weapon-desc-row">
                    <td colspan="${colSpan}">
                        <div class="sheet-item-details">
                            ${description ? `<span class="sheet-item-description">${description}</span>` : ''}
                            ${keywords ? `<span class="sheet-item-keywords">${keywords}</span>` : ''}
                        </div>
                    </td>
                </tr>
            ` : '';

            return `
                <tbody class="sheet-weapon-group">
                    <tr>
                        ${equipCell}
                        <td class="sheet-weapon-name" rowspan="2">${weapon.name}${upgradesDisplay}</td>
                        <td class="sheet-weapon-dice" rowspan="2"${diceTooltip}>${weapon.attackDice.display}</td>
                        <td class="sheet-weapon-damage" colspan="2"${damageTooltip}>${weapon.calculatedDamage.display}</td>
                        <td class="sheet-weapon-range" rowspan="2">${range}</td>
                        <td class="sheet-weapon-traits" rowspan="2">${traits}</td>
                    </tr>
                    <tr class="sheet-weapon-sub-row">
                        <td class="sheet-weapon-ap"${apTooltip}>${weapon.calculatedDamage.apDisplay} AP</td>
                        <td class="sheet-weapon-ed"${edTooltip}>${weapon.calculatedDamage.edDisplay} ED</td>
                    </tr>
                    ${descRow}
                </tbody>
            `;
        }).join('');

        const equipHeaderCell = hasSimultaneousStrike ? '<th rowspan="2" class="sheet-weapon-equip-header">In Hand</th>' : '';

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Weapons</h2>
                ${hasSimultaneousStrike ? '<p class="sheet-note">Check "In Hand" for weapons being dual-wielded with Simultaneous Strike</p>' : ''}
                <table class="sheet-table sheet-weapons-table">
                    <thead>
                        <tr>
                            ${equipHeaderCell}
                            <th rowspan="2">Name</th>
                            <th rowspan="2">Dice</th>
                            <th colspan="2">Damage</th>
                            <th rowspan="2">Range</th>
                            <th rowspan="2">Traits</th>
                        </tr>
                        <tr>
                            <th>AP</th>
                            <th>ED</th>
                        </tr>
                    </thead>
                    ${rows}
                </table>
            </div>
        `;
    },

    // Get Simultaneous Strike talent info if character has it
    getSimultaneousStrikeInfo(character) {
        const entry = State.getTalentEntry('simultaneous_strike');
        if (!entry || !entry.choice) return null;
        return {
            skill: entry.choice,
            isMelee: entry.choice === 'Weapon Skill',
            isPistol: entry.choice === 'Ballistic Skill'
        };
    },

    // Check if weapon is compatible with Simultaneous Strike
    isWeaponCompatibleWithSimultaneousStrike(weapon, ssInfo) {
        if (!ssInfo) return false;
        if (ssInfo.isMelee) {
            // One-handed melee weapons (type === 'melee' and not Two-Handed trait)
            return weapon.type === 'melee' && !weapon.traits?.includes('Two-Handed');
        } else if (ssInfo.isPistol) {
            // Pistols
            return weapon.traits?.includes('Pistol');
        }
        return false;
    },

    // Get Trademark Weapon info if character has it
    getTrademarkWeaponInfo(character) {
        const entry = State.getTalentEntry('trademark_weapon');
        if (!entry || entry.choice === undefined || entry.choice === null) return null;

        // Choice is now the wargear index
        const wargearIndex = parseInt(entry.choice, 10);
        if (isNaN(wargearIndex)) {
            // Legacy support: if choice is a weapon name (old format), return null
            // User will need to re-select the trademark weapon
            return null;
        }

        return {
            wargearIndex: wargearIndex,
            bonusED: (character.rank || 1) * 2 // Double Rank ED
        };
    },

    // Render armor with full details
    renderArmor(character) {
        const armors = [];

        for (const item of character.wargear || []) {
            const armor = DataLoader.getArmor(item.id);
            if (armor) {
                armors.push({ ...armor });
            }
        }

        if (armors.length === 0) {
            return `
                <div class="sheet-section">
                    <h2 class="sheet-section-title">Armor</h2>
                    <p class="sheet-empty">No armor equipped</p>
                </div>
            `;
        }

        const rows = armors.map(armor => {
            const traits = armor.traits?.length > 0
                ? `<span class="sheet-traits-cell">${armor.traits.join(', ')}</span>`
                : '-';

            // Build description and keywords row
            const description = armor.description || '';
            const keywords = armor.keywords?.length > 0
                ? armor.keywords.map(k => `<span class="sheet-mini-keyword">${k}</span>`).join(' ')
                : '';
            const hasDescOrKeywords = description || keywords;

            const descRow = hasDescOrKeywords ? `
                <tr class="sheet-armor-desc-row">
                    <td colspan="3">
                        <div class="sheet-item-details">
                            ${description ? `<span class="sheet-item-description">${description}</span>` : ''}
                            ${keywords ? `<span class="sheet-item-keywords">${keywords}</span>` : ''}
                        </div>
                    </td>
                </tr>
            ` : '';

            return `
                <tr>
                    <td class="sheet-armor-name">${armor.name}</td>
                    <td class="sheet-armor-ar">${armor.ar || 0}</td>
                    <td class="sheet-armor-traits">${traits}</td>
                </tr>
                ${descRow}
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Armor</h2>
                <table class="sheet-table sheet-armor-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>AR</th>
                            <th>Traits</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Render equipment with full details
    renderEquipment(character) {
        const equipment = [];

        for (const item of character.wargear || []) {
            // Skip if it's a weapon or armor
            if (DataLoader.getWeapon(item.id) || DataLoader.getArmor(item.id)) {
                continue;
            }
            const equip = DataLoader.getEquipment(item.id);
            if (equip) {
                equipment.push({ ...equip });
            }
        }

        if (equipment.length === 0) {
            return '';
        }

        const rows = equipment.map(equip => {
            // Build description and keywords row
            const description = equip.description || '';
            const keywords = equip.keywords?.length > 0
                ? equip.keywords.map(k => `<span class="sheet-mini-keyword">${k}</span>`).join(' ')
                : '';
            const hasDescOrKeywords = description || keywords;

            const descRow = hasDescOrKeywords ? `
                <tr class="sheet-equip-desc-row">
                    <td colspan="2">
                        <div class="sheet-item-details">
                            ${description ? `<span class="sheet-item-description">${description}</span>` : ''}
                            ${keywords ? `<span class="sheet-item-keywords">${keywords}</span>` : ''}
                        </div>
                    </td>
                </tr>
            ` : '';

            return `
                <tr>
                    <td class="sheet-equip-name">${equip.name}</td>
                    <td class="sheet-equip-effect">${equip.effect || '-'}</td>
                </tr>
                ${descRow}
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Equipment</h2>
                <table class="sheet-table sheet-equipment-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Effect</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Render species abilities including sub-option abilities (chapter, path, mutations)
    renderSpeciesAbilities(character, species) {
        if (!species) return '';

        const allAbilities = [];

        // Add base species abilities
        if (species.abilities) {
            for (const ability of species.abilities) {
                allAbilities.push({
                    name: ability.name,
                    flavor: ability.flavor || null,
                    effect: ability.effect || ability.description,
                    source: species.name
                });
            }
        }

        // Add sub-option abilities (chapter abilities, path bonuses, mutations)
        if (species.subOptions && character.species?.subOptions) {
            const subOptionsConfig = Array.isArray(species.subOptions) ? species.subOptions : [species.subOptions];

            for (const config of subOptionsConfig) {
                const selected = character.species.subOptions.filter(opt => opt.type === config.type);

                for (const sel of selected) {
                    const option = config.options?.find(o => o.id === sel.optionId);
                    if (option) {
                        // Chapter-style abilities (array of abilities)
                        if (option.abilities) {
                            for (const ability of option.abilities) {
                                allAbilities.push({
                                    name: ability.name,
                                    flavor: ability.flavor || null,
                                    effect: ability.effect || ability.description,
                                    source: option.name
                                });
                            }
                        }
                        // Path/mutation style abilities (single effect)
                        else if (option.effect || option.description) {
                            allAbilities.push({
                                name: option.name,
                                flavor: null,
                                effect: option.effect || option.description,
                                source: config.label
                            });
                        }
                    }
                }
            }
        }

        if (allAbilities.length === 0) return '';

        const abilitiesHtml = allAbilities.map(ability => {
            // Flavor text should NOT have glossary terms (escaped), effect text SHOULD (not escaped)
            const flavorHtml = ability.flavor
                ? `<div class="sheet-ability-flavor">${this.escapeHtml(ability.flavor)}</div>`
                : '';
            // Effect text will be enhanced with glossary terms by enhanceWithGlossary
            const effectHtml = `<div class="sheet-ability-effect">${ability.effect}</div>`;
            const sourceHtml = ability.source !== species.name
                ? `<span class="sheet-ability-source">(${ability.source})</span>`
                : '';

            return `
                <div class="sheet-ability">
                    <div class="sheet-ability-header">
                        <span class="sheet-ability-name">${ability.name}</span>
                        ${sourceHtml}
                    </div>
                    <div class="sheet-ability-content">
                        ${effectHtml}
                        ${flavorHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Species Abilities</h2>
                ${abilitiesHtml}
            </div>
        `;
    },

    // Render archetype abilities
    renderArchetypeAbilities(archetype) {
        const character = State.getCharacter();

        // For custom archetype, look up the purchased ability
        let abilitiesToRender = [];
        let sectionTitle = 'Archetype Abilities';

        if (character.archetype?.id === 'custom' && character.customArchetype?.abilityArchetypeId) {
            const abilityArchetype = DataLoader.getArchetype(character.customArchetype.abilityArchetypeId);
            if (abilityArchetype?.abilities) {
                abilitiesToRender = abilityArchetype.abilities;
                sectionTitle = `Archetype Ability (from ${abilityArchetype.name})`;
            }
        } else if (archetype?.abilities) {
            abilitiesToRender = archetype.abilities;
        }

        if (abilitiesToRender.length === 0) {
            return '';
        }

        const abilities = abilitiesToRender.map(ability => {
            // Support both old 'description' format and new 'flavor'+'effect' format
            const flavor = ability.flavor || null;
            const effect = ability.effect || ability.description;

            const flavorHtml = flavor
                ? `<div class="sheet-ability-flavor">${this.escapeHtml(flavor)}</div>`
                : '';
            const effectHtml = `<div class="sheet-ability-effect">${effect}</div>`;

            return `
                <div class="sheet-ability">
                    <div class="sheet-ability-header">
                        <span class="sheet-ability-name">${ability.name}</span>
                    </div>
                    <div class="sheet-ability-content">
                        ${effectHtml}
                        ${flavorHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">${sectionTitle}</h2>
                ${abilities}
            </div>
        `;
    },

    // Render talents
    renderTalents(character) {
        if (!character.talents || character.talents.length === 0) {
            return `
                <div class="sheet-section">
                    <h2 class="sheet-section-title">Talents</h2>
                    <p class="sheet-empty">No talents learned</p>
                </div>
            `;
        }

        const talents = character.talents.map(entry => {
            const talentId = typeof entry === 'string' ? entry : entry.id;
            const choice = typeof entry === 'object' ? entry.choice : null;
            const talent = DataLoader.getTalent(talentId);

            if (!talent) return '';

            // For weapon_owned choices, convert wargear index to weapon name
            let choiceDisplay = choice;
            if (choice !== null && choice !== undefined && talent.choiceType === 'weapon_owned') {
                const wargearIndex = parseInt(choice, 10);
                if (!isNaN(wargearIndex) && character.wargear[wargearIndex]) {
                    const weapon = DataLoader.getWeapon(character.wargear[wargearIndex].id);
                    if (weapon) {
                        choiceDisplay = weapon.name;
                    }
                }
            }

            const nameWithChoice = choiceDisplay
                ? `${talent.name} (${choiceDisplay})`
                : talent.name;

            // Build effect description with choice highlighted
            let effectText = talent.effect || '-';
            if (choiceDisplay) {
                // Add a note about the chosen option at the start
                const choiceNote = `<strong class="sheet-talent-choice">Chosen: ${choiceDisplay}</strong>. `;
                effectText = choiceNote + effectText;
            }

            // Build flavor text (displayed under effect, escaped to prevent glossary enhancement)
            const flavorHtml = talent.flavor
                ? `<div class="sheet-talent-flavor">${this.escapeHtml(talent.flavor)}</div>`
                : '';

            return `
                <div class="sheet-talent">
                    <div class="sheet-talent-header">
                        <span class="sheet-talent-name">${nameWithChoice}</span>
                    </div>
                    <div class="sheet-talent-content">
                        <div class="sheet-talent-effect">${effectText}</div>
                        ${flavorHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Talents</h2>
                ${talents}
            </div>
        `;
    },

    // Render psychic powers
    renderPsychicPowers(character) {
        if (!State.isPsyker() || !character.psychicPowers || character.psychicPowers.length === 0) {
            return '';
        }

        const rows = character.psychicPowers.map(powerId => {
            const power = DataLoader.getPsychicPower(powerId);
            if (!power) return '';

            return `
                <tr>
                    <td class="sheet-power-name">${power.name}</td>
                    <td class="sheet-power-dn">${power.dn || '-'}</td>
                    <td class="sheet-power-desc">${power.effect || '-'}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Psychic Powers</h2>
                <table class="sheet-table sheet-powers-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>DN</th>
                            <th>Effect</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },

    // Render background
    renderBackground(character) {
        const backgrounds = DataLoader.getBackgrounds();
        const parts = [];

        if (character.background?.origin?.id) {
            const origin = backgrounds.origins?.find(o => o.id === character.background.origin.id);
            if (origin) {
                parts.push(`<strong>Origin:</strong> ${origin.name}`);
            }
        }

        if (character.background?.accomplishment?.id) {
            const accomplishment = backgrounds.accomplishments?.find(a => a.id === character.background.accomplishment.id);
            if (accomplishment) {
                parts.push(`<strong>Accomplishment:</strong> ${accomplishment.name}`);
            }
        }

        if (character.background?.goal?.id) {
            const goal = backgrounds.goals?.find(g => g.id === character.background.goal.id);
            if (goal) {
                parts.push(`<strong>Goal:</strong> ${goal.name}`);
            }
        }

        // Languages
        const languages = character.languages || ['low_gothic'];
        const langNames = languages.map(l => l.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()));
        parts.push(`<strong>Languages:</strong> ${langNames.join(', ')}`);

        if (parts.length === 1) { // Only languages
            return `
                <div class="sheet-section">
                    <h2 class="sheet-section-title">Background</h2>
                    <p class="sheet-background-item">${parts[0]}</p>
                </div>
            `;
        }

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Background</h2>
                <div class="sheet-background-content">
                    ${parts.map(p => `<p class="sheet-background-item">${p}</p>`).join('')}
                </div>
            </div>
        `;
    },

    // Render notes
    renderNotes(character) {
        if (!character.notes || character.notes.trim() === '') {
            return '';
        }

        return `
            <div class="sheet-section">
                <h2 class="sheet-section-title">Notes</h2>
                <div class="sheet-notes">${this.escapeHtml(character.notes)}</div>
            </div>
        `;
    },

    // Print the character sheet (with light theme for paper)
    print() {
        // Add light theme class for printer-friendly output
        document.body.classList.add('print-light-theme');

        // Use afterprint event to clean up
        const cleanup = () => {
            document.body.classList.remove('print-light-theme');
            window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);

        window.print();
    },

    // Export to PDF (opens automatically after export)
    async exportPDF() {
        const character = State.getCharacter();
        const filename = `${character.name || 'character'}-sheet.pdf`;

        try {
            const result = await window.api.exportPDF({ filename });

            if (!result.success && result.error !== 'cancelled') {
                alert('Error exporting PDF: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Error exporting PDF: ' + error.message);
        }
    },

    // Helper: Calculate attack dice pool for a weapon
    calculateAttackDice(weapon, character, upgradeDetails = []) {
        // Determine skill and attribute based on weapon type
        let skillKey, skillName, attrKey, attrAbbrev;

        if (weapon.type === 'melee') {
            skillKey = 'weaponSkill';
            skillName = 'WS';
            attrKey = 'initiative';
            attrAbbrev = 'INI';
        } else {
            skillKey = 'ballisticSkill';
            skillName = 'BS';
            attrKey = 'agility';
            attrAbbrev = 'AGI';
        }

        const skillRating = character.skills?.[skillKey] || 0;
        const attrValue = character.attributes?.[attrKey] || 1;
        const basePool = skillRating + attrValue;

        // Collect bonus dice from upgrades
        let bonusDice = [];
        for (const upgrade of upgradeDetails) {
            if (upgrade.bonusDice) {
                bonusDice.push({ value: upgrade.bonusDice, source: upgrade.name });
            }
        }

        // TODO: Could add talent bonuses here (e.g., certain talents that grant bonus dice)

        // Calculate total
        const totalBonus = bonusDice.reduce((sum, b) => sum + b.value, 0);
        const totalPool = basePool + totalBonus;

        // Build tooltip showing breakdown
        let tooltip = `${skillName} ${skillRating} + ${attrAbbrev} ${attrValue} = ${basePool}`;
        if (bonusDice.length > 0) {
            const bonusStrings = bonusDice.map(b => `+${b.value} (${b.source})`);
            tooltip += `\n${bonusStrings.join('\n')}\nTotal: ${totalPool}`;
        }

        return {
            base: basePool,
            bonuses: bonusDice,
            total: totalPool,
            skill: skillName,
            attr: attrAbbrev,
            display: `${totalPool}`,
            tooltip: tooltip
        };
    },

    // Helper: Calculate weapon damage with detailed breakdown including talent bonuses and upgrades
    calculateWeaponDamageDetailed(weapon, character, wargearIndex = null, simultaneousStrike = null, equippedWeapons = [], upgradeDetails = []) {
        let baseDamage = (weapon.damage?.base || 0) + (weapon.damage?.bonus || 0);
        let ed = weapon.ed || 0;
        let ap = weapon.ap || 0;
        let edBonuses = [];
        let apBonuses = [];
        let damageBonuses = [];
        const rank = character.rank || 1;
        const weaponKeywords = weapon.keywords || [];
        const weaponTraits = weapon.traits || [];

        // Helper to check keywords (case-insensitive)
        const hasKeyword = (kw) => weaponKeywords.some(k => k.toUpperCase() === kw.toUpperCase());
        const hasTrait = (trait) => weaponTraits.some(t => t.toUpperCase().startsWith(trait.toUpperCase()));

        // Apply upgrade bonuses
        for (const upgrade of upgradeDetails) {
            if (upgrade.bonusDamage) {
                damageBonuses.push({ value: upgrade.bonusDamage, source: upgrade.name });
            }
            if (upgrade.bonusAP) {
                apBonuses.push({ value: upgrade.bonusAP, source: upgrade.name });
            }
            if (upgrade.bonusDice) {
                // Bonus dice affect attack tests, not damage directly - just note it
            }
            if (upgrade.bonusSalvo) {
                // Salvo is tracked separately
            }
        }

        // === DAMAGE TALENTS ===

        // Angel of Death: +Rank Damage for Chainswords, Chainaxes, Power Swords, Power Fists, Unarmed, Bolt weapons, ADEPTUS ASTARTES weapons
        if (State.hasTalent('angel_of_death')) {
            const angelWeapons = ['chainsword', 'chainaxe', 'power sword', 'power fist', 'unarmed'];
            const weaponNameLower = weapon.name.toLowerCase();
            const isAngelWeapon = angelWeapons.some(w => weaponNameLower.includes(w)) ||
                hasKeyword('BOLT') || hasKeyword('ADEPTUS ASTARTES');
            if (isAngelWeapon) {
                damageBonuses.push({ value: rank, source: 'Angel of Death' });
            }
        }

        // Emperor's Executioner: +Rank Damage with BOLT, FIRE, or MELTA weapons
        if (State.hasTalent('emperor_s_executioner')) {
            if (hasKeyword('BOLT') || hasKeyword('FIRE') || hasKeyword('MELTA')) {
                damageBonuses.push({ value: rank, source: "Emperor's Executioner" });
            }
        }

        // === ED TALENTS ===

        // Trademark Weapon: +Double Rank ED (applies to specific weapon instance by wargear index)
        const trademarkInfo = this.getTrademarkWeaponInfo(character);
        if (trademarkInfo && wargearIndex === trademarkInfo.wargearIndex) {
            edBonuses.push({ value: trademarkInfo.bonusED, source: 'Trademark Weapon' });
        }

        // Pyre Kindler: +Rank ED for weapons with Inflict (On Fire) trait
        if (State.hasTalent('pyre_kindler')) {
            if (hasTrait('Inflict') && weaponTraits.some(t => t.toLowerCase().includes('on fire') || t.toLowerCase().includes('fire'))) {
                edBonuses.push({ value: rank, source: 'Pyre Kindler' });
            }
        }

        // Promethium Proficiency: +Rank ED for weapons with Inflict (On Fire) trait
        if (State.hasTalent('promethium_proficiency')) {
            if (hasTrait('Inflict') && weaponTraits.some(t => t.toLowerCase().includes('on fire') || t.toLowerCase().includes('fire'))) {
                edBonuses.push({ value: rank, source: 'Promethium Prof.' });
            }
        }

        // Absolute Incineration: +Rank ED and AP for MELTA weapons (at Short Range)
        // Note: This shows the potential bonus; actual bonus only applies at Short Range
        if (State.hasTalent('absolute_incineration')) {
            if (hasTrait('Melta') || hasKeyword('MELTA')) {
                edBonuses.push({ value: rank, source: 'Abs. Incin. (Short)' });
                apBonuses.push({ value: rank, source: 'Abs. Incin. (Short)' });
            }
        }

        // === AP TALENTS ===

        // Honed to Lethality: +Rank AP for POWER FIELD weapons
        if (State.hasTalent('honed_to_lethality')) {
            if (hasKeyword('POWER FIELD') || hasKeyword('POWER_FIELD')) {
                apBonuses.push({ value: rank, source: 'Honed to Lethality' });
            }
        }

        // Blood Angels Assault Squad: +Rank AP on melee or Pistol weapons
        if (State.hasTalent('blood_angels_assault_squad_faith')) {
            if (weapon.type === 'melee' || hasTrait('Pistol')) {
                apBonuses.push({ value: rank, source: 'Assault Squad' });
            }
        }

        // Devastator Centurion: +Rank AP when using chosen heavy weapon
        if (State.hasTalent('devastator_centurion')) {
            const entry = State.getTalentEntry('devastator_centurion');
            if (entry && entry.choice && weapon.name === entry.choice) {
                apBonuses.push({ value: rank, source: 'Devastator' });
            }
        }

        // Signature Saedath (Dark): +Rank AP on melee
        if (State.hasTalent('signature_saedath')) {
            const entry = State.getTalentEntry('signature_saedath');
            // Dark saedath gives AP bonus on melee
            if (entry && entry.choice === 'Dark' && weapon.type === 'melee') {
                apBonuses.push({ value: rank, source: 'Saedath (Dark)' });
            }
        }

        // Assault Doctrine: +Rank AP on melee or Pistol weapons
        if (State.hasTalent('assault_doctrine')) {
            if (weapon.type === 'melee' || hasTrait('Pistol')) {
                apBonuses.push({ value: rank, source: 'Assault Doctrine' });
            }
        }

        // Devastator Doctrine: +Rank AP on the chosen heavy weapon
        if (State.hasTalent('devastator_doctrine')) {
            const entry = State.getTalentEntry('devastator_doctrine');
            if (entry && entry.choice && weapon.name === entry.choice) {
                apBonuses.push({ value: rank, source: 'Devastator Doctrine' });
            }
        }

        // Disciple of the Holy Trinity: +Rank Damage with BOLT, FIRE, or MELTA weapons
        if (State.hasTalent('disciple_of_holy_trinity')) {
            if (hasKeyword('BOLT') || hasKeyword('FIRE') || hasKeyword('MELTA')) {
                damageBonuses.push({ value: rank, source: 'Holy Trinity' });
            }
        }

        // === SIMULTANEOUS STRIKE ===

        // Check for Simultaneous Strike bonus (only if this weapon is equipped and another compatible weapon is also equipped)
        if (simultaneousStrike && wargearIndex !== null && State.isWeaponEquipped(wargearIndex)) {
            const compatibleEquipped = equippedWeapons.filter(w =>
                this.isWeaponCompatibleWithSimultaneousStrike(w, simultaneousStrike)
            );

            if (compatibleEquipped.length >= 2) {
                // Find the "other" weapon (not this one)
                const otherWeapon = compatibleEquipped.find(w => w.wargearIndex !== wargearIndex);
                if (otherWeapon) {
                    // Add half of the other weapon's BASE damage only (rounded up) as ED
                    // Base damage is the fixed damage value, not including attribute bonuses
                    const otherBaseDamage = (otherWeapon.damage?.base || 0) + (otherWeapon.damage?.bonus || 0);
                    const ssBonus = Math.ceil(otherBaseDamage / 2);
                    if (ssBonus > 0) {
                        edBonuses.push({ value: ssBonus, source: 'Simul. Strike' });
                    }
                }
            }
        }

        // Calculate total damage bonus from talents and upgrades
        const totalDamageBonus = damageBonuses.reduce((sum, b) => sum + b.value, 0);

        // Calculate total ED
        const totalED = ed + edBonuses.reduce((sum, b) => sum + b.value, 0);

        // Calculate total AP (AP is negative, so bonuses make it more negative)
        const apBonus = apBonuses.reduce((sum, b) => sum + b.value, 0);
        const totalAP = ap - apBonus; // Subtract because AP bonuses increase penetration (more negative)

        // Build ED tooltip showing breakdown
        let edTooltip = `Base ED: ${ed}`;
        if (edBonuses.length > 0) {
            const bonusStrings = edBonuses.map(b => `+${b.value} (${b.source})`);
            edTooltip += `\n${bonusStrings.join('\n')}\nTotal: ${totalED}`;
        }

        // Build AP tooltip showing breakdown
        let apTooltip = `Base AP: ${ap}`;
        if (apBonuses.length > 0) {
            const bonusStrings = apBonuses.map(b => `-${b.value} (${b.source})`);
            apTooltip += `\n${bonusStrings.join('\n')}\nTotal: ${totalAP}`;
        }

        // Check if weapon adds attribute to damage (typically Strength for melee)
        if (weapon.damage?.attribute && character.attributes) {
            const attrValue = character.attributes[weapon.damage.attribute] || 0;
            const attrAbbrev = weapon.damage.attribute.substring(0, 3).toUpperCase();

            const totalDamage = baseDamage + attrValue + totalDamageBonus;
            let damageTooltip = `Base: ${baseDamage} + ${attrAbbrev}: ${attrValue}`;
            if (damageBonuses.length > 0) {
                const bonusStrings = damageBonuses.map(b => `+${b.value} (${b.source})`);
                damageTooltip += `\n${bonusStrings.join('\n')}`;
            }
            damageTooltip += `\nTotal: ${totalDamage}`;

            return {
                damage: totalDamage,
                ed: totalED,
                ap: totalAP,
                edDisplay: `${totalED}`,
                edTooltip: edTooltip,
                apDisplay: `${totalAP}`,
                apTooltip: apBonuses.length > 0 ? apTooltip : null,
                display: `${totalDamage}`,
                damageTooltip: damageTooltip
            };
        }

        const totalDamage = baseDamage + totalDamageBonus;
        let damageTooltip = null;
        if (damageBonuses.length > 0) {
            damageTooltip = `Base: ${baseDamage}`;
            const bonusStrings = damageBonuses.map(b => `+${b.value} (${b.source})`);
            damageTooltip += `\n${bonusStrings.join('\n')}`;
            damageTooltip += `\nTotal: ${totalDamage}`;
        }

        return {
            damage: totalDamage,
            ed: totalED,
            ap: totalAP,
            edDisplay: `${totalED}`,
            edTooltip: edTooltip,
            apDisplay: `${totalAP}`,
            apTooltip: apBonuses.length > 0 ? apTooltip : null,
            display: `${totalDamage}`,
            damageTooltip: damageTooltip
        };
    },

    // Bind tap/click handlers to show tooltips on cells with title attributes
    bindStatTooltips(container) {
        const tappableCells = container.querySelectorAll('.sheet-weapons-table td[title]');

        tappableCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.stopPropagation();

                // Remove any existing tooltip
                const existing = document.querySelector('.stat-tooltip-popup');
                if (existing) existing.remove();

                const tooltip = document.createElement('div');
                tooltip.className = 'stat-tooltip-popup';
                tooltip.textContent = cell.getAttribute('title');
                document.body.appendChild(tooltip);

                // Position below the cell
                const rect = cell.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                let top = rect.bottom + 8;
                let left = rect.left;

                // Keep within viewport
                if (left + tooltipRect.width > window.innerWidth - 10) {
                    left = window.innerWidth - tooltipRect.width - 10;
                }
                if (top + tooltipRect.height > window.innerHeight - 10) {
                    top = rect.top - tooltipRect.height - 8;
                }

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${Math.max(10, left)}px`;

                // Dismiss on click outside
                const dismiss = (evt) => {
                    if (!tooltip.contains(evt.target)) {
                        tooltip.remove();
                        document.removeEventListener('click', dismiss);
                    }
                };
                setTimeout(() => document.addEventListener('click', dismiss), 0);
            });
        });
    },

    // Helper: Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Repair any background selections that are missing bonusType
    repairBackgroundBonusTypes(character) {
        const backgrounds = DataLoader.getBackgrounds();
        if (!backgrounds) return;

        // Check origin
        if (character.background?.origin?.id && !character.background.origin.bonusType) {
            const origin = (backgrounds.origins || []).find(o => o.id === character.background.origin.id);
            if (origin?.bonusType) {
                character.background.origin.bonusType = origin.bonusType;
            }
        }

        // Check accomplishment
        if (character.background?.accomplishment?.id && !character.background.accomplishment.bonusType) {
            const accomplishment = (backgrounds.accomplishments || []).find(a => a.id === character.background.accomplishment.id);
            if (accomplishment?.bonusType) {
                character.background.accomplishment.bonusType = accomplishment.bonusType;
            }
        }

        // Check goal
        if (character.background?.goal?.id && !character.background.goal.bonusType) {
            const goal = (backgrounds.goals || []).find(g => g.id === character.background.goal.id);
            if (goal?.bonusType) {
                character.background.goal.bonusType = goal.bonusType;
            }
        }
    }
};
