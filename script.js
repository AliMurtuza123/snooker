const pointValues = {
  red: 1,
  yellow: 2,
  green: 3,
  brown: 4,
  blue: 5,
  pink: 6,
  black: 7
};

const colorMap = {
  red: 'red',
  yellow: 'yellow',
  green: 'green',
  brown: 'amber',
  blue: 'blue',
  pink: 'pink',
  black: 'gray'
};

let players = [];
let remainingPoints = 147;
let history = [];
let redsRemaining = 15;
let currentPlayerIndex = 0;
let gamePhase = 'red'; // 'red', 'color-choice', 'final-colors'
let currentBreak = 0;
let finalColorSequence = ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
let finalColorIndex = 0;
let gameEnded = false;
let gameHistory = [];
let currentGameNumber = 1;

function addPlayer() {
  const name = document.getElementById("playerName").value.trim();
  if (!name) return;
  const id = Date.now();
  players.push({ id, name, score: 0, currentBreak: 0, pottingHistory: [] });
  renderPlayers();
  document.getElementById("playerName").value = "";
}

function getBallEmoji(ballType) {
  // Handle foul indicators
  if (ballType.startsWith('foul-')) {
    const foulBall = ballType.replace('foul-', '').replace('-', '/');
    const foulEmojis = {
      'miss-general': '⚠️',
      'yellow': '⚠️🟡',
      'green': '⚠️🟢', 
      'brown': '⚠️🟤',
      'blue': '⚠️🔵',
      'pink': '⚠️🪷',
      'black': '⚠️⚫'
    };
    return foulEmojis[foulBall] || '⚠️';
  }
  
  // Regular ball emojis
  const ballEmojis = {
    red: '🔴',
    yellow: '🟡', 
    green: '🟢',
    brown: '🟤',
    blue: '🔵',
    pink: '🪷',
    black: '⚫'
  };
  return ballEmojis[ballType] || '⚪';
}

function renderPlayers() {
  const container = document.getElementById("playersContainer");
  container.innerHTML = "";

  players.forEach((player, index) => {
    const div = document.createElement("div");
    const isCurrentPlayer = index === currentPlayerIndex && !gameEnded;
    div.className = `bg-white p-4 rounded shadow ${isCurrentPlayer ? 'ring-2 ring-green-500' : ''}`;

    const validShots = getValidShots();
    const historyDisplay = player.pottingHistory.map(ballType => getBallEmoji(ballType)).join(' ');
    
    div.innerHTML = `
      <h3 class="font-semibold text-lg mb-2">
        ${isCurrentPlayer ? '🎱 ' : ''}${player.name}: <span id="score-${player.id}">${player.score}</span>
        ${player.currentBreak > 0 ? ` (Break: ${player.currentBreak})` : ''}
      </h3>
      ${historyDisplay ? `<div class="text-sm mb-2 text-gray-600">History: ${historyDisplay}</div>` : ''}
      <div class="grid grid-cols-4 gap-2 text-center text-sm">
        ${Object.entries(pointValues).map(([color, value]) => {
          const twColor = colorMap[color] || 'gray';
          const isValid = validShots.includes(color) && isCurrentPlayer && !gameEnded;
          const buttonClass = isValid ? 
            `bg-${twColor}-500 text-white hover:bg-${twColor}-600` : 
            `bg-gray-300 text-gray-500 cursor-not-allowed`;
          const onclick = isValid ? `addPoints(${player.id}, ${value}, '${color}')` : '';
          return `<button ${onclick ? `onclick="${onclick}"` : ''} class="${buttonClass} rounded px-2 py-1 ${!isValid ? 'opacity-50' : ''}">${color.charAt(0).toUpperCase() + color.slice(1)} (+${value})</button>`;
        }).join('')}
        <button onclick="showFoulOptions(${player.id})" class="col-span-2 ${isCurrentPlayer && !gameEnded ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-400 cursor-not-allowed opacity-50'} text-white rounded px-2 py-1">Foul</button>
      </div>
    `;

    container.appendChild(div);
  });

  updateGameStatus();
}

function getValidShots() {
  if (gameEnded) return [];
  
  if (gamePhase === 'red') {
    return ['red'];
  } else if (gamePhase === 'color-choice') {
    return ['yellow', 'green', 'brown', 'blue', 'pink', 'black'];
  } else if (gamePhase === 'final-colors') {
    return finalColorIndex < finalColorSequence.length ? [finalColorSequence[finalColorIndex]] : [];
  } else if (gamePhase === 'game-complete') {
    // All balls potted, but fouls can still occur
    return [];
  }
  return [];
}

function addPoints(id, points, color) {
  const player = players.find(p => p.id === id);
  const playerIndex = players.findIndex(p => p.id === id);
  if (!player || playerIndex !== currentPlayerIndex || gameEnded) return;

  const validShots = getValidShots();
  if (!validShots.includes(color)) {
    alert(`Invalid shot! You must pot: ${validShots.join(' or ')}`);
    return;
  }

  // Save state for undo
  history.push({
    type: 'addPoints',
    id,
    points,
    color,
    previousRemaining: remainingPoints,
    previousReds: redsRemaining,
    previousPhase: gamePhase,
    previousFinalIndex: finalColorIndex,
    previousBreak: currentBreak,
    previousPlayer: currentPlayerIndex
  });

  player.score += points;
  currentBreak += points;
  player.currentBreak = currentBreak;
  
  // Add ball to player's potting history
  player.pottingHistory.push(color);

  // Update game state based on ball potted
  if (color === 'red') {
    redsRemaining--;
    // Red potted: subtract 1 point (one red gone from table)
    remainingPoints -= 1;
    // After any red (including the last), player chooses a color
    gamePhase = 'color-choice';
  } else if (gamePhase === 'color-choice') {
    // Color potted after red: subtract 7 points (lost black opportunity, color re-spotted)
    remainingPoints -= 7;
    // If no reds left, move to final colors; otherwise back to red
    gamePhase = redsRemaining > 0 ? 'red' : 'final-colors';
  } else if (gamePhase === 'final-colors') {
    // Final color sequence - ball is not re-spotted, subtract actual value
    remainingPoints -= points;
    finalColorIndex++;
    
    // Don't auto-end game - players might still make fouls
    if (finalColorIndex >= finalColorSequence.length) {
      // All balls potted, end game automatically
      gameEnded = true;
      setTimeout(() => showWinnerPopup(), 500);
      return;
    }
  }

  renderPlayers();
}

function showFoulOptions(id) {
  const playerIndex = players.findIndex(p => p.id === id);
  if (playerIndex !== currentPlayerIndex || gameEnded) return;
  
  const foulOptions = [
    { ball: 'Miss/General', points: 4 },
    { ball: 'Yellow', points: 4 },
    { ball: 'Green', points: 4 },
    { ball: 'Brown', points: 4 },
    { ball: 'Blue', points: 5 },
    { ball: 'Pink', points: 6 },
    { ball: 'Black', points: 7 }
  ];
  
  const foulHtml = foulOptions.map(foul => 
    `<button onclick="addFoul(${id}, ${foul.points}, '${foul.ball}')" class="bg-red-500 hover:bg-red-600 text-white rounded px-2 py-1 m-1">${foul.ball} (+${foul.points})</button>`
  ).join('');
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  overlay.innerHTML = `
    <div class="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Select Foul Type</h3>
      <div class="grid grid-cols-2 gap-2">
        ${foulHtml}
      </div>
      <button onclick="this.parentElement.parentElement.remove()" class="mt-4 w-full bg-gray-500 text-white rounded px-3 py-2">Cancel</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

function addFoul(id, foulPoints, foulType) {
  const player = players.find(p => p.id === id);
  const playerIndex = players.findIndex(p => p.id === id);
  if (!player || playerIndex !== currentPlayerIndex || gameEnded) return;

  // Close foul dialog
  const overlay = document.querySelector('.fixed.inset-0');
  if (overlay) overlay.remove();

  const opponents = players.filter(p => p.id !== id);
  if (opponents.length === 0) return;

  history.push({
    type: 'foul',
    offenderId: id,
    foulPoints,
    foulType,
    affected: opponents.map(p => ({ id: p.id, prevScore: p.score })),
    previousBreak: currentBreak,
    previousPlayer: currentPlayerIndex,
    previousPhase: gamePhase
  });

  // Add foul to offending player's history
  player.pottingHistory.push(`foul-${foulType.toLowerCase().replace('/', '-')}`);

  // Award foul points to opponents
  opponents.forEach(p => {
    p.score += foulPoints;
  });

  // End current player's turn
  endTurn();
  renderPlayers();
}

function endTurn() {
  if (gameEnded || players.length === 0) return;
  
  // Save state for undo
  history.push({
    type: 'endTurn',
    previousPlayer: currentPlayerIndex,
    previousBreak: currentBreak,
    previousPhase: gamePhase,
    previousRemaining: remainingPoints
  });
  
  // Reset current break
  if (players[currentPlayerIndex]) {
    players[currentPlayerIndex].currentBreak = 0;
  }
  currentBreak = 0;
  
  // If player missed during color-choice phase, adjust game phase accordingly
  if (gamePhase === 'color-choice') {
    remainingPoints -= 7; // Lost black opportunity
    if (redsRemaining > 0) {
      gamePhase = 'red'; // Back to reds if any remain
    } else {
      gamePhase = 'final-colors'; // Move to final colors if no reds left
    }
  }
  
  // Switch to next player
  currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
  
  // Re-render to update UI
  renderPlayers();
}

function updateGameStatus() {
  document.getElementById("remainingPoints").innerText = remainingPoints;
  document.getElementById("redsRemaining").innerText = redsRemaining;
  
  const phaseText = {
    'red': 'Pot a red',
    'color-choice': 'Choose a color',
    'final-colors': `Pot ${finalColorSequence[finalColorIndex] || 'game over'}`,
    'game-complete': 'All balls potted'
  };
  
  document.getElementById("gamePhase").innerText = gameEnded ? 'Game Over' : phaseText[gamePhase] || '';
  
  if (!gameEnded && players[currentPlayerIndex]) {
    document.getElementById("currentPlayer").innerText = players[currentPlayerIndex].name;
  }  
  // Update game number display if element exists
  const gameNumberElement = document.getElementById("currentGameNumber");
  if (gameNumberElement) {
    gameNumberElement.innerText = currentGameNumber;
  }}

function undoLastAction() {
  const last = history.pop();
  if (!last) return;

  if (last.type === 'addPoints') {
    const player = players.find(p => p.id === last.id);
    if (!player) return;
    
    player.score -= last.points;
    player.currentBreak = last.previousBreak;
    // Remove last ball from potting history
    player.pottingHistory.pop();
    remainingPoints = last.previousRemaining;
    redsRemaining = last.previousReds;
    gamePhase = last.previousPhase;
    finalColorIndex = last.previousFinalIndex;
    currentBreak = last.previousBreak;
    currentPlayerIndex = last.previousPlayer;
    gameEnded = false;
    
  } else if (last.type === 'foul') {
    // Remove foul from offending player's history
    const offender = players.find(p => p.id === last.offenderId);
    if (offender) {
      offender.pottingHistory.pop();
    }
    
    // Restore opponent scores
    last.affected.forEach(({ id, prevScore }) => {
      const player = players.find(p => p.id === id);
      if (player) {
        player.score = prevScore;
      }
    });
    
    currentBreak = last.previousBreak;
    currentPlayerIndex = last.previousPlayer;
    gamePhase = last.previousPhase;
    if (players[currentPlayerIndex]) {
      players[currentPlayerIndex].currentBreak = currentBreak;
    }
  } else if (last.type === 'endTurn') {
    currentPlayerIndex = last.previousPlayer;
    currentBreak = last.previousBreak;
    gamePhase = last.previousPhase;
    remainingPoints = last.previousRemaining;
    if (players[currentPlayerIndex]) {
      players[currentPlayerIndex].currentBreak = currentBreak;
    }
  }
  
  renderPlayers();
}

function showWinnerPopup() {
  const winner = players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
  const playersHtml = players.map(p => 
    `<div class="mb-2 ${p.id === winner.id ? 'text-green-600 font-semibold' : ''}">
      ${p.id === winner.id ? '🏆 ' : ''}${p.name}: ${p.score} points
      <div class="text-xs text-gray-600">History: ${p.pottingHistory.map(ball => getBallEmoji(ball)).join(' ')}</div>
    </div>`
  ).join('');
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-lg max-w-md w-full">
      <div class="p-6 text-center">
        <h3 class="text-2xl font-bold mb-4">🏆 Game ${currentGameNumber} Complete!</h3>
        <div class="text-xl text-green-600 font-semibold mb-4">
          Winner: ${winner.name} (${winner.score} points)
        </div>
        <div class="text-left mb-6">
          ${playersHtml}
        </div>
        <div class="flex gap-3">
          <button onclick="removeWinnerPopup(); resetGame();" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2">New Game</button>
          <button onclick="removeWinnerPopup();" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded px-4 py-2">Continue Playing</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

function removeWinnerPopup() {
  const overlays = document.querySelectorAll('.fixed.inset-0');
  overlays.forEach(overlay => overlay.remove());
}

function endGameManually() {
  if (players.length === 0) {
    alert('No players to end game!');
    return;
  }
  // Don't set gameEnded = true here, just show the popup
  showWinnerPopup();
}

function showGameHistory() {
  if (gameHistory.length === 0) {
    alert('No previous games to show!');
    return;
  }
  
  const historyHtml = gameHistory.slice().reverse().map(game => {
    const playersHtml = game.players.map(p => 
      `<div class="mb-2">
        <strong>${p.name}</strong>: ${p.finalScore} points
        <div class="text-xs text-gray-600">History: ${p.pottingHistory.map(ball => getBallEmoji(ball)).join(' ')}</div>
      </div>`
    ).join('');
    
    return `
      <div class="bg-gray-50 p-4 rounded mb-4">
        <h4 class="font-semibold mb-2">Game ${game.gameNumber} (${game.timestamp})</h4>
        <div class="text-green-600 font-medium mb-2">🏆 Winner: ${game.winner.name} (${game.winner.finalScore} points)</div>
        ${playersHtml}
      </div>
    `;
  }).join('');
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
      <div class="p-6">
        <h3 class="text-xl font-semibold mb-4">Game History (${gameHistory.length} games)</h3>
        <div class="space-y-4">
          ${historyHtml}
        </div>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white rounded px-4 py-2">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

function resetGame() {
  // Save current game to history if there are players and some activity
  if (players.length > 0 && (players.some(p => p.score > 0) || players.some(p => p.pottingHistory.length > 0))) {
    const winner = players.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    const gameSnapshot = {
      gameNumber: currentGameNumber,
      timestamp: new Date().toLocaleString(),
      players: players.map(p => ({
        name: p.name,
        finalScore: p.score,
        pottingHistory: [...p.pottingHistory]
      })),
      winner: {
        name: winner.name,
        finalScore: winner.score
      }
    };
    gameHistory.push(gameSnapshot);
    currentGameNumber++;
  }
  
  players.forEach(player => {
    player.score = 0;
    player.currentBreak = 0;
    player.pottingHistory = [];
  });
  
  remainingPoints = 147;
  redsRemaining = 15;
  currentPlayerIndex = 0;
  gamePhase = 'red';
  currentBreak = 0;
  finalColorIndex = 0;
  gameEnded = false;
  history = [];
  
  renderPlayers();
}

function updateUI(id) {
  const scoreElement = document.getElementById(`score-${id}`);
  if (scoreElement) {
    scoreElement.innerText = players.find(p => p.id === id).score;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker registered:', reg))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}