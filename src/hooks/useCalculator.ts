import { useEffect, useState, useCallback } from 'react';
import { safeEvaluate } from '../utils/mathEngine';
import { storageGet, storageSet } from '../utils/storage';

const MAX_HISTORY = 200;

export type HistoryItem = {
    id: string;
    expression: string;
    result: string;
    time: number;
};

export default function useCalculator(storageKey = 'calc_history_v1') {
    const [expression, setExpression] = useState<string>('');
    const [result, setResult] = useState<string>('0');
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Load persisted history on mount
    useEffect(() => {
        storageGet<HistoryItem[]>(storageKey).then(saved => {
            if (Array.isArray(saved)) setHistory(saved);
        });
    }, []);

    // Live-evaluate as user types; never throw into React render
    useEffect(() => {
        try {
            const { value } = safeEvaluate(expression);
            if (value) setResult(value);
        } catch {
            // silent — display keeps previous valid result
        }
    }, [expression]);

    const persistHistory = useCallback(async (items: HistoryItem[]) => {
        setHistory(items);
        await storageSet(storageKey, items);
    }, []);

    const input = useCallback((value: string) => {
        try {
            if (!value) return;
            setExpression(prev => {
                // prevent consecutive decimal points in the same number segment
                if (value === '.' && /\.$/.test(prev)) return prev;
                return prev + value;
            });
        } catch {
            // ignore
        }
    }, []);

    const inputOperator = useCallback((op: string) => {
        try {
            if (!op) return;
            setExpression(prev => {
                if (!prev) return prev;
                // replace trailing operator instead of stacking
                if (/[+\-×÷/*^]$/.test(prev)) {
                    return prev.slice(0, -1) + op;
                }
                return prev + op;
            });
        } catch {
            // ignore
        }
    }, []);

    const clearEntry = useCallback(() => {
        try {
            setExpression('');
            setResult('0');
        } catch {
            // ignore
        }
    }, []);

    const backspace = useCallback(() => {
        try {
            setExpression(prev => (prev.length > 0 ? prev.slice(0, -1) : prev));
        } catch {
            // ignore
        }
    }, []);

    const toggleSign = useCallback(() => {
        try {
            setExpression(prev => {
                if (!prev) return prev;
                const match = prev.match(/(.*?)([-]?\d+\.?\d*)$/);
                if (!match) return prev;
                const [, prefix, num] = match;
                return num.startsWith('-')
                    ? (prefix ?? '') + num.slice(1)
                    : (prefix ?? '') + '-' + num;
            });
        } catch {
            // ignore
        }
    }, []);

    const evaluateExpression = useCallback(async (): Promise<string> => {
        try {
            const { value, error } = safeEvaluate(expression);

            if (error || !value) {
                setResult('Error');
                return 'Error';
            }

            const item: HistoryItem = {
                id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
                expression,
                result: value,
                time: Date.now(),
            };

            const updated = [item, ...history].slice(0, MAX_HISTORY);
            await persistHistory(updated);

            setExpression(value);
            setResult(value);
            return value;
        } catch {
            setResult('Error');
            return 'Error';
        }
    }, [expression, history, persistHistory]);

    const loadFromHistory = useCallback((item: HistoryItem) => {
        try {
            setExpression(item.expression ?? '');
            setResult(item.result ?? '0');
        } catch {
            // ignore
        }
    }, []);

    const clearHistory = useCallback(async () => {
        try {
            await persistHistory([]);
        } catch {
            setHistory([]);
        }
    }, [persistHistory]);

    return {
        expression,
        result,
        history,
        input,
        inputOperator,
        clearEntry,
        backspace,
        toggleSign,
        evaluateExpression,
        loadFromHistory,
        clearHistory,
    } as const;
}
