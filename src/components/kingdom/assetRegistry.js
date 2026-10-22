const base=import.meta.env.BASE_URL+'assets/kingdom/greenwood/';
const sprite=(file)=>({src:base+file+'.webp',fallback:base+file+'.png',thumbnail:base+'thumbs/'+file+'.webp',width:640,height:640});
/** @type {Record<string, import('../../game/kingdomContent').SpriteDefinition>} */
export const SPRITES={
  cottage:sprite('starter_cottage'),schoolhouse:sprite('schoolhouse_spelling_academy'),
  townhall:sprite('town_hall_guild_hall'),market:sprite('marketplace_cluster'),
  bakery:sprite('bakery'),well:sprite('well'),greenwoodcastle:sprite('castle'),
  'cottage-grand':sprite('cottage-grand'),
  garden:sprite('garden'),camp:sprite('camp'),
};
export const TERRAIN={src:base+'greenwood-terrain-v2.webp',fallback:base+'greenwood-terrain-v2.png'};
// Planned art has no active building ID, purchase, or save migration.
export const PLANNED_SPRITES={library:sprite('library_word_hall'),tower:sprite('spell_tower')};
