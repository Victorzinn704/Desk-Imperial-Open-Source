'use client'

/**
 * Utilitário de vibração háptica para ações mobile.
 * Usa a Vibration API (suportada em Android Chrome e parcialmente em iOS 16.4+).
 * Silenciosamente não faz nada em browsers sem suporte.
 */
export const haptic = {
  /** Toque leve — seleção, toggle, navegação */
  light() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  },

  /** Toque médio — confirmação, ação concluída */
  medium() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25)
    }
  },

  /** Toque forte — erro, ação destrutiva, alerta */
  heavy() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([30, 50, 30])
    }
  },

  /** Padrão de sucesso — dupla vibração curta */
  success() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([15, 80, 15])
    }
  },

  /** Padrão de erro — vibração longa */
  error() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(100)
    }
  },
}
