import dynamic from 'next/dynamic'

const LandingPage = dynamic(() => import('@/components/marketing/landing-page').then((m) => m.LandingPage), {
  ssr: false,
})

export default function HomePage() {
  return <LandingPage />
}
