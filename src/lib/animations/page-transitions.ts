import { Variants } from 'framer-motion'

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02
  }
}

export const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
}

// Sidebar animation variants
export const sidebarVariants: Variants = {
  closed: {
    x: '-100%',
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut'
    }
  },
  open: {
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeInOut'
    }
  }
}

// Stagger children animation
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
}

export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'tween',
      duration: 0.4,
      ease: 'easeOut'
    }
  }
}

// Card hover animations
export const cardHoverVariants: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
  },
  hover: {
    scale: 1.02,
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: 'easeOut'
    }
  }
}

// Button hover animations
export const buttonHoverVariants: Variants = {
  initial: {
    scale: 1
  },
  hover: {
    scale: 1.05,
    transition: {
      type: 'tween',
      duration: 0.15,
      ease: 'easeOut'
    }
  },
  tap: {
    scale: 0.98,
    transition: {
      type: 'tween',
      duration: 0.1,
      ease: 'easeOut'
    }
  }
}

// Dropdown menu animations
export const dropdownVariants: Variants = {
  closed: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: {
      duration: 0.15,
      ease: 'easeIn'
    }
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  }
}

// List item animations
export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'tween',
      duration: 0.3,
      ease: 'easeOut'
    }
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      type: 'tween',
      duration: 0.2,
      ease: 'easeIn'
    }
  }
}

// Navigation link animations
export const navLinkVariants: Variants = {
  initial: {
    backgroundColor: 'transparent'
  },
  hover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transition: {
      duration: 0.2,
      ease: 'easeOut'
    }
  },
  active: {
    backgroundColor: 'rgb(var(--primary))',
    transition: {
      duration: 0.3,
      ease: 'easeOut'
    }
  }
} 