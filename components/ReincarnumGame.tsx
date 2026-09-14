'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

type StatKey = 'wealth' | 'power' | 'influence';
type Stats = Record<StatKey, number>;
type Choice = { label: string; reward: Partial<Stats> };
type Level = {
  id: number;
  title: string;
  subtitle: string;
  scene: string;
  objective: string;
  nodes: { x: number; y: number; label: string; reward: Partial<Stats> }[];
  choices: Choice[];
};

const levels: Level[] = [
  {
    id: 1,
    title: 'Розколоті простори',
    subtitle: 'Перший шанс',
    scene: 'scene-one',
    objective: 'Знайди три можливості на уламках світу й заклади першу перевагу.',
    nodes: [
      { x: 18, y: 62, label: 'Рідкісний ресурс', reward: { wealth: 12 } },
      { x: 49, y: 44, label: 'Інстинкт', reward: { power: 10 } },
      { x: 78, y: 58, label: 'Перша угода', reward: { influence: 9 } },
    ],
    choices: [
      { label: 'Накопичення', reward: { wealth: 30 } },
      { label: 'Перевага', reward: { power: 22 } },
      { label: 'Корисні знайомства', reward: { influence: 18 } },
    ],
  },
  {
    id: 2,
    title: 'Затонулий архів',
    subtitle: 'Капітал знань',
    scene: 'scene-two',
    objective: 'Перетвори знання, маршрути й борги на особисті активи.',
    nodes: [
      { x: 22, y: 57, label: 'Схема торгівлі', reward: { wealth: 14 } },
      { x: 52, y: 40, label: 'Таємний маршрут', reward: { power: 8, wealth: 6 } },
      { x: 79, y: 61, label: 'Борг впливової родини', reward: { influence: 13 } },
    ],
    choices: [
      { label: 'Торгова мережа', reward: { wealth: 45, influence: 5 } },
      { label: 'Ексклюзивне знання', reward: { wealth: 20, power: 16 } },
      { label: 'Коло боржників', reward: { influence: 30 } },
    ],
  },
  {
    id: 3,
    title: 'Забутий шпиль',
    subtitle: 'Влада',
    scene: 'scene-three',
    objective: 'Підіймись вище й отримай важелі, які інші не можуть ігнорувати.',
    nodes: [
      { x: 20, y: 68, label: 'Авторитет', reward: { influence: 12 } },
      { x: 52, y: 46, label: 'Силовий ресурс', reward: { power: 14 } },
      { x: 80, y: 28, label: 'Право рішення', reward: { influence: 8, power: 7 } },
    ],
    choices: [
      { label: 'Особиста гвардія', reward: { power: 38 } },
      { label: 'Посада', reward: { wealth: 10, influence: 28 } },
      { label: 'Контроль ресурсу', reward: { wealth: 28, power: 18 } },
    ],
  },
  {
    id: 4,
    title: 'Місто завтрашнього дня',
    subtitle: 'Монополія',
    scene: 'scene-four',
    objective: 'Візьми під контроль технологічну перевагу й масштабуй її.',
    nodes: [
      { x: 17, y: 61, label: 'Алгоритм', reward: { power: 10, influence: 6 } },
      { x: 50, y: 52, label: 'Енергомережа', reward: { wealth: 16 } },
      { x: 82, y: 41, label: 'Патент', reward: { wealth: 12, influence: 8 } },
    ],
    choices: [
      { label: 'Технологічна монополія', reward: { wealth: 55, influence: 10 } },
      { label: 'Автономна інфраструктура', reward: { wealth: 20, power: 32 } },
      { label: 'Платформа', reward: { wealth: 18, influence: 36 } },
    ],
  },
  {
    id: 5,
    title: 'Дерево тисячі життів',
    subtitle: 'Масштаб',
    scene: 'scene-five',
    objective: 'Навчись переносити цінність між втіленнями: капітал, навички й імʼя.',
    nodes: [
      { x: 21, y: 58, label: 'Капітал', reward: { wealth: 20 } },
      { x: 50, y: 35, label: 'Навичка', reward: { power: 18 } },
      { x: 80, y: 58, label: 'Репутація', reward: { influence: 18 } },
    ],
    choices: [
      { label: 'Династичний капітал', reward: { wealth: 70 } },
      { label: 'Ядро здібностей', reward: { power: 48 } },
      { label: 'Імʼя, яке відкриває двері', reward: { wealth: 10, influence: 45 } },
    ],
  },
  {
    id: 6,
    title: 'Вершина втілень',
    subtitle: 'Особиста мета',
    scene: 'scene-six',
    objective: 'Закріпи остаточну форму своєї переваги: багатство, могутність або вплив.',
    nodes: [
      { x: 19, y: 64, label: 'Скарбниця', reward: { wealth: 24 } },
      { x: 51, y: 43, label: 'Абсолютний важіль', reward: { power: 22 } },
      { x: 81, y: 59, label: 'Незалежність', reward: { influence: 20 } },
    ],
    choices: [
      { label: 'Незліченне багатство', reward: { wealth: 120 } },
      { label: 'Неперевершена могутність', reward: { power: 85 } },
      { label: 'Невидимий вплив', reward: { wealth: 25, influence: 80 } },
    ],
  },
];

const STORAGE_KEY = 'reincarnum-game-v1';

export default function ReincarnumGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ wealth: 0, power: 0, influence: 0 });
  const [collected, setCollected] = useState<number[]>([]);
  const [history, setHistory] = useState<Array<Stats & { life: number }>>([]);
  const [journalOpen, setJournalOpen] = useState(false);
  const [finished, setFinished] = useState(false);

  const level = levels[levelIndex];

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setLevelIndex(Math.min(data.levelIndex ?? 0, levels.length - 1));
      setStats(data.stats ?? { wealth: 0, power: 0, influence: 0 });
      setHistory(data.history ?? []);
      setFinished(Boolean(data.finished));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ levelIndex, stats, history, finished }));
  }, [levelIndex, stats, history, finished]);

  const applyReward = (reward: Partial<Stats>) => {
    setStats((prev) => ({
      wealth: prev.wealth + (reward.wealth ?? 0),
      power: prev.power + (reward.power ?? 0),
      influence: prev.influence + (reward.influence ?? 0),
    }));
  };

  const collectNode = (index: number) => {
    if (collected.includes(index)) return;
    setCollected((prev) => [...prev, index]);
    applyReward(level.nodes[index].reward);
  };

  const choosePath = (choice: Choice) => {
    const nextStats = {
      wealth: stats.wealth + (choice.reward.wealth ?? 0),
      power: stats.power + (choice.reward.power ?? 0),
      influence: stats.influence + (choice.reward.influence ?? 0),
    };
    setStats(nextStats);
    setHistory((prev) => [...prev, { life: level.id, ...nextStats }]);
    setCollected([]);
    if (levelIndex === levels.length - 1) {
      setFinished(true);
    } else {
      setLevelIndex((v) => v + 1);
    }
  };

  const radarData = useMemo(() => [
    { stat: 'Багатство', value: stats.wealth },
    { stat: 'Могутність', value: stats.power },
    { stat: 'Вплив', value: stats.influence },
  ], [stats]);

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLevelIndex(0);
    setStats({ wealth: 0, power: 0, influence: 0 });
    setCollected([]);
    setHistory([]);
    setFinished(false);
  };

  return (
    <main className="min-h-screen bg-[#020806] text-[#f5e8b0]">
      <section className={`game-scene ${level.scene}`}>
        <div className="scene-overlay" />
        <header className="hud">
          <div>
            <div className="eyebrow">ВТІЛЕННЯ {level.id} / {levels.length}</div>
            <h1>{level.title}</h1>
            <p>{level.subtitle}</p>
          </div>
          <div className="stats-row">
            <Stat label="Багатство" value={stats.wealth} />
            <Stat label="Могутність" value={stats.power} />
            <Stat label="Вплив" value={stats.influence} />
          </div>
        </header>

        <div className="objective-card">{level.objective}</div>

        {level.nodes.map((node, index) => {
          const done = collected.includes(index);
          return (
            <motion.button
              key={node.label}
              className={`node ${done ? 'node-done' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => collectNode(index)}
            >
              <span className="node-orb" />
              <span>{done ? 'Отримано' : node.label}</span>
            </motion.button>
          );
        })}

        <div className="bottom-bar">
          <button className="secondary" onClick={() => setJournalOpen(true)}>Журнал</button>
          <div>{collected.length} / {level.nodes.length} активів</div>
        </div>

        <AnimatePresence>
          {collected.length === level.nodes.length && !finished && (
            <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div className="choice-modal" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                <div className="eyebrow">ВУЗОЛ МОЖЛИВОСТЕЙ</div>
                <h2>Закріпити перевагу</h2>
                <p>Обери те, що найбільше збільшує твої ресурси та свободу дій.</p>
                <div className="choice-grid">
                  {level.choices.map((choice) => (
                    <button key={choice.label} onClick={() => choosePath(choice)}>{choice.label}</button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {finished && (
            <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <motion.div className="choice-modal" initial={{ scale: .9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="eyebrow">СХОДЖЕННЯ ЗАВЕРШЕНО</div>
                <h2>Ти перетворив шість життів на капітал</h2>
                <p>Підсумок: {stats.wealth} багатства · {stats.power} могутності · {stats.influence} впливу.</p>
                <button className="primary" onClick={reset}>Почати новий цикл</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {journalOpen && (
          <motion.aside className="journal" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}>
            <div className="journal-head">
              <div><div className="eyebrow">ЖУРНАЛ СХОДЖЕННЯ</div><h2>Портфель життів</h2></div>
              <button className="secondary" onClick={() => setJournalOpen(false)}>Закрити</button>
            </div>
            <div className="chart-card">
              <h3>Поточний баланс</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="stat" />
                  <Radar dataKey="value" stroke="#d9b85b" fill="#d9b85b" fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <h3>Розвиток по втіленнях</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={history}>
                  <XAxis dataKey="life" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="wealth" stroke="#d9b85b" strokeWidth={2} />
                  <Line type="monotone" dataKey="power" stroke="#9ee6b1" strokeWidth={2} />
                  <Line type="monotone" dataKey="influence" stroke="#9ec8ff" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}
