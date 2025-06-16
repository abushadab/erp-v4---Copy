"use client"

import { motion } from 'framer-motion'
import { cardHoverVariants } from '@/lib/animations/page-transitions'
import { Card } from '@/components/ui/card'
import { forwardRef } from 'react'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  disabled?: boolean
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, disabled = false, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={cardHoverVariants}
        initial="initial"
        whileHover={disabled ? "initial" : "hover"}
        className={className}
      >
        <Card {...props}>
          {children}
        </Card>
      </motion.div>
    )
  }
)

AnimatedCard.displayName = "AnimatedCard" 