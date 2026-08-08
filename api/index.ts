// @ts-ignore
import rawApp from '../dist/server.cjs';

// Robust fallback to handle different bundler default export behaviors
const app = rawApp && typeof rawApp === 'object' && 'default' in rawApp ? rawApp.default : rawApp;

export default app;
