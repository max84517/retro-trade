import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OHLC, Portfolio, SimulationConfig, SimulationStatus, Speed } from './types';
import { fetchMarketData, MarketDataResult } from './services/marketData';
import StockChart from './components/StockChart';

// Icons
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" /></svg>;
const ArrowPathIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S12 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S12 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
const CpuChipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>;

const DEFAULT_CASH = 10000;
const DEFAULT_SYMBOL = 'AAPL';
const DEFAULT_DATE = '2023-01-01';

const App: React.FC = () => {
  // --- State ---
  const [config, setConfig] = useState<SimulationConfig>({
    initialCash: DEFAULT_CASH,
    symbol: DEFAULT_SYMBOL,
    startDate: DEFAULT_DATE,
  });

  const [status, setStatus] = useState<SimulationStatus>(SimulationStatus.IDLE);
  const [speed, setSpeed] = useState<Speed>(Speed.X1);
  const [marketData, setMarketData] = useState<OHLC[]>([]);
  const [isRealData, setIsRealData] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  const [portfolio, setPortfolio] = useState<Portfolio>({
    cash: DEFAULT_CASH,
    shares: 0,
    equity: DEFAULT_CASH,
    totalValue: DEFAULT_CASH,
    avgCost: 0,
  });

  const [tradeAmount, setTradeAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Refs ---
  const timerRef = useRef<number | null>(null);

  // --- Computed ---
  const currentDayData = marketData[currentIndex];
  const displayedData = marketData.slice(0, currentIndex + 1);
  const isMarketLoaded = marketData.length > 0;
  const isFinished = currentIndex >= marketData.length - 1;

  // --- Helpers ---
  const updateEquity = useCallback((currentPrice: number, currentPortfolio: Portfolio) => {
    const equity = currentPortfolio.shares * currentPrice;
    const totalValue = currentPortfolio.cash + equity;
    return { ...currentPortfolio, equity, totalValue };
  }, []);

  // --- Effects ---
  useEffect(() => {
    if (status === SimulationStatus.RUNNING && !isFinished) {
      const intervalMs = 10000 / speed;
      timerRef.current = window.setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= marketData.length - 1) {
            setStatus(SimulationStatus.FINISHED);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status, speed, marketData.length, isFinished]);

  useEffect(() => {
    if (currentDayData) {
      setPortfolio(prev => updateEquity(currentDayData.close, prev));
    }
  }, [currentIndex, currentDayData, updateEquity]);

  // --- Handlers ---
  const handleStartLoad = async () => {
    if (status === SimulationStatus.IDLE || status === SimulationStatus.FINISHED) {
      setIsLoading(true);
      setStatus(SimulationStatus.PAUSED);
      
      const result: MarketDataResult = await fetchMarketData(config.symbol, config.startDate);
      
      setMarketData(result.data);
      setIsRealData(result.isRealData);
      setCurrentIndex(0);
      setPortfolio({
        cash: config.initialCash,
        shares: 0,
        equity: config.initialCash,
        totalValue: config.initialCash,
        avgCost: 0,
      });
      setIsLoading(false);
    } else {
      if (status === SimulationStatus.RUNNING) setStatus(SimulationStatus.PAUSED);
      else setStatus(SimulationStatus.RUNNING);
    }
  };

  const handleReset = () => {
    setStatus(SimulationStatus.IDLE);
    setMarketData([]);
    setCurrentIndex(0);
    setPortfolio({
      cash: config.initialCash,
      shares: 0,
      equity: config.initialCash,
      totalValue: config.initialCash,
      avgCost: 0,
    });
    setErrorMsg(null);
    setIsRealData(false);
  };

  const handleBuy = () => {
    if (!currentDayData) return;
    const amount = parseInt(tradeAmount);
    if (isNaN(amount) || amount <= 0) { setErrorMsg("Invalid qty"); return; }
    const cost = amount * currentDayData.close;
    if (portfolio.cash < cost) { setErrorMsg("No funds"); return; }

    const oldTotalCost = portfolio.shares * portfolio.avgCost;
    const newTotalShares = portfolio.shares + amount;
    const newAvgCost = (oldTotalCost + cost) / newTotalShares;

    setPortfolio(prev => updateEquity(currentDayData.close, {
      ...prev,
      cash: prev.cash - cost,
      shares: newTotalShares,
      avgCost: newAvgCost
    }));
    setErrorMsg(null);
    setTradeAmount('');
  };

  const handleSell = () => {
    if (!currentDayData) return;
    const amount = parseInt(tradeAmount);
    if (isNaN(amount) || amount <= 0) { setErrorMsg("Invalid qty"); return; }
    if (portfolio.shares < amount) { setErrorMsg("No shares"); return; }

    setPortfolio(prev => updateEquity(currentDayData.close, {
      ...prev,
      cash: prev.cash + (amount * currentDayData.close),
      shares: prev.shares - amount,
      // avg cost doesn't change on sell
    }));
    setErrorMsg(null);
    setTradeAmount('');
  };

  // P/L Calculation
  const marketValue = portfolio.shares * (currentDayData?.close || 0);
  const costBasis = portfolio.shares * portfolio.avgCost;
  const unrealizedPL = marketValue - costBasis;
  const unrealizedPLPercent = costBasis > 0 ? (unrealizedPL / costBasis) * 100 : 0;
  const totalReturn = ((portfolio.totalValue - config.initialCash) / config.initialCash) * 100;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans flex flex-col">
      {/* 1. Header: Global Stats */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold">R</div>
            <h1 className="text-xl font-bold tracking-tight hidden md:block">RetroTrade</h1>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar items-center">
            <div className="flex flex-col items-end leading-tight">
               <span className="text-[10px] text-gray-500 uppercase tracking-wider">Total Equity</span>
               <span className={`font-mono font-bold ${portfolio.totalValue >= config.initialCash ? 'text-emerald-400' : 'text-red-400'}`}>
                 ${portfolio.totalValue.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
               </span>
            </div>
            <div className="w-px h-8 bg-gray-800 hidden sm:block"></div>
            <div className="flex flex-col items-end leading-tight">
               <span className="text-[10px] text-gray-500 uppercase tracking-wider">Cash</span>
               <span className="font-mono text-gray-300">${portfolio.cash.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
            </div>
            <div className="w-px h-8 bg-gray-800 hidden sm:block"></div>
            <div className="flex flex-col items-end leading-tight pr-1">
               <span className="text-[10px] text-gray-500 uppercase tracking-wider">Return</span>
               <span className={`font-mono ${totalReturn >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                 {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
               </span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Layout: Dashboard Grid */}
      <main className="flex-grow p-4 md:p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Chart Area (Takes 9 cols now) */}
        <div className="lg:col-span-9 flex flex-col gap-4">
          <div className="h-[400px] lg:h-[600px] bg-gray-900/50 rounded-2xl border border-gray-800 p-1 relative overflow-hidden flex flex-col">
             {/* Chart Header Overlay */}
             <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <div className="flex items-baseline gap-3 bg-gray-900/80 backdrop-blur px-3 py-1 rounded-lg border border-gray-800/50">
                  <h2 className="text-2xl font-bold text-white tracking-wide">{config.symbol}</h2>
                  <span className="text-gray-400 text-sm">Daily</span>
                </div>
                {/* Data Source Indicator */}
                {isMarketLoaded && (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-[10px] font-medium backdrop-blur w-fit ${isRealData ? 'bg-blue-900/30 border-blue-800 text-blue-300' : 'bg-amber-900/30 border-amber-800 text-amber-300'}`}>
                    {isRealData ? <GlobeIcon /> : <CpuChipIcon />}
                    {isRealData ? 'Real Market Data' : 'Simulated Data'}
                  </div>
                )}
             </div>

             {!isMarketLoaded && !isLoading && (
               <div className="absolute inset-0 flex items-center justify-center z-0">
                 <div className="text-center text-gray-600">
                   <p>Waiting for Simulation Data...</p>
                 </div>
               </div>
             )}
             
             {isLoading && (
               <div className="absolute inset-0 flex items-center justify-center z-20 bg-gray-950/50 backdrop-blur-sm">
                 <div className="text-center">
                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
                   <p className="text-blue-400">Fetching Data...</p>
                 </div>
               </div>
             )}
             
             <div className="flex-grow w-full h-full pt-16">
                <StockChart data={displayedData} />
             </div>
          </div>
        </div>

        {/* Right: Command Center (Takes 3 cols now) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* A. Market Status Card */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 shadow-sm flex flex-col gap-1">
             <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 uppercase font-semibold">Current Price</span>
                <span className="text-xs text-gray-500 font-mono">{currentDayData ? currentDayData.date : '--/--/--'}</span>
             </div>
             <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl xl:text-4xl font-mono text-white font-medium">
                  ${currentDayData?.close.toFixed(2) || '0.00'}
                </span>
                {currentDayData && (
                  <span className={`text-sm font-mono ${currentDayData.close >= currentDayData.open ? 'text-emerald-500' : 'text-red-500'}`}>
                     {((currentDayData.close - currentDayData.open) / currentDayData.open * 100).toFixed(2)}%
                  </span>
                )}
             </div>
          </div>

          {/* B. Simulation Controls */}
          {isMarketLoaded ? (
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 flex flex-col gap-3">
               <div className="flex gap-2">
                 <button 
                   onClick={() => status === SimulationStatus.RUNNING ? setStatus(SimulationStatus.PAUSED) : setStatus(SimulationStatus.RUNNING)}
                   disabled={isFinished}
                   className={`flex-1 py-4 rounded-lg flex justify-center items-center gap-2 font-bold transition text-lg shadow-lg ${
                     status === SimulationStatus.RUNNING 
                     ? 'bg-amber-600/90 hover:bg-amber-600 text-white shadow-amber-900/20' 
                     : 'bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-emerald-900/20'
                   } disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                   {status === SimulationStatus.RUNNING ? <PauseIcon/> : <PlayIcon/>}
                   {status === SimulationStatus.RUNNING ? 'PAUSE' : 'PLAY'}
                 </button>
               </div>
               
               <div className="bg-gray-950 rounded-lg p-1 flex">
                 {[1, 2, 5].map((s) => (
                   <button
                     key={s}
                     onClick={() => setSpeed(s as Speed)}
                     className={`flex-1 py-1 text-xs font-medium rounded transition-all ${
                       speed === s ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'
                     }`}
                   >
                     {s}x
                   </button>
                 ))}
               </div>
            </div>
          ) : (
             // Initial Setup State
             <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
                <h3 className="text-sm font-bold text-gray-400 uppercase">Setup</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Stock Symbol</label>
                    <input 
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white text-sm uppercase placeholder-gray-600"
                      value={config.symbol}
                      placeholder="e.g. AAPL, TSLA"
                      onChange={e => setConfig({...config, symbol: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Start Date</label>
                    <input 
                       type="date"
                       className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                       value={config.startDate}
                       onChange={e => setConfig({...config, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Cash ($)</label>
                    <input 
                       type="number"
                       className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                       value={config.initialCash}
                       onChange={e => setConfig({...config, initialCash: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <button 
                  onClick={handleStartLoad}
                  className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2"
                >
                  {isLoading ? 'Loading...' : 'Start Simulation'}
                </button>
             </div>
          )}

          {/* C. Order Entry */}
          {isMarketLoaded && !isFinished && (
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 flex-grow flex flex-col gap-4">
               <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                 <span className="text-xs font-bold text-gray-400 uppercase">Trade</span>
                 <div className="text-xs text-gray-500">
                    Avail: <span className="text-white">${portfolio.cash.toFixed(0)}</span>
                 </div>
               </div>

               <div className="relative">
                  <label className="text-[10px] text-gray-500 absolute -top-2 left-2 bg-gray-900 px-1">Quantity</label>
                  <input 
                    type="number" 
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg font-mono focus:border-blue-500 focus:outline-none"
                  />
                  <div className="absolute right-2 top-2.5 flex gap-1">
                    <button onClick={() => setTradeAmount(Math.floor(portfolio.cash / currentDayData.close).toString())} className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-blue-400">MAX BUY</button>
                    <button onClick={() => setTradeAmount(portfolio.shares.toString())} className="text-[10px] bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-blue-400">MAX SELL</button>
                  </div>
                  {errorMsg && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-1">{errorMsg}</p>}
               </div>

               <div className="grid grid-cols-2 gap-3 mt-2">
                  <button onClick={handleBuy} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform">
                    BUY
                  </button>
                  <button onClick={handleSell} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-red-900/20 active:scale-95 transition-transform">
                    SELL
                  </button>
               </div>
               
               {/* My Position Mini-View (Enhanced) */}
               <div className="mt-auto pt-5 border-t border-gray-800">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Your Position</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-950/50 p-2 rounded-lg border border-gray-800/50">
                      <span className="text-[10px] text-gray-500 uppercase block mb-1">Shares</span>
                      <span className="text-lg font-mono font-medium text-white">{portfolio.shares}</span>
                    </div>
                    <div className="bg-gray-950/50 p-2 rounded-lg border border-gray-800/50">
                      <span className="text-[10px] text-gray-500 uppercase block mb-1">Avg Cost</span>
                      <span className="text-lg font-mono font-medium text-gray-300">${portfolio.avgCost.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="bg-gray-950/50 p-3 rounded-lg border border-gray-800/50">
                     <span className="text-[10px] text-gray-500 uppercase block mb-1">Unrealized P/L</span>
                     <div className={`text-xl font-mono font-bold flex items-baseline gap-2 ${unrealizedPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                       <span>{unrealizedPL >= 0 ? '+' : ''}{unrealizedPL.toFixed(2)}</span>
                       <span className={`text-xs font-normal ${unrealizedPL >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                         ({unrealizedPLPercent.toFixed(2)}%)
                       </span>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* D. Reset / End */}
          {isMarketLoaded && (
            <button 
              onClick={handleReset}
              className="text-gray-500 hover:text-white text-xs flex justify-center items-center gap-1 py-2"
            >
              <ArrowPathIcon /> Reset Simulation
            </button>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;