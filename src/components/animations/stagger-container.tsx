"use client"

import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations/page-transitions'

interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function StaggerContainer({ children, className = '', delay = 0.1 }: StaggerContainerProps) {
  const customStaggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: delay,
        delayChildren: delay
      }
    }
  }

  return (
    <motion.div
      variants={customStaggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerItemProps {
  children: React.ReactNode
  className?: string
}

export function StaggerItem({ children, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      variants={staggerItem}
      className={className}
    >
      {children}
    </motion.div>
  )
} 