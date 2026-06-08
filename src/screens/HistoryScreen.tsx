import React from 'react';
import GradientBackground from '../components/GradientBackground';
import HistoryPanel from '../components/HistoryPanel';
import type { HistoryItem } from '../hooks/useCalculator';

type Props = {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
    onClear: () => void;
};

export default function HistoryScreen({ history, onSelect, onClear }: Props) {
    return (
        <GradientBackground>
            <HistoryPanel items={history} onSelect={onSelect} onClear={onClear} />
        </GradientBackground>
    );
}
