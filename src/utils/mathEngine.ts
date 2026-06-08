import { evaluate } from 'mathjs';

// Only characters produced by calculator buttons are allowed.
const ALLOWED_PATTERN = /^[0-9+\-*/^().%πe,\s]*(sin|cos|tan|sqrt|ln|log|abs|ceil|floor|round|pi)?[0-9+\-*/^().%πe,\s]*$/;

export type EvalResult = { value: string; error: string | null };

function normalize(expr: string): string {
    return expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'pi')
        .replace(/(\d+\.?\d*)%/g, '($1/100)');
}

function formatNumber(n: number): string {
    if (!isFinite(n) || isNaN(n)) return 'Error';
    const rounded = Math.round((n + Number.EPSILON) * 1e12) / 1e12;
    return String(rounded);
}

function isValidExpr(expr: string): boolean {
    // Normalize first so × ÷ π are converted before pattern matching
    const normalized = normalize(expr);
    const stripped = normalized
        .replace(/sin|cos|tan|sqrt|ln|log|abs|ceil|floor|round|pi/g, '');
    return ALLOWED_PATTERN.test(stripped);
}

export function safeEvaluate(expr: string): EvalResult {
    if (!expr || expr.trim() === '') return { value: '0', error: null };

    try {
        if (!isValidExpr(expr)) {
            return { value: 'Error', error: 'Invalid expression' };
        }

        const normalized = normalize(expr);

        // Empty scope {} prevents variable injection between evaluations
        const raw = evaluate(normalized, {});

        if (typeof raw === 'number') {
            return { value: formatNumber(raw), error: null };
        }

        // mathjs can return complex numbers or unit objects — coerce safely
        if (raw !== null && raw !== undefined && typeof raw.toNumber === 'function') {
            const num = raw.toNumber();
            return { value: formatNumber(num), error: null };
        }

        if (raw !== null && raw !== undefined) {
            return { value: String(raw), error: null };
        }

        return { value: 'Error', error: 'Unexpected result' };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Calculation error';
        return { value: '', error: message };
    }
}
