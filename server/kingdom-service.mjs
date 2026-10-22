import { reduceKingdomAction } from '../src/game/expansion.js';

// db is an Appwrite Databases service. Kept injectable for offline contract tests.
export async function executeKingdomTransaction({ db, query, databaseId='kingdom', actorId, playerId, action }) {
  if (!actorId || typeof playerId !== 'string' || !/^[a-zA-Z0-9._-]{1,36}$/.test(playerId)) throw Object.assign(new Error('A signed-in player is required.'),{status:401});
  const tx=await db.createTransaction({ttl:60});
  const common={databaseId,transactionId:tx.$id};
  try {
    const profileDoc=await db.getDocument({...common,collectionId:'player_profiles',documentId:playerId});
    if (profileDoc.parentId!==actorId) throw Object.assign(new Error('This player is not part of your account.'),{status:403});
    const progressDoc=await db.getDocument({...common,collectionId:'player_progress',documentId:playerId});
    // Reuse the existing player index; no composite index/schema migration.
    const mastery=[];
    let cursor;
    do {
      const records=await db.listDocuments({...common,collectionId:'player_word_mastery',queries:[query.equal('playerId',playerId),query.limit(100),...(cursor?[query.cursorAfter(cursor)]:[])]});
      const correct=records.documents.find(word=>word.correctAttempts>0);
      if(correct){mastery.push(correct);break;}
      cursor=records.documents.length===100 ? records.documents.at(-1).$id : null;
    } while(cursor);
    const profile={id:profileDoc.$id,parent_id:profileDoc.parentId,coins:profileDoc.coins,xp:profileDoc.xp,avatar:JSON.parse(profileDoc.avatar || '{}'),name:profileDoc.name};
    const progress={player_id:playerId,buildings:JSON.parse(progressDoc.buildings || '{}'),unlocked_kingdoms:JSON.parse(progressDoc.unlockedKingdoms || '[1]'),current_kingdom:progressDoc.currentKingdom,royal_tests_completed:progressDoc.royalTestsCompleted};
    let result;
    try {result=reduceKingdomAction({profile,progress,mastery},action,actorId);}
    catch(error){error.status=400;throw error;}
    if (result.replay) {await db.updateTransaction({transactionId:tx.$id,rollback:true});return result;}
    await db.updateDocument({...common,collectionId:'player_progress',documentId:playerId,data:{buildings:JSON.stringify(result.progress.buildings)}});
    const cost=profile.coins-result.profile.coins;
    if (cost>0) await db.decrementDocumentAttribute({...common,collectionId:'player_profiles',documentId:playerId,attribute:'coins',value:cost,min:0});
    await db.updateTransaction({transactionId:tx.$id,commit:true});
    return result;
  } catch(error) {
    try {await db.updateTransaction({transactionId:tx.$id,rollback:true});} catch { /* failed/expired transaction is already closed */ }
    throw error;
  }
}
