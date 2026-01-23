import React, { useState, useEffect, useCallback } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Bar,
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
  // Use a ref to track if we're "locked" to the end (auto-scroll)
  // When user drags back, we unlock. When they drag to end, we lock again.
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [viewEndIndex, setViewEndIndex] = useState(0);

  // Zoom State
  const [visibleCandles, setVisibleCandles] = useState(60);
  const MIN_CANDLES = 10;
  const MAX_CANDLES = 300; // Increase max zoom out

  // --- 1. Update View on Data Change (Auto-Scroll) ---
  useEffect(() => {
    if (data.length === 0) return;

    if (isAutoScroll) {
      // If locked to end, always jump to the latest data point
      setViewEndIndex(data.length - 1);
    } else {
      setViewEndIndex(prev => Math.min(prev, data.length - 1));
    }
  }, [data.length, isAutoScroll]);


  // --- 2. Calculate displayed range ---
  const endIndex = Math.min(data.length - 1, Math.max(0, viewEndIndex));
  const startIndex = Math.max(0, endIndex - visibleCandles);
  const displayedData = data.slice(startIndex, endIndex + 1);

  // --- 3. Zoom Logic (Wheel) ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation(); // Try to prevent bubbling if it helps

    const delta = e.deltaY;
    if (delta === 0) return;

    setVisibleCandles(prev => {
      // Zoom step: 10% of current or min 1
      const step = Math.max(1, Math.floor(prev * 0.1));
      // Delta > 0 (Scroll Down) -> Zoom Out (Increase candles)
      // Delta < 0 (Scroll Up) -> Zoom In (Decrease candles)
      let next = delta > 0 ? prev + step : prev - step;
      return Math.max(MIN_CANDLES, Math.min(MAX_CANDLES, next));
    });
  }, []);

  // --- 4. Drag / Swipe Logic (Pan) ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartIndexAtStart, setDragStartIndexAtStart] = useState(0);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Check if it's touch or mouse
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setIsDragging(true);
    setDragStartX(clientX);
    setDragStartIndexAtStart(endIndex);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const diff = clientX - dragStartX;

    // Dynamic Sensitivity based on Zoom Level
    // sensitivityFactor = visibleCandles / 800 (assuming 800px chart width)
    const sensitivityFactor = visibleCandles / 800;
    const candleShift = Math.round(diff * sensitivityFactor * 1.5);

    if (candleShift === 0) return;

    // Drag right (positive diff) -> Move view left (see past) -> Decrease index
    let newEndIndex = dragStartIndexAtStart - candleShift;

    // Clamping
    newEndIndex = Math.max(visibleCandles, Math.min(data.length - 1, newEndIndex));

    // Auto-scroll logic: If we are at the very end, enable auto-scroll. Else disable.
    if (newEndIndex >= data.length - 1) {
      setIsAutoScroll(true);
    } else {
      setIsAutoScroll(false);
    }

    setViewEndIndex(newEndIndex);
  }, [isDragging, dragStartX, dragStartIndexAtStart, data.length, visibleCandles]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle global mouse up to catch drags that go outside container
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove as any, { passive: false });
    } else {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
    }
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove as any);
    }
  }, [isDragging, handleMouseMove]);


  if (data.length === 0) return <div className="h-full flex items-center justify-center text-gray-500">No Data</div>;

  // Calculate domain
  const minLow = Math.min(...displayedData.map(d => d.low));
  const maxHigh = Math.max(...displayedData.map(d => d.high));
  const domain = [minLow * 0.99, maxHigh * 1.01];

  return (
    <div
      className={`w-full h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onWheel={handleWheel}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={displayedData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.5} />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(val) => val.slice(5)}
            minTickGap={35}
            allowDuplicatedCategory={false}
          />
          <YAxis
            domain={domain}
            stroke="#6b7280"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            width={45}
            tickFormatter={(val) => val.toFixed(0)}
            allowDataOverflow={true}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#4b5563', strokeDasharray: '4 4' }} />

          <YAxis yAxisId="volume" hide domain={[0, Math.max(...displayedData.map(d => d.volume)) * 4]} />
          <Bar
            dataKey="volume"
            yAxisId="volume"
            fill="#374151"
            opacity={0.5}
            isAnimationActive={false}
          />

          <Bar
            dataKey={(d) => [d.low, d.high]}
            shape={<CandleStickShape />}
            isAnimationActive={false}
          />

        </ComposedChart>
      </ResponsiveContainer>

      {!isAutoScroll && (
        <div className="absolute bottom-2 right-12 bg-gray-800 text-xs text-blue-300 px-2 py-1 rounded opacity-75 pointer-events-none">
          Viewing History
        </div>
      )}
    </div>
  );
};

export default StockChart;