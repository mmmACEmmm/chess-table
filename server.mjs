import { createReadStream, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, normalize, resolve } from 'node:path';
import { createServer } from 'node:http';
import { Chess } from './vendor/chess.mjs';

const root = resolve(process.cwd());
const port = Number(process.argv[2] ?? process.env.PORT ?? 4173);
const rooms = new Map();
const clients = new Set();
const webSocketGuid = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.on('upgrade', (request, socket) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  const key = request.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = createHash('sha1')
    .update(`${key}${webSocketGuid}`)
    .digest('base64');

  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${accept}`,
      '',
      '',
    ].join('\r\n'),
  );

  const client = {
    socket,
    buffer: Buffer.alloc(0),
    roomCode: null,
    color: null,
  };

  clients.add(client);
  socket.on('data', (chunk) => readFrames(client, chunk));
  socket.on('close', () => removeClient(client));
  socket.on('error', () => removeClient(client));
});

server.listen(port, () => {
  console.log(`Chess Table running at http://localhost:${port}`);
});

function readFrames(client, chunk) {
  client.buffer = Buffer.concat([client.buffer, chunk]);

  while (client.buffer.length >= 2) {
    const firstByte = client.buffer[0];
    const secondByte = client.buffer[1];
    const opcode = firstByte & 0x0f;
    const isMasked = Boolean(secondByte & 0x80);
    let length = secondByte & 0x7f;
    let offset = 2;

    if (length === 126) {
      if (client.buffer.length < offset + 2) return;
      length = client.buffer.readUInt16BE(offset);
      offset += 2;
    } else if (length === 127) {
      if (client.buffer.length < offset + 8) return;
      const longLength = client.buffer.readBigUInt64BE(offset);
      if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        closeClient(client);
        return;
      }
      length = Number(longLength);
      offset += 8;
    }

    const maskLength = isMasked ? 4 : 0;
    const frameEnd = offset + maskLength + length;
    if (client.buffer.length < frameEnd) return;

    let payload = client.buffer.subarray(offset + maskLength, frameEnd);
    if (isMasked) {
      const mask = client.buffer.subarray(offset, offset + 4);
      payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
    }

    client.buffer = client.buffer.subarray(frameEnd);

    if (opcode === 0x8) {
      closeClient(client);
      return;
    }

    if (opcode === 0x9) {
      client.socket.write(encodeFrame(payload, 0x0a));
      continue;
    }

    if (opcode === 0x1) {
      handleMessage(client, payload.toString('utf8'));
    }
  }
}

function handleMessage(client, rawMessage) {
  let message;
  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    sendJson(client, { type: 'error', message: 'Bad message' });
    return;
  }

  if (message.type === 'host') {
    hostRoom(client);
    return;
  }

  if (message.type === 'join') {
    joinRoom(client, String(message.code ?? ''));
    return;
  }

  if (message.type === 'move') {
    makeRoomMove(client, message.move);
    return;
  }

  if (message.type === 'reset') {
    resetRoom(client);
    return;
  }

  if (message.type === 'leave') {
    removeClientFromRoom(client);
    sendJson(client, { type: 'left' });
  }
}

function hostRoom(client) {
  removeClientFromRoom(client);
  const code = createRoomCode();
  const room = {
    code,
    game: new Chess(),
    players: { w: client, b: null },
  };
  rooms.set(code, room);
  client.roomCode = code;
  client.color = 'w';
  sendJson(client, { type: 'hosted', ...roomState(room, 'w') });
}

function joinRoom(client, code) {
  const cleanCode = code.replace(/\D/g, '').slice(0, 5);
  const room = rooms.get(cleanCode);

  if (!room) {
    sendJson(client, { type: 'error', message: 'Room not found' });
    return;
  }

  if (room.players.b && room.players.b !== client) {
    sendJson(client, { type: 'error', message: 'Room is full' });
    return;
  }

  removeClientFromRoom(client);
  room.players.b = client;
  client.roomCode = cleanCode;
  client.color = 'b';
  sendJson(client, { type: 'joined', ...roomState(room, 'b') });
  broadcastRoom(room, { type: 'room', ...roomState(room) });
}

function makeRoomMove(client, moveSpec) {
  const room = getClientRoom(client);
  if (!room) {
    sendJson(client, { type: 'error', message: 'You are not in a room' });
    return;
  }

  if (client.color !== room.game.turn()) {
    sendJson(client, { type: 'error', message: 'Not your turn' });
    return;
  }

  try {
    const move = room.game.move({
      from: moveSpec?.from,
      to: moveSpec?.to,
      promotion: moveSpec?.promotion,
    });

    if (!move) {
      sendJson(client, { type: 'error', message: 'Illegal move' });
      return;
    }

    broadcastRoom(room, {
      type: 'move',
      move: {
        from: move.from,
        to: move.to,
        captured: move.captured,
        promotion: move.promotion,
        san: move.san,
      },
      ...roomState(room),
    });
  } catch (error) {
    sendJson(client, { type: 'error', message: 'Illegal move' });
  }
}

function resetRoom(client) {
  const room = getClientRoom(client);
  if (!room) {
    sendJson(client, { type: 'error', message: 'You are not in a room' });
    return;
  }

  room.game = new Chess();
  broadcastRoom(room, { type: 'reset', ...roomState(room) });
}

function roomState(room, color = null) {
  return {
    code: room.code,
    color,
    fen: room.game.fen(),
    turn: room.game.turn(),
    moves: room.game.history({ verbose: true }).map((move) => ({
      from: move.from,
      to: move.to,
      promotion: move.promotion,
    })),
    players: {
      w: Boolean(room.players.w),
      b: Boolean(room.players.b),
    },
    gameOver: room.game.isGameOver(),
  };
}

function broadcastRoom(room, message) {
  for (const color of ['w', 'b']) {
    const player = room.players[color];
    if (player) {
      sendJson(player, { ...message, color });
    }
  }
}

function removeClient(client) {
  clients.delete(client);
  removeClientFromRoom(client);
}

function removeClientFromRoom(client) {
  const room = getClientRoom(client);
  if (!room) {
    client.roomCode = null;
    client.color = null;
    return;
  }

  if (room.players.w === client) room.players.w = null;
  if (room.players.b === client) room.players.b = null;
  client.roomCode = null;
  client.color = null;

  if (!room.players.w && !room.players.b) {
    rooms.delete(room.code);
    return;
  }

  broadcastRoom(room, { type: 'room', ...roomState(room) });
}

function getClientRoom(client) {
  return client.roomCode ? rooms.get(client.roomCode) : null;
}

function createRoomCode() {
  let code;
  do {
    code = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  } while (rooms.has(code));
  return code;
}

function sendJson(client, value) {
  if (!client.socket.writable) return;
  client.socket.write(encodeFrame(Buffer.from(JSON.stringify(value), 'utf8')));
}

function encodeFrame(payload, opcode = 0x1) {
  const length = payload.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x80 | opcode, length]), payload]);
  }

  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x80 | opcode;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, payload]);
}

function closeClient(client) {
  removeClient(client);
  client.socket.end();
}
