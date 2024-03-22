'use client'
import Metronome from "@/app/components/Metronome";

export default function Home() {
    return (
        <main className="bg-background-gradient h-screen flex flex-col items-center justify-between p-12">
            <Metronome />
        </main>
    );
}
