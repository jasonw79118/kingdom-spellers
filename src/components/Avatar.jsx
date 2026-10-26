import {companionSprite} from '../game/dragon';
import {useId,useState} from 'react';
import {PET_ART} from './kingdom/petArt';
import LegacyAvatar from './LegacyAvatar';
import {DEFAULT_AVATAR,normalizeAvatar,tintMatrix,skinTables,CAPE_COLORS} from '../game/avatar';
import {avatarAsset,BODY,HAIR} from './avatarAssets';
import './Avatar.css';
export {AVATAR_OPTIONS,DEFAULT_AVATAR} from '../game/avatar';
function Layer({id,x,y,w,h,onUnavailable,...props}){
 const [attempt,setAttempt]=useState(0),asset=avatarAsset(id);
 return <image {...props} href={attempt?asset.fallback:asset.src} x={x} y={y} width={w} height={h} preserveAspectRatio="none" onError={()=>{if(!attempt)setAttempt(1);else onUnavailable();}}/>;
}
export default function Avatar({config=DEFAULT_AVATAR,size=96,className='',presentation='portrait'}){
 const a=normalizeAvatar(config),uid=useId().replaceAll(':',''),[failed,setFailed]=useState(false);
 const body=BODY[a.base],hair=HAIR[a.hair],full=presentation==='full',skin=skinTables(a.skin),Pet=a.companion?PET_ART[companionSprite(a)]:null;
 const unavailable=()=>setFailed(true),filter=id=>`url(#${uid+id})`,baseId='base-'+a.base;
 if(failed)return <LegacyAvatar config={{...a,hair:['crop','quiff','coils'].includes(a.hair)?'short':a.hair}} size={size} className={className}/>;
 const part=(id,{x,y,w,h},props={})=><Layer key={id} id={id} x={x} y={y} w={w} h={h} {...props} onUnavailable={unavailable}/>;
 return <svg viewBox={full?'0 0 240 320':'60 0 120 120'} width={size} height={full?size*4/3:size} className={`avatar ks-painted-avatar ${full?'avatar-full':'avatar-portrait'} ${className}`} role="img" aria-label="player avatar" data-avatar-base={a.base} data-avatar-hair={a.hair} data-avatar-renderer="painted-v1">
  <title>{a.base==='girl'?'Girl':'Boy'} explorer with {a.hair} hair</title>
  <defs>
   <radialGradient id={uid+'parchment'}><stop stopColor="#fffaf0"/><stop offset="1" stopColor="#e6d4a1"/></radialGradient>
   <filter id={uid+'hair'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={tintMatrix(a.hairColor)}/></filter>
   <filter id={uid+'tunic'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={tintMatrix(a.tunic)}/></filter>
   <filter id={uid+'cape'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={tintMatrix(CAPE_COLORS[a.cape]||'#4a7fb5')}/></filter>
   <filter id={uid+'skin'} colorInterpolationFilters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="table" tableValues={skin[0]}/><feFuncG type="table" tableValues={skin[1]}/><feFuncB type="table" tableValues={skin[2]}/><feFuncA type="identity"/></feComponentTransfer></filter>
   <clipPath id={uid+'skinClip'}><path d={body.skin}/></clipPath><clipPath id={uid+'coatClip'}><path d={body.coat}/></clipPath>
   <clipPath id={uid+'portrait'}><circle cx="120" cy="60" r="57"/></clipPath>
  </defs>
  {!full&&<circle cx="120" cy="60" r="58" fill={filter('parchment')} stroke="#b79a56" strokeWidth="2"/>}
  <g clipPath={full?undefined:filter('portrait')}>
   {a.cape&&part('cape',{x:55,y:94,w:130,h:191},{filter:filter('cape'),'data-avatar-layer':'cape'})}
   {part(baseId,body,{'data-avatar-layer':'body'})}
   <g clipPath={filter('skinClip')}>{part(baseId,body,{filter:filter('skin'),'data-avatar-layer':'skin'})}</g>
   <g clipPath={filter('coatClip')}>{part(baseId,body,{filter:filter('tunic'),'data-avatar-layer':'tunic'})}</g>
   {part('hair-'+a.hair,hair,{filter:filter('hair'),'data-avatar-layer':'hair'})}
   {a.crown&&part('crown-'+a.crown,{x:91,y:a.hair==='bun'?9:11,w:59,h:31},{'data-avatar-layer':'crown'})}
   {full&&a.shield&&part('shield-'+a.shield,{x:47,y:163,w:53,h:75},{'data-avatar-layer':'shield'})}
  </g>
  {!full&&a.shield&&part('shield-'+a.shield,{x:65,y:83,w:26,h:34},{'data-avatar-layer':'shield'})}
  {Pet&&<g data-avatar-layer="companion" transform={full?'translate(175 249) scale(.54)':'translate(148 86) scale(.29)'}><circle cx="50" cy="50" r="49" fill="#fff6dc" stroke="#b99b58" strokeWidth="3"/><Pet/></g>}
 </svg>;
}
