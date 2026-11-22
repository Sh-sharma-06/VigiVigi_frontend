export default function CoverPage() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: '#05040c',
        overflow: 'hidden',
      }}
    >
      <iframe
        src="/cover/index.html"
        title="Vigilant"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  )
}
