"use client"

import { motion } from 'framer-motion'
import { buttonHoverVariants } from '@/lib/animations/page-transitions'
import { Button, ButtonProps } from '@/components/ui/button'
import { forwardRef } from 'react'

interface AnimatedButtonProps extends ButtonProps {
  children: React.ReactNode
  disabled?: boolean
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ children, disabled = false, ...props }, ref) => {
    return (
      <motion.div
        variants={buttonHoverVariants}
        initial="initial"
        whileHover={disabled ? "initial" : "hover"}
        whileTap={disabled ? "initial" : "tap"}
        style={{ display: 'inline-block' }}
      >
        <Button ref={ref} disabled={disabled} {...props}>
          {children}
        </Button>
      </motion.div>
    )
  }
)

AnimatedButton.displayName = "AnimatedButton" 