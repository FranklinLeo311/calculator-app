import type { ButtonVariant } from '../components/Button';

export type ButtonKind =
    | 'input'
    | 'operator'
    | 'clearEntry'
    | 'backspace'
    | 'toggleSign'
    | 'evaluate';

export type ButtonDef = {
    label: string;
    kind: ButtonKind;
    value?: string;
    variant: ButtonVariant;
    flex?: number;
};

export type ButtonRow = ButtonDef[];
export type ButtonLayout = ButtonRow[];

// Classic 4-column layout — every row has exactly 4 equal-width cells
export const STANDARD_LAYOUT: ButtonLayout = [
    [
        { label: 'AC',  kind: 'clearEntry',  variant: 'clear' },
        { label: '⌫',   kind: 'backspace',   variant: 'backspace' },
        { label: '%',   kind: 'input',       value: '%',  variant: 'number' },
        { label: '÷',   kind: 'operator',    value: '÷',  variant: 'operator' },
    ],
    [
        { label: '7', kind: 'input', value: '7', variant: 'number' },
        { label: '8', kind: 'input', value: '8', variant: 'number' },
        { label: '9', kind: 'input', value: '9', variant: 'number' },
        { label: '×', kind: 'operator', value: '×', variant: 'operator' },
    ],
    [
        { label: '4', kind: 'input', value: '4', variant: 'number' },
        { label: '5', kind: 'input', value: '5', variant: 'number' },
        { label: '6', kind: 'input', value: '6', variant: 'number' },
        { label: '-', kind: 'operator', value: '-', variant: 'operator' },
    ],
    [
        { label: '1', kind: 'input', value: '1', variant: 'number' },
        { label: '2', kind: 'input', value: '2', variant: 'number' },
        { label: '3', kind: 'input', value: '3', variant: 'number' },
        { label: '+', kind: 'operator', value: '+', variant: 'operator' },
    ],
    [
        { label: '+/-', kind: 'toggleSign',  variant: 'number' },
        { label: '0',   kind: 'input',       value: '0', variant: 'number' },
        { label: '.',   kind: 'input',       value: '.', variant: 'number' },
        { label: '=',   kind: 'evaluate',    variant: 'equals' },
    ],
];

export const SCIENTIFIC_LAYOUT: ButtonLayout = [
    [
        { label: 'sin', kind: 'input', value: 'sin(', variant: 'scientific' },
        { label: 'cos', kind: 'input', value: 'cos(', variant: 'scientific' },
        { label: 'tan', kind: 'input', value: 'tan(', variant: 'scientific' },
        { label: 'π',   kind: 'input', value: 'π',    variant: 'scientific' },
    ],
    [
        { label: 'ln',  kind: 'input',    value: 'ln(',  variant: 'scientific' },
        { label: 'log', kind: 'input',    value: 'log(', variant: 'scientific' },
        { label: 'x^y', kind: 'operator', value: '^',    variant: 'scientific' },
        { label: 'e',   kind: 'input',    value: 'e',    variant: 'scientific' },
    ],
    [
        { label: '(',  kind: 'input', value: '(',     variant: 'number' },
        { label: ')',  kind: 'input', value: ')',     variant: 'number' },
        { label: '√',  kind: 'input', value: 'sqrt(', variant: 'scientific' },
        { label: '^2', kind: 'input', value: '^2',    variant: 'scientific' },
    ],
    [
        { label: '⌫',  kind: 'backspace', variant: 'backspace' },
        { label: 'AC', kind: 'clearEntry', variant: 'clear' },
        { label: '%',  kind: 'input', value: '%', variant: 'number' },
        { label: '=',  kind: 'evaluate',  variant: 'equals' },
    ],
];
