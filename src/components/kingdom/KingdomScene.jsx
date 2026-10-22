import { useState } from 'react';
import { PLOT, plotState } from '../../game/kingdom';
import { buildingLevel, expansionOf } from '../../game/expansion';
import { SPRITES, TERRAIN } from './assetRegistry';
import PetArt from './petArt';

export function KingdomSprite({id,level=1,className='',registry=SPRITES}) {
  const key=id==='cottage' && level>=2 ? 'cottage-grand' : id;
  const art=registry[key];
  const [failed,setFailed]=useState(0);
  if (!art || failed>1) return <span className="ks-art-fallback" role="img" aria-label="Landmark artwork unavailable.">Saved landmark · artwork unavailable</span>;
  return <img className={className} src={failed ? art.fallback : art.src} alt="" draggable="false" decoding="async" loading="lazy" width={art.width} height={art.height} onError={()=>setFailed(n=>n+1)}/>;
}

function Banners({lanterns=false}) {
  return <svg viewBox="0 0 100 115" aria-hidden="true"><g stroke="#876742" strokeWidth="4"><path d="M20 110V14M80 110V14"/></g>{lanterns?<g fill="#ffe6a0" stroke="#7d6338" strokeWidth="3"><path d="M12 15h16v22H12ZM72 15h16v22H72Z"/><path d="M20 17v19M80 17v19" strokeWidth="1"/></g>:<g fill="#2f65a5" stroke="#edc66c" strokeWidth="2"><path d="M20 15h29v56L34 61l-14 10ZM51 15h29v56L65 61l-14 10Z"/><path d="m34 27 2 6 6 2-6 2-2 6-2-6-6-2 6-2ZM65 27l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#f3d480"/></g>}</svg>;
}

/** Reusable scene composer. Terrain, paths, sites, sprites, decor and labels stay separate. */
export default function KingdomScene({region,sites,built,selectedId,gold,onSelect,companion,assets={terrain:TERRAIN,sprites:SPRITES}}) {
  const [terrainFailed,setTerrainFailed]=useState(false);
  const data=expansionOf(built);
  const owned=region.buildings.filter(b=>plotState(built,b.id)===PLOT.BUILT);
  return <div className="ks-story-scene" data-region-id={region.id}>
    <img className="ks-story-terrain" alt="" src={terrainFailed ? assets.terrain.fallback : assets.terrain.src} onError={()=>setTerrainFailed(true)} fetchPriority="high" draggable="false"/>
    <svg className="ks-scene-paths" viewBox="0 0 1280 780" aria-hidden="true"><g fill="none" stroke="#dcc394" strokeWidth="12" opacity=".7">{owned.map(b=><path key={b.id} d={`M${sites[b.id].x} ${sites[b.id].y}Q${sites[b.id].x} ${sites[b.id].y+25} 635 ${sites[b.id].y+40}`}/>)}</g></svg>
    <div className="ks-start-camp" data-role="starter-shelter" aria-label="Starting woodland camp"><KingdomSprite id="camp" registry={assets.sprites}/><small>Woodland camp</small></div>
    {companion && <div className="ks-companion-marker"><PetArt id={companion} size={38} label="Your companion"/></div>}
    {region.buildings.map(b=>{
      const site=sites[b.id],state=plotState(built,b.id),isBuilt=state===PLOT.BUILT,level=buildingLevel(built,b.id),cost=state===PLOT.WILD ? b.clearCost : b.cost;
      return <div key={b.id} className={`ks-scene-slot ${isBuilt ? 'is-owned' : 'is-empty'} ${selectedId===b.id ? 'is-selected' : ''}`} data-art-id={b.id} data-art-state={state} data-level={level} style={{left:site.x/1280*100+'%',top:site.y/780*100+'%',width:site.width/1280*100+'%',zIndex:Math.round(site.y)}}>
        {isBuilt ? <div className="ks-owned-art"><div className="ks-contact-shadow"/><KingdomSprite key={b.id+'-'+level} id={b.id} level={level} registry={assets.sprites}/>{level>=2&&<div className="ks-level-garden" aria-hidden="true"><KingdomSprite id="garden" registry={assets.sprites}/></div>}{level>=3&&<div className="ks-level-flags" aria-hidden="true"><Banners/></div>}</div> : <div className={`ks-construction-site ${state===PLOT.CLEARED?'is-cleared':''}`} aria-hidden="true"><span>+</span><i/><i/></div>}
      </div>;
    })}
    <div className="ks-scene-labels">
      {region.buildings.map(b=>{
        const site=sites[b.id],state=plotState(built,b.id),isBuilt=state===PLOT.BUILT,level=buildingLevel(built,b.id),cost=state===PLOT.WILD?b.clearCost:b.cost;
        return <div key={b.id} className={`ks-scene-hit ${isBuilt?'is-owned':'is-empty'} ${selectedId===b.id?'is-selected':''}`} style={{left:site.x/1280*100+'%',top:site.y/780*100+'%',width:site.width/1280*100+'%'}}>
        <button type="button" className={`gw-lot${isBuilt ? ' is-built' : gold>=cost ? ' is-ready' : ' is-locked'}`} onClick={()=>onSelect(b,true)} aria-pressed={selectedId===b.id} aria-label={`${b.name}. ${isBuilt ? `Built, level ${level}` : `${state===PLOT.WILD?'Clear plot':'Build'} for ${cost} gold`}`}><span aria-hidden="true">{isBuilt?'✓':'+'}</span><span>{b.name}{isBuilt&&<small>Level {level}</small>}</span></button>
        </div>;
      })}
    </div>
    {Object.entries(data.decorations).filter(([,owned])=>owned).map(([key])=><div key={key} className={`ks-decoration ks-decor-${key}`} data-decoration-id={key} aria-label={key.replaceAll('-',' ')}>{key.includes('garden')||key.includes('flower')?<KingdomSprite id="garden" registry={assets.sprites}/>:<Banners lanterns={key.includes('lantern')}/>}</div>)}
    <div className="ks-scene-vignette" aria-hidden="true"/>
  </div>;
}
