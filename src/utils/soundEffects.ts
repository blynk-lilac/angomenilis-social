// Sound effects for interactions - uses existing notification.mp3 for click

const likeSound = new Audio('/sounds/like.mp3');
const clickSound = new Audio('/sounds/notification.mp3');

// Pre-load sounds
likeSound.volume = 0.4;
clickSound.volume = 0.2;

export const playLikeSound = () => {
  try {
    likeSound.currentTime = 0;
    likeSound.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors
  }
};

export const playClickSound = () => {
  try {
    clickSound.currentTime = 0;
    clickSound.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors
  }
};

export const playSound = (type: 'like' | 'click' | 'notification') => {
  switch (type) {
    case 'like':
      playLikeSound();
      break;
    case 'click':
      playClickSound();
      break;
    case 'notification':
      const notifSound = new Audio('/sounds/notification.mp3');
      notifSound.volume = 0.6;
      notifSound.play().catch(() => {});
      break;
  }
};
