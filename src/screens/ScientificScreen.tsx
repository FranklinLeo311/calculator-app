import React from 'react';
import GradientBackground from '../components/GradientBackground';
import Display from '../components/Display';
import ButtonGrid from '../components/ButtonGrid';
import { SCIENTIFIC_LAYOUT } from '../config/buttonLayouts';
import type { CalcActions } from '../components/ButtonGrid';

type Props = {
    expression: string;
    result: string;
    actions: CalcActions;
};

export default function ScientificScreen({ expression, result, actions }: Props) {
    return (
        <GradientBackground>
            <Display formula={expression} result={result} />
            <ButtonGrid layout={SCIENTIFIC_LAYOUT} actions={actions} />
        </GradientBackground>
    );
}
