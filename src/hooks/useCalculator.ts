import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluate } from 'mathjs';

const HISTORY_KEY = 'calc_history_v1';

export type HistoryItem = { id: string; expression: string; result: string; time: number };

export default function useCalculator() {
    const [expression, setExpression] = useState<string>('');
    const [result, setResult] = useState<string>('0');
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        try {
            const res = safeEvaluate(expression);
            setResult(res);
        } catch (e) {
            setResult('');
        }
    }, [expression]);

    async function loadHistory() {
        try {
            const raw = await AsyncStorage.getItem(HISTORY_KEY);
            if (raw) setHistory(JSON.parse(raw));
        } catch (e) {
            // ignore
        }
    }

    async function saveHistory(items: HistoryItem[]) {
        try {
            setHistory(items);
            await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(items));
        } catch (err) {
            console.log('AsyncStorage error:', err);
        }
    }

    function safeEvaluate(expr: string) {
        if (!expr) return '0';
        // normalize operators
        const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi');
        // convert trailing % by replacing n% with (n/100)
        const percentNormalized = normalized.replace(/(\d+\.?\d*)%/g, '($1/100)');
        const raw = evaluate(percentNormalized);
        if (typeof raw === 'number') {
            return formatNumber(raw);
        }
        return String(raw);
    }

    function formatNumber(n: number) {
        const rounded = Math.round((n + Number.EPSILON) * 1e12) / 1e12;
        return String(rounded);
    }

    function input(value: string) {
        // prevent invalid sequence
        if (value === '.' && /\.$/.test(expression)) return;
        setExpression(prev => prev + value);
    }

    function inputOperator(op: string) {
        if (!expression) return;
        // avoid double operators
        if (/[+\-×÷/*^]$/.test(expression)) {
            setExpression(prev => prev.slice(0, -1) + op);
        } else {
            setExpression(prev => prev + op);
        }
    }

    function clearEntry() {
        setExpression('');
        setResult('0');
    }

    function backspace() {
        setExpression(prev => prev.slice(0, -1));
    }

    function toggleSign() {
        if (!expression) return;
        // naive: toggle sign of last number
        const m = expression.match(/(.*?)([-]?\d+\.?\d*)$/);
        if (m) {
            const prefix = m[1] || '';
            const num = m[2];
            if (num.startsWith('-')) {
                setExpression(prefix + num.slice(1));
            } else {
                setExpression(prefix + '-' + num);
            }
        }
    }

    async function evaluateExpression() {
        try {
            const res = safeEvaluate(expression);
            const item: HistoryItem = { id: String(Date.now()), expression, result: res, time: Date.now() };
            const newHistory = [item, ...history].slice(0, 200);
            await saveHistory(newHistory);
            setExpression(res);
            setResult(res);
            return res;
        } catch (e) {
            console.log('Evaluate error:', e);
            setResult('Error');
            return 'Error';
        }
    }

    function loadFromHistory(item: HistoryItem) {
        setExpression(item.expression);
        setResult(item.result);
    }

    function clearHistory() {
        saveHistory([]);
    }

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
        clearHistory
    } as const;
}
