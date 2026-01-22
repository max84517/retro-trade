import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  Brush
} from 'recharts';
import { OHLC } from '../types';

interface StockChartProps {
  data: OHLC[];
}

// Custom Shape for Candlestick (K-Line)
const CandleStickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  
  // Color configuration
  const color = isUp ? '#10b981' : '#ef4444'; 

  const range = high - low;
  const ratio = range === 0 ? 0 : height / range;

  const openOffset = (high - open) * ratio;
  const closeOffset = (high - close) * ratio;

  const bodyTop = y + Math.min(openOffset, closeOffset);
  const bodyHeight = Math.max(1, Math.abs(openOffset - closeOffset));

  return (
    <g>
      <line 
        x1={x + width / 2} 
        y1={y} 
        x2={x + width / 2} 
        y2={y + height} 
        stroke={color} 
        strokeWidth={1.5} 
      />
      <rect 
        x={x} 
        y={bodyTop} 
        width={width} 
        height={bodyHeight} 
        fill={color} 
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const isUp = d.close >= d.open;
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded shadow-xl text-xs md:text-sm z-50">
        <p className="font-bold text-gray-300 mb-2">{d.date}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
          <p className="text-gray-500">Open</p>
          <p className="text-gray-200 text-right">{d.open.toFixed(2)}</p>
          
          <p className="text-gray-500">High</p>
          <p className="text-gray-200 text-right">{d.high.toFixed(2)}</p>
          
          <p className="text-gray-500">Low</p>
          <p className="text-gray-200 text-right">{d.low.toFixed(2)}</p>
          
          <p className="text-gray-500">Close</p>
          <p className={`${isUp ? 'text-emerald-400' : 'text-red-400'} text-right`}>{d.close.toFixed(2)}</p>
          
          <div className="col-span-2 border-t border-gray-800 my-1"></div>
          
          <p className="text-gray-500">Vol</p>
          <p className="text-gray-400 text-right">{(d.volume / 1000).toFixed(0)}k</p>
        </div>
      </div>
    );
  }
  return null;
};

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  const [range, setRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Sync range with data updates (Auto-scroll behavior)
  useEffect(() => {
    if (data.length === 0) return;

    setRange((prev) => {
      // If we don't have a range yet, show everything (or last N items if desired)
      if (!prev) {
        return { startIndex: 0, endIndex: data.length - 1 };
      }
      
      // If user was looking at the very end (latest data), keep looking at the end as data grows
      const wasAtEnd = prev.endIndex === (data.length - 2) || prev.endIndex === (data.length - 1); // tolerance of 1
      
      if (wasAtEnd) {
        // Shift window to follow the new data
        const windowSize = prev.endIndex - prev.startIndex;
        return {
          startIndex: Math.max(0, data.length - 1 - windowSize),
          endIndex: data.length - 1
        };
      }
      
      // Otherwise, keep the current index view (don't force scroll if user is looking at history)
      return prev;
    });
  }, [data.length]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!data.length || !range) return;

    // Prevent page scrolling when hovering chart
    // Note: In React synthetic events, we might not be able to prevent default for wheel in all browsers cleanly 
    // without using a ref and native listener, but usually the chart captures focus.
    
    // Determine scroll direction
    // DeltaY > 0 means scroll down (usually implies "Next" or "Right" in timelines)
    // DeltaY < 0 means scroll up (usually implies "Prev" or "Left" in timelines)
    const direction = e.deltaY > 0 ? 1 : -1;
    const speed = Math.max(1, Math.floor((range.endIndex - range.startIndex) / 20)); // Adaptive speed
    const shift = direction * speed;

    setRange((prev) => {
      if (!prev) return null;
      let newStart = prev.startIndex + shift;
      let newEnd = prev.endIndex + shift;

      // Boundary checks
      if (newEnd >= data.length) {
        const diff = newEnd - (data.length - 1);
        newEnd = data.length - 1;
        newStart = Math.max(0, newStart - diff); // Try to maintain window size
      }
      if (newStart < 0) {
        const diff = 0 - newStart;
        newStart = 0;
        newEnd = Math.min(data.length - 1, newEnd + diff);
      }
      
      // Safety check to ensure window didn't collapse
      if (newEnd <= newStart) return prev;

      return { startIndex: newStart, endIndex: newEnd };
    });
  }, [data.length, range]);

  if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-500">No Data</div>;

  // Calculate domain
  const minLow = Math.min(...data.map(d => d.low));
  const maxHigh = Math.max(...data.map(d => d.high));
  const domain = [minLow * 0.99, maxHigh * 1.01];

  return (
    <div className="w-full h-full" onWheel={handleWheel}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280" 
            tick={{fontSize: 10, fill: '#9ca3af'}} 
            tickFormatter={(val) => val.slice(5)} 
            minTickGap={35}
          />
          <YAxis 
            domain={domain} 
            stroke="#6b7280" 
            tick={{fontSize: 10, fill: '#9ca3af'}}
            width={45}
            tickFormatter={(val) => val.toFixed(0)}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeDasharray: '4 4' }} />

          <YAxis yAxisId="volume" hide domain={[0, Math.max(...data.map(d => d.volume)) * 4]} />
          <Bar 
            dataKey="volume" 
            yAxisId="volume" 
            fill="#374151" 
            opacity={0.5} 
            // Remove fixed barSize to allow auto-scaling width
            maxBarSize={50} // Limit max width so they don't look ridiculous when data is sparse
            isAnimationActive={false}
          />

          <Bar
            dataKey={(d) => [d.low, d.high]}
            shape={<CandleStickShape />}
            // Remove fixed barSize={10} to allow candles to get wider
            maxBarSize={40} // Limit max width
            isAnimationActive={false}
          />
          
          <Brush 
            dataKey="date" 
            height={30} 
            stroke="#4b5563" 
            fill="#1f2937" 
            tickFormatter={(val) => val.slice(5)}
            travellerWidth={10}
            startIndex={range?.startIndex}
            endIndex={range?.endIndex}
            onChange={(newIndex) => {
              if (newIndex.startIndex !== undefined && newIndex.endIndex !== undefined) {
                setRange({ startIndex: newIndex.startIndex, endIndex: newIndex.endIndex });
              }
            }}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;