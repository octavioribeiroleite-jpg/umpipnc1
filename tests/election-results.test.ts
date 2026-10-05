import test from 'node:test';
import { createSnapshotRead } from '../src/lib/snapshot-read.ts';
import assert from 'node:assert/strict';
import { calculateElectionRounds, type ElectionVote } from '../src/lib/election-results.ts';

const candidates = [
  { id: 'a', birth_date: '1990-01-01' },
  { id: 'b', birth_date: '1980-01-01' },
  { id: 'c', birth_date: '2000-01-01' },
];
const votes = (counts: Record<string, number>, round = 1): ElectionVote[] => Object.entries(counts).flatMap(([candidate_id, count]) =>
  Array.from({ length: count }, (_, index) => ({ id: `${round}-${candidate_id}-${index}`, ballot_id: `${round}-${candidate_id}-${index}`, candidate_id, round_number: round, is_blank: false })),
);
const elected = (rows: ReturnType<typeof calculateElectionRounds>) => rows.flatMap(row => row.electedIds);

test('a 3–3–2 tie at one seat does not elect the first ranked candidate', () => {
  const result = calculateElectionRounds(votes({ a: 3, b: 3, c: 2 }), candidates, { seats_count: 1, majority_rule: 'simple' });
  assert.equal(result[0].totalBallots, 8);
  assert.equal(result[0].hasTie, true);
  assert.deepEqual(elected(result), []);
});

test('absolute majority uses ballots including blanks and does not elect a plurality below the threshold', () => {
  const rows = [...votes({ a: 4, b: 3 }), { id: 'blank', ballot_id: 'blank', candidate_id: null, is_blank: true, round_number: 1 }];
  const result = calculateElectionRounds(rows, candidates, { seats_count: 1, majority_rule: 'absolute_50' });
  assert.equal(result[0].totalBallots, 8);
  assert.equal(result[0].blankVotes, 1);
  assert.deepEqual(elected(result), []);
  assert.equal(result[0].rows.length, 2);
  assert.deepEqual(elected(calculateElectionRounds(votes({ a: 5, b: 3 }), candidates, { majority_rule: 'absolute_50' })), ['a']);
});

test('multiple choices count one ballot and can elect multiple candidates without summing selections as voters', () => {
  const rows = Array.from({ length: 5 }, (_, index) => ['a', index < 4 ? 'b' : 'c'].map(candidate_id => ({
    id: `${index}-${candidate_id}`, ballot_id: `ballot-${index}`, candidate_id, round_number: 1, is_blank: false,
  }))).flat();
  const result = calculateElectionRounds(rows, candidates, { seats_count: 2, majority_rule: 'absolute_50' });
  assert.equal(result[0].totalBallots, 5);
  assert.deepEqual(elected(result), ['a', 'b']);
});

test('round two uses simple majority for remaining seats and excludes already elected candidates', () => {
  const rows = [...votes({ a: 6, b: 2, c: 2 }), ...votes({ a: 9, b: 4, c: 3 }, 2)];
  const result = calculateElectionRounds(rows, candidates, { seats_count: 2, current_round: 2, majority_rule: 'absolute_50' });
  assert.deepEqual(result[0].electedIds, ['a']);
  assert.deepEqual(result[1].electedIds, ['b']);
  assert.equal(result[1].rows.some(row => row.candidate_id === 'a'), false);
  assert.deepEqual(elected(result), ['a', 'b']);
});

test('round-two cutoff tie stays open; round three applies the existing oldest-candidate tie break', () => {
  const rows = [...votes({ a: 3, b: 3, c: 2 }), ...votes({ a: 4, b: 4 }, 2), ...votes({ a: 4, b: 4 }, 3)];
  const result = calculateElectionRounds(rows, candidates, { seats_count: 1, current_round: 3, majority_rule: 'simple' });
  assert.deepEqual(result[0].electedIds, []);
  assert.deepEqual(result[1].electedIds, []);
  assert.equal(result[1].hasTie, true);
  assert.deepEqual(result[2].electedIds, ['b']);
  assert.equal(result[2].hasTie, true);
});

test('empty results never declare a winner, and legacy votes without ballot ids keep the existing id fallback', () => {
  assert.deepEqual(elected(calculateElectionRounds([], candidates)), []);
  const legacy = votes({ a: 3, b: 1 }).map(({ ballot_id: _, ...row }) => row);
  const result = calculateElectionRounds(legacy, candidates, { majority_rule: 'absolute_50' });
  assert.equal(result[0].totalBallots, 4);
  assert.deepEqual(elected(result), ['a']);
});


test('failed result refresh preserves confirmed elected candidates instead of publishing an empty invalid tally', async () => {
  const reader = createSnapshotRead();
  let result: ReturnType<typeof calculateElectionRounds> | undefined;
  const initial = calculateElectionRounds(votes({ a: 5, b: 3 }), candidates, { majority_rule: 'absolute_50' });
  await reader.run(async () => () => { result = initial; });
  await reader.run(async () => {
    await Promise.reject(new Error('Simulated vote read failure'));
    return () => { result = calculateElectionRounds([], candidates); };
  });
  assert.equal(result, initial);
  assert.deepEqual(elected(result!), ['a']);
  assert.deepEqual(reader.getSnapshot(), { loading: false, hasSnapshot: true, error: true });
  await reader.run(async () => () => { result = calculateElectionRounds([], candidates); });
  assert.deepEqual(elected(result!), []);
  assert.equal(reader.getSnapshot().error, false);
});
