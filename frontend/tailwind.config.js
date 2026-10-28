/** Palette taken from the farm itself: deep canal water, wet and dry soil, turmeric, leaf. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E3B43', // canal water, primary
        inkSoft: '#2A5560',
        field: '#E6ECE2', // page background, pale sage
        paper: '#F7F9F4',
        line: '#C9D3C4',
        turmeric: '#D9951C',
        clay: '#B4492F', // dry / alert
        leaf: '#3E7C4F', // healthy / wet
        soilDry: '#CDB38B',
        soilWet: '#4A3626',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'Hind', 'system-ui', 'sans-serif'],
        body: ['Hind', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        flow: { to: { backgroundPositionX: '-24px' } },
      },
      animation: { flow: 'flow 0.8s linear infinite' },
    },
  },
  plugins: [],
};
