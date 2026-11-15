// Kept so the game's existing imports keep working under their original name.
// The implementation moved to ./projection-game.js when the game gained a
// second crater; it is centred on whichever crater is active, and that is
// Jezero unless setGameCrater says otherwise.
export * from '@/lib/coordinates/projection-game';
