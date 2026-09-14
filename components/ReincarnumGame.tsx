'use client';

import { useEffect, useRef, useState } from 'react';

type Hud = { hp:number; boss:number; bossMax:number; kills:number; deaths:number };

export default function ReincarnumGame(){
  const hostRef = useRef<HTMLDivElement|null>(null);
  const gameRef = useRef<any>(null);
  const [hud,setHud] = useState<Hud>({hp:100,boss:260,bossMax:260,kills:0,deaths:0});
  const [won,setWon] = useState(false);

  useEffect(()=>{
    const onHud=(e:Event)=>setHud((e as CustomEvent<Hud>).detail);
    const onWin=()=>setWon(true);
    window.addEventListener('reincarnum-hud',onHud as EventListener);
    window.addEventListener('reincarnum-win',onWin);
    return()=>{window.removeEventListener('reincarnum-hud',onHud as EventListener);window.removeEventListener('reincarnum-win',onWin);};
  },[]);

  useEffect(()=>{
    let disposed=false;
    (async()=>{
      const Phaser=(await import('phaser')).default;
      if(disposed||!hostRef.current)return;

      class MainScene extends Phaser.Scene{
        player:any; cursors:any; keys:any; platforms:any; enemies:any[]=[]; boss:any; facing=1; attackReady=true; kills=0; deaths=0; bossHp=260; bossMax=260; controls={left:false,right:false,jump:false};
        constructor(){super('main');}
        preload(){this.load.image('bg','/art/level1.jpg');}
        create(){
          this.physics.world.setBounds(0,0,2600,720);
          this.cameras.main.setBounds(0,0,2600,720);
          const bg=this.add.image(1300,360,'bg').setDisplaySize(2600,720).setScrollFactor(.18);
          bg.setTint(0xddeeff);

          const g=this.add.graphics();
          g.fillStyle(0x17202b,1).fillRoundedRect(0,0,44,88,12);g.lineStyle(3,0xe6c874,1).strokeRoundedRect(4,4,36,80,10);g.generateTexture('hero',44,88);g.clear();
          g.fillStyle(0x173228,1).fillRoundedRect(0,0,56,76,12);g.lineStyle(3,0x6ec9a0,1).strokeRoundedRect(3,3,50,70,10);g.generateTexture('enemy',56,76);g.clear();
          g.fillStyle(0x21150f,1).fillRoundedRect(0,0,96,124,18);g.lineStyle(5,0xd9983d,1).strokeRoundedRect(4,4,88,116,16);g.generateTexture('boss',96,124);g.destroy();

          this.platforms=this.physics.add.staticGroup();
          const rects=[[380,640,760,160],[1160,630,620,180],[1760,615,500,210],[2325,627,550,185],[638,465,215,34],[1290,432,220,34],[1845,409,230,34]];
          rects.forEach(([x,y,w,h])=>{const r=this.add.rectangle(x,y,w,h,0x000000,0.001);this.physics.add.existing(r,true);this.platforms.add(r);});

          this.player=this.physics.add.sprite(150,470,'hero').setCollideWorldBounds(true).setDepth(5);
          this.player.setMaxVelocity(320,900);this.player.setDragX(1300);
          this.physics.add.collider(this.player,this.platforms);
          this.cameras.main.startFollow(this.player,true,.08,.08,-260,60);
          this.cameras.main.setDeadzone(360,220);

          [620,1110,1660].forEach((x,i)=>{const e=this.physics.add.sprite(x,430-i*12,'enemy').setData('hp',40+i*10).setData('maxHp',40+i*10).setDepth(4);e.setCollideWorldBounds(true);this.physics.add.collider(e,this.platforms);this.enemies.push(e);});
          this.boss=this.physics.add.sprite(2220,420,'boss').setData('hp',260).setDepth(4);this.boss.setCollideWorldBounds(true);this.physics.add.collider(this.boss,this.platforms);

          this.physics.add.overlap(this.player,this.enemies,()=>this.damagePlayer(8),undefined,this);
          this.physics.add.overlap(this.player,this.boss,()=>this.damagePlayer(14),undefined,this);
          this.cursors=this.input.keyboard?.createCursorKeys();
          this.keys=this.input.keyboard?.addKeys('A,D,W,SPACE,J');

          window.addEventListener('reincarnum-input',this.onInput as EventListener);
          window.addEventListener('reincarnum-attack',this.onAttack as EventListener);
          this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('reincarnum-input',this.onInput as EventListener);window.removeEventListener('reincarnum-attack',this.onAttack as EventListener);});
          this.emitHud();
        }
        onInput=(e:Event)=>{const d=(e as CustomEvent<{key:string;down:boolean}>).detail;(this.controls as any)[d.key]=d.down;};
        onAttack=()=>this.attack();
        emitHud(){window.dispatchEvent(new CustomEvent('reincarnum-hud',{detail:{hp:Math.max(0,Math.round(this.player?.getData('hp')??100)),boss:this.bossHp,bossMax:this.bossMax,kills:this.kills,deaths:this.deaths}}));}
        damagePlayer(amount:number){if(!this.player.active||this.player.getData('hurt'))return;const hp=(this.player.getData('hp')??100)-amount;this.player.setData('hp',hp).setData('hurt',true).setTint(0xff7777);this.time.delayedCall(350,()=>{if(this.player.active)this.player.clearTint().setData('hurt',false);});if(hp<=0){this.deaths++;this.scene.restart();}else this.emitHud();}
        attack(){if(!this.attackReady||!this.player.active)return;this.attackReady=false;this.time.delayedCall(240,()=>this.attackReady=true);const px=this.player.x;const dir=this.facing;this.player.setAngle(dir>0?10:-10);this.time.delayedCall(100,()=>this.player.active&&this.player.setAngle(0));
          this.enemies.forEach(e=>{if(!e.active)return;if(Math.abs(e.x-(px+dir*55))<105&&Math.abs(e.y-this.player.y)<100){const hp=e.getData('hp')-28;e.setData('hp',hp).setTint(0xffcc88);this.time.delayedCall(90,()=>e.active&&e.clearTint());if(hp<=0){e.destroy();this.kills++;this.emitHud();}}});
          if(this.boss.active&&Math.abs(this.boss.x-(px+dir*70))<145&&Math.abs(this.boss.y-this.player.y)<130){this.bossHp=Math.max(0,this.bossHp-22);this.boss.setData('hp',this.bossHp).setTint(0xffaa55);this.time.delayedCall(100,()=>this.boss.active&&this.boss.clearTint());this.emitHud();if(this.bossHp<=0){this.boss.destroy();window.dispatchEvent(new Event('reincarnum-win'));}}
        }
        update(){if(!this.player?.active)return;const body=this.player.body;const left=this.controls.left||this.cursors?.left?.isDown||this.keys?.A?.isDown;const right=this.controls.right||this.cursors?.right?.isDown||this.keys?.D?.isDown;const jump=this.controls.jump||this.cursors?.up?.isDown||this.keys?.W?.isDown;
          if(left){this.player.setVelocityX(-260);this.facing=-1;this.player.setFlipX(true);}else if(right){this.player.setVelocityX(260);this.facing=1;this.player.setFlipX(false);}else this.player.setVelocityX(0);
          if(jump&&body.blocked.down){this.player.setVelocityY(-520);this.controls.jump=false;}
          if(Phaser.Input.Keyboard.JustDown(this.keys?.SPACE)||Phaser.Input.Keyboard.JustDown(this.keys?.J))this.attack();
          this.enemies.forEach(e=>{if(!e.active)return;const dx=this.player.x-e.x;if(Math.abs(dx)<260)e.setVelocityX(Math.sign(dx)*45);else e.setVelocityX(0);});
          if(this.boss?.active){const dx=this.player.x-this.boss.x;if(Math.abs(dx)<330)this.boss.setVelocityX(Math.sign(dx)*62);else this.boss.setVelocityX(0);}
        }
      }

      gameRef.current=new Phaser.Game({type:Phaser.AUTO,parent:hostRef.current,width:1280,height:720,backgroundColor:'#020507',physics:{default:'arcade',arcade:{gravity:{x:0,y:1250},debug:false}},scene:MainScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
      const sceneReady=()=>{const s=gameRef.current?.scene?.getScene('main');if(s?.player){s.player.setData('hp',100);s.emitHud?.();}else setTimeout(sceneReady,100);};sceneReady();
    })();
    return()=>{disposed=true;gameRef.current?.destroy(true);gameRef.current=null;};
  },[]);

  const press=(key:'left'|'right'|'jump',down:boolean)=>window.dispatchEvent(new CustomEvent('reincarnum-input',{detail:{key,down}}));
  const attack=()=>window.dispatchEvent(new Event('reincarnum-attack'));

  return <main className="canvas-shell">
    <div ref={hostRef} className="phaser-host" />
    <div className="canvas-hud">
      <div className="brand"><b>REINCARNUM</b><span>ВТІЛЕННЯ 1/6 · РОЗКОЛОТІ ПРОСТОРИ</span></div>
      <div className="life"><span>ЖИТТЯ {hud.hp}/100</span><i><b style={{width:`${hud.hp}%`}} /></i></div>
      <div className="mini">Вороги {hud.kills}/3 · Реінкарнації {hud.deaths}</div>
      <div className="bossbar"><span>КАМ’ЯНИЙ ВАРТОВИЙ</span><i><b style={{width:`${Math.max(0,hud.boss/hud.bossMax*100)}%`}} /></i></div>
    </div>
    <div className="touch touch-left"><button onPointerDown={()=>press('left',true)} onPointerUp={()=>press('left',false)} onPointerCancel={()=>press('left',false)}>◀</button><button onPointerDown={()=>press('right',true)} onPointerUp={()=>press('right',false)} onPointerCancel={()=>press('right',false)}>▶</button></div>
    <div className="touch touch-right"><button onPointerDown={()=>press('jump',true)} onPointerUp={()=>press('jump',false)}>↑</button><button className="attack" onPointerDown={attack}>⚔</button></div>
    {won&&<div className="win"><div><span>Бос переможений</span><h2>Нове втілення відкрито</h2><button onClick={()=>location.reload()}>Продовжити</button></div></div>}
  </main>;
}
