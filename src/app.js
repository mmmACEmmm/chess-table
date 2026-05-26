import { Chess } from '../vendor/chess.mjs';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS_WHITE = [8, 7, 6, 5, 4, 3, 2, 1];
const RANKS_BLACK = [1, 2, 3, 4, 5, 6, 7, 8];
const DEFAULT_CLOCK_SECONDS = 10 * 60;
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];

const PIECES = {
  wk: '♚',
  wq: '♛',
  wr: '♜',
  wb: '♝',
  wn: '♞',
  wp: '♟',
  bk: '♚',
  bq: '♛',
  br: '♜',
  bb: '♝',
  bn: '♞',
  bp: '♟',
};

const PIECE_NAMES = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
};

const PIECE_VALUES = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const state = {
  mode: 'menu',
  menuView: 'home',
  game: new Chess(),
  selectedSquare: null,
  legalMoves: [],
  orientation: 'w',
  showHints: true,
  promotion: null,
  clocks: { w: DEFAULT_CLOCK_SECONDS, b: DEFAULT_CLOCK_SECONDS },
  clockHistory: [],
  timerRunning: false,
  timedOut: null,
  lastMove: null,
  draggedFrom: null,
  noticeTimer: null,
  onlineNoticeTimer: null,
  settings: {
    clockMinutes: 10,
    humanColor: 'w',
    botDifficulty: 'sharp',
    sound: true,
  },
  audioContext: null,
  bot: {
    thinking: false,
    timer: null,
  },
  online: {
    socket: null,
    status: 'offline',
    code: null,
    color: null,
    players: { w: false, b: false },
    pendingAction: null,
    menuView: 'home',
  },
};

const els = {};

document.addEventListener('DOMContentLoaded', () => {
  bindElements();
  bindEvents();
  window.setInterval(tickClock, 1000);
  render();
});

function bindElements() {
  els.board = document.querySelector('#chessBoard');
  els.gameStatus = document.querySelector('#gameStatus');
  els.newGameButton = document.querySelector('#newGameButton');
  els.menuButton = document.querySelector('#menuButton');
  els.onlineButton = document.querySelector('#onlineButton');
  els.undoButton = document.querySelector('#undoButton');
  els.flipButton = document.querySelector('#flipButton');
  els.clockButton = document.querySelector('#clockButton');
  els.resetClockButton = document.querySelector('#resetClockButton');
  els.copyFenButton = document.querySelector('#copyFenButton');
  els.hintsToggle = document.querySelector('#hintsToggle');
  els.turnDot = document.querySelector('#turnDot');
  els.turnLabel = document.querySelector('#turnLabel');
  els.topClock = document.querySelector('#topClock');
  els.bottomClock = document.querySelector('#bottomClock');
  els.whiteCaptures = document.querySelector('#whiteCaptures');
  els.blackCaptures = document.querySelector('#blackCaptures');
  els.materialBalance = document.querySelector('#materialBalance');
  els.moveList = document.querySelector('#moveList');
  els.notice = document.querySelector('#notice');
  els.promotionOverlay = document.querySelector('#promotionOverlay');
  els.promotionOptions = document.querySelector('#promotionOptions');
  els.cancelPromotionButton = document.querySelector('#cancelPromotionButton');
  els.onlinePanelButton = document.querySelector('#onlinePanelButton');
  els.onlineBadge = document.querySelector('#onlineBadge');
  els.onlineSummary = document.querySelector('#onlineSummary');
  els.timeControlLabel = document.querySelector('#timeControlLabel');
  els.difficultyLabel = document.querySelector('#difficultyLabel');
  els.onlineOverlay = document.querySelector('#onlineOverlay');
  els.closeOnlineButton = document.querySelector('#closeOnlineButton');
  els.onlineHome = document.querySelector('#onlineHome');
  els.hostGameButton = document.querySelector('#hostGameButton');
  els.showJoinButton = document.querySelector('#showJoinButton');
  els.joinForm = document.querySelector('#joinForm');
  els.joinCodeInput = document.querySelector('#joinCodeInput');
  els.roomPanel = document.querySelector('#roomPanel');
  els.roomCode = document.querySelector('#roomCode');
  els.copyCodeButton = document.querySelector('#copyCodeButton');
  els.roomStatus = document.querySelector('#roomStatus');
  els.leaveOnlineButton = document.querySelector('#leaveOnlineButton');
  els.onlineNotice = document.querySelector('#onlineNotice');
  els.startMenuOverlay = document.querySelector('#startMenuOverlay');
  els.closeStartMenuButton = document.querySelector('#closeStartMenuButton');
  els.startMenuHome = document.querySelector('#startMenuHome');
  els.settingsPanel = document.querySelector('#settingsPanel');
  els.startOnlineButton = document.querySelector('#startOnlineButton');
  els.startOfflineButton = document.querySelector('#startOfflineButton');
  els.startBotButton = document.querySelector('#startBotButton');
  els.startSettingsButton = document.querySelector('#startSettingsButton');
  els.clockMinutesInput = document.querySelector('#clockMinutesInput');
  els.botDifficultyInput = document.querySelector('#botDifficultyInput');
  els.menuHintsToggle = document.querySelector('#menuHintsToggle');
  els.soundToggle = document.querySelector('#soundToggle');
  els.playWhiteButton = document.querySelector('#playWhiteButton');
  els.playBlackButton = document.querySelector('#playBlackButton');
  els.backToMenuButton = document.querySelector('#backToMenuButton');
  els.saveSettingsButton = document.querySelector('#saveSettingsButton');
  els.lastMoveLabel = document.querySelector('#lastMoveLabel');
  els.legalCountLabel = document.querySelector('#legalCountLabel');
}

function bindEvents() {
  els.newGameButton.addEventListener('click', openStartMenu);
  els.menuButton.addEventListener('click', openStartMenu);
  els.onlineButton.addEventListener('click', openOnlineMenu);
  els.onlinePanelButton.addEventListener('click', openOnlineMenu);
  els.undoButton.addEventListener('click', undoMove);
  els.flipButton.addEventListener('click', () => {
    state.orientation = state.orientation === 'w' ? 'b' : 'w';
    clearSelection();
    render();
  });
  els.clockButton.addEventListener('click', () => {
    if (isBoardLocked()) return;
    state.timerRunning = !state.timerRunning;
    render();
  });
  els.resetClockButton.addEventListener('click', () => {
    state.clocks = createClocks();
    state.clockHistory = [];
    state.timedOut = null;
    state.timerRunning = false;
    render();
  });
  els.copyFenButton.addEventListener('click', copyFen);
  els.hintsToggle.addEventListener('change', () => {
    state.showHints = els.hintsToggle.checked;
    render();
  });
  els.cancelPromotionButton.addEventListener('click', () => {
    state.promotion = null;
    render();
  });
  els.closeOnlineButton.addEventListener('click', closeOnlineMenu);
  els.hostGameButton.addEventListener('click', hostOnlineGame);
  els.showJoinButton.addEventListener('click', showJoinForm);
  els.joinCodeInput.addEventListener('input', () => {
    els.joinCodeInput.value = els.joinCodeInput.value.replace(/\D/g, '').slice(0, 5);
  });
  els.joinForm.addEventListener('submit', (event) => {
    event.preventDefault();
    joinOnlineGame();
  });
  els.copyCodeButton.addEventListener('click', copyRoomCode);
  els.leaveOnlineButton.addEventListener('click', leaveOnlineGame);
  els.closeStartMenuButton.addEventListener('click', () => {
    if (state.mode === 'menu') {
      startOfflineGame();
    } else {
      closeStartMenu();
    }
  });
  els.startOnlineButton.addEventListener('click', () => {
    closeStartMenu();
    openOnlineMenu();
  });
  els.startOfflineButton.addEventListener('click', startOfflineGame);
  els.startBotButton.addEventListener('click', startBotGame);
  els.startSettingsButton.addEventListener('click', showSettingsPanel);
  els.backToMenuButton.addEventListener('click', showStartMenuHome);
  els.saveSettingsButton.addEventListener('click', saveSettings);
  els.playWhiteButton.addEventListener('click', () => setHumanColor('w'));
  els.playBlackButton.addEventListener('click', () => setHumanColor('b'));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      state.promotion = null;
      closeOnlineMenu();
      if (state.mode !== 'menu') closeStartMenu();
      clearSelection();
      render();
    }
  });
}

function render() {
  renderStatus();
  renderClocks();
  renderBoard();
  renderCaptures();
  renderHistory();
  renderPromotion();
  renderOnline();
  renderGameMeta();
  renderStartMenu();
  els.undoButton.disabled = isOnlineActive() || state.game.history().length === 0;
  els.clockButton.textContent = state.timerRunning ? 'Pause Clock' : 'Start Clock';
  els.clockButton.disabled = isOnlineActive() || isBoardLocked();
  els.resetClockButton.disabled = isOnlineActive();
}

function renderStatus() {
  const turn = state.game.turn();
  const sideName = colorName(turn);
  els.turnLabel.textContent = sideName;
  els.turnDot.className = `turn-dot ${turn === 'w' ? 'is-white' : 'is-black'}`;
  els.gameStatus.textContent = getStatusText();
}

function renderClocks() {
  const topColor = state.orientation === 'w' ? 'b' : 'w';
  const bottomColor = state.orientation === 'w' ? 'w' : 'b';
  renderClock(els.topClock, topColor);
  renderClock(els.bottomClock, bottomColor);
}

function renderClock(container, color) {
  const isActive = state.game.turn() === color && state.timerRunning && !isBoardLocked();
  const percentRemaining = Math.max(0, Math.min(100, (state.clocks[color] / getClockSeconds()) * 100));
  container.className = `clock-row ${isActive ? 'is-active' : ''} ${state.timedOut === color ? 'is-flagged' : ''}`;
  container.innerHTML = `
    <div class="clock-main">
      <span>${colorName(color)}</span>
      <strong>${formatTime(state.clocks[color])}</strong>
    </div>
    <span class="clock-bar" aria-hidden="true"><span style="width: ${percentRemaining}%"></span></span>
  `;
}

function renderBoard() {
  const squares = getVisibleSquares();
  const fragment = document.createDocumentFragment();
  const legalTargets = new Map(state.legalMoves.map((move) => [move.to, move]));
  const checkSquare = getCheckedKingSquare();
  const leftFile = state.orientation === 'w' ? 'a' : 'h';
  const bottomRank = state.orientation === 'w' ? 1 : 8;

  squares.forEach((square) => {
    const button = document.createElement('button');
    const piece = state.game.get(square);
    const isLight = isLightSquare(square);
    const legalMove = legalTargets.get(square);

    button.type = 'button';
    button.className = [
      'square',
      isLight ? 'is-light' : 'is-dark',
      state.selectedSquare === square ? 'is-selected' : '',
      state.lastMove && (state.lastMove.from === square || state.lastMove.to === square) ? 'is-last-move' : '',
      legalMove && state.showHints ? 'is-legal' : '',
      legalMove?.captured && state.showHints ? 'is-capture' : '',
      checkSquare === square ? 'is-check' : '',
    ]
      .filter(Boolean)
      .join(' ');
    button.dataset.square = square;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', getSquareLabel(square, piece));
    button.draggable = canDrag(square, piece);
    button.addEventListener('click', () => handleSquareClick(square));
    button.addEventListener('dragstart', (event) => handleDragStart(event, square));
    button.addEventListener('dragend', handleDragEnd);
    button.addEventListener('dragover', handleDragOver);
    button.addEventListener('drop', (event) => handleDrop(event, square));

    if (piece) {
      const pieceElement = document.createElement('span');
      pieceElement.className = `piece piece-${piece.color}`;
      pieceElement.textContent = PIECES[`${piece.color}${piece.type}`];
      pieceElement.setAttribute('aria-hidden', 'true');
      button.append(pieceElement);
    }

    if (state.showHints && legalMove) {
      const hint = document.createElement('span');
      hint.className = legalMove.captured ? 'capture-ring' : 'move-dot';
      hint.setAttribute('aria-hidden', 'true');
      button.append(hint);
    }

    const file = square[0];
    const rank = Number(square[1]);
    if (file === leftFile) {
      const rankLabel = document.createElement('span');
      rankLabel.className = 'coord coord-rank';
      rankLabel.textContent = rank;
      button.append(rankLabel);
    }
    if (rank === bottomRank) {
      const fileLabel = document.createElement('span');
      fileLabel.className = 'coord coord-file';
      fileLabel.textContent = file;
      button.append(fileLabel);
    }

    fragment.append(button);
  });

  els.board.replaceChildren(fragment);
}

function renderCaptures() {
  const captures = getCaptures();
  const whiteScore = captures.w.reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0);
  const blackScore = captures.b.reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0);
  renderCaptureLine(els.whiteCaptures, captures.w, 'White has not captured a piece');
  renderCaptureLine(els.blackCaptures, captures.b, 'Black has not captured a piece');

  if (whiteScore === blackScore) {
    els.materialBalance.textContent = 'Even';
  } else if (whiteScore > blackScore) {
    els.materialBalance.textContent = `White +${whiteScore - blackScore}`;
  } else {
    els.materialBalance.textContent = `Black +${blackScore - whiteScore}`;
  }
}

function renderCaptureLine(container, pieces, emptyLabel) {
  container.replaceChildren();
  if (pieces.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'empty-captures';
    empty.textContent = 'None';
    empty.setAttribute('aria-label', emptyLabel);
    container.append(empty);
    return;
  }

  pieces.forEach((piece) => {
    const item = document.createElement('span');
    item.className = `captured-piece piece-${piece.color}`;
    item.textContent = PIECES[`${piece.color}${piece.type}`];
    item.setAttribute('aria-label', `${colorName(piece.color)} ${PIECE_NAMES[piece.type]}`);
    container.append(item);
  });
}

function renderHistory() {
  const moves = state.game.history({ verbose: true });
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < moves.length; i += 2) {
    const item = document.createElement('li');
    item.className = 'move-row';
    item.innerHTML = `
      <span class="move-number">${Math.floor(i / 2) + 1}</span>
      <span class="move-san">${moves[i]?.san ?? ''}</span>
      <span class="move-san">${moves[i + 1]?.san ?? ''}</span>
    `;
    fragment.append(item);
  }

  els.moveList.replaceChildren(fragment);
  els.moveList.scrollTop = els.moveList.scrollHeight;
}

function renderPromotion() {
  if (!state.promotion) {
    els.promotionOverlay.classList.add('is-hidden');
    els.promotionOptions.replaceChildren();
    return;
  }

  const { from, to, color } = state.promotion;
  const fragment = document.createDocumentFragment();
  PROMOTION_PIECES.forEach((pieceType) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'promotion-piece';
    button.textContent = PIECES[`${color}${pieceType}`];
    button.setAttribute('aria-label', `Promote to ${PIECE_NAMES[pieceType]}`);
    button.addEventListener('click', () => makeMove({ from, to, promotion: pieceType }));
    fragment.append(button);
  });
  els.promotionOptions.replaceChildren(fragment);
  els.promotionOverlay.classList.remove('is-hidden');
}

function renderOnline() {
  const active = isOnlineActive();
  const connecting = state.online.status === 'connecting';
  const disconnected = state.online.status === 'disconnected';
  const hasRoomPanel = active || connecting || disconnected;
  const code = state.online.code ?? '.....';
  const color = state.online.color ? colorName(state.online.color) : 'Waiting';
  const opponentColor = state.online.color ? oppositeColor(state.online.color) : null;
  const opponentOnline = opponentColor ? state.online.players[opponentColor] : false;

  els.onlineBadge.textContent = active
    ? code
    : connecting
      ? 'Connecting'
      : disconnected
        ? 'Offline'
        : state.mode === 'bot'
          ? 'BOT'
          : state.mode === 'offline'
            ? 'Offline'
            : 'Menu';
  els.onlineBadge.className = `balance-chip online-badge ${active ? 'is-online' : ''}`;

  if (active) {
    els.onlineSummary.textContent = `Room ${code} - You are ${color} - ${opponentOnline ? 'Opponent online' : 'Waiting'}`;
  } else if (connecting) {
    els.onlineSummary.textContent = 'Connecting...';
  } else if (disconnected) {
    els.onlineSummary.textContent = 'Connection closed';
  } else if (state.mode === 'bot') {
    els.onlineSummary.textContent = `BOT game - You are ${colorName(state.settings.humanColor)}`;
  } else if (state.mode === 'offline') {
    els.onlineSummary.textContent = 'Offline two-player game';
  } else {
    els.onlineSummary.textContent = 'Choose a game mode';
  }

  els.onlineHome.classList.toggle('is-hidden', hasRoomPanel || state.online.menuView !== 'home');
  els.joinForm.classList.toggle('is-hidden', hasRoomPanel || state.online.menuView !== 'join');
  els.roomPanel.classList.toggle('is-hidden', !hasRoomPanel);
  els.roomCode.textContent = code;

  if (active) {
    els.roomStatus.textContent = `You are ${color}. ${opponentOnline ? 'Opponent online.' : 'Waiting for opponent.'}`;
  } else if (connecting) {
    els.roomStatus.textContent = 'Connecting...';
  } else if (disconnected) {
    els.roomStatus.textContent = 'Connection closed.';
  }

  els.leaveOnlineButton.disabled = !active && !connecting && !disconnected;
  els.copyCodeButton.disabled = !state.online.code;
}

function renderGameMeta() {
  const history = state.game.history({ verbose: true });
  const last = history[history.length - 1];
  const legalMoves = state.game.moves().length;

  els.lastMoveLabel.textContent = last ? last.san : 'None';
  els.legalCountLabel.textContent = String(legalMoves);
  els.timeControlLabel.textContent = `${state.settings.clockMinutes} min`;
  els.difficultyLabel.textContent =
    state.mode === 'bot'
      ? `${capitalize(state.settings.botDifficulty)} bot`
      : state.mode === 'online'
        ? 'Live room'
        : state.mode === 'offline'
          ? 'Local table'
          : 'Ready';
}

function renderStartMenu() {
  const showingSettings = state.menuView === 'settings';
  els.closeStartMenuButton.textContent = state.mode === 'menu' ? 'Quick Start' : 'Resume';
  els.startMenuHome.classList.toggle('is-hidden', showingSettings);
  els.settingsPanel.classList.toggle('is-hidden', !showingSettings);
  els.clockMinutesInput.value = String(state.settings.clockMinutes);
  els.botDifficultyInput.value = state.settings.botDifficulty;
  els.menuHintsToggle.checked = state.showHints;
  els.soundToggle.checked = state.settings.sound;
  els.playWhiteButton.classList.toggle('is-selected', state.settings.humanColor === 'w');
  els.playBlackButton.classList.toggle('is-selected', state.settings.humanColor === 'b');
}

function handleSquareClick(square) {
  if (isMoveInputLocked()) return;

  if (state.selectedSquare) {
    const moved = attemptMove(square);
    if (moved) return;
  }

  const piece = state.game.get(square);
  if (piece && piece.color === state.game.turn()) {
    selectSquare(square);
  } else {
    clearSelection();
    render();
  }
}

function handleDragStart(event, square) {
  const piece = state.game.get(square);
  if (!canDrag(square, piece)) {
    event.preventDefault();
    return;
  }

  state.draggedFrom = square;
  selectSquare(square);
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', square);
}

function handleDragOver(event) {
  if (state.draggedFrom) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }
}

function handleDrop(event, square) {
  event.preventDefault();
  const from = event.dataTransfer.getData('text/plain') || state.draggedFrom;
  if (!from) return;
  selectSquare(from);
  attemptMove(square);
  state.draggedFrom = null;
}

function handleDragEnd() {
  state.draggedFrom = null;
}

function attemptMove(to) {
  const from = state.selectedSquare;
  if (!from) return false;

  const matchingMoves = state.legalMoves.filter((move) => move.to === to);
  if (matchingMoves.length === 0) {
    const piece = state.game.get(to);
    if (piece?.color === state.game.turn()) {
      selectSquare(to);
    } else {
      clearSelection();
      render();
    }
    return false;
  }

  const promotionMoves = matchingMoves.filter((move) => move.promotion);
  if (promotionMoves.length > 0) {
    state.promotion = { from, to, color: state.game.turn() };
    render();
    return true;
  }

  makeMove({ from, to });
  return true;
}

function makeMove(moveSpec) {
  if (isOnlineActive()) {
    if (!isOnlineReady()) {
      showNotice('Waiting for opponent');
      return;
    }

    if (state.online.color !== state.game.turn()) {
      showNotice('Not your turn');
      return;
    }

    sendOnline({ type: 'move', move: moveSpec });
    state.promotion = null;
    clearSelection();
    render();
    return;
  }

  applyLocalMove(moveSpec);
}

function applyLocalMove(moveSpec, { scheduleNextBotMove = true } = {}) {
  try {
    const previousClocks = { ...state.clocks };
    const move = state.game.move(moveSpec);
    if (!move) return;

    state.clockHistory.push(previousClocks);
    state.lastMove = { from: move.from, to: move.to };
    state.promotion = null;
    clearSelection();
    playMoveSound(move);
    render();
    if (scheduleNextBotMove) {
      scheduleBotMove();
    }
  } catch (error) {
    showNotice('Illegal move');
  }
}

function selectSquare(square) {
  state.selectedSquare = square;
  state.legalMoves = state.game.moves({ square, verbose: true });
  render();
}

function clearSelection() {
  state.selectedSquare = null;
  state.legalMoves = [];
}

function resetGame() {
  if (isOnlineActive()) {
    sendOnline({ type: 'reset' });
    showNotice('New online game started');
    return;
  }

  startMode(state.mode === 'bot' ? 'bot' : 'offline');
}

function undoMove() {
  if (isOnlineActive()) {
    showNotice('Undo is local only');
    return;
  }

  if (state.game.history().length === 0) return;
  state.game.undo();
  if (state.mode === 'bot' && state.game.history().length > 0 && state.game.turn() !== state.settings.humanColor) {
    state.game.undo();
    state.clockHistory.pop();
  }
  state.clocks = state.clockHistory.pop() ?? state.clocks;
  state.timedOut = null;
  state.promotion = null;
  clearSelection();

  const history = state.game.history({ verbose: true });
  const last = history[history.length - 1];
  state.lastMove = last ? { from: last.from, to: last.to } : null;
  render();
}

function tickClock() {
  if (!state.timerRunning || isBoardLocked()) return;

  const turn = state.game.turn();
  state.clocks[turn] = Math.max(0, state.clocks[turn] - 1);
  if (state.clocks[turn] === 0) {
    state.timedOut = turn;
    state.timerRunning = false;
    render();
    return;
  }
  renderStatus();
  renderClocks();
}

function scheduleBotMove() {
  if (state.mode !== 'bot' || state.game.isGameOver() || state.timedOut) return;
  if (state.game.turn() === state.settings.humanColor) return;
  if (state.bot.thinking) return;

  state.bot.thinking = true;
  render();
  state.bot.timer = window.setTimeout(() => {
    state.bot.thinking = false;
    makeBotMove();
  }, 550);
}

function makeBotMove() {
  if (state.mode !== 'bot' || state.game.isGameOver() || state.timedOut) {
    render();
    return;
  }

  const moves = state.game.moves({ verbose: true });
  if (moves.length === 0) {
    render();
    return;
  }

  const move = chooseBotMove(moves);
  applyLocalMove(
    {
      from: move.from,
      to: move.to,
      promotion: move.promotion || (move.flags.includes('p') ? 'q' : undefined),
    },
    { scheduleNextBotMove: false },
  );
}

function chooseBotMove(moves) {
  if (state.settings.botDifficulty === 'casual') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const scoredMoves = moves.map((move) => ({
    move,
    score: scoreBotMove(move),
  }));
  const bestScore = Math.max(...scoredMoves.map((entry) => entry.score));
  const bestMoves = scoredMoves.filter((entry) => entry.score === bestScore);
  return bestMoves[Math.floor(Math.random() * bestMoves.length)].move;
}

function scoreBotMove(move) {
  let score = 0;
  if (move.captured) score += PIECE_VALUES[move.captured] * 10;
  if (move.promotion) score += PIECE_VALUES[move.promotion] * 12;
  if (move.san.includes('+')) score += 4;
  if (move.san.includes('#')) score += 1000;
  if (move.flags.includes('k') || move.flags.includes('q')) score += 3;
  if (['d4', 'e4', 'd5', 'e5'].includes(move.to)) score += 2;
  score += Math.random();
  return score;
}

function clearBotTimer() {
  if (state.bot.timer) {
    window.clearTimeout(state.bot.timer);
    state.bot.timer = null;
  }
  state.bot.thinking = false;
}

function playMoveSound(move) {
  if (!state.settings.sound) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    state.audioContext = state.audioContext ?? new AudioContext();
    const context = state.audioContext;
    if (context.state === 'suspended') {
      context.resume();
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const isCapture = Boolean(move.captured);
    const isCheck = move.san.includes('+') || move.san.includes('#');

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(isCheck ? 720 : isCapture ? 520 : 360, now);
    oscillator.frequency.exponentialRampToValueAtTime(isCheck ? 920 : isCapture ? 390 : 300, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
  } catch (error) {
    state.settings.sound = false;
  }
}

async function copyFen() {
  const fen = state.game.fen();
  try {
    await navigator.clipboard.writeText(fen);
    showNotice('FEN copied');
  } catch (error) {
    showNotice(fen);
  }
}

function openStartMenu() {
  state.menuView = 'home';
  els.startMenuOverlay.classList.remove('is-hidden');
  renderStartMenu();
}

function closeStartMenu() {
  els.startMenuOverlay.classList.add('is-hidden');
}

function showSettingsPanel() {
  state.menuView = 'settings';
  renderStartMenu();
}

function showStartMenuHome() {
  state.menuView = 'home';
  renderStartMenu();
}

function saveSettings() {
  const minutes = Number.parseInt(els.clockMinutesInput.value, 10);
  state.settings.clockMinutes = Number.isFinite(minutes) ? Math.min(60, Math.max(1, minutes)) : 10;
  state.settings.botDifficulty = els.botDifficultyInput.value;
  state.settings.sound = els.soundToggle.checked;
  state.showHints = els.menuHintsToggle.checked;
  els.hintsToggle.checked = state.showHints;
  state.clocks = createClocks();
  state.clockHistory = [];
  showStartMenuHome();
  showNotice('Settings saved');
  render();
}

function setHumanColor(color) {
  state.settings.humanColor = color;
  renderStartMenu();
}

function startOfflineGame() {
  startMode('offline');
}

function startBotGame() {
  startMode('bot');
}

function startMode(mode) {
  leaveOnlineGame({ silent: true });
  clearBotTimer();
  state.mode = mode;
  state.game = new Chess();
  state.selectedSquare = null;
  state.legalMoves = [];
  state.promotion = null;
  state.clocks = createClocks();
  state.clockHistory = [];
  state.timerRunning = true;
  state.timedOut = null;
  state.lastMove = null;
  state.draggedFrom = null;
  state.bot.thinking = false;
  state.orientation = mode === 'bot' ? state.settings.humanColor : 'w';
  showNotice(mode === 'bot' ? 'BOT game started' : 'Offline game started');
  closeStartMenu();
  render();
  scheduleBotMove();
}

function createClocks() {
  const seconds = getClockSeconds();
  return { w: seconds, b: seconds };
}

function getClockSeconds() {
  return Math.max(1, state.settings.clockMinutes) * 60;
}

function openOnlineMenu() {
  if (!isOnlineActive() && state.online.status !== 'connecting' && state.online.status !== 'disconnected') {
    state.online.menuView = 'home';
  }
  els.onlineOverlay.classList.remove('is-hidden');
  if (isStaticPagesHost()) {
    showOnlineNotice('Online rooms need the local server. Offline and BOT work here.');
  }
  renderOnline();
}

function closeOnlineMenu() {
  els.onlineOverlay.classList.add('is-hidden');
}

function showJoinForm() {
  state.online.menuView = 'join';
  showOnlineNotice('');
  renderOnline();
  window.setTimeout(() => els.joinCodeInput.focus(), 0);
}

function hostOnlineGame() {
  state.online.menuView = 'room';
  connectOnline({ type: 'host' });
}

function joinOnlineGame() {
  const code = els.joinCodeInput.value.replace(/\D/g, '').slice(0, 5);
  if (code.length !== 5) {
    showOnlineNotice('Enter a 5-number code');
    return;
  }

  state.online.menuView = 'room';
  state.online.code = code;
  connectOnline({ type: 'join', code });
}

function connectOnline(action) {
  if (state.online.socket?.readyState === WebSocket.OPEN) {
    sendOnline(action);
    return;
  }

  if (state.online.socket) {
    state.online.socket.close();
  }

  const socketUrl = getOnlineSocketUrl();
  if (!socketUrl) {
    state.online.status = 'offline';
    state.online.pendingAction = null;
    state.online.menuView = action.type === 'join' ? 'join' : 'home';
    showOnlineNotice('Online rooms need the local server. Offline and BOT work here.');
    render();
    return;
  }

  const socket = new WebSocket(socketUrl);
  state.online.socket = socket;
  state.online.status = 'connecting';
  state.online.color = null;
  state.online.players = { w: false, b: false };
  state.online.pendingAction = action;
  showOnlineNotice('');
  render();

  socket.addEventListener('open', () => {
    sendOnline(action);
  });

  socket.addEventListener('message', (event) => {
    handleOnlineMessage(event.data);
  });

  socket.addEventListener('close', () => {
    if (state.online.socket !== socket) return;
    state.online.socket = null;
    state.online.status = 'disconnected';
    state.online.players = { w: false, b: false };
    state.online.pendingAction = null;
    showOnlineNotice('Connection closed');
    render();
  });

  socket.addEventListener('error', () => {
    showOnlineNotice('Could not connect');
  });
}

function handleOnlineMessage(rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    showOnlineNotice('Bad online message');
    return;
  }

  if (message.type === 'error') {
    showOnlineNotice(message.message ?? 'Online error');
    if (state.online.status === 'connecting') {
      state.online.status = 'offline';
      state.online.menuView = state.online.pendingAction?.type === 'join' ? 'join' : 'home';
      state.online.pendingAction = null;
    }
    render();
    return;
  }

  if (message.type === 'hosted' || message.type === 'joined' || message.type === 'room' || message.type === 'move' || message.type === 'reset') {
    updateOnlineRoom(message);
  }

  if (message.type === 'left') {
    resetOnlineState();
    render();
  }
}

function updateOnlineRoom(message) {
  state.mode = 'online';
  state.online.status = message.color === 'w' ? 'hosting' : 'joined';
  state.online.code = message.code;
  state.online.color = message.color;
  state.online.players = message.players ?? { w: false, b: false };
  state.online.pendingAction = null;
  state.online.menuView = 'room';
  state.orientation = message.color ?? state.orientation;
  state.timerRunning = Boolean(message.players?.w && message.players?.b);
  state.timedOut = null;
  syncGameFromServer(message);
  if (message.type === 'hosted' || message.type === 'joined' || message.type === 'reset') {
    state.clocks = createClocks();
    state.clockHistory = [];
  }

  if (message.type === 'hosted') {
    showOnlineNotice('Room hosted');
  } else if (message.type === 'joined') {
    showOnlineNotice('Joined room');
  } else if (message.type === 'reset') {
    showNotice('Online game reset');
  }

  render();
  if (message.type === 'move' && message.move) {
    playMoveSound({ san: message.move.san ?? '', captured: message.move.captured });
  }
}

function syncGameFromServer(message) {
  try {
    const nextGame = new Chess();
    for (const move of message.moves ?? []) {
      nextGame.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
    }
    state.game = nextGame;
  } catch (error) {
    state.game = message.fen ? new Chess(message.fen) : new Chess();
  }

  const history = state.game.history({ verbose: true });
  const last = history[history.length - 1];
  state.lastMove = last ? { from: last.from, to: last.to } : null;
  state.promotion = null;
  clearSelection();
}

function sendOnline(message) {
  const socket = state.online.socket;
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showOnlineNotice('Online connection is not open');
    return;
  }
  socket.send(JSON.stringify(message));
}

async function copyRoomCode() {
  if (!state.online.code) return;
  try {
    await navigator.clipboard.writeText(state.online.code);
    showOnlineNotice('Code copied');
  } catch (error) {
    showOnlineNotice(state.online.code);
  }
}

function leaveOnlineGame({ silent = false } = {}) {
  const socket = state.online.socket;
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'leave' }));
  }
  state.online.socket = null;
  socket?.close();
  resetOnlineState();
  if (!silent) {
    showOnlineNotice('');
    render();
  }
}

function resetOnlineState() {
  state.online = {
    socket: null,
    status: 'offline',
    code: null,
    color: null,
    players: { w: false, b: false },
    pendingAction: null,
    menuView: 'home',
  };
}

function showNotice(message) {
  if (state.noticeTimer) {
    window.clearTimeout(state.noticeTimer);
  }
  els.notice.textContent = message;
  if (message) {
    state.noticeTimer = window.setTimeout(() => {
      els.notice.textContent = '';
      state.noticeTimer = null;
    }, 2800);
  }
}

function showOnlineNotice(message) {
  if (state.onlineNoticeTimer) {
    window.clearTimeout(state.onlineNoticeTimer);
  }
  els.onlineNotice.textContent = message;
  if (message) {
    state.onlineNoticeTimer = window.setTimeout(() => {
      els.onlineNotice.textContent = '';
      state.onlineNoticeTimer = null;
    }, 2800);
  }
}

function getVisibleSquares() {
  const files = state.orientation === 'w' ? FILES : [...FILES].reverse();
  const ranks = state.orientation === 'w' ? RANKS_WHITE : RANKS_BLACK;
  return ranks.flatMap((rank) => files.map((file) => `${file}${rank}`));
}

function getCheckedKingSquare() {
  if (!state.game.isCheck()) return null;
  const kingColor = state.game.turn();
  for (const rank of RANKS_WHITE) {
    for (const file of FILES) {
      const square = `${file}${rank}`;
      const piece = state.game.get(square);
      if (piece?.type === 'k' && piece.color === kingColor) {
        return square;
      }
    }
  }
  return null;
}

function getCaptures() {
  const captures = { w: [], b: [] };
  state.game.history({ verbose: true }).forEach((move) => {
    if (move.captured) {
      const capturedColor = move.color === 'w' ? 'b' : 'w';
      captures[move.color].push({ color: capturedColor, type: move.captured });
    }
  });
  return captures;
}

function getStatusText() {
  if (state.timedOut) {
    return `${colorName(state.timedOut)} flagged. ${colorName(oppositeColor(state.timedOut))} wins on time.`;
  }

  const turn = state.game.turn();
  if (state.mode === 'menu') {
    return 'Choose a mode to start.';
  }
  if (isOnlineActive() && !isOnlineReady()) {
    return `Room ${state.online.code}. Waiting for opponent.`;
  }

  if (state.game.isCheckmate()) {
    return `${colorName(turn)} is checkmated. ${colorName(oppositeColor(turn))} wins.`;
  }
  if (state.game.isStalemate()) return 'Stalemate. The game is drawn.';
  if (state.game.isInsufficientMaterial()) return 'Draw by insufficient material.';
  if (state.game.isThreefoldRepetition()) return 'Draw by threefold repetition.';
  if (state.game.isDrawByFiftyMoves()) return 'Draw by the fifty-move rule.';
  if (state.game.isDraw()) return 'The game is drawn.';
  if (state.game.isCheck()) return `${colorName(turn)} to move, in check.`;
  if (state.mode === 'bot' && state.bot.thinking) return 'BOT is thinking...';
  if (state.mode === 'bot' && turn !== state.settings.humanColor) return 'BOT to move.';
  if (isOnlineActive() && state.online.color !== turn) return `${colorName(turn)} to move. Waiting for opponent.`;
  return `${colorName(turn)} to move.`;
}

function getSquareLabel(square, piece) {
  if (!piece) return `${square}, empty`;
  return `${square}, ${colorName(piece.color)} ${PIECE_NAMES[piece.type]}`;
}

function canDrag(square, piece) {
  return Boolean(piece && piece.color === state.game.turn() && !isMoveInputLocked());
}

function isBoardLocked() {
  return state.timedOut || state.game.isGameOver();
}

function isMoveInputLocked() {
  if (isBoardLocked() || state.promotion) return true;
  if (state.mode === 'menu') return true;
  if (state.mode === 'bot' && state.game.turn() !== state.settings.humanColor) return true;
  if (!isOnlineActive()) return false;
  return !isOnlineReady() || state.online.color !== state.game.turn();
}

function isOnlineActive() {
  return state.online.status === 'hosting' || state.online.status === 'joined';
}

function isOnlineReady() {
  return Boolean(state.online.players.w && state.online.players.b);
}

function getOnlineSocketUrl() {
  if (isStaticPagesHost()) return null;
  const socketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${socketProtocol}://${window.location.host}/ws`;
}

function isStaticPagesHost() {
  return window.location.hostname.endsWith('.github.io');
}

function isLightSquare(square) {
  const fileIndex = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  return (fileIndex + rank) % 2 === 1;
}

function colorName(color) {
  return color === 'w' ? 'White' : 'Black';
}

function oppositeColor(color) {
  return color === 'w' ? 'b' : 'w';
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
