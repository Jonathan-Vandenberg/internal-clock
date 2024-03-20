export class Metronome {
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private beatsPerMeasure: number = 4;
    private barsBetweenTicks: number = 1;
    private tempo: number = 120; // Default tempo
    private countInBars: number = 1; // Default count-in bars
    private countInBeats: number = 0; // Number of beats in count-in
    private countInIntervalId: NodeJS.Timeout | null = null; // Interval ID for count-in
    private tickCallback: () => void; // Callback function for each tick

    constructor(beatsPerMeasure: number, tempo: number, barsBetweenTicks: number, countInBars: number, tickCallback: () => void) {
        this.beatsPerMeasure = beatsPerMeasure;
        this.tempo = tempo;
        this.barsBetweenTicks = barsBetweenTicks;
        this.countInBars = countInBars;
        this.tickCallback = tickCallback;
    }

    start(): void {
        if (!this.isRunning) {
            this.startCountIn();
        }
    }

    private startCountIn(): void {
        this.countInBeats = this.beatsPerMeasure * this.countInBars;
        const millisecondsPerBeat = 60000 / this.tempo;

        let count = 0;
        this.countInIntervalId = setInterval(() => {
            console.log('Count-in Tick');
            this.tickCallback(); // Call the callback function
            count++;

            if (count >= this.countInBeats) {
                clearInterval(this.countInIntervalId!);
                // Start the main metronome after count-in is complete
                setTimeout(() => {
                    this.startMainMetronome();
                }, millisecondsPerBeat);
            }
        }, millisecondsPerBeat);
    }

    private startMainMetronome(): void {
        const millisecondsPerBeat = 60000 / this.tempo;
        const millisecondsPerBar = millisecondsPerBeat * this.beatsPerMeasure;
        const millisecondsPerTick = millisecondsPerBar * this.barsBetweenTicks;

        this.tickCallback(); // Trigger the first tick immediately

        this.intervalId = setInterval(() => {
            this.tickCallback();
        }, millisecondsPerTick);
        this.isRunning = true;
    }

    stop(): void {
        if (this.isRunning) {
            clearInterval(this.intervalId!);
            this.isRunning = false;
        }

        if (this.countInIntervalId) {
            clearInterval(this.countInIntervalId);
        }
    }
}
