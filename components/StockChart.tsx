import React from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
  Cell
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
  
  // Color configuration: Green for Up, Red for Down
  const color = isUp ? '#10b981' : '#ef4444'; 

  // Calculate pixel positions based on the Bar's allocated height (which corresponds to high - low)
  // Recharts Bar with dataKey={[low, high]} sets y to the 'high' value pixel, and height to the diff.
  const range = high - low;
  const ratio = range === 0 ? 0 : height / range;

  // Calculate Open and Close positions relative to High (y)
  // Note: SVG coordinate system, y increases downwards.
  const openOffset = (high - open) * ratio;
  const closeOffset = (high - close) * ratio;

  const bodyTop = y + Math.min(openOffset, closeOffset);
  const bodyHeight = Math.max(1, Math.abs(openOffset - closeOffset)); // Ensure at least 1px visibility

  return (
    <g>
      {/* Wick (High to Low) - Drawn in the center of the bar space */}
      <line 
        x1={x + width / 2} 
        y1={y} 
        x2={x + width / 2} 
        y2={y + height} 
        stroke={color} 
        strokeWidth={1.5} 
      />
      {/* Body (Open to Close) */}
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
  if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-500">No Data</div>;

  // Calculate domain with padding
  const minLow = Math.min(...data.map(d => d.low));
  const maxHigh = Math.max(...data.map(d => d.high));
  const domain = [minLow * 0.99, maxHigh * 1.01];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

        {/* Volume Bars at the bottom */}
        <YAxis yAxisId="volume" hide domain={[0, Math.max(...data.map(d => d.volume)) * 4]} />
        <Bar 
          dataKey="volume" 
          yAxisId="volume" 
          fill="#374151" 
          opacity={0.5} 
          barSize={4} 
          isAnimationActive={false}
        />

        {/* K-Line (Candlestick) */}
        {/* We use a Bar with a calculated range [low, high] to set the drawing area for each candle */}
        <Bar
          dataKey={(d) => [d.low, d.high]}
          shape={<CandleStickShape />}
          barSize={10} // Width of the candle body
          isAnimationActive={false}
        />

      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default StockChart;