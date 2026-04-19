import { Link } from 'react-router-dom'

export function BrandLogo() {
  const src = `${import.meta.env.BASE_URL}images/logo.png`
  return (
    <Link to="/" className="brand-mark">
      <img src={src} alt="" width={44} height={44} className="brand-logo" decoding="async" />
      <span className="brand-mark-text">Karthik's Travel Agency</span>
    </Link>
  )
}
