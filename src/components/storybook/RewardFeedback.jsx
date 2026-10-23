import {useState} from 'react';
import StorybookArt from './StorybookArt';
import {achievementsFor} from '../../game/achievements';
import './StorybookCharacters.css';
const titles={word_correct:'Correct!',word_retry:'A little more practice',word_mastered:'Word mastered!',quest_complete:'Quest complete!',building_unlocked:'A new place in your story',region_unlocked:'A new region awaits',rank_up:'A royal milestone',session_complete:'Your adventure, saved'};
export default function RewardFeedback({event,title,message,gold=0,xp=0,children,artOnly=false}){
 const [still,setStill]=useState(false);
 if(artOnly)return <span data-reward-event={event}><StorybookArt id="chest" width="100" height="100"/></span>;
 return <section className={`storybook-reward reward-${event} ${still?'reward-still':''}`} data-reward-event={event} role="status"><StorybookArt id="chest" width="96" height="96"/><div><h2>{title || titles[event]}</h2>{message&&<p>{message}</p>}{(gold>0||xp>0)&&<strong className="reward-amount">+{gold} gold · +{xp} XP saved</strong>}{children}</div>{event!=='word_retry'&&<button type="button" className="reward-motion" aria-label="Stop reward animation" onClick={()=>setStill(true)}>Stop animation</button>}</section>;
}
export function AchievementJournal({mastery,buildings}){
 const badges=achievementsFor(mastery,buildings);
 return <section className="achievement-journal" aria-label="Saved achievements"><span className="gw-eyebrow">YOUR STORY SO FAR</span><h3>Small steps, lasting achievements</h3><p>Badges reflect saved progress. They do not grant extra coins on refresh.</p><div>{badges.map(b=><article key={b.id} data-achievement={b.id} data-earned={b.earned}><span className="achievement-seal" aria-hidden="true">{b.earned?'✦':'◇'}</span><h4>{b.title}</h4><p>{b.detail}</p><strong>{b.earned?'Earned':'Still to discover'}</strong></article>)}</div></section>;
}
