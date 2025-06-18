"use client"

import { motion } from 'framer-motion'
import { cardHoverVariants } from '@/lib/animations/page-transitions'
import { Card } from '@/components/ui/card'
import { forwardRef } from 'react'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  disabled?: boolean
  noHover?: boolean
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, disabled = false, noHover = false, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        variants={cardHoverVariants}
        initial="initial"
        whileHover={(disabled || noHover) ? "initial" : "hover"}
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