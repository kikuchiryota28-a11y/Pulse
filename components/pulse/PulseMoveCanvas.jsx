'use client';

import React, { useState } from 'react';
import { VisualCanvas } from './VisualCanvas';
import { ChooseWidget } from './moves/ChooseWidget';
import { HoldToImpactButton } from '../ui/HoldToImpactButton';
import { ConsequenceOverlay } from './ConsequenceOverlay';

export const PulseMoveCanvas = ({ pulse, onSubmitMove }) => {
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConsequence, setShowConsequence] = useState(false);

  const currentState = pulse.current_state;
  const versionIndex = currentState?.version_index ?? 0;
  const biasRatio = currentState?.state_data?.bias_ratio ?? 50;

  const mockOptions = [
    {
      id: 'opt_darkness',
      label: 'DROWN IN DARKNESS',
      description: 'Shifts the reality bias -15% toward complete freeze.',
      delta: -15,
    },
    {
      id: 'opt_light',
      label: 'REIGNITE LIGHT',
      description: 'Shifts the reality bias +15% toward state explosion.',
      delta: 15,
    },
  ];

  const handleImpact = async () => {
    if (!selectedPayload || isSubmitting) return;

    setIsSubmitting(true);
    setShowConsequence(true);

    try {
      await onSubmitMove(selectedPayload);
    } catch (err) {
      console.error('Failed to submit move:', err);
    } finally {
      setTimeout(() => {
        setShowConsequence(false);
        setIsSubmitting(false);
      }, 1200);
    }
  };

  return (
    <div className="relative flex flex-col gap-6 w-full max-w-2xl mx-auto p-4 bg-[#0F0F10] text-zinc-100 font-sans min-h-screen">
      <ConsequenceOverlay isVisible={showConsequence} versionIndex={versionIndex + 1} />

      <VisualCanvas
        visualUrl={currentState?.state_data?.visual_url}
        versionIndex={versionIndex}
        biasRatio={biasRatio}
        recentContributorsCount={3}
      />

      <div className="flex flex-col gap-1 border-b border-zinc-800 pb-4">
        <h1 className="text-xl font-bold font-mono tracking-tight">{pulse.title}</h1>
        <p className="text-xs text-zinc-500 font-mono">
          CREATED BY @{pulse.author?.username ?? 'anonymous'}
        </p>
      </div>

      <ChooseWidget
        options={mockOptions}
        onChange={(payload) => setSelectedPayload(payload)}
      />

      <div className="mt-auto pt-4">
        <HoldToImpactButton
          onImpact={handleImpact}
          disabled={!selectedPayload || isSubmitting}
          label={isSubmitting ? 'MUTATING REALITY...' : 'HOLD TO IMPACT WORLD'}
        />
      </div>
    </div>
  );
};
