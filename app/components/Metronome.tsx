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

    const inputFields = [
        { label: 'Time Signature', value: timeSig, setter: setTimeSig },
        { label: 'Tempo (BPM)', value: tempo, setter: setTempo },
        { label: 'Bars between ticks', value: barsBetweenTicks, setter: setBarsBetweenTicks },
        { label: 'Count-in bars', value: countInBars, setter: setCountInBars },
    ];

    const handleChange = (setter: (value: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(Number(e.target.value));
    };

    return (
        <div className="flex flex-col items-center">
            <div className={`w-36 h-36 rounded-full mt-4 ${isLightOn ? 'bg-blue-300' : 'bg-gray-800'}`}></div>
            <div className={'flex items-center justify-center gap-6 my-12'}>
                <button onClick={handleStart} className="bg-gray-500 text-white px-4 py-2 rounded-md mr-2">Start</button>
                <button onClick={handleStop} className="bg-gray-800 text-white px-4 py-2 rounded-md">Stop</button>
            </div>
            <div className={'flex flex-wrap items-start justify-center w-full'}>
                {inputFields.map(({ label, value, setter }, index) => (
                    <div key={index} className="mt-4 w-full flex flex-col items-center justify-center">
                        <label htmlFor={`input-${index}`} className="mr-2 text-gray-400">{label}</label>
                        <input
                            id={`input-${index}`}
                            type="number"
                            className={'text-gray-200 px-6 py-3 rounded bg-gray-800 text-center'}
                            value={value}
                            onChange={handleChange(setter)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MetronomeComponent;
