import React, { useState, useEffect } from 'react'
import DateInput from '../components/DateInput'
import toast from 'react-hot-toast'
import { Alumni, School, WorkExperience, SocialLink } from '../types'
import { createAlumni, updateAlumni, geocode } from '../api/alumni'

interface Props {
  initial?: Partial<Alumni>
  onSaved: (a: Alumni) => void
  onCancel: () => void
}

const emptySchool = (): School => ({ school_name: '', degree: '', is_main: false })
const emptyWork = (): WorkExperience => ({ company: '', position: '', is_current: false })
const emptyLink = (): SocialLink => ({ platform: '', url: '' })

// Défini HORS du composant pour éviter la recréation à chaque render (causerait un unmount/remount des champs)
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function AlumniForm({ initial, onSaved, onCancel }: Props) {
  const isEdit = !!initial?.id
  const [saving, setSaving] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const [form, setForm] = useState({
    first_name: initial?.first_name ?? '',
    last_name: initial?.last_name ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    birth_date: initial?.birth_date ?? '',
    city: initial?.city ?? '',
    country: initial?.country ?? 'France',
    latitude: initial?.latitude ?? '',
    longitude: initial?.longitude ?? '',
    promotion: initial?.promotion ?? '',
    linkedin_url: initial?.linkedin_url ?? '',
    status: initial?.status ?? 'actif',
    rgpd_consent: initial?.rgpd_consent ?? false,
    rgpd_consent_date: initial?.rgpd_consent_date ?? '',
    internal_notes: initial?.internal_notes ?? '',
  })

  const [schools, setSchools] = useState<School[]>(initial?.schools ?? [])
  const [works, setWorks] = useState<WorkExperience[]>(initial?.work_experiences ?? [])
  const [links, setLinks] = useState<SocialLink[]>(initial?.social_links ?? [])
  const [tagInput, setTagInput] = useState(initial?.tags?.map((t) => t.name).join(', ') ?? '')

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }))

  const handleGeocode = async () => {
    if (!form.city) return
    setGeocoding(true)
    try {
      const res = await geocode(form.city, form.country)
      if (res.found) {
        setForm((f) => ({ ...f, latitude: res.latitude, longitude: res.longitude }))
        toast.success('Position trouvée')
      } else {
        toast.error('Ville non trouvée')
      }
    } catch {
      toast.error('Erreur de géocodage')
    } finally {
      setGeocoding(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Prénom et nom obligatoires')
      return
    }
    setSaving(true)
    const payload: any = {
      ...form,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      schools,
      work_experiences: works,
      social_links: links,
      tag_names: tagInput.split(',').map((t) => t.trim()).filter(Boolean),
    }
    // Nettoyer les champs vides
    Object.keys(payload).forEach((k) => {
      if (payload[k] === '') payload[k] = null
    })

    try {
      const saved = isEdit
        ? await updateAlumni(initial!.id!, payload)
        : await createAlumni(payload)
      toast.success(isEdit ? 'Alumni mis à jour' : 'Alumni créé')
      onSaved(saved)
    } catch (err: any) {
      toast.error(err.response?.data?.detail ?? 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const inputCls ='w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom *">
          <input className={inputCls} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
        </Field>
        <Field label="Nom *">
          <input className={inputCls} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Date de naissance">
          <DateInput value={form.birth_date} onChange={(v) => set('birth_date', v)} className={inputCls + ' pr-8'} />
        </Field>
        <Field label="Promotion">
          <input className={inputCls} value={form.promotion} onChange={(e) => set('promotion', e.target.value)} placeholder="2020, 2021…" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ville">
          <div className="flex gap-2">
            <input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !form.city}
              className="text-xs px-2 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg whitespace-nowrap disabled:opacity-40"
            >
              {geocoding ? '…' : '📍 Géocoder'}
            </button>
          </div>
        </Field>
        <Field label="Pays">
          <input className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="LinkedIn URL">
          <input className={inputCls} value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} />
        </Field>
        <Field label="Statut">
          <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="a_verifier">À vérifier</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 col-span-2">
          <input
            type="checkbox"
            id="rgpd"
            checked={form.rgpd_consent}
            onChange={(e) => {
              set('rgpd_consent', e.target.checked)
              if (e.target.checked && !form.rgpd_consent_date) {
                set('rgpd_consent_date', new Date().toISOString().split('T')[0])
              }
            }}
          />
          <label htmlFor="rgpd" className="text-sm cursor-pointer">Consentement RGPD</label>
          {form.rgpd_consent && (
            <DateInput
              value={form.rgpd_consent_date}
              onChange={(v) => set('rgpd_consent_date', v)}
              className="border border-gray-300 rounded px-2 py-1 text-xs w-36 pr-8"
            />
          )}
        </div>
      </div>

      <Field label="Tags (séparés par virgule)">
        <input className={inputCls} value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Alumni, Partenaire, Intervenant…" />
      </Field>

      {/* Formations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">Formations</span>
          <button type="button" onClick={() => setSchools((s) => [...s, emptySchool()])} className="text-xs text-blue-600 hover:underline">+ Ajouter</button>
        </div>
        {schools.map((s, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
            <input className={inputCls} placeholder="École" value={s.school_name} onChange={(e) => setSchools((arr) => arr.map((x, j) => j === i ? { ...x, school_name: e.target.value } : x))} />
            <input className={inputCls} placeholder="Diplôme" value={s.degree ?? ''} onChange={(e) => setSchools((arr) => arr.map((x, j) => j === i ? { ...x, degree: e.target.value } : x))} />
            <input type="text" inputMode="numeric" maxLength={4} className={inputCls} placeholder="Début (ex: 2018)" value={s.start_year ?? ''} onChange={(e) => setSchools((arr) => arr.map((x, j) => j === i ? { ...x, start_year: e.target.value ? Number(e.target.value) : undefined } : x))} />
            <div className="flex gap-2 items-center">
              <input type="text" inputMode="numeric" maxLength={4} className={inputCls} placeholder="Fin (ex: 2021)" value={s.end_year ?? ''} onChange={(e) => setSchools((arr) => arr.map((x, j) => j === i ? { ...x, end_year: e.target.value ? Number(e.target.value) : undefined } : x))} />
              <button type="button" onClick={() => setSchools((arr) => arr.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* Expériences professionnelles */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">Expériences professionnelles</span>
          <button type="button" onClick={() => setWorks((w) => [...w, emptyWork()])} className="text-xs text-blue-600 hover:underline">+ Ajouter</button>
        </div>
        {works.map((w, i) => (
          <div key={i} className="grid grid-cols-3 gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
            <input className={inputCls} placeholder="Entreprise" value={w.company} onChange={(e) => setWorks((arr) => arr.map((x, j) => j === i ? { ...x, company: e.target.value } : x))} />
            <input className={inputCls} placeholder="Poste" value={w.position} onChange={(e) => setWorks((arr) => arr.map((x, j) => j === i ? { ...x, position: e.target.value } : x))} />
            <div className="flex gap-2 items-center">
              <input className={inputCls} placeholder="Secteur" value={w.sector ?? ''} onChange={(e) => setWorks((arr) => arr.map((x, j) => j === i ? { ...x, sector: e.target.value } : x))} />
              <button type="button" onClick={() => setWorks((arr) => arr.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
            </div>
            <div className="flex items-center gap-2 col-span-3">
              <input type="checkbox" checked={w.is_current} onChange={(e) => setWorks((arr) => arr.map((x, j) => j === i ? { ...x, is_current: e.target.checked } : x))} id={`current-${i}`} />
              <label htmlFor={`current-${i}`} className="text-xs cursor-pointer">Poste actuel</label>
              <DateInput
                value={w.start_date ?? ''}
                onChange={(v) => setWorks((arr) => arr.map((x, j) => j === i ? { ...x, start_date: v } : x))}
                placeholder="JJ/MM/AAAA"
                className="border border-gray-300 rounded px-2 py-1 text-xs w-32 pr-8"
              />
              {!w.is_current && (
                <DateInput
                  value={w.end_date ?? ''}
                  onChange={(v) => setWorks((arr) => arr.map((x, j) => j === i ? { ...x, end_date: v } : x))}
                  placeholder="JJ/MM/AAAA"
                  className="border border-gray-300 rounded px-2 py-1 text-xs w-32 pr-8"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Liens sociaux */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-700">Liens / Réseaux</span>
          <button type="button" onClick={() => setLinks((l) => [...l, emptyLink()])} className="text-xs text-blue-600 hover:underline">+ Ajouter</button>
        </div>
        {links.map((l, i) => (
          <div key={i} className="grid grid-cols-3 gap-2 mb-2">
            <input className={inputCls} placeholder="Plateforme" value={l.platform} onChange={(e) => setLinks((arr) => arr.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))} />
            <div className="col-span-2 flex gap-2">
              <input className={inputCls} placeholder="URL" value={l.url} onChange={(e) => setLinks((arr) => arr.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
              <button type="button" onClick={() => setLinks((arr) => arr.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        ))}
      </div>

      <Field label="Notes internes">
        <textarea
          className={inputCls}
          rows={3}
          value={form.internal_notes}
          onChange={(e) => set('internal_notes', e.target.value)}
        />
      </Field>

      <div className="flex gap-3 justify-end pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
          Annuler
        </button>
        <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer'}
        </button>
      </div>
    </form>
  )
}
