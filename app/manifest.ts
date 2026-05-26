import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Internal Clock',
    short_name: 'Metronome',
    description: 'A precision metronome with interval and sequencer modes',
    start_url: '/',
    display: 'standalone',
    background_color: '#000212',
    theme_color: '#000212',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
