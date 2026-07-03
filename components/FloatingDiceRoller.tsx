import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DiceRollerState, runDiceRollerCommand } from '../utils/diceRoller';

type Position = {
  x: number;
  y: number;
};

const INITIAL_OFFSET = 28;
const BUTTON_SIZE = 56;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 460;
const STORAGE_KEY = 'dnd_floating_dice_roller';

const initialState: DiceRollerState = {
  history: [],
  inputHistory: [],
  macros: {},
};

export const FloatingDiceRoller: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<Position>(() => getInitialPosition(BUTTON_SIZE, BUTTON_SIZE));
  const [state, setState] = useState<DiceRollerState>(() => loadState());
  const [input, setInput] = useState('');
  const [inputHistoryIndex, setInputHistoryIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ pointerId: number; dx: number; dy: number; moved: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const size = useMemo(() => (
    isOpen
      ? { width: Math.min(PANEL_WIDTH, window.innerWidth - INITIAL_OFFSET * 2), height: Math.min(PANEL_HEIGHT, window.innerHeight - INITIAL_OFFSET * 2) }
      : { width: BUTTON_SIZE, height: BUTTON_SIZE }
  ), [isOpen]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      history: state.history.slice(0, 100),
      inputHistory: state.inputHistory.slice(0, 100),
      macros: state.macros,
    }));
  }, [state]);

  useEffect(() => {
    setPosition(prev => clampPosition(prev, size.width, size.height));
  }, [size.width, size.height]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  const resetPosition = () => {
    setPosition(getInitialPosition(size.width, size.height));
  };

  const clearHistory = () => {
    setState(prev => ({ ...prev, history: [] }));
  };

  const submit = () => {
    const nextInput = input.trim();
    if (!nextInput) return;
    setState(prev => runDiceRollerCommand(nextInput, prev));
    setInput('');
    setInputHistoryIndex(-1);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    const target = event.target as HTMLElement;
    if (isOpen && target.closest('input,button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      dx: event.clientX - position.x,
      dy: event.clientY - position.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const next = clampPosition({
      x: event.clientX - drag.dx,
      y: event.clientY - drag.dy,
    }, size.width, size.height);
    if (Math.abs(next.x - position.x) + Math.abs(next.y - position.y) > 3) drag.moved = true;
    setPosition(next);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    if (!isOpen && drag && !drag.moved) {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex = Math.min(inputHistoryIndex + 1, state.inputHistory.length - 1);
      if (nextIndex >= 0) {
        setInputHistoryIndex(nextIndex);
        setInput(state.inputHistory[nextIndex]);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = inputHistoryIndex - 1;
      setInputHistoryIndex(nextIndex);
      setInput(nextIndex >= 0 ? state.inputHistory[nextIndex] : '');
    }
  };

  return (
    <div
      role={isOpen ? 'dialog' : 'button'}
      aria-label={isOpen ? '骰子工具' : '打开骰子工具'}
      tabIndex={isOpen ? -1 : 0}
      className={`fixed z-[60] flex overflow-hidden border shadow-xl transition-[width,height,border-radius,background-color,box-shadow,transform] duration-200 ${
        isOpen
          ? 'flex-col rounded-xl border-gray-300 bg-white shadow-2xl'
          : 'h-14 w-14 items-center justify-center rounded-full border-red-900 bg-dnd-red text-xl font-bold text-white hover:scale-105'
      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ left: position.x, top: position.y, width: size.width, height: size.height, touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={event => {
        if (!isOpen && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          setIsOpen(true);
        }
      }}
    >
      {!isOpen ? 'd20' : (
        <>
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs font-bold uppercase text-gray-500">Dice Roller</div>
            <div className="flex items-center gap-2">
              <button type="button" className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white" onClick={resetPosition}>复位</button>
              <button type="button" className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white" onClick={clearHistory}>清空</button>
              <button type="button" className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-white" onClick={() => setIsOpen(false)}>关闭</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {state.history.length === 0 ? (
              <div className="text-sm text-gray-400">输入 /help 查看骰子语法。</div>
            ) : (
              <div className="flex flex-col gap-2">
                {state.history.map(entry => (
                  <div key={entry.id} className="rounded border border-gray-200 bg-gray-50 p-2 text-sm">
                    <div className="break-words font-mono text-xs text-gray-500">{entry.input}</div>
                    <div className="mt-1 font-bold text-gray-900">{entry.output}</div>
                    {entry.detail && <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-gray-600">{entry.detail}</pre>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 p-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-dnd-red"
                placeholder="Fireball: 8d6"
              />
              <button type="button" className="rounded bg-dnd-red px-3 py-2 text-sm font-bold text-white hover:bg-red-900" onClick={submit}>
                Roll
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function getInitialPosition(width: number, height: number): Position {
  if (typeof window === 'undefined') return { x: INITIAL_OFFSET, y: INITIAL_OFFSET };
  return {
    x: Math.max(INITIAL_OFFSET, window.innerWidth - width - INITIAL_OFFSET),
    y: Math.max(INITIAL_OFFSET, window.innerHeight - height - INITIAL_OFFSET),
  };
}

function clampPosition(position: Position, width: number, height: number): Position {
  if (typeof window === 'undefined') return position;
  return {
    x: Math.min(Math.max(INITIAL_OFFSET, position.x), Math.max(INITIAL_OFFSET, window.innerWidth - width - INITIAL_OFFSET)),
    y: Math.min(Math.max(INITIAL_OFFSET, position.y), Math.max(INITIAL_OFFSET, window.innerHeight - height - INITIAL_OFFSET)),
  };
}

function loadState(): DiceRollerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState;
    const parsed = JSON.parse(saved) as Partial<DiceRollerState>;
    return {
      history: Array.isArray(parsed.history) ? parsed.history : [],
      inputHistory: Array.isArray(parsed.inputHistory) ? parsed.inputHistory : [],
      macros: parsed.macros && typeof parsed.macros === 'object' ? parsed.macros : {},
    };
  } catch {
    return initialState;
  }
}
