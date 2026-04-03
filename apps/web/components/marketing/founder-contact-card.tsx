'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Github, Linkedin } from 'lucide-react'

const socialLinks = [
  {
    label: 'LinkedIn',
    handle: '@joao-victor-530060259',
    href: 'https://www.linkedin.com/in/jo%C3%A3o-victor-530060259/',
    icon: Linkedin,
    social: 'linkedin',
  },
  {
    label: 'GitHub',
    handle: '@Victorzinn704',
    href: 'https://github.com/Victorzinn704',
    icon: Github,
    social: 'github',
  },
] as const

const floatingMotion = [
  {
    animate: {
      y: [0, -4, -8, -5, -7, -3, 0],
      x: [0, 0.5, 1.4, 0.8, 1.1, 0.4, 0],
      rotate: [0, -0.4, -1.1, -0.6, -1, -0.3, 0],
      scale: [1, 1.004, 1.012, 1.008, 1.011, 1.005, 1],
    },
    transition: {
      duration: 7.2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
      times: [0, 0.18, 0.34, 0.5, 0.67, 0.84, 1],
    },
  },
  {
    animate: {
      y: [-1, -5, -9, -6, -8, -4, -1],
      x: [0, -0.5, -1.5, -0.9, -1.2, -0.5, 0],
      rotate: [0, 0.4, 1.1, 0.6, 1, 0.3, 0],
      scale: [1.002, 1.006, 1.014, 1.009, 1.013, 1.006, 1.002],
    },
    transition: {
      duration: 7.8,
      repeat: Infinity,
      ease: 'easeInOut' as const,
      delay: 0.45,
      times: [0, 0.16, 0.33, 0.52, 0.7, 0.86, 1],
    },
  },
]

export function FounderContactCard() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <aside className="pointer-events-auto relative z-20 mx-auto mt-3 w-fit lg:absolute lg:right-[22px] lg:top-[170px] lg:mt-0">
      <div className="pointer-events-none absolute -inset-4 rounded-[26px] bg-[radial-gradient(circle,rgba(155,132,96,0.24),transparent_66%)] blur-xl" />

      <ul className="contact-bubbles" role="list">
        {socialLinks.map((social, index) => {
          const Icon = social.icon
          const motionSpec = floatingMotion[index] ?? floatingMotion[0]

          return (
            <motion.li
              animate={prefersReducedMotion ? { x: 0, y: 0, rotate: 0, scale: 1 } : motionSpec.animate}
              className="bubble-item"
              key={social.label}
              transition={prefersReducedMotion ? { duration: 0 } : motionSpec.transition}
            >
              <a
                aria-label={social.label}
                data-social={social.social}
                href={social.href}
                rel="noreferrer"
                target="_blank"
              >
                <span className="bubble-fill" />
                <Icon className="bubble-icon" />
              </a>
              <div className="bubble-tooltip">
                <span className="bubble-tooltip-title">{social.label}</span>
                <span className="bubble-tooltip-handle">{social.handle}</span>
              </div>
            </motion.li>
          )
        })}
      </ul>

      <style jsx>{`
        .contact-bubbles {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
        }

        @media (min-width: 1024px) {
          .contact-bubbles {
            flex-direction: column;
            gap: 16px;
          }
        }

        .bubble-item {
          position: relative;
          will-change: transform;
        }

        .bubble-item a {
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          border-radius: 9999px;
          border: 1px solid rgba(155, 132, 96, 0.36);
          background: rgba(10, 10, 11, 0.92);
          color: rgba(223, 204, 173, 0.95);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.32);
          transition: transform 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
        }

        .bubble-item a::after {
          content: '';
          position: absolute;
          inset: -5px;
          border-radius: 9999px;
          border: 1px solid rgba(155, 132, 96, 0.24);
          opacity: 0.18;
          transform: scale(0.92);
          animation: bubbleAura 3.4s ease-in-out infinite;
          pointer-events: none;
        }

        .bubble-item:nth-child(2) a::after {
          animation-delay: 0.85s;
        }

        .bubble-item a:hover {
          color: #ffffff;
          transform: translateY(-3px) scale(1.06);
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.35);
        }

        .bubble-item a:hover::after {
          opacity: 0.3;
        }

        .bubble-fill {
          position: absolute;
          inset: auto 0 0;
          width: 100%;
          height: 0;
          transition: height 0.32s ease;
        }

        .bubble-item a:hover .bubble-fill {
          height: 100%;
        }

        .bubble-item a[data-social='linkedin'] .bubble-fill {
          background: #0274b3;
        }

        .bubble-item a[data-social='github'] .bubble-fill {
          background: #24262a;
        }

        .bubble-icon {
          position: relative;
          z-index: 1;
          width: 23px;
          height: 23px;
        }

        .bubble-tooltip {
          position: absolute;
          left: 50%;
          bottom: calc(100% + 11px);
          transform: translate(-50%, 8px);
          min-width: 156px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(10, 10, 11, 0.95);
          padding: 8px 10px;
          text-align: center;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.24s ease, transform 0.24s ease;
          pointer-events: none;
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.36);
        }

        .bubble-item:hover .bubble-tooltip {
          opacity: 1;
          visibility: visible;
          transform: translate(-50%, 0);
        }

        .bubble-tooltip-title {
          display: block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--accent);
        }

        .bubble-tooltip-handle {
          display: block;
          margin-top: 3px;
          font-size: 12px;
          color: var(--text-soft);
        }

        @keyframes bubbleAura {
          0%,
          100% {
            opacity: 0.14;
            transform: scale(0.92);
          }

          50% {
            opacity: 0.36;
            transform: scale(1.08);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bubble-item a::after {
            animation: none;
          }
        }
      `}</style>
    </aside>
  )
}
