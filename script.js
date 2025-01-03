// Game state
const gameState = {
    currentPosition: 0,
    turn: 0,
    isGameStarted: false,
    hexagons: [],
    stats: {
        RD: 0,  // Roll Dice
        BT: 0,  // Bounty
        GD: 0,  // Gold
        CS: 10,  // Coins
        SP: 0,  // Sleep
        HP: 0   // Health Points
    },
    diceS: 0, // Dice value
    finalS: 0, // Final move value
    diceS2: 0,
    activeBuffs: [],
    selectedHero: null,
    inventory: new Array(5).fill(null),
    shopItems: [], // Array to store all created items
    availableItemImages: [],
    activeMissions: [], // Array to store active missions // Will store unused item image paths
    timer: {
        startTime: null, // When the timer started
        elapsedTime: 0, // Total elapsed time in milliseconds
        isRunning: false, // Whether the timer is currently running
    },
    Runes: {
        bless: [],
        curse: []
    },
};

// Constants
const SQUARE_SIZE = 40;
const GRID_WIDTH = 5;
const INITIAL_SQUARES = 10;

// Initialize D3 hexagon grid
const svg = d3.select('#hex-grid')
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%');

const hexagonGroup = svg.append('g');

function initializeHexGrid() {
    gameState.hexagons = [];
    const startX = SQUARE_SIZE * 2;
    const startY = svg.node().getBoundingClientRect().height - SQUARE_SIZE * 2;
    
    for (let i = 0; i < INITIAL_SQUARES; i++) {
        const square = {
            id: i,
            x: startX + 120,
            y: startY - (i * SQUARE_SIZE * 1.2), // 1.2 for some spacing between squares
            mission: null
        };
        
        gameState.hexagons.push(square);
    }
    
    drawHexGrid();
    addPlayerToken();
}

function addPlayerToken() {
    hexagonGroup.selectAll('.player-token').remove();
    
    const currentSquare = gameState.hexagons[gameState.currentPosition];
    hexagonGroup.append('circle')
        .attr('class', 'player-token')
        .attr('cx', currentSquare.x)
        .attr('cy', currentSquare.y)
        .attr('r', SQUARE_SIZE/3)
        .attr('fill', 'red');
}

function drawHexGrid() {
    const squares = hexagonGroup.selectAll('.square-group')
        .data(gameState.hexagons, d => d.id);

    // Enter new square groups
    const squareEnter = squares.enter()
        .append('g')
        .attr('class', 'square-group');

    // Add square rectangles
    squareEnter.append('rect')
        .attr('class', 'hexagon') // keeping class name for compatibility
        .attr('x', d => d.x - SQUARE_SIZE/2)
        .attr('y', d => d.y - SQUARE_SIZE/2)
        .attr('width', SQUARE_SIZE)
        .attr('height', SQUARE_SIZE)
        .attr('data-id', d => d.id);

    // Add cell numbers
    squareEnter.append('text')
        .attr('class', 'cell-number')
        .attr('x', d => d.x)
        .attr('y', d => d.y)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .text(d => d.id);

    // Update existing squares
    squares.select('.hexagon')
        .attr('x', d => d.x - SQUARE_SIZE/2)
        .attr('y', d => d.y - SQUARE_SIZE/2);

    squares.select('.cell-number')
        .attr('x', d => d.x)
        .attr('y', d => d.y);

    // Remove old squares
    squares.exit().remove();

    // Add event listeners
    squareEnter.select('.hexagon')
        .on('click', handleHexagonClick)
        .on('mouseover', handleHexagonHover)
        .on('mouseout', handleHexagonHoverEnd);

    // Ensure the player token is always on top
    addPlayerToken();
}

// Event Handlers
function handleHexagonClick(event, d) {
    if (!gameState.isGameStarted) {
        // Before the game starts, allow editing the mission
        showEditMissionModal(d);
    } else {
        // After the game starts, show the "Move" option
        showMoveOptionModal(d);
    }
}

function handleHexagonHover(event, d) {
    if (d.mission) {
        document.getElementById('hover-mission').innerHTML = `
            <h4>Cell ${d.id} Mission:</h4>
            <p><strong>Condition:</strong> ${d.mission.condition}</p>
            <p><strong>Reward:</strong> ${d.mission.reward}</p>
            <p><strong>Punishment:</strong> ${d.mission.punishment}</p>
        `;
    }
}

function handleHexagonHoverEnd() {
    document.getElementById('hover-mission').innerHTML = '';
}

// Modal handling
function showEditMissionModal(hexagon) {
    const modal = document.getElementById('edit-mission-modal');
    modal.style.display = 'block';
    
    // Pre-fill existing mission if it exists
    if (hexagon.mission) {
        document.getElementById('mission-condition').value = hexagon.mission.condition;
        document.getElementById('mission-reward').value = hexagon.mission.reward;
        document.getElementById('mission-punishment').value = hexagon.mission.punishment;
    } else {
        document.getElementById('mission-condition').value = '';
        document.getElementById('mission-reward').value = '';
        document.getElementById('mission-punishment').value = '';
    }

    // Save button handler
    document.getElementById('save-mission').onclick = () => {
        hexagon.mission = {
            condition: document.getElementById('mission-condition').value,
            reward: document.getElementById('mission-reward').value,
            punishment: document.getElementById('mission-punishment').value
        };
        modal.style.display = 'none';
    };

    document.getElementById('cancel-mission-edit').onclick = () => {
        modal.style.display = 'none';
    };
}

function scrollToBottom() {
    const container = document.querySelector('.path-container');
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

// Initialize the game
function init() {
    initializeHexGrid();
    initializeShop();
    setupEventListeners();
    setupDragScroll();
    scrollToBottom(); // Scroll to the bottom when the game starts
    updateShopDisplay();
    updateTimerDisplay(); // Initialize the timer display
    updateBlessDisplay(); // Initialize bless display
    updateCurseDisplay(); // Initialize curse display
}

// Setup event listeners for game controls
function setupEventListeners() {
    document.getElementById('start-game').addEventListener('click', startGame);
    document.getElementById('start-turn').addEventListener('click', startTurn);
    document.getElementById('roll-dice').addEventListener('click', rollDice);
    document.getElementById('roll-dice2').addEventListener('click', rollDice2);
    document.getElementById('move-token').addEventListener('click', moveToken);
    document.getElementById('move-token2').addEventListener('click', moveToken2);
    document.getElementById('end-turn').addEventListener('click', endTurn);
    document.getElementById('make-changes').addEventListener('click', showChangeStatsModal);
    document.getElementById('add-hexagon').addEventListener('click', addHexagon);
    document.getElementById('import-rules').addEventListener('click', importRules);
    document.getElementById('export-rules').addEventListener('click', exportRules);
    document.getElementById('add-item').addEventListener('click', showAddItemModal);
    document.getElementById('save-game').addEventListener('click', saveGame);
    document.getElementById('load-game').addEventListener('click', loadGame);
}

// Implement drag scrolling for the hex grid
function setupDragScroll() {
    let isDragging = false;
    let startY = 0;
    let scrollTop = 0;

    const container = document.querySelector('.path-container');

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        startY = e.pageY - container.offsetTop;
        scrollTop = container.scrollTop;
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const y = e.pageY - container.offsetTop;
        const walk = (y - startY) * 2;
        container.scrollTop = scrollTop - walk;
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
    });

    container.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

// Game control functions
function startGame() {
    showHeroSelection();
    startTimer(); // Start the timer when the game starts
}

function showHeroSelection() {
    const modal = document.getElementById('hero-select-modal');
    const heroOptions = document.getElementById('hero-options');
    
    heroOptions.innerHTML = `
        <div class="hero-option" data-hero="1">
            <img src="assets/img1.webp" alt="Hero 1">
            <h3>Снежный Барон</h3>
            <p>Каждые 4 выбивания игроков в лобби дает доп бросок</p>
        </div>
        <div class="hero-option" data-hero="2">
            <img src="assets/img2.webp" alt="Hero 2">
            <h3>Успешный Мыловар</h3>
            <p>Максимальное количество триплетов 10 за игру и +20 хп</p>
        </div>
        <div class="hero-option" data-hero="3">
            <img src="assets/img3.webp" alt="Hero 3">
            <h3>Авантюристка</h3>
            <p>Получает в 2 раза больше урона и в 2 раза меньше хила, бросает 2 кубика каждый ход и ходит одним из них</p>
        </div>
    `;

    modal.style.display = 'block';

    const options = document.querySelectorAll('.hero-option');
    options.forEach(option => {
        option.addEventListener('click', () => {
            selectHero(option.dataset.hero);
            modal.style.display = 'none';
        });
    });
}

// Hero selection and stats management
function selectHero(heroId) {
    gameState.selectedHero = heroId;
    gameState.isGameStarted = true;
    
    // Initialize hero stats based on selection
    switch(heroId) {
        case "1": // Warrior
            gameState.stats.HP = 200;
            break;
        case "2": // Mage
            gameState.stats.HP = 220;
            break;
        case "3": // Rogue
            gameState.stats.HP = 200;
            break;
    }
    
    updateHeroDisplay();
    enableGameControls();
}

function updateHeroDisplay() {
    const heroWindow = document.getElementById('hero-window');
    const statsHtml = Object.entries(gameState.stats)
        .map(([key, value]) => `<div>${key}: ${value}</div>`)
        .join('');
    
    document.getElementById('hero-stats').innerHTML = statsHtml;
    document.getElementById('hero-image').innerHTML = 
        `<img src="assets/img${gameState.selectedHero}.webp" alt="Selected Hero">`;
    
    // Initialize item slots
    const itemSlotsContainer = document.getElementById('item-slots');
    itemSlotsContainer.innerHTML = Array(5)
        .fill('')
        .map((_, i) => `<div class="item-slot" data-slot="${i}"></div>`)
        .join('');
        
    // Update inventory display after initializing slots
    updateInventoryDisplay();
}

// Game turn management
function startTurn() {
    gameState.turn++;
    document.getElementById('turn-display').textContent = `Turn: ${gameState.turn}`;
    document.getElementById('roll-dice').disabled = false;
    resumeTimer(); // Resume the timer when the turn starts
}

function showChangeStatsModal() {
    const modal = document.getElementById('change-stats-modal');
    modal.style.display = 'block';
    
    document.getElementById('save-changes').onclick = () => {
        updateStats();
        modal.style.display = 'none';
    };
    
    document.getElementById('cancel-changes').onclick = () => {
        modal.style.display = 'none';
    };
}

function updateStats() {
    const stats = ['bt', 'gd', 'cs', 'sp', 'hp'];
    stats.forEach(stat => {
        const change = parseInt(document.getElementById(`${stat}-change`).value) || 0;
        gameState.stats[stat.toUpperCase()] += change;
        document.getElementById(`${stat}-change`).value = '';
    });
    updateHeroDisplay();
}

// Dice rolling and movement
function rollDice() {
    // Roll the dice
    const roll = Math.floor(Math.random() * 6) + 1;
    gameState.stats.RD = roll;
    gameState.diceS = roll;
    gameState.finalS = roll;

    // Apply any active effects that modify RD (only if there are active buffs)
    if (gameState.activeBuffs.length > 0) {
        const finalRoll = evaluateFormula(gameState.stats.RD.toString());
        gameState.stats.RD = finalRoll;
        gameState.finalS = finalRoll;
    }

    //enable the move token button
    document.getElementById('move-token').disabled = false;

    updateDiceStats();
}   

function updateDiceStats() {
    document.getElementById('diceS').textContent = gameState.diceS;
}

function moveToken() {
    const maxPosition = gameState.hexagons.length - 1; // Last cell index
    const newPosition = gameState.currentPosition + gameState.stats.RD;

    // If the new position exceeds the last cell, set it to the last cell
    if (newPosition > maxPosition) {
        gameState.currentPosition = maxPosition;
    } else {
        gameState.currentPosition = newPosition;
    }

    const currentHex = gameState.hexagons[gameState.currentPosition];

    // Move the token
    hexagonGroup.select('.player-token')
        .attr('cx', currentHex.x)
        .attr('cy', currentHex.y);

    // Activate mission if it exists
    if (currentHex.mission) {
        activateMission(currentHex);
    }

    document.getElementById('end-turn').disabled = false;
}

function rollDice2() {
    const roll2 = Math.floor(Math.random() * 6) + 1;
    gameState.diceS2 = roll2;
    
    updateDiceStats2();
}   

function updateDiceStats2() {
    document.getElementById('diceS2').textContent = gameState.diceS2;
}

function moveToken2() {
    const maxPosition = gameState.hexagons.length - 1; // Last cell index
    const newPosition = gameState.currentPosition + gameState.diceS2;

    // If the new position exceeds the last cell, set it to the last cell
    if (newPosition > maxPosition) {
        gameState.currentPosition = maxPosition;
    } else {
        gameState.currentPosition = newPosition;
    }

    const currentHex = gameState.hexagons[gameState.currentPosition];

    // Move the token
    hexagonGroup.select('.player-token')
        .attr('cx', currentHex.x)
        .attr('cy', currentHex.y);

    // Activate mission if it exists
    if (currentHex.mission) {
        activateMission(currentHex);
    }

    document.getElementById('end-turn').disabled = false;
}

function updateTokenPosition() {
    const currentHex = gameState.hexagons[gameState.currentPosition];
    
    // Update token position
    hexagonGroup.select('.player-token')
        .attr('cx', currentHex.x)
        .attr('cy', currentHex.y);
        
    // Update hexagon highlighting
    d3.selectAll('.hexagon').classed('active', false);
    d3.select(`.hexagon[data-id="${gameState.currentPosition}"]`)
        .classed('active', true);
}

// Mission handling
function activateMission(hexagon) {
    if (hexagon.mission) {
        // Add the mission to the activeMissions array
        gameState.activeMissions.push(hexagon.mission);

        // Update the mission list display
        updateMissionList();
    }
}

function completeMission(missionIndex, success) {
    const mission = gameState.activeMissions[missionIndex];
    if (mission) {
        const formula = success ? mission.reward : mission.punishment;
        evaluateAndApplyFormula(formula);

        // Remove the completed mission from the activeMissions array
        gameState.activeMissions.splice(missionIndex, 1);

        // Update the mission list display
        updateMissionList();

        // Update the hero display to reflect any stat changes
        updateHeroDisplay();

        // Check if the completed mission is the last cell's mission
        const lastCell = gameState.hexagons[gameState.hexagons.length - 1];
        if (lastCell.mission && mission === lastCell.mission) {
            showVictoryMessage();
        }
    }
}

function cancelMission() {
    document.getElementById('mission-list').innerHTML = '';
}

function updateMissionList() {
    const missionList = document.getElementById('mission-list');
    
    // Clear the existing content
    missionList.innerHTML = '';

    // Create and append the heading
    const heading = document.createElement('h3');
    heading.textContent = 'Active Missions';
    missionList.appendChild(heading);

    // Loop through active missions and create elements for each
    gameState.activeMissions.forEach((mission, index) => {
        const missionContainer = document.createElement('div');
        missionContainer.className = 'active-mission';

        // Create and append the mission title
        const missionTitle = document.createElement('h4');
        missionTitle.textContent = `Mission ${index + 1}:`;
        missionContainer.appendChild(missionTitle);

        // Create and append the condition
        const condition = document.createElement('p');
        condition.innerHTML = `<strong>Condition:</strong> ${mission.condition}`;
        missionContainer.appendChild(condition);

        // Create and append the reward
        const reward = document.createElement('p');
        reward.innerHTML = `<strong>Reward:</strong> ${mission.reward}`;
        missionContainer.appendChild(reward);

        // Create and append the punishment
        const punishment = document.createElement('p');
        punishment.innerHTML = `<strong>Punishment:</strong> ${mission.punishment}`;
        missionContainer.appendChild(punishment);

        // Create and append the "Complete" button
        const completeButton = document.createElement('button');
        completeButton.textContent = 'Complete';
        completeButton.addEventListener('click', () => completeMission(index, true));
        missionContainer.appendChild(completeButton);

        // Create and append the "Fail" button
        const failButton = document.createElement('button');
        failButton.textContent = 'Fail';
        failButton.addEventListener('click', () => completeMission(index, false));
        missionContainer.appendChild(failButton);

        // Create and append the "Cancel" button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.addEventListener('click', () => cancelMission(index));
        missionContainer.appendChild(cancelButton);

        // Append the mission container to the mission list
        missionList.appendChild(missionContainer);
    });
}

function cancelMission(missionIndex) {
    // Remove the mission from the activeMissions array
    gameState.activeMissions.splice(missionIndex, 1);

    // Update the mission list display
    updateMissionList();
}

// Formula evaluation
function evaluateFormula(formula) {
    // Replace stat variables with their values
    let evaluatedFormula = formula;
    Object.entries(gameState.stats).forEach(([key, value]) => {
        evaluatedFormula = evaluatedFormula.replace(
            new RegExp(key, 'g'), 
            value.toString()
        );
    });
    
    try {
        return Function(`return ${evaluatedFormula}`)();
    } catch (e) {
        console.error('Formula evaluation error:', e);
        return 0;
    }
}

function evaluateAndApplyFormula(formula) {
    // Check if the formula contains the "rdItem" keyword
    const rdItemMatch = formula.match(/rdItem\s*(\d+)/i);
    if (rdItemMatch) {
        const numberOfItems = parseInt(rdItemMatch[1], 10); // Extract the number of items
        if (!isNaN(numberOfItems) && numberOfItems > 0) {
            for (let i = 0; i < numberOfItems; i++) {
                const randomItem = getRandomShopItem();
                if (randomItem) {
                    addItemToInventory(randomItem);
                }
            }
        }
        return; // Exit after handling rdItem
    }
    // Replace variables in the formula with their actual values
    let evaluatedFormula = formula
        .replace(/currentPosition/g, gameState.currentPosition)
        .replace(/RD/g, gameState.stats.RD)
        .replace(/BT/g, gameState.stats.BT)
        .replace(/GD/g, gameState.stats.GD)
        .replace(/CS/g, gameState.stats.CS)
        .replace(/SP/g, gameState.stats.SP)
        .replace(/HP/g, gameState.stats.HP);

    // Evaluate the formula
    try {
        const result = Function(`return ${evaluatedFormula}`)();
        
        // If the formula affects currentPosition, update it
        if (formula.includes("currentPosition")) {
            gameState.currentPosition = Math.max(0, result); // Ensure position doesn't go below 0
            updateTokenPosition(); // Move the token to the new position
        } else {
            // Otherwise, assume it's a stat update
            const statRegex = /(RD|BT|GD|CS|SP|HP)\s*([+\-*/])\s*(\d+)/g;
            let match;
            while ((match = statRegex.exec(formula)) !== null) {
                const [_, stat, operator, value] = match;
                const numValue = parseFloat(value); // Use parseFloat to handle decimals
                switch (operator) {
                    case '+':
                        gameState.stats[stat] += numValue;
                        break;
                    case '-':
                        gameState.stats[stat] -= numValue;
                        break;
                    case '*':
                        gameState.stats[stat] *= numValue;
                        break;
                    case '/':
                        gameState.stats[stat] /= numValue;
                        break;
                }
            }
        }
    } catch (e) {
        console.error('Formula evaluation error:', e);
    }
}

// Import/Export functionality
function exportRules() {
    const gameRules = {
        hexagons: gameState.hexagons,
        shopItems: gameState.shopItems,
        bless: gameState.Runes.bless,
        curse: gameState.Runes.curse
    };
    
    const dataStr = JSON.stringify(gameRules);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'game-rules.json');
    exportLink.click();
}

function importRules() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = event => {
            const rules = JSON.parse(event.target.result);
            gameState.hexagons = rules.hexagons;
            gameState.shopItems = rules.shopItems || [];
            gameState.Runes.bless = rules.bless || [];
            gameState.Runes.curse = rules.curse || [];
            drawHexGrid();
            initializeShop();
            updateBlessDisplay();
            updateCurseDisplay();
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Helper functions
function enableGameControls() {
    document.getElementById('start-game').style.display = 'none';
    document.getElementById('import-rules').style.display = 'none';
    document.getElementById('export-rules').style.display = 'none';
    document.getElementById('start-turn').disabled = false;
}

function endTurn() {
    document.getElementById('start-turn').disabled = false;
    pauseTimer(); // Pause the timer when the turn ends
}

function addHexagon() {
    const lastSquare = gameState.hexagons[gameState.hexagons.length - 1];
    const newId = gameState.hexagons.length;
    
    const newSquare = {
        id: newId,
        x: lastSquare.x, // Same X as previous square
        y: lastSquare.y - (SQUARE_SIZE * 1.2), // Move up by square size plus spacing
        mission: null
    };
    
    gameState.hexagons.push(newSquare);
    drawHexGrid();
}

// Add these functions for shop management
function initializeShop() {
    // Initialize available item images (assuming we have 20 items)
    for (let i = 1; i <= 20; i++) {
        gameState.availableItemImages.push(`items/item${i}.jpeg`);
    }
    
    // Remove images that are already used by existing items
    gameState.shopItems.forEach(item => {
        const index = gameState.availableItemImages.indexOf(item.image);
        if (index > -1) {
            gameState.availableItemImages.splice(index, 1);
        }
    });

    updateShopDisplay();
}

// Add these variables to track the selected item
let selectedItemIndex = null;

// Update the shop display function
function updateShopDisplay() {
    const shopGrid = document.getElementById('shop-items-grid');
    shopGrid.innerHTML = '';

    gameState.shopItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'shop-item';
        itemElement.dataset.itemIndex = index;
        itemElement.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
        `;
        itemElement.addEventListener('click', () => selectItem(index));
        itemElement.addEventListener('mouseover', () => showItemDetails(item));
        itemElement.addEventListener('mouseout', () => hideItemDetails());
        shopGrid.appendChild(itemElement);
    });  
}

// Function to select an item
function selectItem(index) {
    selectedItemIndex = index;
    document.getElementById('buy-item').disabled = false;
    updateShopDisplay();
}

// Function to show item details on hover
function showItemDetails(item) {
    const itemDetails = document.getElementById('item-details');
    itemDetails.innerHTML = `
        <h4>${item.name}</h4>
        <p>${item.description}</p>
        <p>Price: ${item.price} CS</p>
    `;
}

// Function to hide item details
function hideItemDetails() {
    document.getElementById('item-details').innerHTML = '';
}

// Function to handle the buy button click
document.getElementById('buy-item').addEventListener('click', () => {
    if (selectedItemIndex !== null) {
        buyItem(selectedItemIndex);
        selectedItemIndex = null;
        document.getElementById('buy-item').disabled = true;
    }
});


function showAddItemModal() {
    const modal = document.getElementById('add-item-modal');
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    let html = `
        <h2>Add New Item</h2>
        <div class="image-selection">
            <h3>Select Image:</h3>
            <div class="image-grid">
    `;
    
    // Display available images
    gameState.availableItemImages.forEach(imagePath => {
        html += `
            <div class="image-option">
                <img src="${imagePath}" alt="Item Image" data-image="${imagePath}">
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        <div class="item-details">
            <input type="text" id="item-name" placeholder="Item Name">
            <textarea id="item-description" placeholder="Item Description (use formulas like RD*2)"></textarea>
            <input type="number" id="item-price" placeholder="Price in Coins (CS)" min="0">
            <button id="save-item">Save Item</button>
            <button id="cancel-item">Cancel</button>
        </div>
    `;
    
    modalContent.innerHTML = html;
    modal.innerHTML = '';
    modal.appendChild(modalContent);
    modal.style.display = 'block';
    
    // Add event listeners
    const images = modalContent.querySelectorAll('.image-option img');
    let selectedImage = null;
    
    images.forEach(img => {
        img.addEventListener('click', () => {
            images.forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            selectedImage = img.dataset.image;
        });
    });
    
    document.getElementById('save-item').addEventListener('click', () => {
        const name = document.getElementById('item-name').value;
        const description = document.getElementById('item-description').value;
        const price = parseInt(document.getElementById('item-price').value);
        
        if (selectedImage && name && description && !isNaN(price)) {
            addItem(selectedImage, name, description, price);
            modal.style.display = 'none';
        } else {
            alert('Please fill in all fields and select an image');
        }
    });
    
    document.getElementById('cancel-item').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

function addItem(image, name, description, price) {
    gameState.shopItems.push({ image, name, description, price });
    
    // Remove the used image from available images
    const index = gameState.availableItemImages.indexOf(image);
    if (index > -1) {
        gameState.availableItemImages.splice(index, 1);
    }
    
    updateShopDisplay();
}

function buyItem(itemIndex) {
    const item = gameState.shopItems[itemIndex];
    if (item && gameState.stats.CS >= item.price) {
        // Find empty inventory slot
        const emptySlot = gameState.inventory.findIndex(slot => slot === null);
        if (emptySlot !== -1) {
            gameState.stats.CS -= item.price;
            gameState.inventory[emptySlot] = item;
            updateInventoryDisplay();
            updateShopDisplay();
            updateHeroDisplay();
        } else {
            alert('Inventory is full!');
        }
    } else {
        alert('Not enough coins!');
    }
}

function updateInventoryDisplay() {
    const itemSlots = document.querySelectorAll('.item-slot');
    
    gameState.inventory.forEach((item, index) => {
        const slot = itemSlots[index];
        if (!slot) return;
        
        if (item) {
            slot.innerHTML = `
                <img src="${item.image}" alt="${item.name}" title="${item.name}">
                <button onclick="useItem(${index})">Use</button>
            `;
        } else {
            slot.innerHTML = '';
        }
    });
}

function useItem(slotIndex) {
    const item = gameState.inventory[slotIndex];
    if (item) {
        evaluateAndApplyFormula(item.description);
        gameState.inventory[slotIndex] = null;
        updateInventoryDisplay();
        updateHeroDisplay();
        updateDiceStats;
        
        const actionWindow = document.getElementById('action-window');
        actionWindow.insertAdjacentHTML('beforeend', `<p>Used ${item.name}</p>`);
    }
}

function showVictoryMessage() {
    // Create a modal for the victory message
    const victoryModal = document.createElement('div');
    victoryModal.id = 'victory-modal';
    victoryModal.style.position = 'fixed';
    victoryModal.style.top = '0';
    victoryModal.style.left = '0';
    victoryModal.style.width = '100%';
    victoryModal.style.height = '100%';
    victoryModal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    victoryModal.style.display = 'flex';
    victoryModal.style.flexDirection = 'column';
    victoryModal.style.alignItems = 'center';
    victoryModal.style.justifyContent = 'center';
    victoryModal.style.color = 'white';
    victoryModal.style.zIndex = '1000';

    // Add the victory message
    const victoryMessage = document.createElement('h1');
    victoryMessage.textContent = 'ВЫ ВЫЙГРАЛИ!';
    victoryMessage.style.fontSize = '3rem';
    victoryMessage.style.marginBottom = '20px';

    // Add the video
    const victoryVideo = document.createElement('video');
    victoryVideo.src = 'assets/dance.mp4';
    victoryVideo.autoplay = true;
    victoryVideo.loop = true;
    victoryVideo.controls = false;
    victoryVideo.style.width = '40%';
    victoryVideo.style.borderRadius = '10px';
    victoryVideo.volume = 0.4;

    // Append elements to the modal
    victoryModal.appendChild(victoryMessage);
    victoryModal.appendChild(victoryVideo);

    // Add the modal to the body
    document.body.appendChild(victoryModal);

    // Add a click listener to close the modal
    victoryModal.addEventListener('click', () => {
        document.body.removeChild(victoryModal);
    });
}

function showMoveOptionModal(hexagon) {
    const modal = document.createElement('div');
    modal.id = 'move-option-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.flexDirection = 'column';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.color = 'white';
    modal.style.zIndex = '1000';

    // Add the message
    const message = document.createElement('h2');
    message.textContent = `Move to Cell ${hexagon.id}?`;
    message.style.marginBottom = '20px';

    // Add the "Move" button
    const moveButton = document.createElement('button');
    moveButton.textContent = 'Move';
    moveButton.style.padding = '10px 20px';
    moveButton.style.fontSize = '1.2rem';
    moveButton.style.cursor = 'pointer';
    moveButton.addEventListener('click', () => {
        moveTokenToCell(hexagon.id);
        document.body.removeChild(modal);
    });

    // Add the "Cancel" button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.fontSize = '1.2rem';
    cancelButton.style.marginTop = '10px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(modal);
    });

    // Append elements to the modal
    modal.appendChild(message);
    modal.appendChild(moveButton);
    modal.appendChild(cancelButton);

    // Add the modal to the body
    document.body.appendChild(modal);
}

function moveTokenToCell(cellId) {
    // Ensure the cellId is within bounds
    if (cellId >= 0 && cellId < gameState.hexagons.length) {
        gameState.currentPosition = cellId;
        const currentHex = gameState.hexagons[gameState.currentPosition];

        // Move the token
        hexagonGroup.select('.player-token')
            .attr('cx', currentHex.x)
            .attr('cy', currentHex.y);

        // Activate mission if exists
        if (currentHex.mission) {
            activateMission(currentHex);
        }

        // Enable the "End Turn" button
        document.getElementById('end-turn').disabled = false;
    }
}

function saveGame() {
    // Read counter values from the DOM
    const counters = {};
    for (let i = 1; i <= 10; i++) {
        const counterId = `counter${i}`;
        const counterValue = document.getElementById(counterId).value;
        counters[counterId] = counterValue;
    }

    pauseTimer(); // Pause the timer when saving

    const gameProgress = {
        currentPosition: gameState.currentPosition,
        turn: gameState.turn,
        isGameStarted: gameState.isGameStarted,
        stats: gameState.stats,
        diceS: gameState.diceS,
        finalS: gameState.finalS,
        diceS2: gameState.diceS2,
        activeBuffs: gameState.activeBuffs,
        selectedHero: gameState.selectedHero,
        inventory: gameState.inventory,
        activeMissions: gameState.activeMissions,
        bless: gameState.Runes.bless,
        curse: gameState.Runes.curse,
        counters: counters, // Save counter values
        timer: {
            elapsedTime: gameState.timer.elapsedTime,
            isRunning: gameState.timer.isRunning,
        },
    };

    const dataStr = JSON.stringify(gameProgress);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportLink = document.createElement('a');
    exportLink.setAttribute('href', dataUri);
    exportLink.setAttribute('download', 'game-progress.json');
    exportLink.click();
}

function loadGame() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            const progress = JSON.parse(event.target.result);

            // Update the game state with the loaded progress
            gameState.currentPosition = progress.currentPosition;
            gameState.turn = progress.turn;
            gameState.isGameStarted = progress.isGameStarted;
            gameState.stats = progress.stats;
            gameState.diceS = progress.diceS;
            gameState.finalS = progress.finalS;
            gameState.diceS2 = progress.diceS2;
            gameState.activeBuffs = progress.activeBuffs;
            gameState.selectedHero = progress.selectedHero;
            gameState.inventory = progress.inventory;
            gameState.activeMissions = progress.activeMissions;
            gameState.Runes.bless = progress.bless || [];
            gameState.Runes.curse = progress.curse || [];
            gameState.timer.elapsedTime = progress.timer.elapsedTime;
            gameState.timer.isRunning = false;

            // Restore counter values
            if (progress.counters) {
                for (let i = 1; i <= 10; i++) {
                    const counterId = `counter${i}`;
                    const counterValue = progress.counters[counterId];
                    document.getElementById(counterId).value = counterValue;
                }
            }

            // Update the UI to reflect the loaded state
            updateHeroDisplay();
            updateTokenPosition();
            updateMissionList();
            updateInventoryDisplay();
            updateDiceStats();
            updateDiceStats2();
            updateTimerDisplay();

            // If the game is already started, enable game controls
            if (gameState.isGameStarted) {
                enableGameControls();
                document.getElementById('roll-dice').disabled = false;
            }

            resumeTimer(); // Resume the timer when loading
        };

        reader.readAsText(file);
    };

    input.click();
}

// Start the timer
function startTimer() {
    if (!gameState.timer.isRunning) {
        gameState.timer.startTime = Date.now() - gameState.timer.elapsedTime;
        gameState.timer.isRunning = true;
        updateTimerDisplay();
    }
}

// Pause the timer
function pauseTimer() {
    if (gameState.timer.isRunning) {
        gameState.timer.elapsedTime = Date.now() - gameState.timer.startTime;
        gameState.timer.isRunning = false;
    }
}

// Resume the timer
function resumeTimer() {
    if (!gameState.timer.isRunning) {
        gameState.timer.startTime = Date.now() - gameState.timer.elapsedTime;
        gameState.timer.isRunning = true;
        updateTimerDisplay();
    }
}

// Update the timer display
function updateTimerDisplay() {
    if (gameState.timer.isRunning) {
        const elapsedTime = Date.now() - gameState.timer.startTime;
        const formattedTime = formatTime(elapsedTime);
        document.getElementById('timer-display').textContent = formattedTime;
        requestAnimationFrame(updateTimerDisplay);
    } else {
        const formattedTime = formatTime(gameState.timer.elapsedTime);
        document.getElementById('timer-display').textContent = formattedTime;
    }
}

// Format time in HH:MM:SS
function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Function to show the runes modal
document.getElementById('show-runes').addEventListener('click', () => {
    const modal = document.getElementById('runes-modal');
    modal.style.display = 'block';
    updateBlessDisplay();
    updateCurseDisplay();
});

// Function to close the runes modal
document.getElementById('close-runes-modal').addEventListener('click', () => {
    const modal = document.getElementById('runes-modal');
    modal.style.display = 'none';
});

// Function to toggle active runes
document.getElementById('show-active-only').addEventListener('change', () => {
    updateBlessDisplay();
    updateCurseDisplay();
});

// Function to update the bless display
function updateBlessDisplay() {
    const blessList = document.getElementById('bless');
    const showActiveOnly = document.getElementById('show-active-only').checked;
    blessList.innerHTML = '';

    gameState.Runes.bless.forEach((bless, index) => {
        if (!showActiveOnly || bless.active) {
            const blessItem = document.createElement('div');
            blessItem.className = `bless-item ${bless.active ? 'active' : ''}`;
            blessItem.innerHTML = `
                <p><strong>${bless.name}</strong>: ${bless.description}</p>
                <button onclick="toggleBless(${index})">${bless.active ? 'Deactivate' : 'Activate'}</button>
            `;
            blessList.appendChild(blessItem);
        }
    });
}

// Function to update the curse display
function updateCurseDisplay() {
    const curseList = document.getElementById('curse');
    const showActiveOnly = document.getElementById('show-active-only').checked;
    curseList.innerHTML = '';

    gameState.Runes.curse.forEach((curse, index) => {
        if (!showActiveOnly || curse.active) {
            const curseItem = document.createElement('div');
            curseItem.className = `curse-item ${curse.active ? 'active' : ''}`;
            curseItem.innerHTML = `
                <p><strong>${curse.name}</strong>: ${curse.description}</p>
                <button onclick="toggleCurse(${index})">${curse.active ? 'Deactivate' : 'Activate'}</button>
            `;
            curseList.appendChild(curseItem);
        }
    });
}

// Function to toggle a bless's active status
function toggleBless(index) {
    gameState.Runes.bless[index].active = !gameState.Runes.bless[index].active;
    updateBlessDisplay();
}

// Function to toggle a curse's active status
function toggleCurse(index) {
    gameState.Runes.curse[index].active = !gameState.Runes.curse[index].active;
    updateCurseDisplay();
}

// Function to add a new bless
document.getElementById('add-bless').addEventListener('click', () => {
    const name = prompt('Enter bless name:');
    const description = prompt('Enter bless description:');
    if (name && description) {
        gameState.Runes.bless.push({ name, description, active: false });
        updateBlessDisplay();
    }
});

// Function to add a new curse
document.getElementById('add-curse').addEventListener('click', () => {
    const name = prompt('Enter curse name:');
    const description = prompt('Enter curse description:');
    if (name && description) {
        gameState.Runes.curse.push({ name, description, active: false });
        updateCurseDisplay();
    }
});

// Function to activate a random bless from non-active runes
document.getElementById('random-bless').addEventListener('click', () => {
    const nonActiveBlesses = gameState.Runes.bless.filter(bless => !bless.active); // Filter non-active blesses
    if (nonActiveBlesses.length > 0) {
        const randomIndex = Math.floor(Math.random() * nonActiveBlesses.length);
        const selectedBless = nonActiveBlesses[randomIndex];
        const blessIndex = gameState.Runes.bless.indexOf(selectedBless); // Find the index in the original array
        toggleBless(blessIndex); // Activate the selected bless
    } else {
        alert('No non-active blesses available!');
    }
});

// Function to activate a random curse from non-active runes
document.getElementById('random-curse').addEventListener('click', () => {
    const nonActiveCurses = gameState.Runes.curse.filter(curse => !curse.active); // Filter non-active curses
    if (nonActiveCurses.length > 0) {
        const randomIndex = Math.floor(Math.random() * nonActiveCurses.length);
        const selectedCurse = nonActiveCurses[randomIndex];
        const curseIndex = gameState.Runes.curse.indexOf(selectedCurse); // Find the index in the original array
        toggleCurse(curseIndex); // Activate the selected curse
    } else {
        alert('No non-active curses available!');
    }
});

function getRandomShopItem() {
    if (gameState.shopItems.length === 0) {
        console.warn('No items available in the shop.');
        return null;
    }
    const randomIndex = Math.floor(Math.random() * gameState.shopItems.length);
    return gameState.shopItems[randomIndex];
}

function addItemToInventory(item) {
    const emptySlot = gameState.inventory.findIndex(slot => slot === null);
    if (emptySlot !== -1) {
        gameState.inventory[emptySlot] = item;
        updateInventoryDisplay();
        console.log(`Added ${item.name} to inventory.`);
    } else {
        console.warn('Inventory is full!');
    }
}

// Initialize the game when the page loads
window.addEventListener('load', init);
