import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAlumni, getAuditLogs, deleteAlumni, uploadPhoto, exportRgpd } from '../api/alumni'
import { Alumni, AuditLog } from '../types'
import { useAuthStore } from '../store/authStore'
import AlumniForm from '../forms/AlumniForm'
import EmailModal from '../components/modals/EmailModal'
import SmsModal from '../components/modals/SmsModal'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  view: 'Consultation',
  login: 'Connexion',
  export: 'Export',
  import: 'Import',
}

export default function AlumniDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, user } = useAuthStore()
  const [alumni, setAlumni] = useState<Alumni | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showSms, setShowSms] = useState(false)
  const [activeTab, setActiveTab] = useState<'profil' | 'timeline' | 'audit'>('profil')

  const fetchLogs = () => {
    if (id && isAdmin()) {
      getAuditLogs(id).then(setLogs).catch(() => {})
    }
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getAlumni(id).then((a) => { setAlumni(a); setLoading(false) }).catch(() => { toast.error('Alumni introuvable'); navigate('/') })
    if (isAdmin()) {
      getAuditLogs(id).then(setLogs).catch(() => {})
    }
  }, [id, user])

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteAlumni(id)
      toast.success('Alumni supprimé')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erreur')
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    try {
      const { photo_path } = await uploadPhoto(id, file)
      setAlumni((a) => a ? { ...a, photo_path } : a)
      toast.success('Photo mise à jour')
    } catch {
      toast.error('Erreur lors de l\'upload')
    }
  }

  if (loading) return <Layout><div className="flex-1 flex items-center justify-center text-gray-400">Chargement…</div></Layout>
  if (!alumni) return null

  if (editing) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto w-full p-6">
          <h1 className="text-xl font-semibold mb-4">Modifier {alumni.first_name} {alumni.last_name}</h1>
          <AlumniForm
            initial={alumni}
            onSaved={(a) => { setAlumni(a); setEditing(false); fetchLogs() }}
            onCancel={() => setEditing(false)}
          />
        </div>
      </Layout>
    )
  }

  const currentWork = alumni.work_experiences.find((w) => w.is_current)
  const allExps = [...alumni.work_experiences].sort((a, b) => {
    const da = a.start_date ?? '0000'
    const db = b.start_date ?? '0000'
    return db.localeCompare(da)
  })

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex gap-6 items-start">
          <div className="relative flex-shrink-0">
            {alumni.photo_path ? (
              <img src={alumni.photo_path} className="w-20 h-20 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
                {alumni.first_name[0]}{alumni.last_name[0]}
              </div>
            )}
            {isAdmin() && (
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white border border-gray-300 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-50 text-xs shadow">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{alumni.first_name} {alumni.last_name}</h1>
            {currentWork && (
              <p className="text-gray-600 mt-0.5">{currentWork.position} — {currentWork.company}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
              {alumni.city && <span>📍 {alumni.city}{alumni.country ? `, ${alumni.country}` : ''}</span>}
              {alumni.promotion && <span>🎓 Promo {alumni.promotion}</span>}
              {alumni.email && <span>✉️ {alumni.email}</span>}
              {alumni.phone && <span>📞 {alumni.phone}</span>}
              {alumni.linkedin_url && (
                <a href={alumni.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  LinkedIn →
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {alumni.tags.map((t) => (
                <span key={t.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{t.name}</span>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alumni.status === 'actif' ? 'bg-green-100 text-green-700' : alumni.status === 'inactif' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                {alumni.status === 'actif' ? 'Actif' : alumni.status === 'inactif' ? 'Inactif' : 'À vérifier'}
              </span>
              {alumni.rgpd_consent && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">✓ RGPD</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700">← Retour</button>
            {alumni.email && (
              <button onClick={() => setShowEmail(true)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email
              </button>
            )}
            {alumni.phone && (
              <button onClick={() => setShowSms(true)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                SMS
              </button>
            )}
            {isAdmin() && (
              <>
                <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Modifier</button>
                <button onClick={() => exportRgpd(alumni.id).catch(() => toast.error('Erreur export RGPD'))} className="text-sm text-gray-500 hover:underline">Export RGPD</button>
                <button onClick={() => setShowDeleteConfirm(true)} className="text-sm text-red-500 hover:underline">Supprimer</button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['profil', 'timeline', ...(isAdmin() ? ['audit'] : [])] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab === 'profil' ? 'Profil' : tab === 'timeline' ? 'Parcours' : 'Historique'}
            </button>
          ))}
        </div>

        {activeTab === 'profil' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alumni.schools.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Formations</h3>
                <ul className="space-y-2">
                  {alumni.schools.map((s) => (
                    <li key={s.id} className="text-sm">
                      <div className="font-medium text-gray-900">{s.school_name}</div>
                      {s.degree && <div className="text-gray-600">{s.degree}</div>}
                      {(s.start_year || s.end_year) && (
                        <div className="text-gray-400 text-xs">{s.start_year ?? '?'} — {s.end_year ?? 'En cours'}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alumni.social_links.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Réseaux / Liens</h3>
                <ul className="space-y-1">
                  {alumni.social_links.map((l) => (
                    <li key={l.id} className="text-sm">
                      <span className="text-gray-500">{l.platform} : </span>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{l.url}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {alumni.internal_notes && isAdmin() && (
              <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 md:col-span-2">
                <h3 className="text-sm font-semibold text-amber-700 mb-2">Notes internes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{alumni.internal_notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Parcours professionnel</h3>
            {allExps.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucune expérience enregistrée.</p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-3 space-y-6">
                {allExps.map((w) => (
                  <li key={w.id} className="ml-4">
                    <div className={`absolute -left-1.5 w-3 h-3 rounded-full border-2 border-white ${w.is_current ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{w.position}</div>
                      <div className="text-gray-600">{w.company}{w.sector ? ` · ${w.sector}` : ''}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {w.start_date ? new Date(w.start_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }) : '?'}
                        {' → '}
                        {w.is_current ? 'Aujourd\'hui' : w.end_date ? new Date(w.end_date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short' }) : '?'}
                      </div>
                      {w.description && <p className="text-gray-500 mt-1">{w.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {activeTab === 'audit' && isAdmin() && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Historique des modifications</h3>
            {logs.length === 0 ? (
              <p className="text-gray-400 text-sm">Aucun historique.</p>
            ) : (
              <table className="text-xs w-full">
                <thead className="text-gray-500 border-b">
                  <tr>
                    <th className="text-left py-1.5 pr-4">Date</th>
                    <th className="text-left pr-4">Utilisateur</th>
                    <th className="text-left pr-4">Action</th>
                    <th className="text-left pr-4">Champ</th>
                    <th className="text-left pr-4">Avant</th>
                    <th className="text-left">Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="py-1.5 pr-4 text-gray-400">{new Date(l.timestamp).toLocaleString('fr-FR')}</td>
                      <td className="pr-4 font-medium">{l.username ?? l.user_id.slice(0, 8)}</td>
                      <td className="pr-4">{ACTION_LABELS[l.action] ?? l.action}</td>
                      <td className="pr-4 text-gray-500">{l.field_name ?? '—'}</td>
                      <td className="pr-4 text-red-500 max-w-xs truncate">{l.old_value ?? '—'}</td>
                      <td className="text-green-600 max-w-xs truncate">{l.new_value ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showEmail && alumni.email && (
        <EmailModal
          toEmail={alumni.email}
          firstName={alumni.first_name}
          lastName={alumni.last_name}
          onClose={() => setShowEmail(false)}
        />
      )}

      {showSms && alumni.phone && (
        <SmsModal
          phone={alumni.phone}
          firstName={alumni.first_name}
          lastName={alumni.last_name}
          onClose={() => setShowSms(false)}
        />
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-4">
              Voulez-vous supprimer définitivement <strong>{alumni.first_name} {alumni.last_name}</strong> ?
              Cette action est irréversible (droit à l'oubli RGPD).
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
