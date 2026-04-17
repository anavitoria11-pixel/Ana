import { Link, NavLink } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

export default function Header() {
  const { user, logout } = useAuth()

  return (
    <header
      className="sticky top-0 z-40 bg-white border-b border-[#E8E8E5]"
    >
      <div
        className="mx-auto flex items-center justify-between px-6 h-14"
        style={{ maxWidth: '720px' }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="text-[#191919] font-semibold text-base tracking-tight hover:opacity-75 transition-opacity"
        >
          JD Quiz
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded transition-colors ${
                    isActive
                      ? 'text-[#191919] font-medium bg-[#F1F1EF]'
                      : 'text-[#6B6B6B] hover:text-[#191919] hover:bg-[#F1F1EF]'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded transition-colors ${
                    isActive
                      ? 'text-[#191919] font-medium bg-[#F1F1EF]'
                      : 'text-[#6B6B6B] hover:text-[#191919] hover:bg-[#F1F1EF]'
                  }`
                }
              >
                History
              </NavLink>

              <div className="w-px h-4 bg-[#E8E8E5] mx-1" />

              <span className="text-sm text-[#6B6B6B] px-2 select-none">
                {user.username || user.name || 'User'}
              </span>

              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-[#6B6B6B] hover:text-[#191919] hover:bg-[#F1F1EF] rounded transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded transition-colors ${
                    isActive
                      ? 'text-[#191919] font-medium bg-[#F1F1EF]'
                      : 'text-[#6B6B6B] hover:text-[#191919] hover:bg-[#F1F1EF]'
                  }`
                }
              >
                Log in
              </NavLink>
              <NavLink
                to="/signup"
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded transition-colors ${
                    isActive
                      ? 'bg-[#191919] text-white'
                      : 'bg-[#191919] text-white hover:opacity-85'
                  }`
                }
              >
                Sign up
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
