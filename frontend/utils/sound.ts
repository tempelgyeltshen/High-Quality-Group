type SoundType = 'beep' | 'employee' | 'success' | 'error';

export function playSound(type: SoundType) {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    switch (type) {
      case 'beep':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
        break;

      case 'employee':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08);
        osc.stop(audioCtx.currentTime + 0.25);
        break;

      case 'success':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime + 0.2);
        osc.stop(audioCtx.currentTime + 0.4);
        break;

      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
        break;
    }
  } catch {
    // AudioContext blocked — silent fallback
  }
}
