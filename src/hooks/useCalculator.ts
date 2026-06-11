import { useEffect, useState, useCallback } from 'react';
import { safeEvaluate } from '../utils/mathEngine';
import { storageGet, storageSet } from '../utils/storage';

const MAX_HISTORY = 50;

export type HistoryItem = {
    id: string;
    expression: string;
    result: string;
    time: number;
};

export default function useCalculator(storageKey = 'calc_history_v1') {
    const [expression, setExpression] = useState<string>('');
    const [result, setResult]         = useState<string>('0');
    const [history, setHistory]       = useState<HistoryItem[]>([]);

    // Load persisted history once on mount
    useEffect(() => {
        storageGet<HistoryItem[]>(storageKey).then(saved => {
            if (Array.isArray(saved)) setHistory(saved);
        });
    }, [storageKey]);

    // Live-evaluate as user types — synchronous, no await
    useEffect(() => {
        if (!expression) { setResult('0'); return; }
        try {
            const { value } = safeEvaluate(expression);
            if (value) setResult(value);
        } catch {}
    }, [expression]);

    const input = useCallback((value: string) => {
        if (!value) return;
        setExpression(prev => {
            if (value === '.' && /\.$/.test(prev)) return prev;
            return prev + value;
        });
    }, []);

    const inputOperator = useCallback((op: string) => {
        if (!op) return;
        setExpression(prev => {
            if (!prev) return prev;
            if (/[+\-×÷/*^]$/.test(prev)) return prev.slice(0, -1) + op;
            return prev + op;
        });
    }, []);

    const clearEntry = useCallback(() => {
        setExpression('');
        setResult('0');
    }, []);

    const backspace = useCallback(() => {
        setExpression(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
    }, []);

    const toggleSign = useCallback(() => {
        setExpression(prev => {
            if (!prev) return prev;
            const match = prev.match(/(.*?)([-]?\d+\.?\d*)$/);
            if (!match) return prev;
            const [, prefix, num] = match;
            return num.startsWith('-')
                ? (prefix ?? '') + num.slice(1)
                : (prefix ?? '') + '-' + num;
        });
    }, []);

    const evaluateExpression = useCallback(() => {
        try {
            const { value, error } = safeEvaluate(expression);
            if (error || !value) { setResult('Error'); return; }

            const item: HistoryItem = {
                id: `${Date.now()}`,
                expression,
                result: value,
                time: Date.now(),
            };

            const updated = [item, ...history].slice(0, MAX_HISTORY);

            // Update UI immediately — no await
            setHistory(updated);
            setExpression(value);
            setResult(value);

            // Persist in background — does not block UI
            storageSet(storageKey, updated).catch(() => {});
        } catch {
            setResult('Error');
        }
    }, [expression, history, storageKey]);

    const loadFromHistory = useCallback((item: HistoryItem) => {
        setExpression(item.expression ?? '');
        setResult(item.result ?? '0');
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        storageSet(storageKey, []).catch(() => {});
    }, [storageKey]);

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
