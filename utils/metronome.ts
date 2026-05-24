export type StepState = 'off' | 'normal' | 'accent';

// One beat's worth of steps — length 4 (16th notes) or 6 (16th-note triplets)
export type BeatPattern = StepState[];

interface IntervalConfig {
    mode: 'interval';
    barsBetweenTicks: number;
}

interface SequencerConfig {
    mode: 'sequencer';
    // Getter so callers can mutate the pattern live without restarting.
    // Returns one BeatPattern per beat; each may have 4 or 6 steps.
    getPattern: () => BeatPattern[];
}

export type MetronomeConfig = IntervalConfig | SequencerConfig;

// isBeat = true on every quarter-note downbeat (first step of each beat group,
// count-in ticks, and interval ticks). Used to fire the left light.
export type StepCallback = (
    step: number,
    scheduledTime: number,
    playedState: StepState,
    isBeat: boolean
) => void;

export class Metronome {
    private audioContext: AudioContext | null = null;
    private audioBuffer: AudioBuffer | null = null;
    private isRunning = false;
    private schedulerIntervalId: ReturnType<typeof setInterval> | null = null;

    private readonly beatsPerMeasure: number;
    private readonly tempo: number;
    private readonly countInBars: number;
    private readonly audioUrl: string;
    private readonly config: MetronomeConfig;
    private readonly stepCallback: StepCallback;
    private readonly getBeatSoundEnabled: () => boolean;

    private nextTickTime = 0;
    private currentBeat = 0;
    private currentStepInBeat = 0;
    private isCountingIn = false;
    private countInBeatsRemaining = 0;

    private static readonly LOOKAHEAD_MS = 25;
    private static readonly SCHEDULE_AHEAD_S = 0.1;

    constructor(
        beatsPerMeasure: number,
        tempo: number,
        countInBars: number,
        audioUrl: string,
        config: MetronomeConfig,
        stepCallback: StepCallback,
        getBeatSoundEnabled: () => boolean
    ) {
        this.beatsPerMeasure = beatsPerMeasure;
        this.tempo = tempo;
        this.countInBars = countInBars;
        this.audioUrl = audioUrl;
        this.config = config;
        this.stepCallback = stepCallback;
        this.getBeatSoundEnabled = getBeatSoundEnabled;
    }

    start(): void {
        if (this.isRunning) return;

        this.audioContext = new AudioContext();
        this.nextTickTime = this.audioContext.currentTime + 0.1;
        this.currentBeat = 0;
        this.currentStepInBeat = 0;
        this.isCountingIn = this.countInBars > 0;
        this.countInBeatsRemaining = this.beatsPerMeasure * this.countInBars;
        this.isRunning = true;

        fetch(this.audioUrl)
            .then(r => r.arrayBuffer())
            .then(buf => this.audioContext!.decodeAudioData(buf))
            .then(buffer => { this.audioBuffer = buffer; })
            .catch(console.error);

        this.schedulerIntervalId = setInterval(
            () => this.scheduler(),
            Metronome.LOOKAHEAD_MS
        );
    }

    private scheduler(): void {
        if (!this.audioContext) return;

        while (this.nextTickTime < this.audioContext.currentTime + Metronome.SCHEDULE_AHEAD_S) {
            if (this.isCountingIn) {
                this.playNote(this.nextTickTime, 'normal');
                if (this.getBeatSoundEnabled()) this.playBeatSound(this.nextTickTime);
                this.stepCallback(-1, this.nextTickTime, 'normal', true);
                this.countInBeatsRemaining--;
                if (this.countInBeatsRemaining <= 0) {
                    this.isCountingIn = false;
                    this.currentBeat = 0;
                    this.currentStepInBeat = 0;
                }
                this.nextTickTime += 60.0 / this.tempo;

            } else if (this.config.mode === 'interval') {
                this.playNote(this.nextTickTime, 'normal');
                if (this.getBeatSoundEnabled()) this.playBeatSound(this.nextTickTime);
                this.stepCallback(-1, this.nextTickTime, 'normal', true);
                this.nextTickTime += (60.0 / this.tempo) * this.beatsPerMeasure * this.config.barsBetweenTicks;

            } else {
                const pattern = this.config.getPattern();
                if (pattern.length === 0) break;

                // Wrap beat index in case pattern shrank
                this.currentBeat = this.currentBeat % pattern.length;
                const beat = pattern[this.currentBeat];
                const division = beat.length; // 4 or 6

                // Wrap step index in case division shrank
                this.currentStepInBeat = this.currentStepInBeat % division;
                const state = beat[this.currentStepInBeat];
                const isBeat = this.currentStepInBeat === 0;

                // Compute flat global step index for the UI playhead
                let globalStep = this.currentStepInBeat;
                for (let b = 0; b < this.currentBeat; b++) globalStep += pattern[b].length;

                if (state !== 'off') this.playNote(this.nextTickTime, state);
                if (isBeat && this.getBeatSoundEnabled()) this.playBeatSound(this.nextTickTime);
                this.stepCallback(globalStep, this.nextTickTime, state, isBeat);

                // Advance
                this.currentStepInBeat++;
                if (this.currentStepInBeat >= division) {
                    this.currentStepInBeat = 0;
                    this.currentBeat = (this.currentBeat + 1) % pattern.length;
                }
                // Step duration depends on this beat's division
                this.nextTickTime += (60.0 / this.tempo) / division;
            }
        }
    }

    private playNote(time: number, state: StepState): void {
        if (!this.audioBuffer || !this.audioContext) return;
        const gain = this.audioContext.createGain();
        gain.gain.value = state === 'accent' ? 1.8 : 1.0;
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(gain);
        gain.connect(this.audioContext.destination);
        source.start(time);
    }

    private playBeatSound(time: number): void {
        if (!this.audioBuffer || !this.audioContext) return;
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.35;
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.connect(gain);
        gain.connect(this.audioContext.destination);
        source.start(time);
    }

    getCurrentTime(): number {
        return this.audioContext?.currentTime ?? 0;
    }

    stop(): void {
        if (this.schedulerIntervalId !== null) {
            clearInterval(this.schedulerIntervalId);
            this.schedulerIntervalId = null;
        }
        this.isRunning = false;
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
