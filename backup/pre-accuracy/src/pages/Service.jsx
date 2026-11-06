import { useParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ServiceHeader from '../components/ServiceHeader'
import EmptyState from '../components/EmptyState'
import { findService } from '../data/services'

export default function Service() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const service = findService(slug)

  if (!service) return <Navigate to="/home" replace />

  return (
    <div className="app-shell bg-app">
      <ServiceHeader title={t(`services.${service.slug}`)} />
      <EmptyState variant={service.empty} />
    </div>
  )
}
