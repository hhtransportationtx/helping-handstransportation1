let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function playLoudNotificationSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator1.frequency.value = 880;
    oscillator2.frequency.value = 1000;
    oscillator1.type = 'square';
    oscillator2.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, now);

    oscillator1.start(now);
    oscillator2.start(now);

    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    oscillator1.stop(now + 0.15);
    oscillator2.stop(now + 0.15);

    setTimeout(() => {
      const osc1_2 = ctx.createOscillator();
      const osc2_2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc1_2.connect(gain2);
      osc2_2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1_2.frequency.value = 1000;
      osc2_2.frequency.value = 880;
      osc1_2.type = 'square';
      osc2_2.type = 'sine';

      const now2 = ctx.currentTime;
      gain2.gain.setValueAtTime(0.3, now2);

      osc1_2.start(now2);
      osc2_2.start(now2);

      gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.15);
      osc1_2.stop(now2 + 0.15);
      osc2_2.stop(now2 + 0.15);
    }, 150);

    setTimeout(() => {
      const osc1_3 = ctx.createOscillator();
      const osc2_3 = ctx.createOscillator();
      const gain3 = ctx.createGain();

      osc1_3.connect(gain3);
      osc2_3.connect(gain3);
      gain3.connect(ctx.destination);

      osc1_3.frequency.value = 880;
      osc2_3.frequency.value = 1000;
      osc1_3.type = 'square';
      osc2_3.type = 'sine';

      const now3 = ctx.currentTime;
      gain3.gain.setValueAtTime(0.3, now3);

      osc1_3.start(now3);
      osc2_3.start(now3);

      gain3.gain.exponentialRampToValueAtTime(0.01, now3 + 0.3);
      osc1_3.stop(now3 + 0.3);
      osc2_3.stop(now3 + 0.3);
    }, 300);

  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

export function playUrgentAlertSound() {
  try {
    const ctx = getAudioContext();

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const now = ctx.currentTime;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 1200;
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);
      }, i * 200);
    }
  } catch (error) {
    console.error('Error playing urgent alert sound:', error);
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function showBrowserNotification(title: string, body: string, options?: NotificationOptions) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      requireInteraction: true,
      ...options,
    });

    playUrgentAlertSound();

    return notification;
  }
  return null;
}
