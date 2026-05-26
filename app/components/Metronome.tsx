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

interface Theme {
    lightOff: string;
    lightNormal: string;
    border: string;
    muted: string;
    text: string;
    stepOff: string;
    stepNormal: string;
    stepAccent: string;
    dialBg: string;
    dialTrack: string;
    modeBtnBg: string;
    modeBtnColor: string;
    startRunningBg: string;
    startRunningBorder: string;
    beatSelectOn: string;
    beatSelectOff: string;
    beatSelectOnBorder: string;
    beatSelectOffBorder: string;
    toolbarBtnActiveBg: string;
    toolbarBtnActiveBorder: string;
    toolbarBtnInactiveColor: string;
    toolbarBtnInactiveBorder: string;
    chevronDisabledBorder: string;
    chevronDisabledColor: string;
    stepSubLabel: string;
}

const DARK: Theme = {
    lightOff: '#1a1630',
    lightNormal: '#f7f8f8',
    border: '#170c59',
    muted: '#505050',
    text: '#f7f8f8',
    stepOff: '#0c0826',
    stepNormal: '#5060c0',
    stepAccent: '#8844dd',
    dialBg: '#090818',
    dialTrack: '#1a1630',
    modeBtnBg: '#170c59',
    modeBtnColor: '#f7f8f8',
    startRunningBg: '#1e1060',
    startRunningBorder: '#5544aa',
    beatSelectOn: '#5060c0',
    beatSelectOff: '#0c0826',
    beatSelectOnBorder: '#4a3aaa',
    beatSelectOffBorder: '#170c59',
    toolbarBtnActiveBg: '#2a1880',
    toolbarBtnActiveBorder: '#7a60dd',
    toolbarBtnInactiveColor: '#8880b0',
    toolbarBtnInactiveBorder: '#3a3060',
    chevronDisabledBorder: '#1e1a32',
    chevronDisabledColor: '#2a2640',
    stepSubLabel: '#333058',
};

const LIGHT: Theme = {
    lightOff: '#d4cce8',
    lightNormal: '#2813a8',
    border: '#b8aad8',
    muted: '#7060a0',
    text: '#14063a',
    stepOff: '#e8e3f6',
    stepNormal: '#5060c0',
    stepAccent: '#8844dd',
    dialBg: '#f0eaff',
    dialTrack: '#d4cce8',
    modeBtnBg: '#2813a8',
    modeBtnColor: '#f7f8f8',
    startRunningBg: '#d8d2f4',
    startRunningBorder: '#5060c0',
    beatSelectOn: '#5060c0',
    beatSelectOff: '#e8e3f6',
    beatSelectOnBorder: '#4a3aaa',
    beatSelectOffBorder: '#b8aad8',
    toolbarBtnActiveBg: '#dcd8f8',
    toolbarBtnActiveBorder: '#6050c0',
    toolbarBtnInactiveColor: '#7060a0',
    toolbarBtnInactiveBorder: '#b8aad8',
    chevronDisabledBorder: '#e0d8f4',
    chevronDisabledColor: '#c8c0e0',
    stepSubLabel: '#b0a8d0',
};

function stepBackground(state: StepState, theme: Theme): string {
    if (state === 'normal') return theme.stepNormal;
    if (state === 'accent') return theme.stepAccent;
    return theme.stepOff;
}

function toGlobalStep(beat: number, stepInBeat: number, pattern: BeatPattern[]): number {
    let g = stepInBeat;
    for (let b = 0; b < beat; b++) g += pattern[b].length;
    return g;
}

const StepControl: React.FC<{
    label: string;
    value: number;
    min: number;
    max?: number;
    onChange: (v: number) => void;
    theme: Theme;
}> = ({ label, value, min, max, onChange, theme }) => {
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
                border: `1px solid ${disabled ? theme.chevronDisabledBorder : theme.border}`,
                background: 'transparent',
                color: disabled ? theme.chevronDisabledColor : theme.muted,
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
            <span style={{ color: theme.muted, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {chevronBtn(atMin, () => onChange(Math.max(min, value - 1)), '‹')}
                <span style={{ color: theme.text, fontSize: '1.5rem', fontWeight: 600, minWidth: '1.6rem', textAlign: 'center' }}>
                    {value}
                </span>
                {chevronBtn(atMax, () => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1), '›')}
            </div>
        </div>
    );
};

const BpmDial: React.FC<{ bpm: number; onChange: (v: number) => void; theme: Theme }> = ({ bpm, onChange, theme }) => {
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
            <path d={bgPath} fill="none" stroke={theme.dialTrack} strokeWidth={STROKE} strokeLinecap="round" />
            {progressPath && (
                <path d={progressPath} fill="none" stroke="url(#dialGrad)" strokeWidth={STROKE} strokeLinecap="round" />
            )}
            <circle cx={CX} cy={CY} r={R - STROKE - 5} fill={theme.dialBg} />
            <text x={CX} y={CY - 4} textAnchor="middle" dominantBaseline="middle" fill={theme.text} fontSize="28" fontWeight="700" fontFamily="inherit">
                {bpm}
            </text>
            <text x={CX} y={CY + 18} textAnchor="middle" fill={theme.muted} fontSize="9" letterSpacing="3" fontFamily="inherit">
                BPM
            </text>
            <circle cx={handlePt.x} cy={handlePt.y} r={5} fill={theme.text} />
        </svg>
    );
};

const MetronomeComponent = () => {
    const [darkMode, setDarkMode] = useState(true);
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
    const [sequencerSoundEnabled, setSequencerSoundEnabled] = useState(true);

    const metronomeRef = useRef<Metronome | null>(null);
    const patternRef = useRef(beatPattern);
    const beatSelectRef = useRef<boolean[]>([true, false, false, false]);
    const bpmRef = useRef(bpm);
    const beatSoundEnabledRef = useRef(false);
    const sequencerSoundEnabledRef = useRef(true);
    const pendingEvents = useRef<Array<{
        step: number;
        scheduledTime: number;
        playedState: StepState;
        isBeat: boolean;
    }>>([]);

    // Initialize theme from localStorage / system preference
    useEffect(() => {
        const stored = localStorage.getItem('metronome-theme');
        if (stored === 'light') setDarkMode(false);
        else if (stored === 'dark') setDarkMode(true);
        else setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }, []);

    // Sync html class for CSS variables
    useEffect(() => {
        const root = document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
            root.classList.remove('light');
            localStorage.setItem('metronome-theme', 'dark');
        } else {
            root.classList.add('light');
            root.classList.remove('dark');
            localStorage.setItem('metronome-theme', 'light');
        }
    }, [darkMode]);

    useEffect(() => { if (mode === 'interval') setBeatSoundEnabled(false); }, [mode]);
    useEffect(() => { patternRef.current = beatPattern; }, [beatPattern]);
    useEffect(() => { beatSelectRef.current = beatSelect; }, [beatSelect]);
    useEffect(() => { beatSoundEnabledRef.current = beatSoundEnabled; }, [beatSoundEnabled]);
    useEffect(() => { sequencerSoundEnabledRef.current = sequencerSoundEnabled; }, [sequencerSoundEnabled]);
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
            () => beatSoundEnabledRef.current,
            () => sequencerSoundEnabledRef.current
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

    const theme = darkMode ? DARK : LIGHT;

    const fieldLabel: React.CSSProperties = {
        color: theme.muted,
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
            paddingTop: '2.8rem',
        }}>

            {/* ── Lights + theme toggle — fixed to top of screen ── */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                background: darkMode ? 'rgba(0, 2, 18, 0.85)' : 'rgba(240, 234, 255, 0.85)',
                borderBottom: `1px solid ${theme.border}`,
            }}>
                <div style={{ flex: 1 }} />
                <div style={{ display: 'flex', gap: mode === 'sequencer' ? '3.5rem' : '0.5rem', justifyContent: 'center', flex: 1 }}>
                    {mode === 'interval' ? (
                        <div style={{
                            width: '5rem',
                            height: '0.55rem',
                            borderRadius: '9999px',
                            background: beatLightOn ? theme.lightNormal : theme.lightOff,
                            transition: 'background 55ms',
                        }} />
                    ) : (
                        <>
                            <div style={{
                                width: '5rem',
                                height: '0.55rem',
                                borderRadius: '9999px',
                                background: beatLightOn ? theme.lightNormal : theme.lightOff,
                                transition: 'background 55ms',
                            }} />
                            <div style={{
                                width: '5rem',
                                height: '0.55rem',
                                borderRadius: '9999px',
                                background: noteLightColor ?? theme.lightOff,
                                transition: 'background 55ms',
                            }} />
                        </>
                    )}
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => setDarkMode(d => !d)}
                        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '9999px',
                            border: `1px solid ${theme.border}`,
                            background: 'transparent',
                            color: theme.muted,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            touchAction: 'manipulation',
                            flexShrink: 0,
                        }}
                    >
                        {darkMode ? (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <circle cx="12" cy="12" r="4" />
                                <line x1="12" y1="2" x2="12" y2="5" />
                                <line x1="12" y1="19" x2="12" y2="22" />
                                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                                <line x1="2" y1="12" x2="5" y2="12" />
                                <line x1="19" y1="12" x2="22" y2="12" />
                                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
                            </svg>
                        ) : (
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* ── BPM dial ── */}
            <BpmDial bpm={bpm} onChange={setBpm} theme={theme} />

            {/* ── Mode tabs + Start/Stop ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{
                    display: 'flex',
                    border: `1px solid ${theme.border}`,
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
                                background: mode === m ? theme.modeBtnBg : 'transparent',
                                color: mode === m ? theme.modeBtnColor : theme.muted,
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
                        border: `1px solid ${isRunning ? theme.startRunningBorder : theme.border}`,
                        borderRadius: '9999px',
                        background: isRunning ? theme.startRunningBg : 'transparent',
                        color: theme.text,
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

            {/* ── Time Sig + Count-in ── */}
            <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', opacity: isRunning ? 0.35 : 1, pointerEvents: isRunning ? 'none' : 'auto', transition: 'opacity 150ms' }}>
                <StepControl label="Time Sig" value={timeSig} min={1} max={8} onChange={setTimeSig} theme={theme} />
                <StepControl label="Count-in" value={countInBars} min={0} max={8} onChange={setCountInBars} theme={theme} />
            </div>

            {/* ── Mode panel ── */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {mode === 'interval' ? (

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    width: '100%',
                    maxWidth: '26rem',
                }}>
                    {/* Bars Between Ticks */}
                    <div style={{ opacity: isRunning ? 0.35 : 1, pointerEvents: isRunning ? 'none' : 'auto', transition: 'opacity 150ms' }}>
                        <StepControl label="Bars Between Ticks" value={barsBetweenTicks} min={1} onChange={setBarsBetweenTicks} theme={theme} />
                    </div>

                    {/* Divider */}
                    <div style={{ height: '1px', background: theme.border, opacity: 0.5 }} />

                    {/* Beat selector */}
                    <div style={{ width: '100%' }}>
                        <span style={{ ...fieldLabel, marginBottom: '0.6rem' }}>Beats</span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            {beatSelect.map((active, i) => {
                                const isFlashing = active && beatLightOn && currentStep === i;
                                return (
                                <button
                                    key={i}
                                    onClick={() => setBeatSelect(prev => prev.map((v, j) => j === i ? !v : v))}
                                    style={{
                                        flex: 1,
                                        height: '3.2rem',
                                        borderRadius: '0.4rem',
                                        background: active ? theme.beatSelectOn : theme.beatSelectOff,
                                        border: `1px solid ${active ? theme.beatSelectOnBorder : theme.beatSelectOffBorder}`,
                                        cursor: 'pointer',
                                        transition: 'filter 60ms, background 120ms, border-color 120ms',
                                        touchAction: 'manipulation',
                                        color: active ? theme.modeBtnColor : theme.muted,
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        fontFamily: 'inherit',
                                        filter: isFlashing ? 'brightness(2)' : 'none',
                                    }}
                                >
                                    {i + 1}
                                </button>
                                );
                            })}
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
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                                onClick={() => setSequencerSoundEnabled(v => !v)}
                                style={{
                                    padding: '0.2rem 0.9rem',
                                    fontSize: '0.85rem',
                                    border: `1px solid ${sequencerSoundEnabled ? theme.toolbarBtnActiveBorder : theme.toolbarBtnInactiveBorder}`,
                                    borderRadius: '9999px',
                                    background: sequencerSoundEnabled ? theme.toolbarBtnActiveBg : 'transparent',
                                    color: sequencerSoundEnabled ? theme.text : theme.toolbarBtnInactiveColor,
                                    cursor: 'pointer',
                                    transition: 'background 150ms, color 150ms, border-color 150ms',
                                    touchAction: 'manipulation',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Seq Sound
                            </button>
                            <button
                                onClick={() => setBeatSoundEnabled(v => !v)}
                                style={{
                                    padding: '0.2rem 0.9rem',
                                    fontSize: '0.85rem',
                                    border: `1px solid ${beatSoundEnabled ? theme.toolbarBtnActiveBorder : theme.toolbarBtnInactiveBorder}`,
                                    borderRadius: '9999px',
                                    background: beatSoundEnabled ? theme.toolbarBtnActiveBg : 'transparent',
                                    color: beatSoundEnabled ? theme.text : theme.toolbarBtnInactiveColor,
                                    cursor: 'pointer',
                                    transition: 'background 150ms, color 150ms, border-color 150ms',
                                    touchAction: 'manipulation',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Metronome
                            </button>
                        </div>
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
                                border: `1px solid ${theme.toolbarBtnInactiveBorder}`,
                                borderRadius: '9999px',
                                background: 'transparent',
                                color: theme.toolbarBtnInactiveColor,
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
                                        color: theme.muted,
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
                                                    background: stepBackground(state, theme),
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
                                            border: `1px solid ${is6 ? theme.beatSelectOnBorder : theme.border}`,
                                            borderRadius: '0.3rem',
                                            background: is6 ? theme.modeBtnBg : 'transparent',
                                            color: is6 ? theme.modeBtnColor : theme.muted,
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
                                            style={{ flex: 1, textAlign: 'center', color: theme.stepSubLabel, fontSize: '0.75rem' }}
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
