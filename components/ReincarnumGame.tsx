'use client';

import { useEffect, useRef, useState } from 'react';

type Hud = { hp:number; boss:number; bossMax:number; kills:number; deaths:number };

const WORLD_W = 2000;
const WORLD_H = 720;

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
    return()=>{
      window.removeEventListener('reincarnum-hud',onHud as EventListener);
      window.removeEventListener('reincarnum-win',onWin);
    };
  },[]);

  useEffect(()=>{
    let disposed=false;

    (async()=>{
      const Phaser=(await import('phaser')).default;
      if(disposed||!hostRef.current)return;

      class MainScene extends Phaser.Scene{
        player:any;
        cursors:any;
        keys:any;
        platforms:any;
        enemies:any[]=[];
        boss:any;
        facing=1;
        attackReady=true;
        kills=0;
        deaths=0;
        bossHp=260;
        bossMax=260;
        controls={left:false,right:false,jump:false};

        constructor(){super('main');}

        preload(){
          this.load.image('bg','/art/level1-bg.webp');
          this.load.image('hero','/art/hero.webp');
          this.load.image('boss','/art/boss.webp');
        }

        create(){
          this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
          this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);

          // A real painted level is the visual world. Physics geometry is invisible.
          this.add.image(WORLD_W/2,WORLD_H/2,'bg')
            .setDisplaySize(WORLD_W,WORLD_H)
            .setScrollFactor(1)
            .setDepth(-20);

          // Lightweight shadow creature texture for ordinary enemies.
          const g=this.add.graphics();
          g.fillStyle(0x101a1b,.94);
          g.fillEllipse(28,42,48,68);
          g.fillTriangle(6,38,28,4,50,38);
          g.lineStyle(2,0x8aa69b,.55);
          g.strokeEllipse(28,42,48,68);
          g.generateTexture('enemy',56,78);
          g.destroy();

          this.platforms=this.physics.add.staticGroup();
          const rects=[
            [520,470,1040,52],
            [1560,470,880,52],
            [310,610,420,40],
            [1720,610,420,40]
          ];
          rects.forEach(([x,y,w,h])=>{
            const r=this.add.rectangle(x,y,w,h,0x000000,0.001);
            this.physics.add.existing(r,true);
            this.platforms.add(r);
          });

          this.player=this.physics.add.sprite(250,320,'hero')
            .setDisplaySize(150,116)
            .setCollideWorldBounds(true)
            .setDepth(8)
            .setData('hp',100);
          this.player.setMaxVelocity(330,900);
          this.player.setDragX(1200);
          this.player.body.setSize(70,145,true);
          this.physics.add.collider(this.player,this.platforms);

          this.cameras.main.startFollow(this.player,true,.085,.085,-260,30);
          this.cameras.main.setDeadzone(330,210);

          [620,900,1260].forEach((x,i)=>{
            const e=this.physics.add.sprite(x,330,'enemy')
              .setScale(i===2?1.05:.9)
              .setData('hp',40+i*12)
              .setData('maxHp',40+i*12)
              .setDepth(6);
            e.setCollideWorldBounds(true);
            e.body.setSize(42,66,true);
            this.physics.add.collider(e,this.platforms);
            this.enemies.push(e);
          });

          this.boss=this.physics.add.sprite(1600,300,'boss')
            .setDisplaySize(190,176)
            .setData('hp',260)
            .setDepth(7);
          this.boss.setCollideWorldBounds(true);
          this.boss.body.setSize(105,180,true);
          this.physics.add.collider(this.boss,this.platforms);

          this.physics.add.overlap(this.player,this.enemies,()=>this.damagePlayer(8),undefined,this);
          this.physics.add.overlap(this.player,this.boss,()=>this.damagePlayer(14),undefined,this);

          this.cursors=this.input.keyboard?.createCursorKeys();
          this.keys=this.input.keyboard?.addKeys('A,D,W,SPACE,J');

          window.addEventListener('reincarnum-input',this.onInput as EventListener);
          window.addEventListener('reincarnum-attack',this.onAttack as EventListener);
          this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
            window.removeEventListener('reincarnum-input',this.onInput as EventListener);
            window.removeEventListener('reincarnum-attack',this.onAttack as EventListener);
          });

          this.emitHud();
        }

        onInput=(e:Event)=>{
          const d=(e as CustomEvent<{key:string;down:boolean}>).detail;
          (this.controls as any)[d.key]=d.down;
        };

        onAttack=()=>this.attack();

        emitHud(){
          window.dispatchEvent(new CustomEvent('reincarnum-hud',{detail:{
            hp:Math.max(0,Math.round(this.player?.getData('hp')??100)),
            boss:this.bossHp,
            bossMax:this.bossMax,
            kills:this.kills,
            deaths:this.deaths
          }}));
        }

        damagePlayer(amount:number){
          if(!this.player?.active||this.player.getData('hurt'))return;
          const hp=Math.max(0,(this.player.getData('hp')??100)-amount);
          this.player.setData('hp',hp).setData('hurt',true).setTint(0xff7777);
          this.cameras.main.shake(70,.0025);
          this.time.delayedCall(330,()=>{
            if(this.player?.active)this.player.clearTint().setData('hurt',false);
          });
          this.emitHud();
          if(hp<=0){
            this.deaths++;
            this.time.delayedCall(650,()=>this.scene.restart());
          }
        }

        attack(){
          if(!this.attackReady||!this.player?.active)return;
          this.attackReady=false;
          this.time.delayedCall(250,()=>this.attackReady=true);

          const px=this.player.x;
          const dir=this.facing;
          this.tweens.add({
            targets:this.player,
            angle:dir>0?8:-8,
            duration:70,
            yoyo:true,
            ease:'Sine.easeOut'
          });

          this.enemies.forEach(e=>{
            if(!e.active)return;
            if(Math.abs(e.x-(px+dir*65))<115&&Math.abs(e.y-this.player.y)<110){
              const hp=e.getData('hp')-28;
              e.setData('hp',hp).setTint(0xffc979);
              this.time.delayedCall(90,()=>e.active&&e.clearTint());
              e.setVelocityX(dir*210);
              if(hp<=0){
                this.tweens.add({targets:e,alpha:0,scaleX:.25,scaleY:.25,duration:180,onComplete:()=>e.destroy()});
                this.kills++;
                this.emitHud();
              }
            }
          });

          if(this.boss?.active&&Math.abs(this.boss.x-(px+dir*80))<160&&Math.abs(this.boss.y-this.player.y)<150){
            this.bossHp=Math.max(0,this.bossHp-22);
            this.boss.setData('hp',this.bossHp).setTint(0xffaa55);
            this.cameras.main.shake(85,.0035);
            this.time.delayedCall(100,()=>this.boss.active&&this.boss.clearTint());
            this.emitHud();
            if(this.bossHp<=0){
              this.tweens.add({targets:this.boss,alpha:0,scaleX:.4,scaleY:.4,duration:420,onComplete:()=>{
                this.boss.destroy();
                window.dispatchEvent(new Event('reincarnum-win'));
              }});
            }
          }
        }

        update(){
          if(!this.player?.active)return;
          const body=this.player.body;
          const left=this.controls.left||this.cursors?.left?.isDown||this.keys?.A?.isDown;
          const right=this.controls.right||this.cursors?.right?.isDown||this.keys?.D?.isDown;
          const jump=this.controls.jump||this.cursors?.up?.isDown||this.keys?.W?.isDown;

          if(left){
            this.player.setVelocityX(-270);
            this.facing=-1;
            this.player.setFlipX(true);
          }else if(right){
            this.player.setVelocityX(270);
            this.facing=1;
            this.player.setFlipX(false);
          }else{
            this.player.setVelocityX(0);
          }

          if(jump&&body.blocked.down){
            this.player.setVelocityY(-520);
            this.controls.jump=false;
          }

          if(Phaser.Input.Keyboard.JustDown(this.keys?.SPACE)||Phaser.Input.Keyboard.JustDown(this.keys?.J))this.attack();

          this.enemies.forEach(e=>{
            if(!e.active)return;
            const dx=this.player.x-e.x;
            if(Math.abs(dx)<260)e.setVelocityX(Math.sign(dx)*46);
            else e.setVelocityX(0);
          });

          if(this.boss?.active){
            const dx=this.player.x-this.boss.x;
            if(Math.abs(dx)<360)this.boss.setVelocityX(Math.sign(dx)*58);
            else this.boss.setVelocityX(0);
          }
        }
      }

      gameRef.current=new Phaser.Game({
        type:Phaser.AUTO,
        parent:hostRef.current,
        width:1280,
        height:720,
        backgroundColor:'#020507',
        render:{antialias:true,pixelArt:false,roundPixels:true,powerPreference:'high-performance'},
        physics:{default:'arcade',arcade:{gravity:{x:0,y:1250},debug:false}},
        scene:MainScene,
        scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}
      });
    })();

    return()=>{
      disposed=true;
      gameRef.current?.destroy(true);
      gameRef.current=null;
    };
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

    <div className="touch touch-left">
      <button onPointerDown={()=>press('left',true)} onPointerUp={()=>press('left',false)} onPointerCancel={()=>press('left',false)} onPointerLeave={()=>press('left',false)}>◀</button>
      <button onPointerDown={()=>press('right',true)} onPointerUp={()=>press('right',false)} onPointerCancel={()=>press('right',false)} onPointerLeave={()=>press('right',false)}>▶</button>
    </div>

    <div className="touch touch-right">
      <button onPointerDown={()=>press('jump',true)} onPointerUp={()=>press('jump',false)} onPointerCancel={()=>press('jump',false)}>↑</button>
      <button className="attack" onPointerDown={attack}>⚔</button>
    </div>

    {won&&<div className="win"><div><span>БОС ПЕРЕМОЖЕНИЙ</span><h2>Нове втілення відкрито</h2><button onClick={()=>location.reload()}>Продовжити</button></div></div>}
  </main>;
}
