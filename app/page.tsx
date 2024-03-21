'use client'
import Metronome from "@/app/components/Metronome";

export default function Home() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service worker registered:', registration);
            } catch (error) {
                console.error('Service worker registration failed:', error);
            }
        });
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <Metronome />
        </main>
    );
}
