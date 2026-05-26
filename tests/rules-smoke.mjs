import assert from 'node:assert/strict';
import { Chess } from '../vendor/chess.mjs';

function play(game, from, to, promotion) {
  const move = game.move({ from, to, promotion });
  assert.ok(move, `Expected ${from}-${to} to be legal`);
  return move;
}

{
  const game = new Chess();
  play(game, 'e2', 'e4');
  play(game, 'e7', 'e5');
  play(game, 'g1', 'f3');
  play(game, 'b8', 'c6');
  play(game, 'f1', 'c4');
  play(game, 'g8', 'f6');
  const castle = play(game, 'e1', 'g1');
  assert.equal(castle.san, 'O-O');
  assert.equal(game.get('g1')?.type, 'k');
  assert.equal(game.get('f1')?.type, 'r');
}

{
  const game = new Chess();
  play(game, 'e2', 'e4');
  play(game, 'a7', 'a6');
  play(game, 'e4', 'e5');
  play(game, 'd7', 'd5');
  const capture = play(game, 'e5', 'd6');
  assert.equal(capture.captured, 'p');
  assert.equal(game.get('d5'), undefined);
  assert.equal(game.get('d6')?.type, 'p');
}

{
  const game = new Chess('8/P7/8/8/8/8/8/k6K w - - 0 1');
  const promotion = play(game, 'a7', 'a8', 'q');
  assert.equal(promotion.promotion, 'q');
  assert.equal(game.get('a8')?.type, 'q');
}

{
  const game = new Chess();
  play(game, 'f2', 'f3');
  play(game, 'e7', 'e5');
  play(game, 'g2', 'g4');
  play(game, 'd8', 'h4');
  assert.equal(game.isCheckmate(), true);
}

console.log('Rules smoke test passed');
