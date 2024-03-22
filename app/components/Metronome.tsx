import React, { useState, useEffect } from 'react';
import {Metronome} from '@/utils/metronome';
import woodblockSound from '../../public/audio/metronome-sound.mp3';
import {HeroImage} from "@/app/components/HeroImage";

const MetronomeComponent = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [metronome, setMetronome] = useState<Metronome | null>(null);
    const [isLightOn, setIsLightOn] = useState(false);
    const [timeSig, setTimeSig] = useState<string>("4");
    const [tempo, setTempo] = useState<string>("90");
    const [barsBetweenTicks, setBarsBetweenTicks] = useState<string>("2");
    const [countInBars, setCountInBars] = useState<string>("2");
    const [woodblockAudio, setWoodblockAudio] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(woodblockSound);
        setWoodblockAudio(audio);
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    const handleToggle = () => {
        if (isRunning){
            handleStop()
        } else handleStart()
    }

    const handleStart = () => {
            const newMetronome = new Metronome(
                Number(timeSig),
                Number(tempo),
                Number(barsBetweenTicks),
                Number(countInBars),
                handleTick
            );
            newMetronome.start();
            setMetronome(newMetronome);
            setIsRunning(true);
    };

    const handleStop = () => {
        if (metronome) {
            metronome.stop();
            setIsRunning(false);
        }
    };

    const handleTick = () => {
        if (woodblockAudio) {
            woodblockAudio.currentTime = 0;
            woodblockAudio.play();
        }
        setIsLightOn(true);
        setTimeout(() => {
            setIsLightOn(false);
        }, 120);
    };

    const inputFields = [
        { label: 'Time Signature', value: timeSig, setter: setTimeSig },
        { label: 'Tempo (BPM)', value: tempo, setter: setTempo },
        { label: 'Bars between ticks', value: barsBetweenTicks, setter: setBarsBetweenTicks },
        { label: 'Count-in bars', value: countInBars, setter: setCountInBars },
    ];

    const handleChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <span className={`w-[5rem] h-[0.7rem] rounded-full ${isLightOn ? 'bg-off-white' : 'bg-tick-off'}`}  />
            <div className={'flex items-center justify-center gap-6 my-12'}>
                <div onClick={handleToggle} className="brighten-on-click bg-transparent flex items-center justify-center border-2 border-button-start text-off-white px-3 py-4 rounded-full mr-2">{isRunning ? "Stop" : "Start"}</div>
            </div>
            <div className={'flex flex-wrap items-start justify-center w-full gap-2'}>
                {inputFields.map(({ label, value, setter }, index) => (
                    <div key={index} className="mt-3 w-full flex flex-col items-center justify-center">
                        <label htmlFor={`input-${index}`} className="mb-1 text-off-white">{label}</label>
                        <input
                            id={`input-${index}`}
                            type="text"
                            className={'input-no-outline text-primary-text px-3 py-2 border-2 border-tick-off rounded bg-transparent text-center '}
                            value={value}
                            onChange={handleChange(setter)}
                        />
                    </div>
                ))}
            </div>
            <HeroImage/>
        </div>
    );
};

export default MetronomeComponent;
