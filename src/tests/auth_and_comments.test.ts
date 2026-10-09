import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLevel, hashPassword, verifyPassword, createToken, verifyToken } from '../lib/server/auth';
import {
  saveUser,
  findUserById,
  findUserByEmailOrUsername,
  addComment,
  getComments,
  getCommentCountsByPage,
  updateComment,
  deleteComment,
  UserRecord,
  CommentRecord,
} from '../lib/server/db';

test('auth & level calculations', async (t) => {
  await t.test('calculates levels and ranks according to MangaLib progression', () => {
    assert.equal(calculateLevel(0).level, 1);
    assert.equal(calculateLevel(0).rankTitle, 'Новичок');

    // Level 5+ -> Читатель
    const l5 = calculateLevel(20 * 16); // sqrt(320/20) + 1 = 5
    assert.equal(l5.level, 5);
    assert.equal(l5.rankTitle, 'Читатель');

    // Level 10+ -> Любитель
    const l10 = calculateLevel(20 * 81); // sqrt(1620/20) + 1 = 10
    assert.equal(l10.level, 10);
    assert.equal(l10.rankTitle, 'Любитель');

    // Level 20+ -> Отаку
    const l20 = calculateLevel(20 * 361);
    assert.equal(l20.level, 20);
    assert.equal(l20.rankTitle, 'Отаку');

    // Level 50+ -> Сенсей
    const l50 = calculateLevel(20 * 2401);
    assert.equal(l50.level, 50);
    assert.equal(l50.rankTitle, 'Сенсей');

    // Level 75+ -> Архимаг
    const l75 = calculateLevel(20 * 5476);
    assert.equal(l75.level, 75);
    assert.equal(l75.rankTitle, 'Архимаг');
  });

  await t.test('hashes and verifies passwords securely', () => {
    const { hash, salt } = hashPassword('secret123');
    assert.ok(hash && salt);
    assert.equal(verifyPassword('secret123', hash, salt), true);
    assert.equal(verifyPassword('wrongpassword', hash, salt), false);
  });

  await t.test('creates and verifies session tokens', () => {
    const token = createToken('user-1234');
    const uid = verifyToken(token);
    assert.equal(uid, 'user-1234');

    const invalid = verifyToken('tampered.token');
    assert.equal(invalid, null);
  });
});

test('user database operations', async (t) => {
  await t.test('saves and finds user by username or email', () => {
    const testUser: UserRecord = {
      id: 'test-user-id-999',
      username: 'TestReader99',
      email: 'test99@example.com',
      passwordHash: 'hash',
      salt: 'salt',
      avatar: 'https://example.com/avatar.png',
      bio: 'Люблю манхву',
      exp: 150,
      createdAt: Date.now(),
      bookmarks: [],
      history: {},
    };

    saveUser(testUser);

    const byId = findUserById('test-user-id-999');
    assert.ok(byId);
    assert.equal(byId?.username, 'TestReader99');

    const byName = findUserByEmailOrUsername('testreader99');
    assert.ok(byName);
    assert.equal(byName?.id, 'test-user-id-999');

    const byEmail = findUserByEmailOrUsername('TEST99@EXAMPLE.COM');
    assert.ok(byEmail);
    assert.equal(byEmail?.id, 'test-user-id-999');
  });
});

test('comments database operations', async (t) => {
  await t.test('adds, filters by page, counts, and votes on comments', () => {
    const suffix = Date.now().toString();
    const mangaId = 'demo~test-' + suffix;
    const chapterId = 'ch-' + suffix;
    const comm1Id = 'comm-1-' + suffix;
    const comm2Id = 'comm-2-' + suffix;

    const commentChapter: CommentRecord = {
      id: comm1Id,
      mangaId,
      chapterId,
      pageNumber: null, // whole chapter
      userId: 'test-user-id-999',
      username: 'TestReader99',
      userAvatar: 'avatar',
      userLevel: 2,
      text: 'Отличная глава!',
      createdAt: Date.now(),
      likes: 0,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      parentId: null,
      isSpoiler: false,
    };

    const commentPage2: CommentRecord = {
      id: comm2Id,
      mangaId,
      chapterId,
      pageNumber: 2, // page 2
      userId: 'test-user-id-999',
      username: 'TestReader99',
      userAvatar: 'avatar',
      userLevel: 2,
      text: 'Фрейм на стр 2 просто шедевр!',
      createdAt: Date.now() + 10,
      likes: 5,
      dislikes: 0,
      likedBy: [],
      dislikedBy: [],
      parentId: null,
      isSpoiler: true,
    };

    addComment(commentChapter);
    addComment(commentPage2);

    // Filter all
    const all = getComments(mangaId, chapterId);
    assert.ok(all.some(c => c.id === comm1Id));
    assert.ok(all.some(c => c.id === comm2Id));

    // Filter page 2
    const p2Comments = getComments(mangaId, chapterId, 2);
    assert.equal(p2Comments.length, 1);
    assert.equal(p2Comments[0].id, comm2Id);

    // Page counts
    const pageCounts = getCommentCountsByPage(mangaId, chapterId);
    assert.equal(pageCounts[2], 1);

    // Vote update
    updateComment(comm1Id, c => {
      c.likes += 1;
      c.likedBy.push('test-user-id-999');
    });

    const updated = getComments(mangaId, chapterId).find(c => c.id === comm1Id);
    assert.equal(updated?.likes, 1);
    assert.ok(updated?.likedBy.includes('test-user-id-999'));

    // Delete comment
    const deleted1 = deleteComment(comm1Id, 'test-user-id-999');
    assert.equal(deleted1, true);
    deleteComment(comm2Id, 'test-user-id-999');

    const afterDelete = getComments(mangaId, chapterId).find(c => c.id === comm1Id);
    assert.equal(afterDelete, undefined);
  });
});
