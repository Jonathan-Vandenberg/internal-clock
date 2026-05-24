"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Metronome, StepState, BeatPattern, MetronomeConfig } from '@/utils/metronome';
import woodblockSound from '../../public/audio/metronome-sound.mp3';
import { HeroImage } from "@/app/components/HeroImage";

type Mode = 'interval' | 'sequencer';

// Subdivision labels for 4-step and 6-step beats
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
    if (state === 'normal') return 'linear-gradient(92.88deg, rgb(69,94,181) 9.16%, rgb(86,67,204) 43.89%, rgb(103,63,215) 64.72%)';
    if (state === 'accent') return '#f71414';
    return '#0c0826';
}

// Compute the flat global step index for a given beat + stepInBeat
function toGlobalStep(beat: number, stepInBeat: number, pattern: BeatPattern[]): number {
    let g = stepInBeat;
    for (let b = 0; b < beat; b++) g += pattern[b].length;
    return g;
}

const LIGHT_OFF = '#0c0826';
const LIGHT_NORMAL = '#f7f8f8';
const LIGHT_ACCENT = '#f71414';

const MetronomeComponent = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [beatLightOn, setBeatLightOn] = useState(false);
    const [noteLightColor, setNoteLightColor] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>('interval');
    const [timeSig, setTimeSig] = useState(4);
    const [bpm, setBpm] = useState(110);
    const [countInBars, setCountInBars] = useState(2);
    const [barsBetweenTicks, setBarsBetweenTicks] = useState(2);
    const [beatPattern, setBeatPattern] = useState<BeatPattern[]>(() => defaultBeatPattern(4));
    const [currentStep, setCurrentStep] = useState(-1);
    const [beatSoundEnabled, setBeatSoundEnabled] = useState(false);

    const metronomeRef = useRef<Metronome | null>(null);
    const patternRef = useRef(beatPattern);
    const beatSoundEnabledRef = useRef(false);
    const pendingEvents = useRef<Array<{
        step: number;
        scheduledTime: number;
        playedState: StepState;
        isBeat: boolean;
    }>>([]);

    useEffect(() => { patternRef.current = beatPattern; }, [beatPattern]);
    useEffect(() => { beatSoundEnabledRef.current = beatSoundEnabled; }, [beatSoundEnabled]);

    useEffect(() => {
        setBeatPattern(defaultBeatPattern(timeSig));
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
                    if (playedState !== 'off') {
                        setNoteLightColor(playedState === 'accent' ? LIGHT_ACCENT : LIGHT_NORMAL);
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
            ? { mode: 'interval', barsBetweenTicks }
            : { mode: 'sequencer', getPattern: () => patternRef.current };
        const m = new Metronome(
            timeSig, bpm, countInBars, woodblockSound,
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

    // Toggle a beat row between 4-division (16th notes) and 6-division (16th-note triplets)
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

    const inputStyle: React.CSSProperties = {
        width: '4.5rem',
        padding: '0.3rem 0.4rem',
        fontSize: '1.2rem',
        textAlign: 'center',
        background: 'transparent',
        border: '2px solid #170c59',
        borderRadius: '0.4rem',
        color: '#b4bcd0',
        outline: 'none',
    };

    const labelStyle: React.CSSProperties = {
        color: '#505050',
        fontSize: '1rem',
        marginBottom: '0.2rem',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%', maxWidth: '36rem' }}>

            {/* Lights + beat sound */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <span style={{ width: '4rem', height: '0.6rem', borderRadius: '9999px', background: beatLightOn ? LIGHT_NORMAL : LIGHT_OFF, transition: 'background 60ms', display: 'inline-block' }} />
                {mode === 'sequencer' && (
                    <span style={{ width: '4rem', height: '0.6rem', borderRadius: '9999px', background: noteLightColor ?? LIGHT_OFF, transition: 'background 60ms', display: 'inline-block' }} />
                )}
                <button
                    onClick={() => setBeatSoundEnabled(v => !v)}
                    style={{
                        padding: '0.2rem 0.9rem',
                        fontSize: '1rem',
                        border: '2px solid #170c59',
                        borderRadius: '9999px',
                        background: beatSoundEnabled ? '#170c59' : 'transparent',
                        color: beatSoundEnabled ? '#f7f8f8' : '#505050',
                        cursor: 'pointer',
                        transition: 'background 150ms, color 150ms',
                        touchAction: 'manipulation',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Beat Sound
                </button>
            </div>

            {/* Shared controls */}
            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                    { label: 'Time Sig', value: timeSig, min: 1, max: 8, set: (v: number) => setTimeSig(v) },
                    { label: 'BPM', value: bpm, min: 20, max: 300, set: (v: number) => setBpm(v) },
                    { label: 'Count-in', value: countInBars, min: 0, max: 8, set: (v: number) => setCountInBars(v) },
                ].map(({ label, value, min, max, set }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={labelStyle}>{label}</span>
                        <input
                            type="number"
                            style={inputStyle}
                            value={value}
                            min={min}
                            max={max}
                            onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v)) set(Math.max(min, Math.min(max, v)));
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Mode tabs + Start/Stop */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <div style={{
                    display: 'flex',
                    border: '2px solid #170c59',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    opacity: isRunning ? 0.45 : 1,
                    pointerEvents: isRunning ? 'none' : 'auto',
                }}>
                    {(['interval', 'sequencer'] as Mode[]).map(m => (
                        <button
                            key={m}
                            onClick={() => setMode(m)}
                            style={{
                                padding: '0.4rem 1.1rem',
                                fontSize: '1.1rem',
                                textTransform: 'capitalize',
                                background: mode === m ? '#170c59' : 'transparent',
                                color: mode === m ? '#f7f8f8' : '#505050',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background 150ms, color 150ms',
                            }}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleToggle}
                    style={{
                        padding: '0.5rem 1.6rem',
                        fontSize: '1.2rem',
                        border: '2px solid #170c59',
                        borderRadius: '9999px',
                        background: 'transparent',
                        color: '#f7f8f8',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {isRunning ? 'Stop' : 'Start'}
                </button>
            </div>

            {/* Mode panel */}
            {mode === 'interval' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={labelStyle}>Bars Between Ticks</span>
                    <input
                        type="number"
                        style={inputStyle}
                        value={barsBetweenTicks}
                        min={1}
                        onChange={e => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v) && v >= 1) setBarsBetweenTicks(v);
                        }}
                    />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', maxWidth: '26rem' }}>

                    {/* Clear all */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
                        <button
                            onClick={() => setBeatPattern(defaultBeatPattern(timeSig))}
                            style={{
                                padding: '0.2rem 0.9rem',
                                fontSize: '1rem',
                                border: '2px solid #170c59',
                                borderRadius: '9999px',
                                background: 'transparent',
                                color: '#505050',
                                cursor: 'pointer',
                                touchAction: 'manipulation',
                            }}
                        >
                            Clear
                        </button>
                    </div>

                    {beatPattern.map((beat, beatIdx) => {
                        const is6 = beat.length === 6;
                        const labels = is6 ? LABELS_6 : LABELS_4;

                        return (
                            <div key={beatIdx}>
                                {/* Step row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {/* Beat number */}
                                    <span style={{ width: '1.6rem', flexShrink: 0, textAlign: 'right', color: '#f7f8f8', fontSize: '1rem', fontWeight: 600 }}>
                                        {beatIdx + 1}
                                    </span>

                                    {/* Step buttons */}
                                    {beat.map((state, sub) => {
                                        const globalStep = toGlobalStep(beatIdx, sub, beatPattern);
                                        const isCurrent = currentStep === globalStep;
                                        return (
                                            <button
                                                key={sub}
                                                onClick={() => toggleStep(beatIdx, sub)}
                                                style={{
                                                    flex: 1,
                                                    height: '3rem',
                                                    borderRadius: '0.3rem',
                                                    background: stepBackground(state),
                                                    outline: isCurrent ? '2px solid #f7f8f8' : '2px solid transparent',
                                                    outlineOffset: '2px',
                                                    cursor: 'pointer',
                                                    transition: 'outline 60ms, background 60ms',
                                                    border: 'none',
                                                    touchAction: 'manipulation',
                                                }}
                                            />
                                        );
                                    })}

                                    {/* 6/8 toggle button */}
                                    <button
                                        onClick={() => toggleBeatDivision(beatIdx)}
                                        title={is6 ? 'Switch to 4 subdivisions' : 'Switch to 6 subdivisions (6/8 feel)'}
                                        style={{
                                            flexShrink: 0,
                                            width: '2.4rem',
                                            height: '3rem',
                                            fontSize: '0.9rem',
                                            border: '2px solid #170c59',
                                            borderRadius: '0.3rem',
                                            background: is6 ? '#170c59' : 'transparent',
                                            color: is6 ? '#f7f8f8' : '#505050',
                                            cursor: 'pointer',
                                            transition: 'background 150ms, color 150ms',
                                            touchAction: 'manipulation',
                                            lineHeight: 1,
                                        }}
                                    >
                                        6/8
                                    </button>
                                </div>

                                {/* Subdivision labels row */}
                                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem', paddingLeft: 'calc(1.6rem + 0.4rem)', paddingRight: 'calc(2.4rem + 0.4rem)' }}>
                                    {beat.map((_, sub) => (
                                        <span
                                            key={sub}
                                            style={{ flex: 1, textAlign: 'center', color: '#505050', fontSize: '0.8rem' }}
                                        >
                                            {labels[sub]}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '1rem', color: '#505050', fontSize: '1rem', marginTop: '0.8rem' }}>
                        {(['normal', 'accent', 'off'] as StepState[]).map(state => (
                            <span key={state} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                    width: '0.8rem', height: '0.8rem',
                                    borderRadius: '0.2rem',
                                    background: stepBackground(state),
                                    border: state === 'off' ? '1px solid #222326' : 'none',
                                    display: 'inline-block',
                                    flexShrink: 0,
                                }} />
                                {state.charAt(0).toUpperCase() + state.slice(1)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <HeroImage />
        </div>
    );
};

export default MetronomeComponent;
