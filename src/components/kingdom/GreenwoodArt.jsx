// Original SVG layers, composed independently at stable ground anchors.
// No purchase, account, or progression state is stored by the artwork.
export function GreenwoodTree({ x, y, s = 1, light = false }) {
  return <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx="18" cy="7" rx="48" ry="13" fill="#244b3b" opacity=".15" />
    <path d="M-9 4 -6-75 7-75 12 4Z" fill="#79583e" />
    <path d="M0-35 -25-66 M3-52 26-85" stroke="#79583e" strokeWidth="8" fill="none" />
    <path d="M-55-63 C-82-103-45-136-21-126 C-13-171 45-155 46-124 C88-120 83-72 56-64 C38-36-29-37-55-63Z" fill={light ? "#60925a" : "#32684c"} />
    <path d="M-52-99 C-51-123-30-134-16-124 C-5-152 31-146 35-126 C14-130 8-110-4-101 C-23-111-33-99-52-99Z" fill={light ? "#a0bf72" : "#70a365"} />
    <path d="M-38-68 Q-12-49 7-70 M17-92 Q44-75 61-96" stroke="#244e3c" strokeWidth="5" opacity=".25" fill="none" strokeLinecap="round" />
  </g>;
}

function Flowers({ x = 0, y = 0 }) {
  return <g transform={`translate(${x} ${y})`}>
    {[-18,-8,2,13,24].map((v,i)=><g key={v}><path d={`M${v} 0q-4-10 0-17`} stroke="#4f7946" strokeWidth="2" fill="none"/><circle cx={v} cy={-14-i%2*6} r="4" fill={i%2 ? "#fff0c1" : "#dcaa72"}/><circle cx={v} cy={-14-i%2*6} r="1.5" fill="#9d7138"/></g>)}
  </g>;
}

function Window({ x, y, round = false }) {
  return <g transform={`translate(${x} ${y})`}>
    <rect width="25" height="32" rx={round ? 12 : 3} fill="#f9dd91" stroke="#69543e" strokeWidth="5" />
    <path d="M12 1v29M1 16h23" stroke="#83694b" strokeWidth="3" />
    <path d="M-5 34h35" stroke="#bba47a" strokeWidth="5" />
  </g>;
}

function House({ kind }) {
  const hall = kind === "townhall", school = kind === "schoolhouse", bakery = kind === "bakery";
  const w = hall ? 172 : school ? 145 : 130;
  const roof = school ? "#526f67" : hall ? "#8f5041" : "#b9664a";
  return <g>
    <ellipse cx="5" cy="2" rx={w*.76} ry="24" fill="#2c4e37" opacity=".19" />
    <path d={`M${-w/2-7} 0 ${w/2+15} 0 ${w/2+42} -18 ${-w/2+20} -22Z`} fill="#b7a27b" />
    <path d={`M${-w/2}-10v-101l${w/2}-55 ${w/2} 55v101Z`} fill="#f0dfb7" stroke="#846c4d" strokeWidth="3" />
    <path d={`M${w/2}-10l34-26v-100l-34 25Z`} fill="#c6b28b" stroke="#846c4d" strokeWidth="3" />
    <path d={`M${-w/2-15}-108 ${-6}-177 ${w/2+43}-136 ${w/2+9}-100 -6-151 ${-w/2-12}-94Z`} fill={roof} stroke="#744f3d" strokeWidth="4" strokeLinejoin="round" />
    <path d={`M-6-177 3-162 ${w/2+43}-128M-6-151v-19`} stroke="#e29a70" strokeWidth="4" fill="none" opacity=".6" />
    {[0,1,2,3].map(i=><path key={i} d={`M${-w/2+5+i*15} ${-118-i*10}l${w/2+2} 33`} stroke="#773e30" strokeWidth="2" opacity=".3" />)}
    <path d={`M${-w/2+7}-14v-85M${w/2-7}-14v-86M${-w/2}-56h${w}M0-141v37M-34-112l34 26 34-26`} stroke="#866044" strokeWidth="7" fill="none" />
    <path d="M-17-11v-43a17 17 0 0 1 34 0v43Z" fill="#79563e" stroke="#5e4836" strokeWidth="3" />
    <path d="M-9-58v46M0-62v50M9-58v46" stroke="#b68c5b" strokeWidth="2" opacity=".6" />
    <circle cx="10" cy="-32" r="2.5" fill="#e7b952" />
    <Window x={-w/2+16} y={-97} /><Window x={w/2-40} y={-97} />
    <path d="M-24-7h48M-29-1h58M-33 5h66" stroke="#d7c497" strokeWidth="7" />
    <path d={`M${w/2+15}-146v-39h17v44`} fill="#ae8467" stroke="#785d49" strokeWidth="3" />
    <path d={`M${w/2+10}-184h27`} stroke="#d1ac8a" strokeWidth="5" />
    <Flowers x={-w/2-6} y={1} /><Flowers x={w/2+20} y={-14} />
    {bakery && <g><path d="M-74-70h61l-2 26h-67Z" fill="#f6d9a0" stroke="#775a40" strokeWidth="3"/><path d="M-67-70l-6 26m24-26-5 26m23-26-4 26" stroke="#b75d48" strokeWidth="10"/><path d="M-80-44v34m65-34v34" stroke="#6c573e" strokeWidth="4"/><ellipse cx="-48" cy="-29" rx="20" ry="7" fill="#c58d43"/><path d="M-57-32l3 5m6-6 3 5" stroke="#ffe1a0" strokeWidth="2"/></g>}
    {school && <g><path d="M-17-159v-41h34v41" fill="#dfc99a" stroke="#69583f" strokeWidth="3"/><path d="M-25-200 0-223l25 23Z" fill="#4c6f64"/><path d="M-7-179q0-16 14 0v8H-7Z" fill="#d7a847"/><path d="M0-169v6" stroke="#5f4d38" strokeWidth="3"/></g>}
    {hall && <g><circle cx="0" cy="-120" r="14" fill="#f9edc9" stroke="#785c42" strokeWidth="4"/><path d="M0-129v10l7 3" stroke="#5e4f3c" strokeWidth="2" fill="none"/><path d="M-55-54v30l9-6 9 6v-30M37-54v30l9-6 9 6v-30" fill="#496b54"/></g>}
  </g>;
}

function Castle() {
  return <g>
    <ellipse cy="5" rx="140" ry="29" fill="#2c4e37" opacity=".2" />
    <path d="M-104 0 -110-118 100-118 110 0Z" fill="#d3bc91" stroke="#887453" strokeWidth="4" />
    <path d="M-55-45v-129H55v129" fill="#ead7af" stroke="#887453" strokeWidth="4" />
    <path d="M-72-170 0-222l72 52Z" fill="#597560" stroke="#3f594b" strokeWidth="4" />
    {[-99,99].map((x)=><g key={x} transform={`translate(${x} 0)`}><path d="M-24 0v-143h48V0" fill="#dfcca7" stroke="#887453" strokeWidth="4"/><path d="M-33-139 0-195l33 56Z" fill="#a65e48" stroke="#744c39" strokeWidth="4"/><Window x={-12} y={-115} round/><path d="M0-197v-31h33l-9 12 9 10H0" fill="#365e4c" stroke="#635d3e" strokeWidth="2"/></g>)}
    {[-90,-48,-6,36,78].map(x=><path key={x} d={`M${x}-58h26M${x+5}-33h23M${x}-88h27`} stroke="#ae9875" strokeWidth="2" opacity=".6"/>)}
    <path d="M-24 0v-40a24 24 0 0 1 48 0V0" fill="#70533c" stroke="#937d58" strokeWidth="5"/><path d="M-16-34v33M-5-41v41M6-41v41M17-34v33" stroke="#ae8c57" strokeWidth="3"/>
    <Window x={-12} y={-146} round/><path d="M-35 7h70M-45 17h90" stroke="#c8b88c" strokeWidth="9"/><Flowers x={-65} y={2}/><Flowers x={65} y={2}/>
  </g>;
}

export function GreenwoodBuilding({ id }) {
  if (id === "greenwoodcastle") return <Castle />;
  if (id === "well") return <g><ellipse cy="5" rx="48" ry="12" fill="#294d39" opacity=".18"/><path d="M-31-28v27q31 19 62 0v-27" fill="#c2b390" stroke="#786d51" strokeWidth="3"/><ellipse cy="-28" rx="31" ry="13" fill="#e3d3ad" stroke="#897b5c" strokeWidth="4"/><ellipse cy="-29" rx="20" ry="7" fill="#506d72"/><path d="M-30-25v-65M30-25v-65" stroke="#785539" strokeWidth="7"/><path d="M-44-84 0-113l44 29-13 11L0-95-31-73Z" fill="#a85d43" stroke="#754d36" strokeWidth="3"/><path d="M-29-59h61M0-61v30" stroke="#8f7150" strokeWidth="3"/><path d="M21-27h16l-3 16H24Z" fill="#a37d52"/><Flowers x={-43} y={3}/></g>;
  if (id === "market") return <g><ellipse cy="2" rx="110" ry="23" fill="#294d39" opacity=".15"/>{[-58,48].map((x,i)=><g key={x} transform={`translate(${x} ${i*12-12})`}><path d="M-39-72h78l12 28H-49Z" fill={i ? "#ead7a6" : "#a85d48"} stroke="#776041" strokeWidth="3"/><path d="M-24-72l-7 28M0-72v28M24-72l7 28" stroke={i ? "#54795f" : "#f3d6a0"} strokeWidth="13"/><path d="M-40-44V0M40-44V0" stroke="#785a3f" strokeWidth="5"/><path d="M-42-26h84v27h-84Z" fill="#ba935d" stroke="#795a3b" strokeWidth="3"/><path d="M-25-24v23M0-24v23M25-24v23" stroke="#8f6d46" strokeWidth="2"/>{[-25,-12,2,17,29].map((a)=><circle key={a} cx={a} cy={-31} r="7" fill={i ? "#d6a046" : "#8ca25c"}/>)}</g>)}</g>;
  return <House kind={id} />;
}

export function GreenwoodStarter() {
  return <g transform="translate(180 555) scale(.72)" data-role="starter-shelter">
    <ellipse cy="3" rx="61" ry="16" fill="#294d39" opacity=".17"/>
    <path d="M-46 0v-65l43-29 53 32V0Z" fill="#b5a17a" stroke="#79664a" strokeWidth="4"/>
    <path d="M-57-58-7-112 65-65 50-51-5-86-47-49Z" fill="#82734e" stroke="#65583d" strokeWidth="4"/>
    <path d="M-40-48h81M-40-29h81M-40-11h81" stroke="#88734e" strokeWidth="3"/>
    <path d="M-5 0v-47h27V0" fill="#66553d"/><path d="M-40-42h23v22h-23Z" fill="#8a8e6c" stroke="#685d42" strokeWidth="3"/>
    <path d="M31-80l20 7-8 10-18-10Z" fill="#bba372"/><Flowers x={-47} y={3}/>
  </g>;
}

export function GreenwoodLandscape({ id, children }) {
  return <svg viewBox="0 0 1280 780" className="gw-landscape" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="#badcdb"/><stop offset="1" stopColor="#f7f0d0"/></linearGradient>
      <linearGradient id={`${id}-grass`} x2=".2" y2="1"><stop stopColor="#b1c982"/><stop offset="1" stopColor="#739b58"/></linearGradient>
      <linearGradient id={`${id}-water`} x2="1" y2="1"><stop stopColor="#89c7c3"/><stop offset="1" stopColor="#4d959f"/></linearGradient>
      <pattern id={`${id}-grain`} width="51" height="39" patternUnits="userSpaceOnUse"><path d="m5 22 3-7m22 17 2-6m13-9 2-5" stroke="#5d854e" strokeWidth="1.3" opacity=".2"/><circle cx="16" cy="8" r="1.4" fill="#e5dda4" opacity=".4"/></pattern>
    </defs>
    <rect width="1280" height="780" fill={`url(#${id}-sky)`}/>
    <circle cx="1045" cy="105" r="61" fill="#fff1bd" opacity=".85"/><circle cx="1045" cy="105" r="82" fill="#fff7d3" opacity=".18"/>
    <g fill="#fff9e5" opacity=".65"><path d="M145 104c0-20 27-28 40-12 13-27 53-23 59 5 29-9 40 10 38 17H139Z"/><path d="M730 66c4-18 24-21 33-7 19-25 50-13 51 8 23-4 33 8 30 15H723Z"/></g>
    <path d="M0 251Q140 137 308 236T664 224 981 199 1280 241V780H0Z" fill="#a8c4a0"/>
    <path d="M0 318Q190 221 395 291T792 271 1280 293V780H0Z" fill="#9bb78a"/>
    {[40,96,145,210,315,1010,1070,1135,1210,1260].map((x,i)=><GreenwoodTree key={x} x={x} y={286+i%3*12} s={.43+i%2*.1} light/>)}
    <path d="M0 382Q227 272 462 335T844 320 1280 362V780H0Z" fill={`url(#${id}-grass)`}/>
    <path d="M0 443Q230 341 466 382T847 369 1280 410V780H0Z" fill="#a3be76" opacity=".5"/>
    <path d="M0 382Q227 272 462 335T844 320 1280 362V780H0Z" fill={`url(#${id}-grain)`}/>
    <path d="M1167 310Q1068 389 1129 474T1180 624 1118 780H1280V313Z" fill="#d2d9a3"/>
    <path d="M1184 303Q1084 390 1149 473T1201 625 1142 780H1280V305Z" fill={`url(#${id}-water)`}/>
    <g fill="none" stroke="#daf1dc" strokeWidth="3" opacity=".5"><path d="M1160 366q30-9 63-4m-72 108q35-9 71 2m-25 99q32 13 61 3m-49 108q26 9 62-1m-89 62q30 8 56-1"/></g>
    <path d="M495 808C455 726 600 675 581 588S510 469 564 414 650 375 615 328" stroke="#617a48" strokeWidth="57" opacity=".14" fill="none"/>
    <path d="M495 808C455 726 600 675 581 588S510 469 564 414 650 375 615 328" stroke="#d7bf8e" strokeWidth="44" fill="none"/>
    <path d="M495 808C455 726 600 675 581 588S510 469 564 414 650 375 615 328" stroke="#eddaa5" strokeWidth="27" opacity=".65" fill="none"/>
    <path d="M78 600Q149 521 183 550" fill="none" stroke="#d7bf8e" strokeWidth="18"/>
    {children}
    <g stroke="#68774c" strokeWidth="2" fill="none" opacity=".6"><path d="m1069 631 6-21 5 16m-942 48 5-17 4 16m618 45 5-22 5 18m310-380 4-13 4 12"/></g>
    {[{x:48,y:493,s:1.12},{x:98,y:391,s:.84},{x:1244,y:495,s:1.12},{x:1265,y:685,s:1.3},{x:29,y:739,s:1.35},{x:112,y:800,s:1.13}].map((t,i)=><GreenwoodTree key={i} {...t} light={i%2===1}/>)}
    <g fill="#527746"><ellipse cx="30" cy="778" rx="130" ry="35"/><ellipse cx="1270" cy="776" rx="125" ry="37"/></g>
    {[{x:226,y:691},{x:813,y:716},{x:1044,y:499},{x:1062,y:678},{x:272,y:406}].map((p,i)=><Flowers key={i} {...p}/>)}
    <g fill="#b0ae85" stroke="#8e956c" strokeWidth="2"><ellipse cx="284" cy="708" rx="15" ry="7"/><ellipse cx="1030" cy="739" rx="21" ry="9"/><ellipse cx="767" cy="376" rx="12" ry="6"/></g>
    <g fill="none" stroke="#627c64" strokeWidth="2.5" strokeLinecap="round"><path d="M437 136q6-6 12 0 6-6 12 0M466 119q5-5 10 0 5-5 10 0"/></g>
  </svg>;
}
