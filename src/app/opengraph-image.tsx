import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'
export const alt = 'Candor — Honest feedback, real growth'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Auto-generated Open Graph / Twitter card image.
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: 34,
            fontWeight: 700,
            color: '#a5b4fc',
            letterSpacing: '0.05em',
          }}
        >
          CANDOR
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            Honest feedback,
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 800,
              color: '#818cf8',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            real growth.
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 28,
              fontSize: 34,
              color: '#cbd5e1',
              maxWidth: 900,
            }}
          >
            Anonymous feedback, turned into an AI growth plan you can act on.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#64748b' }}>
          by Yogesh Chauhan · yogeshchauhan.dev
        </div>
      </div>
    ),
    size,
  )
}
