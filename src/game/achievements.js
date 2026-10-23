import {masteryLevel} from './mastery.js';
import {QUESTS,expansionOf} from './expansion.js';
// Badges are views of durable learning/quest records, never extra payouts.
export function savedMasteryLevel(record){return masteryLevel({attempts:record?.attempts || 0,correct:record?.correct_attempts ?? record?.correctAttempts ?? 0,streak:record?.current_streak ?? record?.currentStreak ?? 0,score:record?.mastery_score ?? record?.masteryScore});}
export function achievementsFor(mastery=[],buildings={}){
 const first=mastery.some(m=>(m.correct_attempts ?? m.correctAttempts ?? 0)>0);
 const mastered=mastery.filter(m=>savedMasteryLevel(m)==='mastered').length;
 const quests=expansionOf(buildings).quests;
 return [{id:'first-word',title:'A word takes root',detail:'A correct spelling saved to your learning history.',earned:first},{id:'word-scholar',title:'Word scholar',detail:`${mastered} mastered words. Mastery takes repeated successful practice.`,earned:mastered>0},...QUESTS.map(q=>({id:q.id,title:q.title,detail:'Quest decoration saved in your village.',earned:Boolean(quests[q.id])}))];
}
