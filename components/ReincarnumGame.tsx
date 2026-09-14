'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Rect = { x:number; y:number; w:number; h:number };
type Enemy = { x:number; y:number; hp:number; maxHp:number; alive:boolean; boss?:boolean };
type Player = { x:number; y:number; vx:number; vy:number; hp:number; maxHp:number; facing:1|-1; grounded:boolean; attack:number; invuln:number };

const W = 1280;
const H = 720;
const WORLD_W = 2600;
const FLOOR_Y = 558;
const BG = '/art/level1.jpg';

const colliders: Rect[] = [
  { x:0, y:558, w:760, h:162 },
  { x:850, y:540, w:620, h:180 },
  { x:1510, y:510, w:500, h:210 },
  { x:2050, y:535, w:550, h:185 },
  { x:530, y:448, w:215, h:34 },
  { x:1180, y:415, w:220, h:34 },
  { x:1730, y:392, w:230, h:34 },
];

const startEnemies = (): Enemy[] => [
  { x:620, y:510, hp:40, maxHp:40, alive:true },
  { x:1110, y:492, hp:50, maxHp:50, alive:true },
  { x:1660, y:462, hp:60, maxHp:60, alive:true },
  { x:2220, y:466, hp:260, maxHp:260, alive:true, boss:true },
];

function overlap(a:Rect,b:Rect){ return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }

export default function ReincarnumGame(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  const bgRef = useRef<HTMLImageElement|null>(null);
  const rafRef = useRef<number>(0);
  const keys = useRef<Record<string,boolean>>({});
  const player = useRef<Player>({ x:150,y:480,vx:0,vy:0,hp:100,maxHp:100,facing:1,grounded:false,attack:0,invuln:0 });
  const enemies = useRef<Enemy[]>(startEnemies());
  const camera = useRef(0);
  const [hud,setHud] = useState({hp:100,boss:260,bossMax:260,kills:0,deaths:0});
  const [won,setWon] = useState(false);

  const reset = useCallback(()=>{
    player.current = { x:150,y:480,vx:0,vy:0,hp:100,maxHp:100,facing:1,grounded:false,attack:0,invuln:0 };
    enemies.current = startEnemies(); camera.current = 0; setWon(false);
    setHud(h=>({hp:100,boss:260,bossMax:260,kills:0,deaths:h.deaths}));
  },[]);

  const doAttack = useCallback(()=>{
    const p = player.current;
    if(p.attack>0 || p.hp<=0) return;
    p.attack = 12;
    const hitX = p.x + (p.facing===1 ? 42 : -92);
    const hit:Rect = {x:hitX,y:p.y+18,w:95,h:90};
    let kills = 0;
    enemies.current.forEach(e=>{
      if(!e.alive) return;
      const er:Rect={x:e.x-34,y:e.y-86,w:e.boss?100:70,h:e.boss?112:92};
      if(overlap(hit,er)){
        e.hp = Math.max(0,e.hp-(e.boss?22:28));
        if(e.hp===0){e.alive=false;if(!e.boss)kills++;}
      }
    });
    const boss=enemies.current.find(e=>e.boss);
    if(kills) setHud(h=>({...h,kills:h.kills+kills}));
    if(boss) setHud(h=>({...h,boss:boss.hp}));
    if(boss && !boss.alive) setWon(true);
  },[]);

  useEffect(()=>{
    const img=new Image(); img.src=BG; img.onload=()=>{bgRef.current=img};
    const down=(e:KeyboardEvent)=>{const k=e.key.toLowerCase();keys.current[k]=true;if(k===' '||k==='j')doAttack();};
    const up=(e:KeyboardEvent)=>{keys.current[e.key.toLowerCase()]=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[doAttack]);

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return;
    let last=performance.now(), acc=0;
    const step=1000/60;
    const tick=(now:number)=>{
      acc += Math.min(50,now-last); last=now;
      while(acc>=step){ update(); acc-=step; }
      draw(ctx,canvas); rafRef.current=requestAnimationFrame(tick);
    };

    const update=()=>{
      const p=player.current;if(p.hp<=0)return;
      const left=keys.current['a']||keys.current['arrowleft'];
      const right=keys.current['d']||keys.current['arrowright'];
      const jump=keys.current['w']||keys.current['arrowup'];
      p.vx=(left?-5.6:0)+(right?5.6:0); if(p.vx) p.facing=p.vx>0?1:-1;
      if(jump&&p.grounded){p.vy=-13.5;p.grounded=false;}
      p.vy=Math.min(17,p.vy+0.72); p.attack=Math.max(0,p.attack-1);p.invuln=Math.max(0,p.invuln-1);
      p.x=Math.max(24,Math.min(WORLD_W-40,p.x+p.vx));
      p.y += p.vy;
      const body:Rect={x:p.x-22,y:p.y,w:44,h:88}; p.grounded=false;
      for(const c of colliders){
        if(overlap(body,c) && p.vy>=0 && body.y+body.h-p.vy<=c.y+8){p.y=c.y-88;p.vy=0;p.grounded=true;body.y=p.y;}
      }
      if(p.y>H+160){p.hp=0;}
      enemies.current.forEach(e=>{
        if(!e.alive)return;
        if(!e.boss){ const dx=p.x-e.x; if(Math.abs(dx)<270)e.x+=Math.sign(dx)*0.7; }
        if(Math.abs(p.x-e.x)<(e.boss?72:48)&&Math.abs((p.y+44)-(e.y-35))<90&&p.invuln===0){p.hp=Math.max(0,p.hp-(e.boss?16:9));p.invuln=40;setHud(h=>({...h,hp:p.hp}));}
      });
      camera.current=Math.max(0,Math.min(WORLD_W-W,p.x-410));
      if(p.hp<=0){setHud(h=>({...h,hp:0,deaths:h.deaths+1}));setTimeout(reset,700);}
    };

    const draw=(c:CanvasRenderingContext2D,cv:HTMLCanvasElement)=>{
      c.clearRect(0,0,W,H);
      const bg=bgRef.current;
      if(bg){
        const scale=Math.max(H/bg.height,W/bg.width);
        const bw=bg.width*scale,bh=bg.height*scale;
        const bgCam=(camera.current/(WORLD_W-W))*Math.max(0,bw-W)*0.35;
        c.drawImage(bg,-bgCam,(H-bh)/2,bw,bh);
      } else {c.fillStyle='#06131b';c.fillRect(0,0,W,H);}
      c.fillStyle='rgba(2,8,10,.18)';c.fillRect(0,0,W,H);
      c.save();c.translate(-camera.current,0);

      // world collision geometry is invisible in normal play
      const p=player.current;
      enemies.current.forEach(e=>{if(!e.alive)return;drawEnemy(c,e);});
      drawHero(c,p);
      c.restore();
    };
    rafRef.current=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(rafRef.current);
  },[reset]);

  const press=(key:string,on:boolean)=>{keys.current[key]=on;};

  return <main className="canvas-shell">
    <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />
    <div className="canvas-hud">
      <div className="brand"><b>REINCARNUM</b><span>ВТІЛЕННЯ 1/6 · РОЗКОЛОТІ ПРОСТОРИ</span></div>
      <div className="life"><span>ЖИТТЯ {hud.hp}/100</span><i><b style={{width:`${hud.hp}%`}} /></i></div>
      <div className="mini">Вороги {hud.kills}/3 · Реінкарнації {hud.deaths}</div>
      <div className="bossbar"><span>КАМ’ЯНИЙ ВАРТОВИЙ</span><i><b style={{width:`${Math.max(0,hud.boss/hud.bossMax*100)}%`}} /></i></div>
    </div>
    <div className="touch touch-left">
      <button onPointerDown={()=>press('a',true)} onPointerUp={()=>press('a',false)} onPointerCancel={()=>press('a',false)}>◀</button>
      <button onPointerDown={()=>press('d',true)} onPointerUp={()=>press('d',false)} onPointerCancel={()=>press('d',false)}>▶</button>
    </div>
    <div className="touch touch-right">
      <button onPointerDown={()=>press('w',true)} onPointerUp={()=>press('w',false)}>↑</button>
      <button className="attack" onPointerDown={doAttack}>⚔</button>
    </div>
    {won&&<div className="win"><div><span>Бос переможений</span><h2>Нове втілення відкрито</h2><button onClick={reset}>Продовжити</button></div></div>}
  </main>;
}

function drawHero(c:CanvasRenderingContext2D,p:Player){
  c.save();c.translate(p.x,p.y+88);c.scale(p.facing,1);
  if(p.invuln>0)c.globalAlpha=.55;
  c.shadowBlur=18;c.shadowColor='#4bd7ff';c.fillStyle='#16202a';
  c.beginPath();c.moveTo(-18,-78);c.quadraticCurveTo(-45,-52,-36,-8);c.lineTo(18,-8);c.quadraticCurveTo(28,-45,10,-76);c.closePath();c.fill();
  c.shadowBlur=0;c.fillStyle='#d9bd79';c.beginPath();c.arc(0,-82,10,0,Math.PI*2);c.fill();
  c.strokeStyle='#f2d57b';c.lineWidth=4;c.beginPath();c.moveTo(10,-46);c.lineTo(p.attack>6?72:48,p.attack>6?-92:-66);c.stroke();
  c.restore();
}
function drawEnemy(c:CanvasRenderingContext2D,e:Enemy){
  c.save();c.translate(e.x,e.y);c.shadowBlur=e.boss?22:10;c.shadowColor=e.boss?'#ff9a33':'#75d6bb';c.fillStyle=e.boss?'#211914':'#16241f';
  c.beginPath();c.moveTo(-30,-82);c.lineTo(-45,-24);c.lineTo(-22,0);c.lineTo(26,0);c.lineTo(42,-26);c.lineTo(28,-84);c.closePath();c.fill();
  c.fillStyle=e.boss?'#d8963a':'#75aa8b';c.beginPath();c.arc(0,-88,e.boss?16:12,0,Math.PI*2);c.fill();
  c.shadowBlur=0;c.fillStyle='#21090a';c.fillRect(-46,-116,92,7);c.fillStyle=e.boss?'#d94b42':'#65bd76';c.fillRect(-46,-116,92*(e.hp/e.maxHp),7);
  c.restore();
}
