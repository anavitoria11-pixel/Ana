export default function PageContainer({ children }) {
  return (
    <main
      className="mx-auto px-6 py-12"
      style={{ maxWidth: '720px' }}
    >
      {children}
    </main>
  )
}
