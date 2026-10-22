import { useEffect, useRef, useState } from 'react';
import { KINGDOMS, PLOT, plotState } from '../../game/kingdom';
import { GREENWOOD_SITES, GREENWOOD_DESCRIPTIONS } from '../../game/greenwood';
import { CONTENT_VERSION, QUESTS, DECORATIONS, expansionOf, buildingLevel, upgradeCost, questEligible } from '../../game/expansion';
import KingdomScene, { KingdomSprite } from './KingdomScene';
import './GreenwoodVillage.css';
import './StorybookScene.css';

const kingdom=KINGDOMS[0];

export default function GreenwoodVillage({built,gold,busy,onClear,onBuild,onPractice,companion,onUpgrade,onDecorate,onQuest,mastery=[],expansionAvailable=false}) {
  const [selectedId,setSelectedId]=useState(null),[zoom,setZoom]=useState(1);
  const viewport=useRef(null),detail=useRef(null);
  const selected=kingdom.buildings.find(b=>b.id===selectedId);
  const state=selected ? plotState(built,selected.id) : null;
  const level=selected ? buildingLevel(built,selected.id) : 0;
  const data=expansionOf(built),count=kingdom.buildings.filter(b=>plotState(built,b.id)===PLOT.BUILT).length;
  const price=selected ? state===PLOT.WILD ? selected.clearCost : selected.cost : 0;
  useEffect(()=>{const el=viewport.current;if(el)el.scrollLeft=(el.scrollWidth-el.clientWidth)/2;},[zoom]);
  function select(b,fromMap=false){
    setSelectedId(b.id);
    if(fromMap)requestAnimationFrame(()=>{detail.current?.focus({preventScroll:true});if(matchMedia('(max-width:720px)').matches)detail.current?.scrollIntoView({block:'nearest'});});
    else{const el=viewport.current,site=GREENWOOD_SITES[b.id];if(el)el.scrollTo({left:site.x/1280*el.scrollWidth-el.clientWidth/2,top:Math.max(0,site.y/780*el.scrollHeight-el.clientHeight/2)});}
  }
  const pan=(x,y=0)=>viewport.current?.scrollBy({left:x,top:y});
  return <section className="gw gw-storybook" aria-label="Greenwood Village restoration" data-content-version={CONTENT_VERSION}>
    <header className="gw-intro"><div><span className="gw-eyebrow">CHAPTER ONE · THE WOODLAND REALM</span><h2>A kingdom written by you.</h2><p>Spell a word. Plant a beginning. Build a place to call home.</p></div><div className="gw-progress"><strong>{count}<span> / 7</span></strong><span>places restored</span><progress value={count} max={7} aria-label="Greenwood restoration"/></div></header>
    <div className="gw-layout">
      <div className="gw-world">
        <div className="gw-world-bar"><span><i aria-hidden="true"/>Greenwood Village</span><span>{count===0?'A clearing full of possibility':count===7?'Your flourishing woodland village':'Your village is growing'} · {gold.toLocaleString()} gold</span></div>
        <div className="gw-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Village map. Use arrow keys to explore, or scroll and swipe." onKeyDown={e=>{if(e.target!==e.currentTarget)return;const movement={ArrowLeft:[-120,0],ArrowRight:[120,0],ArrowUp:[0,-120],ArrowDown:[0,120]}[e.key];if(movement){e.preventDefault();pan(...movement);}if(e.key==='Home'){e.preventDefault();setZoom(1);viewport.current?.scrollTo({left:0,top:0});}}}>
          <div className="gw-canvas" style={{width:zoom*100+'%',minWidth:zoom*1080+'px'}}><KingdomScene region={kingdom} sites={GREENWOOD_SITES} built={built} selectedId={selectedId} gold={gold} onSelect={select} companion={companion}/></div>
        </div>
        <div className="gw-map-tools" aria-label="Map controls"><span>Tap a place to explore · drag the scrollbars or swipe to travel</span><div><button type="button" aria-label="Pan left" onClick={()=>pan(-180)}>←</button><button type="button" aria-label="Pan right" onClick={()=>pan(180)}>→</button><button type="button" aria-label="Zoom out" disabled={zoom===1} onClick={()=>setZoom(z=>Math.max(1,z-.25))}>−</button><output aria-label="Map zoom">{Math.round(zoom*100)}%</output><button type="button" aria-label="Zoom in" disabled={zoom===1.75} onClick={()=>setZoom(z=>Math.min(1.75,z+.25))}>+</button><button type="button" aria-label="Reset map view" onClick={()=>{setZoom(1);viewport.current?.scrollTo({left:0,top:0});}}>↺</button></div></div>
      </div>
      <aside className={`gw-detail ${selected?'has-selection':''}`} ref={detail} tabIndex={-1} aria-label="Selected plot details">
        {selected ? <>
          <div className="gw-preview" aria-hidden="true"><KingdomSprite key={selected.id+'-'+level} id={selected.id} level={level}/><span>{state===PLOT.BUILT?`Your landmark · Level ${level}`:'Your future building · preview'}</span></div>
          <div className="ks-building-description"><span className="gw-eyebrow">{state===PLOT.BUILT?'A PART OF YOUR STORY':state===PLOT.CLEARED?'READY TO BUILD':'A NEW BEGINNING'}</span><h3>{selected.name}</h3><p>{GREENWOOD_DESCRIPTIONS[selected.id]}</p><dl><div><dt>Plot</dt><dd>{state===PLOT.BUILT?'Built & saved':state===PLOT.CLEARED?'Cleared':'Wild land'}</dd></div><div><dt>Prosperity when built</dt><dd>+{selected.prosperity}</dd></div>{state!==PLOT.BUILT&&<><div><dt>Clear land</dt><dd>{selected.clearCost} gold{state===PLOT.CLEARED?' · paid':''}</dd></div><div><dt>Build afterward</dt><dd>{selected.cost} gold</dd></div></>}</dl></div>
          <div className="ks-building-actions">{state===PLOT.BUILT?<>
            <p className="gw-saved">✓ You brought this place to life.</p>
            {level<3?<><p className="gw-requirement">Level {level+1}: {level===1?'a welcoming garden and richer surroundings':'royal banners and a flourishing landmark'}. {selected.id==='cottage'&&level===1?'Your cottage gains a new wing.':''} Upgrades are optional and do not change spelling rewards.</p><button type="button" className="gw-primary gw-upgrade" disabled={busy||!expansionAvailable||gold<upgradeCost(selected,level+1)} onClick={()=>onUpgrade(selected,level+1)}>Upgrade to level {level+1} · {upgradeCost(selected,level+1)} gold</button>{!expansionAvailable&&<p className="gw-shortfall">New upgrades are being prepared for your kingdom. Your existing buildings are safe.</p>}</>:<p className="gw-saved">Level 3 · Fully improved</p>}
          </>:<><p className="gw-requirement">{state===PLOT.WILD?'Clear the land first, then build when you have enough gold.':'Your plot is ready. Confirm below to place your landmark.'}</p><button type="button" className="gw-primary" disabled={busy||gold<price} onClick={()=>state===PLOT.WILD?onClear(selected):onBuild(selected)}>{busy?'Saving…':`${state===PLOT.WILD?'Clear plot':'Build'} · ${price} gold`}</button>{gold<price&&<p className="gw-shortfall" role="status">Earn {price-gold} more gold through practice.</p>}</>}
          <button type="button" className="gw-practice" onClick={()=>onPractice()}>Practice & earn gold →</button></div>
        </>:<div className="ks-welcome"><div><span className="gw-eyebrow">YOUR NEXT LITTLE ADVENTURE</span><h3>{count===0?'An open meadow. Your first chapter.':'A little more of your story.'}</h3><p>Start with a woodland camp. Earn gold by practicing your own words, clear a plot, and watch each place become part of your village.</p></div><button type="button" className="gw-primary" onClick={()=>onPractice('first-words')}>Begin a spelling mission →</button></div>}
      </aside>
    </div>
    <div className="gw-journal"><div><span className="gw-eyebrow">THE VILLAGE JOURNAL</span><p>Choose a place to inspect its real cost. Nothing is built until you make it happen.</p></div><span className="gw-purse">{gold.toLocaleString()} <span>gold available</span></span></div>
    <div className="gw-sites" aria-label="Village places">{kingdom.buildings.map(b=>{const s=plotState(built,b.id),owned=s===PLOT.BUILT,cost=s===PLOT.WILD?b.clearCost:b.cost;return <button key={b.id} type="button" className={`gw-site ${selectedId===b.id?'is-selected':''}`} aria-pressed={selectedId===b.id} onClick={()=>select(b)}><span className={`gw-site-marker ${owned?'is-built':''}`} aria-hidden="true">{owned?'✓':'+'}</span><span><strong>{b.name}</strong><small>{owned?`Restored · Level ${buildingLevel(built,b.id)}`:`${s===PLOT.WILD?'Clear':'Build'} · ${cost} gold`}</small></span></button>;})}</div>
    <section className="ks-mission-journal" aria-label="Greenwood missions"><header><span className="gw-eyebrow">LITTLE QUESTS, LASTING CHANGES</span><h3>Your woodland adventures</h3><p>Use your own words. Keep your normal spelling rewards. Earn a little beauty for your village.</p></header><div className="ks-mission-grid">{QUESTS.map(q=>{const complete=Boolean(data.quests[q.id]),eligible=questEligible(q,built,mastery);return <article key={q.id} className={complete?'is-complete':''} data-quest-id={q.id}><span className="ks-quest-symbol" aria-hidden="true">{q.icon}</span><h4>{q.title}</h4><p>{q.instruction}</p><small>{q.reward==='word-garden'?'Reward: a flower garden':q.reward==='home-banner'?'Reward: a home banner':'Reward: school lanterns'}</small>{complete?<strong className="ks-quest-done">✓ Reward in your village</strong>:eligible?<button type="button" className="gw-primary" disabled={busy||!expansionAvailable} onClick={()=>onQuest(q.id)}>Collect {q.title} reward</button>:q.requirement==='correct-word'?<button type="button" className="gw-practice" onClick={()=>onPractice(q.id)}>Start spelling mission →</button>:<button type="button" className="gw-practice" onClick={()=>select(kingdom.buildings.find(b=>b.id===q.requirement))}>Explore its building →</button>}</article>;})}</div></section>
    <section className="ks-decor-shop" aria-label="Village decorations"><h3>Make it feel like home</h3><div>{DECORATIONS.map(d=>{const owned=data.decorations[d.id],ready=plotState(built,d.requires)===PLOT.BUILT;return <article key={d.id}><h4>{d.title}</h4><p>{owned?'Placed in your village':ready?`${d.cost} gold · optional decoration`:`First build ${kingdom.buildings.find(b=>b.id===d.requires).name}`}</p><button type="button" className="gw-practice" disabled={busy||owned||!ready||gold<d.cost||!expansionAvailable} onClick={()=>onDecorate(d.id)}>{owned?'✓ Placed':`Place for ${d.cost} gold`}</button></article>;})}</div></section>
  </section>;
}
