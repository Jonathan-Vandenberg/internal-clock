export type StepState = 'off' | 'normal' | 'accent';

// One beat's worth of steps — length 4 (16th notes) or 6 (16th-note triplets)
export type BeatPattern = StepState[];

interface IntervalConfig {
    mode: 'interval';
    barsBetweenTicks: number;
    // Which beats within bar 1 should play. Length = beatsPerMeasure.
    getBeatSelect: () => boolean[];
}

interface SequencerConfig {
    mode: 'sequencer';
    getPattern: () => BeatPattern[];
}

export type MetronomeConfig = IntervalConfig | SequencerConfig;

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
    private readonly getTempo: () => number;
    private readonly countInBars: number;
    private readonly audioUrl: string;
    private readonly config: MetronomeConfig;
    private readonly stepCallback: StepCallback;
    private readonly getBeatSoundEnabled: () => boolean;

    private nextTickTime = 0;
    // Sequencer position
    private currentBeat = 0;
    private currentStepInBeat = 0;
    // Interval position: beat index within the full N-bar cycle
    private currentIntervalBeat = 0;
    private isCountingIn = false;
    private countInBeatsRemaining = 0;

    private static readonly LOOKAHEAD_MS = 25;
    private static readonly SCHEDULE_AHEAD_S = 0.1;

    constructor(
        beatsPerMeasure: number,
        getTempo: () => number,
        countInBars: number,
        audioUrl: string,
        config: MetronomeConfig,
        stepCallback: StepCallback,
        getBeatSoundEnabled: () => boolean
    ) {
        this.beatsPerMeasure = beatsPerMeasure;
        this.getTempo = getTempo;
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
        this.currentIntervalBeat = 0;
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
                this.stepCallback(-1, this.nextTickTime, 'normal', true);
                this.countInBeatsRemaining--;
                if (this.countInBeatsRemaining <= 0) {
                    this.isCountingIn = false;
                    this.currentBeat = 0;
                    this.currentStepInBeat = 0;
                    this.currentIntervalBeat = 0;
                }
                this.nextTickTime += 60.0 / this.getTempo();

            } else if (this.config.mode === 'interval') {
                const totalBeats = this.beatsPerMeasure * this.config.barsBetweenTicks;
                const barInCycle = Math.floor(this.currentIntervalBeat / this.beatsPerMeasure);
                const beatInBar = this.currentIntervalBeat % this.beatsPerMeasure;

                // Only bar 0 can have active beats
                const beatSelect = this.config.getBeatSelect();
                const played = barInCycle === 0 && (beatSelect[beatInBar] ?? false);

                if (played) {
                    this.playNote(this.nextTickTime, 'normal');
                    if (this.getBeatSoundEnabled()) this.playBeatSound(this.nextTickTime);
                }

                // Pass beatInBar as step during bar 0 so the UI can show the playhead
                const step = barInCycle === 0 ? beatInBar : -1;
                this.stepCallback(step, this.nextTickTime, played ? 'normal' : 'off', played);

                this.currentIntervalBeat = (this.currentIntervalBeat + 1) % totalBeats;
                this.nextTickTime += 60.0 / this.getTempo();

            } else {
                const pattern = this.config.getPattern();
                if (pattern.length === 0) break;

                this.currentBeat = this.currentBeat % pattern.length;
                const beat = pattern[this.currentBeat];
                const division = beat.length;
                this.currentStepInBeat = this.currentStepInBeat % division;
                const state = beat[this.currentStepInBeat];
                const isBeat = this.currentStepInBeat === 0;

                let globalStep = this.currentStepInBeat;
                for (let b = 0; b < this.currentBeat; b++) globalStep += pattern[b].length;

                if (state !== 'off') this.playNote(this.nextTickTime, state);
                if (isBeat && this.getBeatSoundEnabled()) this.playBeatSound(this.nextTickTime);
                this.stepCallback(globalStep, this.nextTickTime, state, isBeat);

                this.currentStepInBeat++;
                if (this.currentStepInBeat >= division) {
                    this.currentStepInBeat = 0;
                    this.currentBeat = (this.currentBeat + 1) % pattern.length;
                }
                this.nextTickTime += (60.0 / this.getTempo()) / division;
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
        gain.gain.value = 1.6;
        const source = this.audioContext.createBufferSource();
        source.buffer = this.audioBuffer;
        source.playbackRate.value = 1.4;
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
