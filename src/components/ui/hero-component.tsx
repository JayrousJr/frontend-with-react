import { useMemo } from "react"
import { Link } from "react-router"

const STYLES = `
  .space-hero {
      position: relative;
      overflow: hidden;
      width: 100%;
      background-color: #050510;
      color: #ffffff;
  }

  .space-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }

  .nebula {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    animation: nebula-pulse 12s ease-in-out infinite alternate;
  }

  .nebula-purple {
    width: 55vw;
    height: 55vw;
    top: -20%;
    left: -15%;
    background: radial-gradient(circle, rgba(139, 92, 246, 0.16) 0%, transparent 70%);
    animation-duration: 14s;
  }

  .nebula-blue {
    width: 50vw;
    height: 50vw;
    top: 5%;
    right: -20%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, transparent 65%);
    animation-duration: 18s;
    animation-delay: -5s;
  }

  .nebula-teal {
    width: 40vw;
    height: 40vw;
    bottom: -10%;
    left: 30%;
    background: radial-gradient(circle, rgba(20, 184, 166, 0.1) 0%, transparent 65%);
    animation-duration: 22s;
    animation-delay: -9s;
  }

  @keyframes nebula-pulse {
    0%   { opacity: 0.6; transform: scale(1); }
    100% { opacity: 1;   transform: scale(1.08); }
  }

  .stars-layer {
    position: absolute;
    inset: 0;
  }

  .star {
    position: absolute;
    border-radius: 50%;
    background: #ffffff;
    animation: twinkle linear infinite;
  }

  @keyframes twinkle {
    0%, 100% { opacity: 0.15; }
    50%       { opacity: 1; }
  }

  .milky-way {
    position: absolute;
    top: 0;
    left: -20%;
    width: 140%;
    height: 100%;
    background: linear-gradient(
      105deg,
      transparent 0%,
      rgba(150, 120, 255, 0.03) 30%,
      rgba(100, 160, 255, 0.05) 50%,
      rgba(150, 120, 255, 0.03) 70%,
      transparent 100%
    );
    transform: rotate(-15deg) scaleY(0.4);
    transform-origin: center 40%;
    filter: blur(20px);
    pointer-events: none;
  }

  .space-hero-content {
      position: relative;
      z-index: 1;
  }
`

interface HeroAction {
  label: string
  href: string
}

interface HeroComponentProps {
  eyebrow?: string
  title: string
  subtitle: string
  primaryAction?: HeroAction
  secondaryAction?: HeroAction
}

export default function HeroComponent({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
}: HeroComponentProps) {
  const tinyStars = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        top: (i * 37 + 13) % 100,
        left: (i * 53 + 7) % 100,
        delay: ((i * 0.17) % 5).toFixed(2),
        duration: (2 + ((i * 0.13) % 3)).toFixed(2),
        size: 1 + (i % 2),
      })),
    []
  )

  return (
    <section className="space-hero flex min-h-[70vh] w-full items-center justify-center px-4 py-24">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="space-bg">
        <div className="nebula nebula-purple" />
        <div className="nebula nebula-blue" />
        <div className="nebula nebula-teal" />
        <div className="stars-layer">
          {tinyStars.map((s) => (
            <div
              key={s.id}
              className="star"
              style={{
                top: s.top + "%",
                left: s.left + "%",
                width: s.size + "px",
                height: s.size + "px",
                animationDelay: s.delay + "s",
                animationDuration: s.duration + "s",
              }}
            />
          ))}
        </div>
        <div className="milky-way" />
      </div>

      <div className="space-hero-content mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        {eyebrow && (
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1 text-xs font-medium tracking-wide text-white/70 uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
          {title}
        </h1>
        <p className="max-w-xl text-base text-white/70 sm:text-lg">
          {subtitle}
        </p>
        {(primaryAction || secondaryAction) && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            {primaryAction && (
              <Link
                to={primaryAction.href}
                className="rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                {primaryAction.label}
              </Link>
            )}
            {secondaryAction && (
              <Link
                to={secondaryAction.href}
                className="rounded-md border border-white/20 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {secondaryAction.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
