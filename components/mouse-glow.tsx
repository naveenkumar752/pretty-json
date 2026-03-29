"use client"

import React, { useEffect } from "react"
import { motion, useSpring, useMotionValue } from "framer-motion"

export function MouseGlow() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Smooth out the movement for the main glow
  const springConfig = { damping: 30, stiffness: 100 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [mouseX, mouseY])

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden bg-background">
      {/* Primary interactive multi-color glow */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full blur-[160px] opacity-40 mix-blend-plus-lighter dark:mix-blend-soft-light"
        style={{
          x: x,
          y: y,
          left: -400,
          top: -400,
          background: "radial-gradient(circle, oklch(0.6 0.15 250 / 0.3) 0%, oklch(0.6 0.2 300 / 0.2) 40%, transparent 80%)",
        }}
      />

      {/* Funky secondary follower (slightly delayed) */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-30 bg-purple-500/10"
        animate={{
          x: mouseX.get() * 0.95,
          y: mouseY.get() * 0.95,
        }}
        transition={{ type: "spring", damping: 40, stiffness: 80 }}
        style={{
          left: -200,
          top: -200,
        }}
      />

      {/* Floating high-intensity blobs */}
      <div 
        className="absolute top-[10%] left-[20%] w-[30vw] h-[30vw] bg-primary/10 rounded-full blur-[140px] animate-pulse" 
        style={{ animationDuration: '15s' }}
      />
      <div 
        className="absolute bottom-[20%] right-[10%] w-[40vw] h-[40vw] bg-blue-400/10 rounded-full blur-[160px] animate-pulse" 
        style={{ animationDuration: '20s' }}
      />
      
      {/* Subtle Animated Mesh Overlay */}
      <div className="absolute inset-0 opacity-[0.25] dark:opacity-[0.15]">
        <svg className="h-full w-full">
          <filter id="noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>
      </div>

    </div>
  )
}
