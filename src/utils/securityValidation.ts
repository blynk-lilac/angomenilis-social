// Security validation utilities

// Special emoji that shows black badge effect
const SPECIAL_EMOJI = '󱢏';

// Check if a string contains emojis (except the special one)
export function containsEmoji(text: string): boolean {
  // Remove the special allowed emoji first
  const cleanText = text.replace(new RegExp(SPECIAL_EMOJI, 'g'), '');
  
  // Emoji regex pattern
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu;
  
  return emojiRegex.test(cleanText);
}

// Validate username - no emojis except special one
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.trim().length === 0) {
    return { valid: false, error: 'Nome de usuário é obrigatório' };
  }
  
  if (username.length < 3) {
    return { valid: false, error: 'Nome de usuário deve ter pelo menos 3 caracteres' };
  }
  
  if (username.length > 30) {
    return { valid: false, error: 'Nome de usuário deve ter no máximo 30 caracteres' };
  }
  
  if (containsEmoji(username)) {
    return { valid: false, error: 'Emojis não são permitidos no nome de usuário' };
  }
  
  // Only allow alphanumeric, underscores, dots, and the special emoji
  const cleanUsername = username.replace(new RegExp(SPECIAL_EMOJI, 'g'), '');
  const validPattern = /^[a-zA-Z0-9._]+$/;
  
  if (!validPattern.test(cleanUsername)) {
    return { valid: false, error: 'Nome de usuário contém caracteres inválidos' };
  }
  
  return { valid: true };
}

// Validate display name - no emojis except special one
export function validateDisplayName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Nome é obrigatório' };
  }
  
  if (containsEmoji(name)) {
    return { valid: false, error: 'Emojis não são permitidos no nome' };
  }
  
  return { valid: true };
}

// Check for special emoji that shows badge effect
export function hasSpecialBadgeEmoji(text: string): boolean {
  return text.includes(SPECIAL_EMOJI);
}

// Get the special badge emoji
export function getSpecialBadgeEmoji(): string {
  return SPECIAL_EMOJI;
}

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Validate password strength
export function validatePassword(password: string): { valid: boolean; error?: string; strength: 'weak' | 'medium' | 'strong' } {
  if (password.length < 8) {
    return { valid: false, error: 'A senha deve ter pelo menos 8 caracteres', strength: 'weak' };
  }
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const strengthScore = [hasUppercase, hasLowercase, hasNumbers, hasSpecial].filter(Boolean).length;
  
  if (strengthScore < 2) {
    return { valid: false, error: 'Senha muito fraca. Use letras maiúsculas, minúsculas, números e símbolos.', strength: 'weak' };
  }
  
  if (strengthScore < 3) {
    return { valid: true, strength: 'medium' };
  }
  
  return { valid: true, strength: 'strong' };
}

// Rate limiting check for client-side
export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts: { [key: string]: number[] } = {};
  
  return {
    check: (key: string): boolean => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!attempts[key]) {
        attempts[key] = [];
      }
      
      // Remove old attempts
      attempts[key] = attempts[key].filter(time => time > windowStart);
      
      if (attempts[key].length >= maxAttempts) {
        return false; // Rate limited
      }
      
      attempts[key].push(now);
      return true;
    },
    
    reset: (key: string) => {
      delete attempts[key];
    }
  };
}

// Login rate limiter - 5 attempts per minute
export const loginRateLimiter = createRateLimiter(5, 60000);

// Action rate limiter - 30 attempts per minute
export const actionRateLimiter = createRateLimiter(30, 60000);
