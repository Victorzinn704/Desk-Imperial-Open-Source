'use client'

import { motion } from 'framer-motion'
import { Github, Linkedin } from 'lucide-react'

const socialLinks = [
  {
    label: 'LinkedIn',
    handle: '@joao-victor-cruz-530060259',
    href: 'https://www.linkedin.com/in/jo%C3%A3o-victor-cruz-530060259/',
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
    animate: { y: [0, -12, 0], x: [0, 1, 0], rotate: [0, -1.5, 0] },
    transition: { duration: 4.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' as const },
  },
  {
    animate: { y: [-2, -16, -2], x: [0, -1, 0], rotate: [0, 1.5, 0] },
    transition: { duration: 5.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' as const, delay: 0.35 },
  },
]

export function FounderContactCard() {
  return (
    <aside className="pointer-events-auto relative z-20 mx-auto mt-3 w-fit lg:absolute lg:right-[22px] lg:top-[170px] lg:mt-0">
      <ul className="contact-bubbles">
        {socialLinks.map((social, index) => (
          <FounderSocialBubble index={index} key={social.label} social={social} />
        ))}
      </ul>
      <FounderContactStyles />
    </aside>
  )
}

function FounderSocialBubble({ index, social }: Readonly<{ index: number; social: (typeof socialLinks)[number] }>) {
  const Icon = social.icon
  const motionSpec = floatingMotion[index] ?? floatingMotion[0]

  return (
    <motion.li animate={motionSpec.animate} className="bubble-item" transition={motionSpec.transition}>
      <a aria-label={social.label} data-social={social.social} href={social.href} rel="noreferrer" target="_blank">
        <span className="bubble-fill" />
        <Icon className="bubble-icon" />
      </a>
      <div className="bubble-tooltip">
        <span className="bubble-tooltip-title">{social.label}</span>
        <span className="bubble-tooltip-handle">{social.handle}</span>
      </div>
    </motion.li>
  )
}

const founderContactStyles = `
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border: 0;
    background: transparent;
    color: rgba(223, 204, 173, 0.95);
    transition:
      transform 0.25s ease,
      color 0.25s ease;
  }

  .bubble-item a:hover {
    color: var(--accent);
    transform: translateY(-2px);
  }

  .bubble-fill {
    display: none;
  }

  .bubble-icon {
    position: relative;
    z-index: 1;
    width: 30px;
    height: 30px;
    stroke-width: 1.8;
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
    transition:
      opacity 0.24s ease,
      transform 0.24s ease;
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
`

function FounderContactStyles() {
  return <style jsx>{founderContactStyles}</style>
}
