import { useParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ServiceHeader from '../components/ServiceHeader'
import EmptyState from '../components/EmptyState'
import { findService } from '../data/services'

export default function Service() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const service = findService(slug)

  // An unknown slug must not render a half-built page: bounce to /home.
  if (!service) return <Navigate to="/home" replace />

  return (
    <div className="app-shell bg-app" data-qa="svcShell">
      <ServiceHeader title={t(`services.${service.slug}`)} tallBand={service.empty === 'day-pills'} />
      <EmptyState variant={service.empty} caption={service.caption ?? 'strong'} />
    </div>
  )
}
