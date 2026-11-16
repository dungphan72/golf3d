import test from 'node:test';
import assert from 'node:assert/strict';
import {
  courseHcp,
  defaultPars,
  grossOf,
  groupFor,
  holeTone,
  leaderboard,
  parsProblem,
  strokesProblem,
  toParText,
  type PlayerDef,
  type RoundDef,
  type ScoreRow,
} from '../lib/tournament-score.ts';

const r1: RoundDef = { id: 'r1', no: 1, name: 'Vòng 1', holes: 18, pars: defaultPars(18) };
const r2: RoundDef = { id: 'r2', no: 2, name: 'Vòng 2', holes: 9, pars: defaultPars(9) };
const fill = (n: number, v: number) => Array.from({ length: n }, () => v);

test('default pars add up to 72 for 18 holes and 36 for 9', () => {
  assert.equal(defaultPars(18).reduce((a, b) => a + b, 0), 72);
  assert.equal(defaultPars(9).reduce((a, b) => a + b, 0), 36);
});

test('par and stroke checks', () => {
  assert.equal(parsProblem(18, defaultPars(18)), null);
  assert.match(parsProblem(18, defaultPars(9))!, /18 hố/);
  assert.match(parsProblem(9, [4, 4, 4, 4, 4, 4, 4, 4, 9])!, /Par/);
  assert.match(parsProblem(10, fill(10, 4))!, /9 hoặc 18/);
  assert.equal(strokesProblem(9, fill(9, 5)), null);
  assert.equal(strokesProblem(9, [...fill(8, 4), null]), null);
  assert.match(strokesProblem(9, fill(9, 0))!, /1 đến 15/);
  assert.match(strokesProblem(9, fill(8, 4))!, /9 hố/);
});

test('gross only exists once every hole is filled', () => {
  assert.equal(grossOf([...fill(8, 4), null]), null);
  assert.equal(grossOf(fill(9, 4)), 36);
});

test('handicap: tenths, half for nine holes, groups', () => {
  assert.equal(courseHcp(80, 18), 8);
  assert.equal(courseHcp(125, 18), 13);
  assert.equal(courseHcp(160, 9), 8);
  assert.equal(groupFor(80), 'A');
  assert.equal(groupFor(120), 'A');
  assert.equal(groupFor(150), 'B');
  assert.equal(groupFor(300), 'C');
});

test('hole colours and to-par text', () => {
  assert.equal(holeTone(3, 5), 'eagle');
  assert.equal(holeTone(3, 4), 'birdie');
  assert.equal(holeTone(4, 4), 'par');
  assert.equal(holeTone(5, 4), 'bogey');
  assert.equal(holeTone(7, 4), 'double');
  assert.equal(holeTone(null, 4), 'empty');
  assert.equal(toParText(2), '+2');
  assert.equal(toParText(0), 'E');
  assert.equal(toParText(-3), '-3');
});

const players: PlayerDef[] = [
  { id: 'a', name: 'An', hcp10: 80, group: 'A' },
  { id: 'b', name: 'Bình', hcp10: 150, group: 'B' },
  { id: 'c', name: 'Cường', hcp10: 100, group: 'A' },
  { id: 'd', name: 'Dũng', hcp10: 100, group: 'A' },
];
const card = (roundId: string, playerId: string, per: number, status = 'confirmed'): ScoreRow => ({
  roundId,
  playerId,
  status,
  holes: fill(roundId === 'r1' ? 18 : 9, per),
});

test('ranking uses net, then gross; only confirmed complete rounds count', () => {
  const scores: ScoreRow[] = [
    card('r1', 'a', 4), // gross 72, hcp 8 -> net 64
    card('r1', 'b', 5), // gross 90, hcp 15 -> net 75
    card('r1', 'c', 4, 'pending'), // not confirmed: ignored
    { roundId: 'r1', playerId: 'd', status: 'confirmed', holes: [...fill(17, 4), null] }, // incomplete: ignored
  ];
  const board = leaderboard(players, [r1], scores);
  assert.deepEqual(board.map((r) => [r.name, r.rank]), [['An', 1], ['Bình', 2], ['Cường', null], ['Dũng', null]]);
  assert.equal(board[0].gross, 72);
  assert.equal(board[0].net, 64);
  assert.equal(board[0].toPar, 0);
  assert.equal(board[1].net, 75);
});

test('equal net and gross share a rank', () => {
  const board = leaderboard(
    players,
    [r1],
    [card('r1', 'c', 4), card('r1', 'd', 4), card('r1', 'a', 5)],
  );
  const ranks = Object.fromEntries(board.map((r) => [r.name, r.rank]));
  assert.equal(ranks['Cường'], 1);
  assert.equal(ranks['Dũng'], 1);
  assert.equal(ranks['An'], 3);
});

test('all rounds are added up; a round and a group can be picked', () => {
  const scores: ScoreRow[] = [card('r1', 'a', 4), card('r2', 'a', 4), card('r1', 'b', 5)];
  const all = leaderboard(players, [r1, r2], scores);
  const an = all.find((r) => r.name === 'An')!;
  assert.equal(an.rounds, 2);
  assert.equal(an.gross, 72 + 36);
  assert.equal(an.net, 72 + 36 - (8 + 4));
  const only2 = leaderboard(players, [r1, r2], scores, { roundId: 'r2' });
  assert.equal(only2.find((r) => r.name === 'An')!.gross, 36);
  assert.equal(only2.find((r) => r.name === 'Bình')!.gross, null);
  const groupB = leaderboard(players, [r1, r2], scores, { group: 'B' });
  assert.deepEqual(groupB.map((r) => r.name), ['Bình']);
});
