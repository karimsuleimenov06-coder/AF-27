/**
 * Shared economy tuning. calculateValue(rating) in types/player.ts is the single
 * source of truth for "what a player is worth" — everything else (pack pricing,
 * market pricing, sell prices, match rewards) is calibrated against it so coins
 * earned from matches map predictably onto packs/transfers.
 */

// Selling a player (duplicate from a pack, or releasing one on the transfer
// market) returns less than full value — otherwise buying/opening packs and
// immediately reselling would print coins for free.
export const SELL_RATE = 0.45

// Buying a specific player on the transfer market is a guaranteed pick (no
// gacha risk), so it costs a premium over a pack's expected value per card.
export const MARKET_MARKUP = 1.15

export function sellValue(value: number): number {
  return Math.round((value * SELL_RATE) / 10) * 10
}

export function marketPrice(value: number): number {
  return Math.round((value * MARKET_MARKUP) / 10) * 10
}
