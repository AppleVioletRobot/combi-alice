const parts = {
  heads: [
    {src:"alice/heads/tears-flat.png",name:"Tears"},
    {src:"alice/heads/tears-paste-paper.png",name:"Paste-paper hair"}
  ],
  torsos: [
    {src:"alice/torsos/chasing-dopamine.png",name:"Chasing dopamine"},
    {src:"alice/torsos/torso - louis.png",name:"Louis"}
  ],
  bottoms: [
    {src:"alice/bottoms/jeans.png",name:"Jeans"},
    {src:"alice/bottoms/grey-tracksuit.png",name:"Grey tracksuit"},
    {src:"alice/bottoms/pink-pyjamas.png",name:"Pink pyjamas"},
    {src:"alice/bottoms/denim-shorts.png",name:"Denim shorts"}
  ]
};
const kinds=["heads","torsos","bottoms"];
const params=new URLSearchParams(location.search);
const selection={heads:+params.get("h")||0,torsos:+params.get("t")||0,bottoms:+params.get("b")||0};
const wrap=(n,l)=>(n+l)%l;
const alice=document.querySelector(".alice");

function setUrl(){
  const q=new URLSearchParams({h:selection.heads,t:selection.torsos,b:selection.bottoms});
  history.replaceState({},"",`${location.pathname}?${q}`);
}
function render(){
  alice.replaceChildren(...kinds.map(kind=>{
    selection[kind]=wrap(selection[kind],parts[kind].length);
    const item=parts[kind][selection[kind]];
    const band=document.createElement("section");
    band.className="alice-band"; band.tabIndex=0; band.ariaLabel=`${kind}: ${item.name}`;
    band.innerHTML=`<img src="${item.src}" alt="${item.name}" draggable="false"><button class="turn turn-left" type="button" aria-label="Previous ${kind}"><span aria-hidden="true">‹</span></button><button class="turn turn-right" type="button" aria-label="Next ${kind}"><span aria-hidden="true">›</span></button>`;
    const turn=d=>{selection[kind]=wrap(selection[kind]+d,parts[kind].length);render()};
    band.querySelector(".turn-left").onclick=()=>turn(-1);
    band.querySelector(".turn-right").onclick=()=>turn(1);
    band.onkeydown=e=>{if(e.key==="ArrowLeft")turn(-1);if(e.key==="ArrowRight")turn(1)};
    let start=null;
    band.ontouchstart=e=>start=e.touches[0].clientX;
    band.ontouchend=e=>{const d=e.changedTouches[0].clientX-start;if(Math.abs(d)>35)turn(d<0?1:-1)};
    return band;
  }));
  setUrl();
}
document.querySelector(".randomise").onclick=()=>{kinds.forEach(k=>selection[k]=Math.floor(Math.random()*parts[k].length));render()};
document.querySelector(".count").textContent=`${parts.heads.length*parts.torsos.length*parts.bottoms.length} possible Alices so far.`;
render();
