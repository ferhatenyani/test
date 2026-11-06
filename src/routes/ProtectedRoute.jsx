import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { signedIn } = useAuth()
  return signedIn ? <Outlet /> : <Navigate to="/login" replace />
}
