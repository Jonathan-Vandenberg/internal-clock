import React, { useState, useEffect } from 'react';
import { Metronome } from '@/utils/metronome';
import woodblockSound from '../../public/audio/metronome-sound.mp3';
import { HeroImage } from "@/app/components/HeroImage";

const MetronomeComponent = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [metronome, setMetronome] = useState<Metronome | null>(null);
    const [isLightOn, setIsLightOn] = useState(false);
    const [inputFields, setInputFields] = useState([
        { label: 'Time Signature', value: 4 },
        { label: 'BPM', value: 90 },
        { label: 'Bars Between Ticks', value: 2 },
        { label: 'Count-in Bars', value: 2 },
    ]);
    const [woodblockAudio, setWoodblockAudio] = useState<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(woodblockSound);
        setWoodblockAudio(audio);
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    const canStart = () => {
        // Check if all fields have valid numbers
        return inputFields.every(field => !isNaN(field.value));
    };

    const handleToggle = () => {
        if (canStart()) {
            if (isRunning) {
                handleStop();
            } else {
                handleStart();
            }
        } else {
            alert("Please enter valid numbers in all fields before starting.");
        }
    };

    const handleStart = () => {
        const [timeSig, tempo, barsBetweenTicks, countInBars] = inputFields.map(field => field.value);
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

    const handleChange = (index: number, value: string) => {
        const newInputFields = [...inputFields];
        const parsedValue = value.trim() === "" ? NaN : parseInt(value, 10);
        newInputFields[index].value = isNaN(parsedValue) ? NaN : parsedValue;
        setInputFields(newInputFields);
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <span className={`w-[5rem] h-[0.7rem] rounded-full ${isLightOn ? 'bg-off-white' : 'bg-tick-off'}`} />
            <div className={'flex items-center justify-center gap-6 my-6'}>
                <div onClick={handleToggle} className={`brighten-on-click bg-transparent flex items-center justify-center border-2 border-button-start text-off-white px-3 py-4 rounded-full ${canStart() ? '' : 'opacity-50 pointer-events-none'}`}>{isRunning ? "Stop" : "Start"}</div>
            </div>
            <div className={'flex flex-wrap items-start justify-evenly h-full w-full gap-2'}>
                {inputFields.map((field, index) => (
                    <div key={index} className="mt-3 w-full h-full flex flex-col items-center justify-center">
                            <label htmlFor={`input-${index}`} className="mb-1 text-off-white">{field.label}</label>
                            <div className="relative">
                                <input
                                    id={`input-${index}`}
                                    type="number"
                                    className={'input-no-outline text-primary-text px-3 py-1 border-2 border-tick-off rounded bg-transparent text-center '}
                                    value={field.value}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    style={{ caretColor: 'transparent' }}
                                />
                                {field.label === 'Time Signature' && (
                                    <span className="text-mid-gray absolute inset-y-0 right-0 flex items-center pr-3">/4</span>
                                )}
                            </div>
                    </div>
                ))}
            </div>
            <HeroImage />
        </div>
    );
};

export default MetronomeComponent;
