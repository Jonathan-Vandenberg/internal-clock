'use client'
import Metronome from "@/app/components/Metronome";

export default function Home() {
    return (
        <main className="bg-background-gradient min-h-screen flex flex-col items-center p-8">
            <Metronome />
        </main>
    );
}
