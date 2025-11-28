import type { Config } from 'tailwindcss';
// @ts-ignore - workspace package
import preset from '@nts/config/tailwind-preset.js';

export default {
  presets: [preset as unknown as Config],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {}
  }
} satisfies Config;


