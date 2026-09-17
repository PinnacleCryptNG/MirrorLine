import { getRealityInstrument } from "./assets";
import { getCandles } from "./history";
import { getTicker } from "./market";
import { getOptionalPublicOrderBook, getOptionalRealityOrderBook } from "./orderbook";
import { getCompanyOverview, getSessionSnapshot, getStockInfoForSymbol } from "./session";

export async function getMarketSnapshot(symbol: string) {
  const [instrument, ticker, candles, session, stock] = await Promise.all([
    getRealityInstrument(symbol),
    getTicker(symbol),
    getCandles({ symbol, interval: "1H", limit: 24 }),
    getSessionSnapshot(),
    getStockInfoForSymbol(symbol),
  ]);

  let company = null;
  let companyError: string | null = null;
  try {
    const result = await getCompanyOverview(instrument.instrument.underlyingSymbol);
    company = result.company;
  } catch (error) {
    companyError = error instanceof Error ? error.message : "Company overview unavailable";
  }

  const [publicBook, realityBook] = await Promise.all([
    getOptionalPublicOrderBook(symbol),
    getOptionalRealityOrderBook(symbol),
  ]);

  return {
    instrument: instrument.instrument,
    ticker: ticker.ticker,
    candles: candles.candles,
    session: session.session,
    stock: stock.stock,
    company,
    companyError,
    publicOrderBook: publicBook,
    realityOrderBook: realityBook,
    provenance: {
      instrument: instrument.provenance,
      ticker: ticker.provenance,
      candles: candles.provenance,
      session: session.provenance,
      stock: stock.provenance,
    },
  };
}
