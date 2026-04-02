'use client'

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

export function FounderContactCard() {
  return (
    <aside className="pointer-events-auto relative z-20 mx-auto mt-2 w-fit lg:absolute lg:right-[-8px] lg:top-[130px] lg:mt-0">
      <ul className="contact-bubbles" role="list">
        {socialLinks.map((social, index) => {
          const Icon = social.icon

          return (
            <li className={`bubble-item ${index === 0 ? 'bubble-float-a' : 'bubble-float-b'}`} key={social.label}>
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
            </li>
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
        }

        .bubble-float-a {
          animation: bubbleFloatA 4.2s ease-in-out infinite;
        }

        .bubble-float-b {
          animation: bubbleFloatB 5s ease-in-out infinite 0.35s;
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
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(247, 247, 247, 0.98);
          color: #444b52;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.26);
          transition: transform 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
        }

        .bubble-item a:hover {
          color: #ffffff;
          transform: translateY(-3px) scale(1.06);
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.35);
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

        @keyframes bubbleFloatA {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }

          50% {
            transform: translate3d(0, -10px, 0);
          }
        }

        @keyframes bubbleFloatB {
          0%,
          100% {
            transform: translate3d(0, -2px, 0);
          }

          50% {
            transform: translate3d(0, -13px, 0);
          }
        }
      `}</style>
    </aside>
  )
}