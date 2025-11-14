
const showPopup = (content, buttons = [{ text: 'OK' }], popupId = null) => {
    // Remove existing popups
    const existingPopup = document.querySelector('.popup-overlay');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup overlay
    const overlay = document.createElement('div');
    overlay.classList.add('popup-overlay');
    if (popupId) {
        overlay.id = popupId;
    }

    // Create popup content area
    const popup = document.createElement('div');
    popup.classList.add('popup-content');

    // Add content
    if (typeof content === 'string') {
        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        popup.appendChild(contentDiv);
    } else {
        popup.appendChild(content);
    }

    // Add buttons
    const btnContainer = document.createElement('div');
    btnContainer.classList.add('popup-buttons');

    buttons.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.textContent = btnInfo.text;
        btn.classList.add('btn', btnInfo.class || 'btn-primary');
        btn.addEventListener('click', () => {
            if (btnInfo.onClick) {
                btnInfo.onClick();
            }
            overlay.remove(); // Close popup
        });
        btnContainer.appendChild(btn);
    });

    popup.appendChild(btnContainer);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
};

document.addEventListener('DOMContentLoaded', () => {
    const cardGrid = document.getElementById('card-grid');
    const mainProgressBar = document.querySelector('#main-progress-container .progress-bar');
    const progressSegmentsContainer = document.querySelector('#main-progress-container .progress-segments-container');
    const progressText = document.querySelector('#main-progress-container .progress-text');
    const searchBar = document.getElementById('search-bar');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const rarityOrder = ["Common", "Uncommon", "Rare", "Epic", "Chaotic", "Legendary", "Eternal"];
    let cardData = [];
    let allSets = [];
    let activeSets = [];

    const groupByMode = document.getElementById('group-by-mode');
    const toggleSwitch = document.querySelector('.toggle-switch');
    const setsFilterBtn = document.getElementById('sets-filter-btn');
    const splitByRarityCheck = document.getElementById('split-by-rarity-check');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const sortBySelect = document.getElementById('sort-by-select');

    const updateProgressBar = () => {
        const totalCards = cardData.length;
        const ownedCards = cardData.filter(card => card.quantity > 0).length;

        if (progressSegmentsContainer) {
            // Clear previous segments
            progressSegmentsContainer.innerHTML = '';

            rarityOrder.forEach(rarity => {
                const ownedInCategory = cardData.filter(c => c.rarity === rarity && c.quantity > 0).length;
                if (ownedInCategory > 0) {
                    const percentage = (ownedInCategory / totalCards) * 100;
                    const segment = document.createElement('div');
                    segment.classList.add('progress', `progress-${rarity.toLowerCase()}`);
                    segment.style.width = `${percentage}%`;
                    progressSegmentsContainer.appendChild(segment);
                }
            });
        }

        if (progressText) {
            progressText.textContent = `${ownedCards} / ${totalCards}`;
        }
    };

    const createRarityProgressBars = () => {
        const rarityProgressContainer = document.getElementById('rarity-progress-container');
        rarityProgressContainer.innerHTML = ''; // Clear existing bars
        rarityOrder.forEach(rarity => {
            const bar = document.createElement('div');
            bar.classList.add('progress-bar', 'rarity-progress-bar');

            const segmentsContainer = document.createElement('div');
            segmentsContainer.classList.add('progress-segments-container');

            const progress = document.createElement('div');
            progress.classList.add('progress', `progress-${rarity.toLowerCase()}`);
            progress.id = `rarity-progress-${rarity.toLowerCase()}`;
            segmentsContainer.appendChild(progress);

            const text = document.createElement('p');
            text.classList.add('progress-text');
            text.id = `rarity-progress-text-${rarity.toLowerCase()}`;

            bar.appendChild(segmentsContainer);
            bar.appendChild(text);
            rarityProgressContainer.appendChild(bar);
        });
    };

    const updateAllRarityProgressBars = () => {
        rarityOrder.forEach(rarity => {
            const cardsInRarity = cardData.filter(card => card.rarity === rarity);
            const ownedInRarity = cardsInRarity.filter(card => card.quantity > 0).length;
            const totalInRarity = cardsInRarity.length;
            const percentage = totalInRarity > 0 ? (ownedInRarity / totalInRarity) * 100 : 0;

            const progressBar = document.getElementById(`rarity-progress-${rarity.toLowerCase()}`);
            if (progressBar) {
                progressBar.style.width = `${percentage}%`;
            }

            const progressText = document.getElementById(`rarity-progress-text-${rarity.toLowerCase()}`);
            if (progressText) {
                progressText.textContent = `${ownedInRarity} / ${totalInRarity}`;
            }
        });
    };

    const renderCards = (cardsToRender) => {
        const mode = groupByMode.value;
        const splitByRarity = splitByRarityCheck.checked;
        cardGrid.innerHTML = '';

        let groups;
        let groupOrder;

        if (mode === 'rarity') {
            groups = cardsToRender.reduce((acc, card) => {
                (acc[card.rarity] = acc[card.rarity] || []).push(card);
                return acc;
            }, {});
            groupOrder = rarityOrder;
        } else { // 'sets'
            groups = {};
            cardsToRender.forEach(card => {
                if (card.sets && card.sets.length > 0) {
                    card.sets.forEach(set => {
                        if (activeSets.includes(set)) {
                            if (!groups[set]) {
                                groups[set] = splitByRarity ? {} : [];
                            }

                            if (splitByRarity) {
                                if (!groups[set][card.rarity]) {
                                    groups[set][card.rarity] = [];
                                }
                                if (!groups[set][card.rarity].find(c => c.title === card.title)) {
                                    groups[set][card.rarity].push(card);
                                }
                            } else {
                                if (!groups[set].find(c => c.title === card.title)) {
                                    groups[set].push(card);
                                }
                            }
                        }
                    });
                }
            });
            groupOrder = allSets.filter(set => activeSets.includes(set)).sort();
        }

        renderGroups(groups, groupOrder);
    };

    const renderGroups = (groups, groupOrder) => {
        cardGrid.innerHTML = '';
        const sidebarContent = document.getElementById('sidebar-content');
        sidebarContent.innerHTML = '';
        let headerCounter = 0;

        const mode = groupByMode.value;
        const splitByRarity = splitByRarityCheck.checked;
        const sortMode = sortBySelect.value;

        groupOrder.forEach(groupName => {
            let groupData = groups[groupName];
            if (!groupData) return; // Skip if the group is empty or filtered out
            const isNonEmpty = splitByRarity ? Object.keys(groupData).length > 0 : groupData.length > 0;

            if (isNonEmpty) {
                headerCounter++;
                const headerId = `header-${headerCounter}`;

                const groupHeader = document.createElement('h2');
                groupHeader.id = headerId;
                groupHeader.classList.add('rarity-header');
                if (mode === 'rarity') {
                    groupHeader.classList.add(`header-${groupName.toLowerCase()}`);
                }

                const titleSpan = document.createElement('span');
                titleSpan.textContent = groupName;
                groupHeader.appendChild(titleSpan);

                const sectionProgressContainer = document.createElement('div');
                sectionProgressContainer.classList.add('progress-container', 'section-progress');
                const sectionProgressBar = document.createElement('div');
                sectionProgressBar.classList.add('progress-bar');
                const sectionSegmentsContainer = document.createElement('div');
                sectionSegmentsContainer.classList.add('progress-segments-container');
                const sectionProgress = document.createElement('div');
                sectionProgress.classList.add('progress');
                if (mode === 'rarity') {
                    sectionProgress.classList.add(`progress-${groupName.toLowerCase()}`);
                } else {
                    sectionProgress.classList.add('progress-default');
                }
                sectionProgressBar.appendChild(sectionSegmentsContainer);
                sectionSegmentsContainer.appendChild(sectionProgress);
                const sectionProgressText = document.createElement('p');
                sectionProgressText.classList.add('progress-text');
                sectionProgressBar.appendChild(sectionProgressText);
                sectionProgressContainer.appendChild(sectionProgressBar);
                groupHeader.appendChild(sectionProgressContainer);

                const cardsForProgressBar = splitByRarity ? Object.values(groupData).flat() : groupData;
                if (mode === 'rarity') {
                    updateSectionProgressBar(groupName, cardsForProgressBar, sectionProgress, sectionProgressText, sectionProgressBar);
                } else {
                    const cardsInSet = cardData.filter(card => card.sets && card.sets.includes(groupName));
                    updateSetSectionProgressBar(groupName, cardsForProgressBar, sectionProgress, sectionProgressText, cardsInSet);
                }

                const linkContainer = document.createElement('div');

                if (mode === 'sets' && splitByRarity) {
                    // Render as a simple, non-clickable header
                    const header = document.createElement('p');
                    header.classList.add('sidebar-set-header');
                    header.textContent = groupName;
                    linkContainer.appendChild(header);
                } else {
                    // Render as a progress bar link
                    const link = document.createElement('a');
                    link.href = `#${headerId}`;

                    const progressFill = document.createElement('div');
                    progressFill.classList.add('sidebar-link-progress');

                    let percentage = 0;
                    let owned, total;
                    if (mode === 'rarity') {
                        const cardsInGroup = groupData;
                        total = cardsInGroup.length;
                        owned = cardsInGroup.filter(c => c.quantity > 0).length;
                        percentage = total > 0 ? (owned / total) * 100 : 0;
                        progressFill.classList.add(`progress-${groupName.toLowerCase()}`);
                    } else { // sets mode without split
                        const cardsInSet = cardData.filter(card => card.sets && card.sets.includes(groupName));
                        total = cardsInSet.length;
                        owned = cardsInSet.filter(c => c.quantity > 0).length;
                        percentage = total > 0 ? (owned / total) * 100 : 0;
                        progressFill.classList.add('progress-default');
                    }
                    progressFill.style.width = `${percentage}%`;

                    const linkText = document.createElement('span');
                    linkText.textContent = groupName;

                    const counter = document.createElement('span');
                    counter.classList.add('sidebar-link-counter');
                    counter.textContent = `${owned} / ${total}`;

                    link.appendChild(progressFill);
                    link.appendChild(linkText);
                    link.appendChild(counter);

                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.getElementById(headerId).scrollIntoView({ behavior: 'smooth' });
                        sidebar.classList.remove('open');
                        sidebarToggle.classList.remove('open');
                    });
                    linkContainer.appendChild(link);
                }

                if (mode === 'rarity') {
                    linkContainer.classList.add('sidebar-link-rarity', `header-${groupName.toLowerCase()}`);
                } else {
                    linkContainer.classList.add('sidebar-link-set');
                }
                sidebarContent.appendChild(linkContainer);

                cardGrid.appendChild(groupHeader);

                if (splitByRarity && mode === 'sets') {
                const subLinksContainer = document.createElement('div');
                subLinksContainer.classList.add('sub-links-container');
                linkContainer.appendChild(subLinksContainer);

                    rarityOrder.forEach(rarity => {
                        if (groupData[rarity] && groupData[rarity].length > 0) {
                            headerCounter++;
                            const subHeaderId = `header-${headerCounter}`;

                            const subHeader = document.createElement('h3');
                            subHeader.id = subHeaderId;
                            subHeader.classList.add('rarity-subheader', `header-${rarity.toLowerCase()}`);

                            const subLink = document.createElement('a');
                            subLink.href = `#${subHeaderId}`;
                            subLink.classList.add('sub-link');

                            // Create progress bar for sidebar sub-link
                            const subProgressFill = document.createElement('div');
                            subProgressFill.classList.add('sidebar-link-progress', `progress-${rarity.toLowerCase()}`);

                            const cardsInSubGroup = groupData[rarity];
                            const total = cardsInSubGroup.length;
                            const owned = cardsInSubGroup.filter(c => c.quantity > 0).length;
                            const percentage = total > 0 ? (owned / total) * 100 : 0;
                            subProgressFill.style.width = `${percentage}%`;

                            const subLinkText = document.createElement('span');
                            subLinkText.textContent = rarity;

                            const subCounter = document.createElement('span');
                            subCounter.classList.add('sidebar-link-counter');
                            subCounter.textContent = `${owned} / ${total}`;

                            subLink.appendChild(subProgressFill);
                            subLink.appendChild(subLinkText);
                            subLink.appendChild(subCounter);

                            subLink.addEventListener('click', (e) => {
                                e.preventDefault();
                                document.getElementById(subHeaderId).scrollIntoView({ behavior: 'smooth' });
                                sidebar.classList.remove('open');
                                sidebarToggle.classList.remove('open');
                            });

                            const subLinkWrapper = document.createElement('div');
                            subLinkWrapper.classList.add('sidebar-link-rarity', `header-${rarity.toLowerCase()}`);
                            subLinkWrapper.appendChild(subLink);
                            subLinksContainer.appendChild(subLinkWrapper);

                            const titleSpan = document.createElement('span');
                            titleSpan.textContent = rarity;
                            subHeader.appendChild(titleSpan);

                            const sectionProgressContainer = document.createElement('div');
                            sectionProgressContainer.classList.add('progress-container', 'section-progress');
                            const sectionProgressBar = document.createElement('div');
                            sectionProgressBar.classList.add('progress-bar');
                            const sectionSegmentsContainer = document.createElement('div');
                            sectionSegmentsContainer.classList.add('progress-segments-container');
                            const sectionProgress = document.createElement('div');
                            sectionProgress.classList.add('progress', `progress-${rarity.toLowerCase()}`);
                            sectionProgressBar.appendChild(sectionSegmentsContainer);
                            sectionSegmentsContainer.appendChild(sectionProgress);
                            const sectionProgressText = document.createElement('p');
                            sectionProgressText.classList.add('progress-text');
                            sectionProgressBar.appendChild(sectionProgressText);
                            sectionProgressContainer.appendChild(sectionProgressBar);
                            subHeader.appendChild(sectionProgressContainer);

                            updateSectionProgressBar(rarity, groupData[rarity], sectionProgress, sectionProgressText, sectionProgressBar);

                            cardGrid.appendChild(subHeader);

                            const groupContainer = document.createElement('div');
                            groupContainer.classList.add('rarity-container');

                            // Sort the cards within the subgroup before rendering
                            if (sortMode === 'alphabetical') {
                                groupData[rarity].sort((a, b) => a.title.localeCompare(b.title));
                            } else if (sortMode === 'count') {
                                groupData[rarity].sort((a, b) => b.quantity - a.quantity);
                            }

                            groupData[rarity].forEach(card => {
                                const cardElement = createCardElement(card);
                                groupContainer.appendChild(cardElement);
                            });
                            cardGrid.appendChild(groupContainer);
                        }
                    });
                } else {
                    const groupContainer = document.createElement('div');
                    groupContainer.classList.add('rarity-container');

                    // Sort the cards within the group before rendering
                    if (sortMode === 'alphabetical') {
                        groupData.sort((a, b) => a.title.localeCompare(b.title));
                    } else if (sortMode === 'count') {
                        groupData.sort((a, b) => b.quantity - a.quantity);
                    }

                    groupData.forEach(card => {
                        const cardElement = createCardElement(card);
                        groupContainer.appendChild(cardElement);
                    });
                    cardGrid.appendChild(groupContainer);
                }
            }
        });
    };

    const createCardElement = (card, isInteractive = true) => {
        const cardContainer = document.createElement('div');
        cardContainer.classList.add('card-container');
        cardContainer.dataset.quantity = card.quantity;

        const cardElement = document.createElement('div');
        cardElement.classList.add('card', `rarity-${card.rarity.toLowerCase()}`);

        if (card.quantity === 0) {
            cardElement.classList.add('unowned');
        }

        const title = document.createElement('h3');
        title.classList.add('card-title');
        title.textContent = card.title;
        cardElement.appendChild(title);

        const image = document.createElement('img');
        image.classList.add('card-image');
        image.src = card.image;
        image.alt = card.title;
        cardElement.appendChild(image);

        const text = document.createElement('p');
        text.classList.add('card-text');
        text.textContent = card.text;
        cardElement.appendChild(text);

        const rarityText = document.createElement('p');
        rarityText.classList.add('card-rarity');
        rarityText.textContent = card.rarity;
        cardElement.appendChild(rarityText);

        cardContainer.appendChild(cardElement);

        const quantityControls = document.createElement('div');
        quantityControls.classList.add('quantity-controls');

        const minusBtn = document.createElement('button');
        minusBtn.classList.add('quantity-btn', 'minus-btn');
        minusBtn.textContent = '-';

        const quantityDisplay = document.createElement('p');
        quantityDisplay.classList.add('card-quantity');
        const quantityValue = document.createElement('span');
        if (showDupesCheck.checked) {
            quantityValue.textContent = card.quantity > 0 ? card.quantity - 1 : 0;
        } else {
            quantityValue.textContent = card.quantity;
        }
        quantityDisplay.textContent = 'Quantity: ';
        quantityDisplay.appendChild(quantityValue);

        const plusBtn = document.createElement('button');
        plusBtn.classList.add('quantity-btn', 'plus-btn');
        plusBtn.textContent = '+';

        if (isInteractive) {
            minusBtn.addEventListener('click', () => {
                if (card.quantity > 0) {
                    card.quantity--;
                    quantityValue.textContent = card.quantity;
                    const quantities = cardData.map(c => c.quantity);
                    sessionStorage.setItem('collectionQuantities', JSON.stringify(quantities));
                    if (card.quantity === 0) {
                        cardElement.classList.add('unowned');
                    }
                    updateProgressBar();
                    updateAllRarityProgressBars();
                    performSearch();
                }
            });

            plusBtn.addEventListener('click', () => {
                const wasUnowned = card.quantity === 0;
                card.quantity++;
                quantityValue.textContent = card.quantity;
                const quantities = cardData.map(c => c.quantity);
                sessionStorage.setItem('collectionQuantities', JSON.stringify(quantities));
                if (wasUnowned) {
                    cardElement.classList.remove('unowned');
                }
                updateProgressBar();
                updateAllRarityProgressBars();
                performSearch();
            });
        }

        quantityControls.appendChild(minusBtn);
        quantityControls.appendChild(quantityDisplay);
        quantityControls.appendChild(plusBtn);
        cardContainer.appendChild(quantityControls);

        return cardContainer;
    };

    const showExtrasPopup = () => {
        // Last sampled on November 13th 2025 - 3pm
        const TOTAL = 1106; // Total cards sampled
        const rarityPercentages = {
            "Common": 764 / TOTAL * 100,
            "Uncommon": 168 / TOTAL * 100,
            "Rare": 121 / TOTAL * 100,
            "Epic": 30 / TOTAL * 100,
            "Chaotic": 9 / TOTAL * 100,
            "Legendary": 13 / TOTAL * 100,
            "Eternal": 1 / TOTAL * 100,
        };

        const rarityCounts = rarityOrder.reduce((acc, rarity) => {
            acc[rarity] = 0;
            return acc;
        }, {});

        let totalCount = 0;

        cardData.forEach(card => {
            if (card.quantity > 0) {
                rarityCounts[card.rarity] += card.quantity;
                totalCount += card.quantity;
            }
        });

        const popupContent = document.createElement('div');
        popupContent.innerHTML = `<h2>Extras</h2>`;

        // Tab buttons
        const tabContainer = document.createElement('div');
        tabContainer.classList.add('popup-tabs');
        tabContainer.innerHTML = `
            <button class="tab-btn active" data-view="stats-view">Stats</button>
            <button class="tab-btn" data-view="calculator-view">Calculate</button>
            <button class="tab-btn" data-view="simulate-view">Simulate</button>
        `;
        popupContent.appendChild(tabContainer);

        const viewsContainer = document.createElement('div');
        viewsContainer.classList.add('popup-views');

        // Stats View
        const statsView = document.createElement('div');
        statsView.id = 'stats-view';
        statsView.classList.add('popup-view');

        let statsGridContent = '<div class="stats-grid">';
        rarityOrder.forEach(rarity => {
            const total = rarityCounts[rarity];
            const expected = (totalCount * (rarityPercentages[rarity] / 100));
            let luck = expected > 0 ? (total / expected) * 100 : 0;
            let luckDisplay = expected > 0 ? `${luck.toFixed(0)}%` : 'N/A';
            statsGridContent += `
                <div class="stat-item ${rarity.toLowerCase()}">
                    <span class="stat-rarity ${rarity.toLowerCase()}">${rarity}</span>
                    <div class="stat-values">
                        <div class="stat-line"><strong>Total:</strong> <span>${total}</span></div>
                        <div class="stat-line"><strong>Expected:</strong> <span>${expected.toFixed(2)}</span></div>
                        <div class="stat-line"><strong>${rarity.toLowerCase() === 'common' ? "'Luck'" : 'Luck'}:</strong> <span>${luckDisplay}</span></div>
                    </div>
                </div>`;
        });
        statsGridContent += '</div>';

        const packsNeeded = (totalCount / 7).toFixed(2);
        statsView.innerHTML = `<p class="stats-subtitle">Analysis of your collection based on presumed rarity (based on ${TOTAL} cards (${TOTAL/7} packs) from Chrissy Discord). Includes all duplicates.</p>` +
            statsGridContent + `
            <div class="stats-total">
                <span>Total Cards</span> <span class="stat-value">${totalCount}</span>
            </div>
            <div class="stats-total sub-total">
                <span>Packs Opened (Est.)</span>
                <span class="stat-value">${packsNeeded}</span>
            </div>`;
        viewsContainer.appendChild(statsView);

        // Calculator View
        const calculatorView = document.createElement('div');
        calculatorView.id = 'calculator-view';
        calculatorView.classList.add('popup-view', 'hidden');

        let calculatorContent = `
            <div class="stats-calculator">
                <div class="calc-inputs">
                    <div class="input-group">
                        <label for="packs-input">Packs</label>
                        <input type="number" id="packs-input" min="0" value="1">
                    </div>
                    <div class="input-group">
                        <label for="cards-input">Cards</label>
                        <input type="number" id="cards-input" min="0" value="7">
                    </div>
                    <div class="graph-controls">
                        <span class="graph-control-label">Graph Mode:</span>
                        <div class="toggle-switch">
                            <span class="switch-option active" data-graph-type="total">Total</span>
                            <span class="switch-option" data-graph-type="unique">Unique</span>
                        </div>
                    </div>
                </div>
                <div class="graph-container">
                    <canvas id="distribution-chart"></canvas>
                </div>
            </div>
        `;

        calculatorView.innerHTML = calculatorContent;
        viewsContainer.appendChild(calculatorView);

        // Simulate View
        const simulateView = document.createElement('div');
        simulateView.id = 'simulate-view';
        simulateView.classList.add('popup-view', 'hidden');

        // Pack opening logic
        const rarityDropRates = [
            { rarity: "Common", rate: rarityPercentages["Common"] / 100 },
            { rarity: "Uncommon", rate: rarityPercentages["Uncommon"] / 100 },
            { rarity: "Rare", rate: rarityPercentages["Rare"] / 100 },
            { rarity: "Epic", rate: rarityPercentages["Epic"] / 100 },
            { rarity: "Chaotic", rate: rarityPercentages["Chaotic"] / 100 },
            { rarity: "Legendary", rate: rarityPercentages["Legendary"] / 100 },
            { rarity: "Eternal", rate: rarityPercentages["Eternal"] / 100 },
        ];

        const getRandomCardByRarity = (rarity) => {
            const cardsOfRarity = cardData.filter(card => card.rarity === rarity);
            if (cardsOfRarity.length === 0) return null;
            const randomIndex = Math.floor(Math.random() * cardsOfRarity.length);
            return cardsOfRarity[randomIndex];
        };

        const openSimulatedPack = () => {
            const pack = [];
            for (let i = 0; i < 7; i++) {
                const random = Math.random();
                let cumulativeRate = 0;
                for (const drop of rarityDropRates) {
                    cumulativeRate += drop.rate;
                    if (random < cumulativeRate) {
                        pack.push(getRandomCardByRarity(drop.rarity));
                        break;
                    }
                }
            }
            return pack.filter(Boolean); // Filter out nulls if a rarity has no cards
        };


        // Structure for the simulate view
        simulateView.innerHTML = `
            <div class="simulate-controls">
                <button id="simulate-pack-btn" class="btn btn-primary">Simulate Pack Opening</button>
                <button id="reset-session-btn" class="btn btn-red">Reset Session</button>
            </div>
            <div id="pack-results-container" class="pack-results"></div>
            <div class="session-stats">
                <h3>Session Statistics</h3>
                <div id="session-stats-grid" class="stats-grid"></div>
            </div>
        `;
        viewsContainer.appendChild(simulateView);

        popupContent.appendChild(viewsContainer);

        // Close Button
        const closeButtonContainer = document.createElement('div');
        closeButtonContainer.classList.add('popup-buttons');
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.classList.add('btn', 'btn-secondary');
        closeBtn.addEventListener('click', () => {
            document.querySelector('.popup-overlay').remove();
        });
        closeButtonContainer.appendChild(closeBtn);
        popupContent.appendChild(closeButtonContainer);

        showPopup(popupContent, [], 'extras-popup');

        // --- Simulate View Logic ---
        let sessionStats = { packsOpened: 0 };
        rarityOrder.forEach(r => sessionStats[r] = 0);
        let sessionNewCards = {};
        rarityOrder.forEach(r => sessionNewCards[r] = []);

        const initialNeededCards = rarityOrder.reduce((acc, rarity) => {
            acc[rarity] = cardData
                .filter(card => card.rarity === rarity && card.quantity === 0)
                .map(card => card.title);
            return acc;
        }, {});

        let sessionNeededCards = JSON.parse(JSON.stringify(initialNeededCards));

        const sessionStatsGrid = simulateView.querySelector('#session-stats-grid');
        const packResultsContainer = simulateView.querySelector('#pack-results-container');
        const simulatePackBtn = simulateView.querySelector('#simulate-pack-btn');
        const resetSessionBtn = simulateView.querySelector('#reset-session-btn');

        const renderSessionStats = () => {
            sessionStatsGrid.innerHTML = '';
            let statsContent = '';
            statsContent += `<div class="stat-item total-packs"><strong>Packs Opened:</strong> <span>${sessionStats.packsOpened}</span></div>`;
            rarityOrder.forEach(rarity => {
                const newCards = sessionNewCards[rarity];
                const newCount = newCards.length;
                const neededCards = sessionNeededCards[rarity];
                const neededCount = neededCards.length;

                let statusTextContent = '';

                // Tooltip for needed cards
                const neededTooltipContent = neededCards.join('<br>');
                const neededText = `<span class="needed-card-count">${neededCount} need<span class="tooltip">${neededTooltipContent}</span></span>`;

                // Tooltip for new cards
                const newTooltipContent = newCards.join('<br>');
                const newText = newCount > 0
                    ? `<span class="new-card-count">${newCount} new<span class="tooltip">${newTooltipContent}</span></span>`
                    : '0 new';

                if (initialNeededCards[rarity].length === 0) {
                    statusTextContent = ` <span class="collection-status complete-text">(complete)</span>`;
                } else if (neededCount === 0) {
                    statusTextContent = ` <span class="collection-status">(<span class="complete-text">complete</span> | ${newText})</span>`;
                } else {
                    statusTextContent = ` <span class="collection-status">(${neededText} | ${newText})</span>`;
                }

                statsContent += `
                    <div class="stat-item ${rarity.toLowerCase()}">
                        <span class="stat-rarity ${rarity.toLowerCase()}">${rarity}</span>
                        <div class="stat-value-container">
                            <span class="stat-value">${sessionStats[rarity]}</span>${statusTextContent}
                        </div>
                    </div>`;
            });
            sessionStatsGrid.innerHTML = statsContent;
        };

        simulatePackBtn.addEventListener('click', () => {
            const pack = openSimulatedPack();
            packResultsContainer.innerHTML = '';
            packResultsContainer.classList.add('tiny-mode'); // Use tiny-mode styling for the container

            sessionStats.packsOpened++;
            pack.forEach(card => {
                if (card) {
                    sessionStats[card.rarity]++;

                    // Check if the card is new to the user's permanent collection
                    const originalCard = cardData.find(c => c.title === card.title);
                    if (originalCard && originalCard.quantity === 0) {
                        // Add to the list of newly found unique cards for this session
                        if (!sessionNewCards[card.rarity].includes(card.title)) {
                            sessionNewCards[card.rarity].push(card.title);
                        }

                        // If this card was on the 'needed' list for the session, remove it
                        const indexInNeeded = sessionNeededCards[card.rarity].indexOf(card.title);
                        if (indexInNeeded > -1) {
                            sessionNeededCards[card.rarity].splice(indexInNeeded, 1);
                        }
                    }

                    const cardElement = createCardElement(card, false); // Not interactive
                    packResultsContainer.appendChild(cardElement);
                }
            });
            renderSessionStats();
        });

        resetSessionBtn.addEventListener('click', () => {
            sessionStats = { packsOpened: 0 };
            rarityOrder.forEach(r => sessionStats[r] = 0);
            sessionNewCards = {};
            rarityOrder.forEach(r => sessionNewCards[r] = []);
            sessionNeededCards = JSON.parse(JSON.stringify(initialNeededCards));
            packResultsContainer.innerHTML = '';
            renderSessionStats();
        });

        renderSessionStats(); // Initial render

        // Tab switching logic
        const tabButtons = popupContent.querySelectorAll('.tab-btn');
        const views = popupContent.querySelectorAll('.popup-view');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const viewId = button.dataset.view;
                views.forEach(view => {
                    if (view.id === viewId) {
                        view.classList.remove('hidden');
                    } else {
                        view.classList.add('hidden');
                    }
                });
            });
        });

        // --- Calculator View Logic ---
        const packsInput = document.getElementById('packs-input');
        const cardsInput = document.getElementById('cards-input');
        const chartCanvas = document.getElementById('distribution-chart');
        let distributionChart = null;

        const rarityColors = {
            "Common": "rgba(189, 195, 199, 1)",
            "Uncommon": "rgba(46, 204, 113, 1)",
            "Rare": "rgba(52, 152, 219, 1)",
            "Epic": "rgba(155, 89, 182, 1)",
            "Chaotic": "rgba(241, 196, 15, 1)",
            "Legendary": "rgba(230, 126, 34, 1)",
            "Eternal": "rgba(231, 76, 60, 1)"
        };

        const generateNormalDistribution = (mean, stdDev, steps = 100) => {
            const data = [];
            if (stdDev === 0) {
                // If stdDev is 0, it's a single point, not a distribution.
                // Represent it as a sharp spike.
                data.push({ x: mean - 1, y: 0 });
                data.push({ x: mean, y: 1 });
                data.push({ x: mean + 1, y: 0 });
                return data;
            }
            const minX = Math.max(0, mean - 3 * stdDev);
            const maxX = mean + 3 * stdDev;
            const stepSize = (maxX - minX) / steps;

            for (let i = 0; i <= steps; i++) {
                const x = minX + i * stepSize;
                // Use a normalized gaussian function where the peak is always 1.0
                const y = Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
                data.push({ x: x, y: y });
            }
            return data;
        };

        const updateDistributionChart = () => {
            const cardCount = parseFloat(cardsInput.value) || 0;
            const datasets = [];
            const graphModeToggle = document.querySelector('.graph-controls .switch-option.active');
            const graphMode = graphModeToggle ? graphModeToggle.dataset.graphType : 'total';

            let minX = Infinity;
            let maxX = -Infinity;

            rarityOrder.forEach(rarity => {
                const p = (rarityPercentages[rarity] || 0) / 100;
                const cardsInRarity = cardData.filter(c => c.rarity === rarity).length;
                let mean, stdDev;

                if (graphMode === 'total') {
                    mean = cardCount * p;
                    stdDev = Math.sqrt(cardCount * p * (1 - p));
                } else { // 'unique'
                    const n = cardCount * p; // Expected number of cards of this rarity
                    if (n === 0) {
                        mean = 0;
                        stdDev = 0;
                    } else {
                        // Ramanujan's approximation for E(C_k) - expected number of unique items
                        const lambda = n / cardsInRarity;
                        const e_lambda = Math.exp(-lambda);
                        mean = cardsInRarity * (1 - e_lambda);
                        // Variance approximation
                        const variance = cardsInRarity * e_lambda * (1 - (lambda + 1) * e_lambda);
                        stdDev = Math.sqrt(variance);
                    }
                }

                const lowerBound = Math.max(0, mean - 3 * stdDev);
                const upperBound = mean + 3 * stdDev;
                if (lowerBound < minX) minX = lowerBound;
                if (upperBound > maxX) maxX = upperBound;

                const data = generateNormalDistribution(mean, stdDev);
                datasets.push({
                    label: rarity,
                    data: data,
                    borderColor: rarityColors[rarity],
                    backgroundColor: rarityColors[rarity].replace('1)', '0.2)'),
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                });
            });

            const xAxisLabel = graphMode === 'total' ? 'Number of Cards' : 'Number of Unique Cards';

            if (!distributionChart) {
                const ctx = chartCanvas.getContext('2d');
                distributionChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                type: 'linear',
                                title: {
                                    display: true,
                                    text: 'Number of Cards'
                                },
                                min: Math.max(0, Math.floor(minX) - 1),
                                max: Math.ceil(maxX) + 1
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Relative Likelihood'
                                },
                                beginAtZero: true
                            }
                        },
                        plugins: {
                            tooltip: {
                                mode: 'index',
                                intersect: false,
                                callbacks: {
                                    title: function(tooltipItems) {
                                        return `~${tooltipItems[0].parsed.x.toFixed(2)} Cards`;
                                    },
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            // The y-value is now normalized (0 to 1), so this represents the percentage of the peak likelihood
                                            label += `${(context.parsed.y * 100).toFixed(2)}%`;
                                        }
                                        return label;
                                    }
                                }
                            },
                            legend: {
                                onClick: (e, legendItem, legend) => {
                                    const index = legendItem.datasetIndex;
                                    const ci = legend.chart;
                                    const meta = ci.getDatasetMeta(index);
                                    meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;

                                    let minX = Infinity;
                                    let maxX = -Infinity;

                                    ci.data.datasets.forEach((dataset, i) => {
                                        const meta = ci.getDatasetMeta(i);
                                        if (!meta.hidden) {
                                            dataset.data.forEach(point => {
                                                if (point.x < minX) minX = point.x;
                                                if (point.x > maxX) maxX = point.x;
                                            });
                                        }
                                    });

                                    if (isFinite(minX) && isFinite(maxX)) {
                                        ci.options.scales.x.min = Math.max(0, Math.floor(minX) - 1);
                                        ci.options.scales.x.max = Math.ceil(maxX) + 1;
                                    } else {
                                        // Handle case where all datasets are hidden
                                        ci.options.scales.x.min = 0;
                                        ci.options.scales.x.max = 10;
                                    }

                                    ci.update();
                                }
                            }
                        }
                    }
                });
            } else {
                distributionChart.data.datasets = datasets;
                distributionChart.options.scales.x.title.text = xAxisLabel;
                distributionChart.options.scales.x.min = Math.max(0, Math.floor(minX) - 1);
                distributionChart.options.scales.x.max = Math.ceil(maxX) + 1;
                distributionChart.update();
            }
        };

        const graphModeToggle = calculatorView.querySelector('.graph-controls .toggle-switch');
        graphModeToggle.addEventListener('click', (e) => {
            const selectedOption = e.target.closest('.switch-option');
            if (!selectedOption || selectedOption.classList.contains('active')) {
                return;
            }
            graphModeToggle.querySelector('.active').classList.remove('active');
            selectedOption.classList.add('active');
            updateDistributionChart();
        });

        packsInput.addEventListener('input', () => {
            const packs = parseFloat(packsInput.value) || 0;
            cardsInput.value = Math.round(packs * 7);
            updateDistributionChart();
        });

        cardsInput.addEventListener('input', () => {
            const cards = parseFloat(cardsInput.value) || 0;
            packsInput.value = (cards / 7).toFixed(2);
            updateDistributionChart();
        });

        updateDistributionChart();
    };

    const updateSectionProgressBar = (rarity, filteredCards, progressBar, progressText, progressBarElement) => {
        const total = filteredCards.length;
        if (showDupesCheck.checked) {
            progressText.textContent = `${filteredCards.reduce((sum, c) => sum + (c.quantity > 1 ? c.quantity - 1 : 0), 0)} (Over ${total} ${cardPlural(total)})`;
            progressText.style.fontSize = '32px';
            progressBarElement.style.background = 'none';
            progressBarElement.style.border = 'none';
            progressBarElement.style.height = 'auto';
            progressBarElement.parentElement.style.width = 'auto';
        }
        else if (showMissingCheck.checked) {
            progressText.textContent = total;
            progressText.style.fontSize = '32px';
            progressBarElement.style.background = 'none';
            progressBarElement.style.border = 'none';
            progressBarElement.style.height = 'auto';
            progressBarElement.parentElement.style.width = 'auto';
        }
        else {
            const owned = filteredCards.filter(c => c.quantity > 0).length;
            const percentage = total > 0 ? (owned / total) * 100 : 0;
            progressText.textContent = `${owned} / ${total}`;
            progressBar.style.width = `${percentage}%`;
        }
    };

    const cardPlural = (count) => {
        return count === 1 ? 'card' : 'cards';
    };

    const updateSetSectionProgressBar = (setName, filteredCards, progressBar, progressText, cardsInSet) => {
        const total = cardsInSet.length;
        const owned = cardsInSet.filter(c => c.quantity > 0).length;
        const percentage = total > 0 ? (owned / total) * 100 : 0;

        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${owned} / ${total}`;
    };

    const loadAndGroupCards = async () => {
        try {
            const response = await fetch('data/card-data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            cardData = await response.json();

            const allSetsList = new Set();
            cardData.forEach(card => {
                if (card.sets) {
                    card.sets.forEach(set => allSetsList.add(set));
                }
            });
            allSets = Array.from(allSetsList).sort();
            activeSets = [...allSets];

            sessionStorage.removeItem('collectionData');
            const savedQuantitiesJSON = sessionStorage.getItem('collectionQuantities');

            if (savedQuantitiesJSON) {
                const savedQuantities = JSON.parse(savedQuantitiesJSON);
                if (cardData.length === savedQuantities.length) {
                    cardData.forEach((card, index) => {
                        card.quantity = savedQuantities[index];
                    });
                } else {
                    console.warn('Saved quantities data length mismatch. Ignoring.');
                }
            }
        } catch (error) {
            console.error('Error loading or processing card data:', error);
            cardGrid.innerHTML = '<p class="error-message">Could not load card collection. Please try again later.</p>';
        }
    };

    loadAndGroupCards().then(() => {
        createRarityProgressBars();
        updateAllRarityProgressBars();
        updateProgressBar();
        performSearch();
    });

    const saveOnsiteBtn = document.getElementById('save-collection-btn');
    const downloadBtn = document.getElementById('download-collection-btn');
    const extrasBtn = document.getElementById('extras-btn');

    extrasBtn.addEventListener('click', showExtrasPopup);

    saveOnsiteBtn.addEventListener('click', () => {
        const dbRequest = indexedDB.open('ChrissyCardsDB', 2);
        dbRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('collections')) {
                db.createObjectStore('collections', { keyPath: 'id' });
            }
        };
        dbRequest.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['collections'], 'readwrite');
            const store = transaction.objectStore('collections');
            const quantities = cardData.map(c => c.quantity);
            store.put({ id: 'userCollectionQuantities', data: quantities });
            transaction.oncomplete = () => {
                showPopup('<h2>Collection Saved!</h2><p>Your collection has been saved locally.</p>');
            };
        };
        dbRequest.onerror = (event) => {
            console.error('IndexedDB error:', event.target.errorCode);
            showPopup('<h2>Save Failed</h2><p>Could not save the collection. See console for details.</p>');
        };
    });

    downloadBtn.addEventListener('click', () => {
        const quantities = cardData.map(c => c.quantity);
        const dataStr = JSON.stringify(quantities, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const downloadLink = document.createElement('a');
        downloadLink.setAttribute('href', dataUri);
        downloadLink.setAttribute('download', 'card-quantities.json');
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });

    const searchByTitleCheck = document.getElementById('search-by-title');
    const searchByTextCheck = document.getElementById('search-by-text');
    const tinyModeCheck = document.getElementById('tiny-mode-check');
    const showHeldCheck = document.getElementById('show-held-check');
    const showDupesCheck = document.getElementById('show-dupes-check');
    const showMissingCheck = document.getElementById('show-missing-check');

    const performSearch = () => {
        checkFilters();
        const searchTerm = searchBar.value.toLowerCase();
        const searchByTitle = searchByTitleCheck.checked;
        const searchByText = searchByTextCheck.checked;
        const showHeldOnly = showHeldCheck.checked;
        const showDupesOnly = showDupesCheck.checked;
        const showMissingOnly = showMissingCheck.checked;

        let filteredCards = cardData;

        if (searchTerm.length >= 3) {
            filteredCards = filteredCards.filter(card => {
                const titleMatch = searchByTitle && card.title.toLowerCase().includes(searchTerm);
                const textMatch = searchByText && card.text.toLowerCase().includes(searchTerm);
                return titleMatch || textMatch;
            });
        }

        if (showHeldOnly) {
            filteredCards = filteredCards.filter(card => card.quantity > 0);
        }
        if (showDupesOnly) {
            filteredCards = filteredCards.filter(card => card.quantity > 1);
        }
        if (showMissingOnly) {
            filteredCards = filteredCards.filter(card => card.quantity === 0);
        }

        renderCards(filteredCards);
    };

    const checkFilters = () => {
        const isRarityMode = groupByMode.value === 'rarity';
        const searchByTitle = searchByTitleCheck.checked;
        const searchByText = searchByTextCheck.checked;
        const sortMode = sortBySelect.value;

        const isDefault = isRarityMode &&
            activeSets.length === allSets.length &&
            !splitByRarityCheck.checked &&
            searchBar.value === '' &&
            searchByTitle &&
            !searchByText &&
            !tinyModeCheck.checked &&
            !showHeldCheck.checked &&
            !showDupesCheck.checked &&
            !showMissingCheck.checked &&
            sortMode === 'default';

        resetFiltersBtn.disabled = isDefault;
    };

    const resetFilters = () => {
        // Reset grouping
        groupByMode.value = 'rarity';
        toggleSwitch.querySelector('.switch-option[data-group="sets"]').classList.remove('active');
        toggleSwitch.querySelector('.switch-option[data-group="rarity"]').classList.add('active');
        setsFilterBtn.disabled = true;
        splitByRarityCheck.disabled = true;
        splitByRarityCheck.checked = false;

        // Reset sorting
        sortBySelect.value = 'default';

        // Reset sets filter
        activeSets = [...allSets];

        // Reset search
        searchBar.value = '';
        clearSearchBtn.style.display = 'none';
        searchByTitleCheck.checked = true;
        searchByTextCheck.checked = false;

        // Reset checkboxes
        tinyModeCheck.checked = false;
        showHeldCheck.checked = false;
        showDupesCheck.checked = false;
        showMissingCheck.checked = false;

        cardGrid.classList.remove('tiny-mode');
        performSearch();
        checkFilters();
    };

    resetFiltersBtn.addEventListener('click', resetFilters);
    sortBySelect.addEventListener('change', performSearch);

    searchBar.addEventListener('input', () => {
        performSearch();
        clearSearchBtn.style.display = searchBar.value ? 'block' : 'none';
        checkFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchBar.value = '';
        clearSearchBtn.style.display = 'none';
        performSearch();
    });

    searchByTitleCheck.addEventListener('change', performSearch);
    searchByTextCheck.addEventListener('change', performSearch);
    showHeldCheck.addEventListener('change', () => {
        if (showHeldCheck.checked) {
            showDupesCheck.checked = false;
            showMissingCheck.checked = false;
        }
        performSearch();
    });
    showDupesCheck.addEventListener('change', () => {
        if (showDupesCheck.checked) {
            showHeldCheck.checked = false;
            showMissingCheck.checked = false;
        }
        performSearch();
    });
    showMissingCheck.addEventListener('change', () => {
        if (showMissingCheck.checked) {
            showHeldCheck.checked = false;
            showDupesCheck.checked = false;
        }
        performSearch();
    });

    tinyModeCheck.addEventListener('change', () => {
        cardGrid.classList.toggle('tiny-mode', tinyModeCheck.checked);
        checkFilters();
    });

    splitByRarityCheck.addEventListener('change', performSearch);

    toggleSwitch.addEventListener('click', (e) => {
        const selectedOption = e.target.closest('.switch-option');
        if (!selectedOption || selectedOption.classList.contains('active')) {
            return;
        }

        const currentActive = toggleSwitch.querySelector('.active');
        currentActive.classList.remove('active');
        selectedOption.classList.add('active');

        const newMode = selectedOption.dataset.group;
        groupByMode.value = newMode;


        const isRarityMode = newMode === 'rarity';
        setsFilterBtn.disabled = isRarityMode;
        splitByRarityCheck.disabled = isRarityMode;
        if (isRarityMode) {
            splitByRarityCheck.checked = false;
        }

        performSearch();
    });

    setsFilterBtn.addEventListener('click', () => {
        const popupContent = document.createElement('div');
        popupContent.innerHTML = '<h2>Filter Sets</h2>';

        const filterGrid = document.createElement('div');
        filterGrid.classList.add('sets-filter-grid');

        allSets.forEach(set => {
            const cardsInSet = cardData.filter(card => card.sets && card.sets.includes(set));
            const total = cardsInSet.length;
            const owned = cardsInSet.filter(c => c.quantity > 0).length;
            const percentage = total > 0 ? (owned / total) * 100 : 0;

            const option = document.createElement('div');
            option.classList.add('set-filter-option');
            option.dataset.set = set;
            if (activeSets.includes(set)) {
                option.classList.add('selected');
            }

            const progressFill = document.createElement('div');
            progressFill.classList.add('set-filter-progress');
            progressFill.style.width = `${percentage}%`;

            const optionText = document.createElement('span');
            optionText.classList.add('set-filter-text');
            optionText.textContent = set;

            const counter = document.createElement('span');
            counter.classList.add('set-filter-counter');
            counter.textContent = `${owned} / ${total}`;

            option.appendChild(progressFill);
            option.appendChild(optionText);
            option.appendChild(counter);

            option.addEventListener('click', () => {
                option.classList.toggle('selected');
            });
            filterGrid.appendChild(option);
        });

        popupContent.appendChild(filterGrid);

        const actionsContainer = document.createElement('div');
        actionsContainer.classList.add('popup-actions');

        const enableAllBtn = document.createElement('button');
        enableAllBtn.textContent = 'Enable All';
        enableAllBtn.classList.add('btn', 'btn-blue');
        enableAllBtn.addEventListener('click', () => {
            filterGrid.querySelectorAll('.set-filter-option').forEach(opt => {
                opt.classList.add('selected');
            });
        });

        const disableAllBtn = document.createElement('button');
        disableAllBtn.textContent = 'Disable All';
        disableAllBtn.classList.add('btn', 'btn-blue', 'disable-all');
        disableAllBtn.addEventListener('click', () => {
            filterGrid.querySelectorAll('.set-filter-option').forEach(opt => {
                opt.classList.remove('selected');
            });
        });

        actionsContainer.appendChild(enableAllBtn);
        actionsContainer.appendChild(disableAllBtn);
        popupContent.appendChild(actionsContainer);

        // Create the second row of buttons (Apply/Cancel)
        const confirmationContainer = document.createElement('div');
        confirmationContainer.classList.add('popup-buttons');

        const applyBtn = document.createElement('button');
        applyBtn.textContent = 'Apply';
        applyBtn.classList.add('btn', 'btn-green');
        applyBtn.addEventListener('click', () => {
            const selectedOptions = filterGrid.querySelectorAll('.set-filter-option.selected');
            activeSets = Array.from(selectedOptions).map(opt => opt.dataset.set);
            performSearch();
            document.querySelector('.popup-overlay').remove(); // Manually close popup
            checkFilters();
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.classList.add('btn', 'btn-red');
        cancelBtn.addEventListener('click', () => {
            document.querySelector('.popup-overlay').remove(); // Manually close popup
        });

        confirmationContainer.appendChild(applyBtn);
        confirmationContainer.appendChild(cancelBtn);
        popupContent.appendChild(confirmationContainer);

        // Call showPopup with an empty buttons array, as we've handled them manually
        showPopup(popupContent, [], 'sets-filter-popup');
    });

    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        sidebarToggle.classList.toggle('open');
    });

    // Close sidebar if clicking outside of it
    document.addEventListener('click', (e) => {
        // Check if the click is outside the sidebar AND outside the toggle button
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('open');
            sidebarToggle.classList.remove('open');
        }
    });
});
