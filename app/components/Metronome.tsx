import React, { useState, useEffect } from 'react';
import {Metronome} from '@/utils/metronome';
import woodblockSound from '../../public/audio/metronome-sound.mp3';

const MetronomeComponent = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [metronome, setMetronome] = useState<Metronome | null>(null);
    const [isLightOn, setIsLightOn] = useState(false);
    const [timeSig, setTimeSig] = useState<number>(4);
    const [tempo, setTempo] = useState<number>(90);
    const [barsBetweenTicks, setBarsBetweenTicks] = useState<number>(2);
    const [countInBars, setCountInBars] = useState<number>(2);
    const [woodblockAudio, setWoodblockAudio] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(woodblockSound);
        setWoodblockAudio(audio);
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    const handleStart = () => {
        if (!isRunning) {
            const newMetronome = new Metronome(
                timeSig,
                tempo,
                barsBetweenTicks,
                countInBars,
                handleTick
            );
            newMetronome.start();
            setMetronome(newMetronome);
            setIsRunning(true);
        }
    };

    const handleStop = () => {
        if (isRunning && metronome) {
            metronome.stop();
            setIsRunning(false);
        }
    };

    const handleTick = () => {
        setIsLightOn(true);
        if (woodblockAudio) {
            woodblockAudio.currentTime = 0;
            woodblockAudio.play();
        }
        setTimeout(() => {
            setIsLightOn(false);
        }, 100);
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`w-36 h-36 rounded-full mt-4 ${isLightOn ? 'bg-blue-300' : 'bg-gray-800'}`}></div>
            <div className={'flex items-center justify-center gap-6 my-12'}>
                <button onClick={handleStart} className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2">Start</button>
                <button onClick={handleStop} className="bg-red-500 text-white px-4 py-2 rounded-md">Stop</button>
            </div>
            <div className={'flex items-start justify-center w-full flex-col'}>
                <div className="mt-4 w-full">
                    <label htmlFor="beatsPerMeasure" className="mr-2 text-white">Time Signature:</label>
                    <input type="number" className={'text-black'} value={timeSig} onChange={(e) => setTimeSig(Number(e.target.value))} />
                </div>
                <div>
                    <label htmlFor="tempo" className="mr-2 text-white">Tempo (BPM):</label>
                    <input type="number" className={'text-black'} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
                </div>
                <div>
                    <label htmlFor="barsBetweenTicks" className="mr-2 text-white">Bars between ticks:</label>
                    <input type="number" className={'text-black'} value={barsBetweenTicks} onChange={(e) => setBarsBetweenTicks(Number(e.target.value))} />
                </div>
                <div>
                    <label htmlFor="countInBars" className="mr-2 text-white">Count-in bars:</label>
                    <input type="number" className={'text-black'} value={countInBars} onChange={(e) => setCountInBars(Number(e.target.value))}  />
                </div>
            </div>
        </div>
    );
};

export default MetronomeComponent;
