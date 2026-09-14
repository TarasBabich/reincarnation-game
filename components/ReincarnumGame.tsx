'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type Stats = { wealth: number; power: number; influence: number };
type Enemy = { id: number; x: number; hp: number; maxHp: number; alive: boolean; type: 'grunt' | 'elite' };
type Boss = { x: number; hp: number; maxHp: number; name: string; alive: boolean };
type Player = { x: number; y: number; vy: number; hp: number; maxHp: number; facing: 1 | -1; onGround: boolean; invuln: number; attackCd: number };

type Level = {
  id: number;
  title: string;
  subtitle: string;
  boss: string;
  theme: string;
  width: number;
  enemies: Array<{ x: number; hp: number; type?: 'grunt' | 'elite' }>;
  reward: Stats;
};

const levels: Level[] = [
  { id: 1, title: 'Розколоті простори', subtitle: 'Перший шанс', boss: 'Кам’яний Вартовий', theme: 'level-one', width: 2600, enemies: [{x:430,hp:34},{x:760,hp:34},{x:1120,hp:42},{x:1460,hp:42,type:'elite'},{x:1810,hp:48}], reward:{wealth:20,power:18,influence:8} },
  { id: 2, title: 'Затонулий архів', subtitle: 'Капітал знань', boss: 'Хранитель Глибин', theme: 'level-two', width: 2750, enemies: [{x:470,hp:40},{x:820,hp:40},{x:1190,hp:46},{x:1510,hp:52,type:'elite'},{x:1910,hp:52}], reward:{wealth:30,power:16,influence:14} },
  { id: 3, title: 'Забутий шпиль', subtitle: 'Влада', boss: 'Архонт Вежі', theme: 'level-three', width: 2850, enemies: [{x:450,hp:46},{x:790,hp:46},{x:1170,hp:54},{x:1560,hp:60,type:'elite'},{x:2010,hp:58}], reward:{wealth:18,power:34,influence:16} },
  { id: 4, title: 'Місто завтрашнього дня', subtitle: 'Монополія', boss: 'Кібер-Титан', theme: 'level-four', width: 3000, enemies: [{x:520,hp:52},{x:910,hp:52},{x:1270,hp:58},{x:1690,hp:68,type:'elite'},{x:2130,hp:64}], reward:{wealth:42,power:22,influence:24} },
  { id: 5, title: 'Дерево тисячі життів', subtitle: 'Масштаб', boss: 'Страж Втілень', theme: 'level-five', width: 3100, enemies: [{x:500,hp:58},{x:900,hp:58},{x:1330,hp:64},{x:1770,hp:74,type:'elite'},{x:2260,hp:70}], reward:{wealth:32,power:36,influence:32} },
  { id: 6, title: 'Вершина втілень', subtitle: 'Особиста мета', boss: 'Володар Вершини', theme: 'level-six', width: 3250, enemies: [{x:560,hp:64},{x:980,hp:64},{x:1420,hp:72},{x:1900,hp:82,type:'elite'},{x:2410,hp:78}], reward:{wealth:60,power:60,influence:60} },
];

const SAVE_KEY = 'reincarnum-action-v2';
const FLOOR = 360;

const makeEnemies = (level: Level): Enemy[] => level.enemies.map((e, i) => ({ id:i, x:e.x, hp:e.hp, maxHp:e.hp, alive:true, type:e.type ?? 'grunt' }));
const makeBoss = (level: Level): Boss => ({ x: level.width - 260, hp: 180 + level.id * 55, maxHp: 180 + level.id * 55, name: level.boss, alive:true });

export default function ReincarnumGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = levels[levelIndex];
  const [stats, setStats] = useState<Stats>({ wealth:0, power:0, influence:0 });
  const [history, setHistory] = useState<Array<Stats & { life:number }>>([]);
  const [player, setPlayer] = useState<Player>({ x:120, y:FLOOR, vy:0, hp:100, maxHp:100, facing:1, onGround:true, invuln:0, attackCd:0 });
  const [enemies, setEnemies] = useState<Enemy[]>(() => makeEnemies(levels[0]));
  const [boss, setBoss] = useState<Boss>(() => makeBoss(levels[0]));
  const [bossDefeated, setBossDefeated] = useState(false);
  const [finished, setFinished] = useState(false);
  const [deaths, setDeaths] = useState(0);
  const [kills, setKills] = useState(0);
  const keys = useRef<Record<string, boolean>>({});

  const powerBonus = Math.floor(stats.power / 35);
  const damage = 18 + powerBonus * 3;

  useEffect(() => {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    try {
      const s = JSON.parse(raw);
      const li = Math.min(Math.max(s.levelIndex ?? 0, 0), levels.length - 1);
      setLevelIndex(li);
      setStats(s.stats ?? { wealth:0, power:0, influence:0 });
      setHistory(s.history ?? []);
      setDeaths(s.deaths ?? 0);
      setKills(s.kills ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ levelIndex, stats, history, deaths, kills }));
  }, [levelIndex, stats, history, deaths, kills]);

  const resetStage = useCallback((idx = levelIndex) => {
    const l = levels[idx];
    const maxHp = 100 + Math.floor(stats.power / 20) * 5;
    setPlayer({ x:120, y:FLOOR, vy:0, hp:maxHp, maxHp, facing:1, onGround:true, invuln:0, attackCd:0 });
    setEnemies(makeEnemies(l));
    setBoss(makeBoss(l));
    setBossDefeated(false);
  }, [levelIndex, stats.power]);

  useEffect(() => { resetStage(levelIndex); }, [levelIndex, resetStage]);

  const attack = useCallback(() => {
    setPlayer(p => {
      if (p.attackCd > 0 || p.hp <= 0) return p;
      const reach = 105;
      const center = p.x + p.facing * 58;
      setEnemies(es => es.map(e => {
        if (!e.alive || Math.abs(e.x - center) > reach) return e;
        const hp = Math.max(0, e.hp - damage);
        if (hp === 0 && e.hp > 0) setKills(k => k + 1);
        return { ...e, hp, alive: hp > 0 };
      }));
      setBoss(b => {
        if (!b.alive || Math.abs(b.x - center) > 135) return b;
        const hp = Math.max(0, b.hp - damage);
        if (hp === 0 && b.hp > 0) setBossDefeated(true);
        return { ...b, hp, alive: hp > 0 };
      });
      return { ...p, attackCd: 14 };
    });
  }, [damage]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keys.current[key] = true;
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) e.preventDefault();
      if (key === 'j' || key === ' ') attack();
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', down, { passive:false });
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [attack]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlayer(p => {
        if (p.hp <= 0) return p;
        let { x, y, vy, facing, onGround, invuln, attackCd } = p;
        const left = keys.current['a'] || keys.current['arrowleft'];
        const right = keys.current['d'] || keys.current['arrowright'];
        const jump = keys.current['w'] || keys.current['arrowup'];
        if (left) { x -= 8; facing = -1; }
        if (right) { x += 8; facing = 1; }
        if (jump && onGround) { vy = -18; onGround = false; }
        vy += 1.25;
        y += vy;
        if (y >= FLOOR) { y = FLOOR; vy = 0; onGround = true; }
        x = Math.max(40, Math.min(level.width - 80, x));
        invuln = Math.max(0, invuln - 1);
        attackCd = Math.max(0, attackCd - 1);
        return { ...p, x, y, vy, facing, onGround, invuln, attackCd };
      });
    }, 30);
    return () => window.clearInterval(timer);
  }, [level.width]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPlayer(p => {
        if (p.hp <= 0 || p.invuln > 0) return p;
        let hit = false;
        for (const e of enemies) if (e.alive && Math.abs(e.x - p.x) < 62) hit = true;
        const bossHit = boss.alive && Math.abs(boss.x - p.x) < 92;
        if (!hit && !bossHit) return p;
        const hp = Math.max(0, p.hp - (bossHit ? 18 : 10));
        return { ...p, hp, invuln: 24 };
      });
    }, 180);
    return () => window.clearInterval(timer);
  }, [enemies, boss]);

  useEffect(() => {
    if (player.hp > 0) return;
    const t = window.setTimeout(() => { setDeaths(d => d + 1); resetStage(); }, 900);
    return () => window.clearTimeout(t);
  }, [player.hp, resetStage]);

  const finishLevel = (focus: keyof Stats) => {
    const mult = focus === 'wealth' ? {wealth:24,power:0,influence:0} : focus === 'power' ? {wealth:0,power:24,influence:0} : {wealth:0,power:0,influence:24};
    const next = {
      wealth: stats.wealth + level.reward.wealth + mult.wealth,
      power: stats.power + level.reward.power + mult.power,
      influence: stats.influence + level.reward.influence + mult.influence,
    };
    setStats(next);
    setHistory(h => [...h, { life:level.id, ...next }]);
    setBossDefeated(false);
    if (levelIndex === levels.length - 1) setFinished(true);
    else setLevelIndex(i => i + 1);
  };

  const restartGame = () => {
    localStorage.removeItem(SAVE_KEY);
    setStats({wealth:0,power:0,influence:0});
    setHistory([]); setDeaths(0); setKills(0); setFinished(false); setLevelIndex(0);
    resetStage(0);
  };

  const camera = Math.max(0, Math.min(level.width - 1000, player.x - 380));
  const historyData = useMemo(() => history.length ? history : [{life:0, wealth:0, power:0, influence:0}], [history]);

  return (
    <main className="action-shell">
      <div className="top-hud">
        <div><span className="eyebrow">ВТІЛЕННЯ {level.id}/6</span><strong>{level.title}</strong><small>{level.subtitle}</small></div>
        <div className="hud-stats"><span>💰 {stats.wealth}</span><span>⚔ {stats.power}</span><span>♛ {stats.influence}</span></div>
      </div>

      <section className={`action-viewport ${level.theme}`}>
        <div className="world" style={{ width: level.width, transform:`translateX(${-camera}px)` }}>
          <div className="parallax stars" />
          <div className="parallax ruins" />
          <div className="ground" />

          {enemies.map(e => e.alive && (
            <motion.div key={e.id} className={`enemy ${e.type}`} style={{ left:e.x, bottom:40 }} animate={{ y:[0,-4,0] }} transition={{ repeat:Infinity, duration:1.4 }}>
              <div className="mini-hp"><i style={{width:`${(e.hp/e.maxHp)*100}%`}} /></div>
              <div className="enemy-body">{e.type === 'elite' ? '◆' : '●'}</div>
            </motion.div>
          ))}

          {boss.alive && (
            <motion.div className="boss" style={{ left:boss.x, bottom:38 }} animate={{ y:[0,-8,0], rotate:[0,-1,1,0] }} transition={{repeat:Infinity,duration:1.8}}>
              <div className="boss-name">{boss.name}</div>
              <div className="boss-hp"><i style={{width:`${(boss.hp/boss.maxHp)*100}%`}} /></div>
              <div className="boss-body">✦</div>
            </motion.div>
          )}

          <motion.div className={`hero ${player.invuln>0?'hurt':''} ${player.attackCd>8?'attacking':''}`} style={{ left:player.x, bottom:410-player.y }} animate={{ scaleX:player.facing }}>
            <div className="hero-aura" />
            <div className="hero-body">♟</div>
            <div className="sword">╱</div>
          </motion.div>
        </div>

        <div className="player-panel">
          <div className="hp-label"><span>ЖИТТЯ</span><b>{player.hp}/{player.maxHp}</b></div>
          <div className="player-hp"><i style={{width:`${(player.hp/player.maxHp)*100}%`}} /></div>
          <div className="progress-line"><i style={{width:`${Math.min(100,(player.x/(level.width-260))*100)}%`}} /></div>
        </div>

        {player.hp <= 0 && <div className="death-flash">РЕІНКАРНАЦІЯ...</div>}

        <div className="mobile-controls">
          <div className="move-controls"><button onPointerDown={()=>keys.current['a']=true} onPointerUp={()=>keys.current['a']=false} onPointerLeave={()=>keys.current['a']=false}>◀</button><button onPointerDown={()=>keys.current['d']=true} onPointerUp={()=>keys.current['d']=false} onPointerLeave={()=>keys.current['d']=false}>▶</button></div>
          <div className="fight-controls"><button onPointerDown={()=>keys.current['w']=true} onPointerUp={()=>keys.current['w']=false}>↑</button><button className="attack-btn" onPointerDown={attack}>АТАКА</button></div>
        </div>
      </section>

      <div className="lower-hud">
        <span>Переможено ворогів: {kills}</span><span>Реінкарнацій: {deaths}</span><span>Бос: {boss.name}</span>
      </div>

      <AnimatePresence>
        {bossDefeated && !finished && (
          <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}}>
            <motion.div className="choice-modal" initial={{y:30,opacity:0}} animate={{y:0,opacity:1}}>
              <div className="eyebrow">БОС ПЕРЕМОЖЕНИЙ</div><h2>{boss.name} повалений</h2>
              <p>Обери, що перенести сильніше у наступне втілення.</p>
              <div className="choice-grid"><button onClick={()=>finishLevel('wealth')}>Багатство +24</button><button onClick={()=>finishLevel('power')}>Могутність +24</button><button onClick={()=>finishLevel('influence')}>Вплив +24</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {finished && (
          <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}}>
            <motion.div className="choice-modal final-card" initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}}>
              <div className="eyebrow">ШІСТЬ ВТІЛЕНЬ ЗАВЕРШЕНО</div><h2>Вершина досягнута</h2>
              <p>Ти пройшов усі світи, переміг шістьох босів і зберіг накопичену перевагу.</p>
              <div className="final-stats"><b>💰 {stats.wealth}</b><b>⚔ {stats.power}</b><b>♛ {stats.influence}</b></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height={180}><LineChart data={historyData}><XAxis dataKey="life"/><YAxis/><Tooltip/><Line type="monotone" dataKey="wealth" stroke="#d9b85b"/><Line type="monotone" dataKey="power" stroke="#9ed7b0"/><Line type="monotone" dataKey="influence" stroke="#80b7e8"/></LineChart></ResponsiveContainer></div>
              <button className="primary" onClick={restartGame}>Почати новий цикл</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
