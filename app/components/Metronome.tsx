"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Metronome, StepState, BeatPattern, MetronomeConfig } from '@/utils/metronome';
import woodblockSound from '../../public/audio/metronome-sound.mp3';
import { HeroImage } from "@/app/components/HeroImage";

type Mode = 'interval' | 'sequencer';

const LABELS_4 = ['', 'e', '&', 'a'];
const LABELS_6 = ['', 'e', '&', 'a', 'uh', 'ah'];

const cycleState = (s: StepState): StepState =>
    s === 'off' ? 'normal' : s === 'normal' ? 'accent' : 'off';

function defaultBeatPattern(timeSig: number): BeatPattern[] {
    return Array.from({ length: timeSig }, () =>
        ['off', 'off', 'off', 'off'] as StepState[]
    );
}

function stepBackground(state: StepState): string {
    if (state === 'normal') return '#5060c0';
    if (state === 'accent') return '#8844dd';
    return '#0c0826';
}

function toGlobalStep(beat: number, stepInBeat: number, pattern: BeatPattern[]): number {
    let g = stepInBeat;
    for (let b = 0; b < beat; b++) g += pattern[b].length;
    return g;
}

const LIGHT_OFF = '#1a1630';
const LIGHT_NORMAL = '#f7f8f8';

const BORDER = '#170c59';
const MUTED = '#505050';
const TEXT = '#f7f8f8';

const StepControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max?: number;
    onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => {
    const atMin = value <= min;
    const atMax = max !== undefined && value >= max;
    const chevronBtn = (disabled: boolean, onClick: () => void, char: string) => (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '9999px',
                border: `1px solid ${disabled ? '#1e1a32' : BORDER}`,
                background: 'transparent',
                color: disabled ? '#2a2640' : MUTED,
                fontSize: '1.4rem',
                cursor: disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                touchAction: 'manipulation',
                fontFamily: 'inherit',
                lineHeight: 1,
                flexShrink: 0,
            }}
        >
            {char}
        </button>
    );
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: MUTED, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {chevronBtn(atMin, () => onChange(Math.max(min, value - 1)), '‹')}
                <span style={{ color: TEXT, fontSize: '1.5rem', fontWeight: 600, minWidth: '1.6rem', textAlign: 'center' }}>
                    {value}
                </span>
                {chevronBtn(atMax, () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1), '›')}
            </div>
        </div>
    );
};

const BpmDial: React.FC<{ bpm: number; onChange: (v: number) => void }> = ({ bpm, onChange }) => {
    const MIN = 50, MAX = 230;
    const SIZE = 148;
    const CX = SIZE / 2, CY = SIZE / 2;
    const R = 56;
    const STROKE = 6;
    const START_DEG = 225;
    const SWEEP_DEG = 270;

    const clockPt = (deg: number) => ({
        x: CX + R * Math.sin((deg * Math.PI) / 180),
        y: CY - R * Math.cos((deg * Math.PI) / 180),
    });

    const fraction = Math.max(0, Math.min(1, (bpm - MIN) / (MAX - MIN)));
    const currentDeg = START_DEG + fraction * SWEEP_DEG;
    const startPt = clockPt(START_DEG);
    const endPt = clockPt(START_DEG + SWEEP_DEG);
    const handlePt = clockPt(currentDeg);

    const bgPath = `M ${startPt.x.toFixed(2)},${startPt.y.toFixed(2)} A ${R},${R} 0 1,1 ${endPt.x.toFixed(2)},${endPt.y.toFixed(2)}`;
    const pSweep = fraction * SWEEP_DEG;
    const progressPath = fraction > 0.01
        ? `M ${startPt.x.toFixed(2)},${startPt.y.toFixed(2)} A ${R},${R} 0 ${pSweep > 180 ? 1 : 0},1 ${handlePt.x.toFixed(2)},${handlePt.y.toFixed(2)}`
        : null;

    const isDragging = useRef(false);
    const lastY = useRef(0);
    const accumulator = useRef(0);
    const bpmInternalRef = useRef(bpm);
    useEffect(() => { bpmInternalRef.current = bpm; }, [bpm]);

    const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
        isDragging.current = true;
        lastY.current = e.clientY;
        accumulator.current = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!isDragging.current) return;
        const dy = lastY.current - e.clientY;
        lastY.current = e.clientY;
        accumulator.current += dy * (MAX - MIN) / 220;
        const delta = Math.trunc(accumulator.current);
        if (delta !== 0) {
            accumulator.current -= delta;
            const next = Math.max(MIN, Math.min(MAX, bpmInternalRef.current + delta));
            if (next !== bpmInternalRef.current) {
                onChange(next);
                bpmInternalRef.current = next;
            }
        }
    };

    const onPointerUp = () => { isDragging.current = false; };

    return (
        <svg
            width={SIZE} height={SIZE}
            style={{ cursor: 'ns-resize', touchAction: 'none', userSelect: 'none', overflow: 'visible' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
        >
            <defs>
                <linearGradient id="dialGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgb(69,94,181)" />
                    <stop offset="100%" stopColor="rgb(103,63,215)" />
                </linearGradient>
            </defs>
            <path d={bgPath} fill="none" stroke={LIGHT_OFF} strokeWidth={STROKE} strokeLinecap="round" />
            {progressPath && (
                <path d={progressPath} fill="none" stroke="url(#dialGrad)" strokeWidth={STROKE} strokeLinecap="round" />
            )}
            <circle cx={CX} cy={CY} r={R - STROKE - 5} fill="#090818" />
            <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="middle" fill={TEXT} fontSize="28" fontWeight="700" fontFamily="inherit">
                {bpm}
            </text>
            <text x={CX} y={CY + 18} textAnchor="middle" fill={MUTED} fontSize="9" letterSpacing="3" fontFamily="inherit">
                BPM
            </text>
            <circle cx={handlePt.x} cy={handlePt.y} r={5} fill={TEXT} />
        </svg>
    );
};

const MetronomeComponent = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [beatLightOn, setBeatLightOn] = useState(false);
    const [noteLightColor, setNoteLightColor] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>('interval');
    const [timeSig, setTimeSig] = useState(4);
    const [bpm, setBpm] = useState(110);
    const [countInBars, setCountInBars] = useState(1);
    const [barsBetweenTicks, setBarsBetweenTicks] = useState(2);
    const [beatPattern, setBeatPattern] = useState<BeatPattern[]>(() => defaultBeatPattern(4));
    const [beatSelect, setBeatSelect] = useState<boolean[]>(() => [true, ...Array(3).fill(false)]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [beatSoundEnabled, setBeatSoundEnabled] = useState(false);

    const metronomeRef = useRef<Metronome | null>(null);
    const patternRef = useRef(beatPattern);
    const beatSelectRef = useRef<boolean[]>([true, false, false, false]);
    const bpmRef = useRef(bpm);
    const beatSoundEnabledRef = useRef(false);
    const pendingEvents = useRef<Array<{
        step: number;
        scheduledTime: number;
        playedState: StepState;
        isBeat: boolean;
    }>>([]);

    useEffect(() => { patternRef.current = beatPattern; }, [beatPattern]);
    useEffect(() => { beatSelectRef.current = beatSelect; }, [beatSelect]);
    useEffect(() => { beatSoundEnabledRef.current = beatSoundEnabled; }, [beatSoundEnabled]);
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);

    useEffect(() => {
        setBeatPattern(defaultBeatPattern(timeSig));
        setBeatSelect([true, ...Array(Math.max(0, timeSig - 1)).fill(false)]);
        setCurrentStep(-1);
    }, [timeSig]);

    useEffect(() => () => { metronomeRef.current?.stop(); }, []);

    useEffect(() => {
        if (!isRunning) return;
        let rafId: number;
        const tick = () => {
            const now = metronomeRef.current?.getCurrentTime() ?? 0;
            const remaining: typeof pendingEvents.current = [];
            for (const event of pendingEvents.current) {
                if (event.scheduledTime <= now) {
                    const { step, playedState, isBeat } = event;
                    if (step >= 0) setCurrentStep(step);
                    if (isBeat) {
                        setBeatLightOn(true);
                        setTimeout(() => setBeatLightOn(false), 150);
                    }
                    if (playedState !== 'off' && step >= 0) {
                        setNoteLightColor(playedState === 'accent' ? '#8844dd' : '#5060c0');
                        setTimeout(() => setNoteLightColor(null), 100);
                    }
                } else {
                    remaining.push(event);
                }
            }
            pendingEvents.current = remaining;
            rafId = requestAnimationFrame(tick);
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [isRunning]);

    const stepCallback = useCallback((
        step: number,
        scheduledTime: number,
        playedState: StepState,
        isBeat: boolean
    ) => {
        pendingEvents.current.push({ step, scheduledTime, playedState, isBeat });
    }, []);

    const handleToggle = () => {
        if (isRunning) {
            metronomeRef.current?.stop();
            metronomeRef.current = null;
            pendingEvents.current = [];
            setIsRunning(false);
            setCurrentStep(-1);
            return;
        }
        const config: MetronomeConfig = mode === 'interval'
            ? { mode: 'interval', barsBetweenTicks, getBeatSelect: () => beatSelectRef.current }
            : { mode: 'sequencer', getPattern: () => patternRef.current };
        const m = new Metronome(
            timeSig, () => bpmRef.current, countInBars, woodblockSound,
            config, stepCallback,
            () => beatSoundEnabledRef.current
        );
        metronomeRef.current = m;
        m.start();
        setIsRunning(true);
    };

    const toggleStep = (beat: number, stepInBeat: number) => {
        setBeatPattern(prev => {
            const next = prev.map(b => [...b] as StepState[]);
            next[beat][stepInBeat] = cycleState(next[beat][stepInBeat]);
            return next;
        });
    };

    const toggleBeatDivision = (beat: number) => {
        setBeatPattern(prev => {
            const next = prev.map(b => [...b] as StepState[]);
            if (next[beat].length === 4) {
                next[beat] = [...next[beat], 'off', 'off'];
            } else {
                next[beat] = next[beat].slice(0, 4);
            }
            return next;
        });
    };

    const fieldLabel: React.CSSProperties = {
        color: MUTED,
        fontSize: '0.75rem',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: '0.35rem',
        textAlign: 'center',
        display: 'block',
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.8rem',
            width: '100%',
            maxWidth: '36rem',
        }}>

            {/* ── Lights ── */}
            <div style={{ display: 'flex', gap: mode === 'sequencer' ? '3.5rem' : '0.5rem', width: '100%', justifyContent: 'center' }}>
                {mode === 'interval' ? (
                    <div style={{
                        width: '5rem',
                        height: '0.55rem',
                        borderRadius: '9999px',
                        background: beatLightOn ? LIGHT_NORMAL : LIGHT_OFF,
                        transition: 'background 55ms',
                    }} />
                ) : (
                    <>
                        <div style={{
                            width: '5rem',
                            height: '0.55rem',
                            borderRadius: '9999px',
                            background: beatLightOn ? LIGHT_NORMAL : LIGHT_OFF,
                            transition: 'background 55ms',
                        }} />
                        <div style={{
                            width: '5rem',
                            height: '0.55rem',
                            borderRadius: '9999px',
                            background: noteLightColor ?? LIGHT_OFF,
                            transition: 'background 55ms',
                        }} />
                    </>
                )}
            </div>

            {/* ── BPM dial ── */}
            <BpmDial bpm={bpm} onChange={setBpm} />

            {/* ── Time Sig + Count-in ── */}
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', opacity: isRunning ? 0.35 : 1, pointerEvents: isRunning ? 'none' : 'auto', transition: 'opacity 150ms' }}>
                <StepControl label="Time Sig" value={timeSig} min={1} max={8} onChange={setTimeSig} />
                <StepControl label="Count-in" value={countInBars} min={0} max={8} onChange={setCountInBars} />
            </div>

            {/* ── Mode tabs + Start/Stop ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{
                    display: 'flex',
                    border: `1px solid ${BORDER}`,
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    opacity: isRunning ? 0.4 : 1,
                    pointerEvents: isRunning ? 'none' : 'auto',
                }}>
                    {(['interval', 'sequencer'] as Mode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                padding: '0.45rem 1.2rem',
                                fontSize: '1rem',
                                textTransform: 'capitalize',
                                background: mode === m ? BORDER : 'transparent',
                                color: mode === m ? TEXT : MUTED,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background 150ms, color 150ms',
                                fontFamily: 'inherit',
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleToggle}
                    style={{
                        padding: '0.5rem 1.8rem',
                        fontSize: '1.1rem',
                        border: `1px solid ${isRunning ? '#5544aa' : BORDER}`,
                        borderRadius: '9999px',
                        background: isRunning ? '#1e1060' : 'transparent',
                        color: TEXT,
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        whiteSpace: 'nowrap',
                        transition: 'background 150ms, border-color 150ms',
                        fontFamily: 'inherit',
                    }}
                >
                    {isRunning ? 'Stop' : 'Start'}
                </button>
            </div>

            {/* ── Mode panel ── */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: isRunning && mode === 'interval' ? 0.35 : 1, pointerEvents: isRunning && mode === 'interval' ? 'none' : 'auto', transition: 'opacity 150ms' }}>
            {mode === 'interval' ? (

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    width: '100%',
                    maxWidth: '26rem',
                }}>
                    {/* Bars Between Ticks */}
                    <StepControl label="Bars Between Ticks" value={barsBetweenTicks} min={1} onChange={setBarsBetweenTicks} />

                    {/* Divider */}
                    <div style={{ height: '1px', background: BORDER, opacity: 0.5 }} />

                    {/* Beat selector */}
                    <div style={{ width: '100%' }}>
                        <span style={{ ...fieldLabel, marginBottom: '0.6rem' }}>Beats</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {beatSelect.map((active, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBeatSelect(prev => prev.map((v, j) => j === i ? !v : v))}
                                    style={{
                                        flex: 1,
                                        height: '3.2rem',
                                        borderRadius: '0.4rem',
                                        background: active
                                            ? '#5060c0'
                                            : '#0c0826',
                                        border: `1px solid ${active ? '#4a3aaa' : BORDER}`,
                                        cursor: 'pointer',
                                        transition: 'background 120ms, border-color 120ms',
                                        touchAction: 'manipulation',
                                        color: active ? TEXT : MUTED,
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            ) : (

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    width: '100%',
                    maxWidth: '26rem',
                }}>
                    {/* Sequencer toolbar: Beat Sound + Clear */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.5rem',
                    }}>
                        <button
                            onClick={() => setBeatSoundEnabled(v => !v)}
                            style={{
                                padding: '0.2rem 0.9rem',
                                fontSize: '0.85rem',
                                border: `1px solid ${beatSoundEnabled ? '#7a60dd' : '#3a3060'}`,
                                borderRadius: '9999px',
                                background: beatSoundEnabled ? '#2a1880' : 'transparent',
                                color: beatSoundEnabled ? TEXT : '#8880b0',
                                cursor: 'pointer',
                                transition: 'background 150ms, color 150ms, border-color 150ms',
                                touchAction: 'manipulation',
                                fontFamily: 'inherit',
                            }}
                        >
                            Beat Sound
                        </button>
                        <button
                            onClick={() => {
                                if (isRunning) {
                                    metronomeRef.current?.stop();
                                    metronomeRef.current = null;
                                    pendingEvents.current = [];
                                    setIsRunning(false);
                                    setCurrentStep(-1);
                                }
                                setBeatPattern(defaultBeatPattern(timeSig));
                            }}
                            style={{
                                padding: '0.2rem 0.9rem',
                                fontSize: '0.85rem',
                                border: '1px solid #3a3060',
                                borderRadius: '9999px',
                                background: 'transparent',
                                color: '#8880b0',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                                fontFamily: 'inherit',
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {/* Beat rows */}
                    {beatPattern.map((beat, beatIdx) => {
                        const is6 = beat.length === 6;
                        const labels = is6 ? LABELS_6 : LABELS_4;

                        return (
                            <div key={beatIdx}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <span style={{
                                        width: '1.4rem',
                                        flexShrink: 0,
                                        textAlign: 'right',
                                        color: MUTED,
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                    }}>
                                        {beatIdx + 1}
                                    </span>

                                    {beat.map((state, sub) => {
                                        const globalStep = toGlobalStep(beatIdx, sub, beatPattern);
                                        const isCurrent = currentStep === globalStep;
                                        return (
                                            <button
                                                key={sub}
                                                onClick={() => toggleStep(beatIdx, sub)}
                                                style={{
                                                    flex: 1,
                                                    height: '2.9rem',
                                                    borderRadius: '0.3rem',
                                                    background: stepBackground(state),
                                                    filter: isCurrent ? 'brightness(2)' : 'none',
                                                    cursor: 'pointer',
                                                    transition: 'outline 55ms, background 55ms',
                                                    border: 'none',
                                                    touchAction: 'manipulation',
                                                }}
                                            />
                                        );
                                    })}

                                    <button
                                        onClick={() => toggleBeatDivision(beatIdx)}
                                        title={is6 ? 'Switch to 4 subdivisions' : 'Switch to 6 subdivisions'}
                                        style={{
                                            flexShrink: 0,
                                            width: '2.2rem',
                                            height: '2.9rem',
                                            fontSize: '0.75rem',
                                            border: `1px solid ${is6 ? '#4a3aaa' : BORDER}`,
                                            borderRadius: '0.3rem',
                                            background: is6 ? '#170c59' : 'transparent',
                                            color: is6 ? TEXT : MUTED,
                                            cursor: 'pointer',
                                            transition: 'background 150ms, color 150ms',
                                            touchAction: 'manipulation',
                                            lineHeight: 1,
                                            fontFamily: 'inherit',
                                        }}
                                    >
                                        6/8
                                    </button>
                                </div>

                                <div style={{
                                    display: 'flex',
                                    gap: '0.4rem',
                                    marginTop: '0.1rem',
                                    paddingLeft: 'calc(1.4rem + 0.4rem)',
                                    paddingRight: 'calc(2.2rem + 0.4rem)',
                                }}>
                                    {beat.map((_, sub) => (
                                        <span
                                            key={sub}
                                            style={{ flex: 1, textAlign: 'center', color: '#333058', fontSize: '0.75rem' }}
                                        >
                                            {labels[sub]}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                </div>
            )}
            </div>

            <HeroImage />
        </div>
    );
};

export default MetronomeComponent;
