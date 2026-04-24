'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange, updateUserProfile, signOutUser } from '@/lib/auth'
import { User } from '@/types'

// ─── PSGC types ───────────────────────────────────────────────────────────────
interface PsgcItem { code: string; name: string }

const PSGC = 'https://psgc.cloud/api'
const NCR_CODE = '1300000000' // National Capital Region

// ─── Component ────────────────────────────────────────────────────────────────
export default function CompleteProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ── Form data ──────────────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState({
    advisorType: '',
    firstName: '',
    middleName: '',
    lastName: '',
    contact: '',
    birthday: '',
    birthplace: '',
    gender: '',
    educationalAttainment: '',
    civilStatus: '',
    currentJob: '',
    // address — stored as human-readable names for display / Firestore
    houseStreet: '',
    barangay: '',
    municipalityCity: '',
    province: '',        // empty string when NCR
    region: '',
    zipCode: '',
  })

  // ── PSGC dropdown data ────────────────────────────────────────────────────
  const [regions, setRegions]           = useState<PsgcItem[]>([])
  const [provinces, setProvinces]       = useState<PsgcItem[]>([])
  const [cities, setCities]             = useState<PsgcItem[]>([])
  const [barangays, setBarangays]       = useState<PsgcItem[]>([])

  // selected codes (for chaining API calls)
  const [selectedRegionCode,   setSelectedRegionCode]   = useState('')
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('')
  const [selectedCityCode,     setSelectedCityCode]     = useState('')

  // loading flags per level
  const [loadingProvinces,  setLoadingProvinces]  = useState(false)
  const [loadingCities,     setLoadingCities]     = useState(false)
  const [loadingBarangays,  setLoadingBarangays]  = useState(false)

  const isNCR = selectedRegionCode === NCR_CODE

  // ── Auto-computed age ─────────────────────────────────────────────────────
  const [computedAge, setComputedAge] = useState<number | null>(null)

  useEffect(() => {
    if (!profileData.birthday) { setComputedAge(null); return }
    const birth = new Date(profileData.birthday)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    setComputedAge(age)
  }, [profileData.birthday])

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      if (!currentUser)                     { router.push('/auth');                  return }
      if (currentUser.role === 'admin')     { router.push('/admin');                 return }
      if (currentUser.status === 'pending') { router.push('/waiting-for-approval'); return }
      if (currentUser.profileCompleted)     { router.push('/dashboard');             return }

      setUser(currentUser)
      setProfileData(prev => ({
        ...prev,
        advisorType:            currentUser.advisorType            || '',
        firstName:              currentUser.firstName              || '',
        middleName:             currentUser.middleName             || '',
        lastName:               currentUser.lastName               || (currentUser.displayName?.split(' ').slice(-1)[0] || ''),
        contact:                currentUser.contact                || '',
        birthday:               currentUser.birthday               || '',
        birthplace:             currentUser.birthplace             || '',
        houseStreet:            currentUser.houseStreet            || '',
        barangay:               currentUser.barangay               || '',
        municipalityCity:       currentUser.municipalityCity       || '',
        province:               currentUser.province               || '',
        region:                 currentUser.region                 || '',
        zipCode:                currentUser.zipCode                || '',
        gender:                 currentUser.gender                 || '',
        educationalAttainment:  currentUser.educationalAttainment  || '',
        civilStatus:            currentUser.civilStatus            || '',
        currentJob:             currentUser.currentJob             || '',
      }))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  // ── Load regions on mount ─────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${PSGC}/regions`)
      .then(r => r.json())
      .then((data: PsgcItem[]) =>
        setRegions(data.sort((a, b) => a.name.localeCompare(b.name)))
      )
      .catch(console.error)
  }, [])

  // ── Load provinces when region changes ───────────────────────────────────
  useEffect(() => {
    if (!selectedRegionCode) { setProvinces([]); setCities([]); setBarangays([]); return }

    // Reset downstream
    setProvinces([])
    setCities([])
    setBarangays([])
    setSelectedProvinceCode('')
    setSelectedCityCode('')
    setProfileData(prev => ({ ...prev, province: '', municipalityCity: '', barangay: '' }))

    if (isNCR) {
      // NCR has no provinces — go straight to cities
      setLoadingCities(true)
      fetch(`${PSGC}/regions/${selectedRegionCode}/cities-municipalities`)
        .then(r => r.json())
        .then((data: PsgcItem[]) =>
          setCities(data.sort((a, b) => a.name.localeCompare(b.name)))
        )
        .catch(console.error)
        .finally(() => setLoadingCities(false))
    } else {
      setLoadingProvinces(true)
      fetch(`${PSGC}/regions/${selectedRegionCode}/provinces`)
        .then(r => r.json())
        .then((data: PsgcItem[]) =>
          setProvinces(data.sort((a, b) => a.name.localeCompare(b.name)))
        )
        .catch(console.error)
        .finally(() => setLoadingProvinces(false))
    }
  }, [selectedRegionCode])

  // ── Load cities when province changes (non-NCR) ──────────────────────────
  useEffect(() => {
    if (!selectedProvinceCode || isNCR) return

    setCities([])
    setBarangays([])
    setSelectedCityCode('')
    setProfileData(prev => ({ ...prev, municipalityCity: '', barangay: '' }))

    setLoadingCities(true)
    fetch(`${PSGC}/provinces/${selectedProvinceCode}/cities-municipalities`)
      .then(r => r.json())
      .then((data: PsgcItem[]) =>
        setCities(data.sort((a, b) => a.name.localeCompare(b.name)))
      )
      .catch(console.error)
      .finally(() => setLoadingCities(false))
  }, [selectedProvinceCode])

  // ── Load barangays when city changes ─────────────────────────────────────
  useEffect(() => {
    if (!selectedCityCode) { setBarangays([]); return }

    setBarangays([])
    setProfileData(prev => ({ ...prev, barangay: '' }))

    setLoadingBarangays(true)
    fetch(`${PSGC}/cities-municipalities/${selectedCityCode}/barangays`)
      .then(r => r.json())
      .then((data: PsgcItem[]) =>
        setBarangays(data.sort((a, b) => a.name.localeCompare(b.name)))
      )
      .catch(console.error)
      .finally(() => setLoadingBarangays(false))
  }, [selectedCityCode])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getMaxDate = () => {
    const today = new Date()
    return new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
      .toISOString().split('T')[0]
  }

  const getMinDate = () => {
    const today = new Date()
    return new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
      .toISOString().split('T')[0]
  }

  const validateAge = (birthDate: string): boolean => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 18 && age <= 100
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    if (!validateAge(profileData.birthday)) {
      setError('You must be at least 18 years old to register.')
      setSaving(false)
      return
    }

    try {
      if (user) {
        const updatedName = [profileData.firstName, profileData.middleName, profileData.lastName]
          .filter(Boolean).join(' ')

        await updateUserProfile(user.uid, {
          advisorType:           profileData.advisorType as 'new' | 'returnee',
          firstName:             profileData.firstName,
          middleName:            profileData.middleName,
          lastName:              profileData.lastName,
          name:                  updatedName,
          contact:               profileData.contact,
          birthday:              profileData.birthday,
          birthplace:            profileData.birthplace,
          houseStreet:           profileData.houseStreet,
          barangay:              profileData.barangay,
          municipalityCity:      profileData.municipalityCity,
          province:              profileData.province,   // '' for NCR
          region:                profileData.region,
          zipCode:               profileData.zipCode,
          gender:                profileData.gender as 'male' | 'female' | 'other',
          educationalAttainment: profileData.educationalAttainment,
          civilStatus:           profileData.civilStatus,
          currentJob:            profileData.currentJob,
          profileCompleted:      true,
        })

        setUser(prev => prev ? {
          ...prev,
          advisorType:     profileData.advisorType as 'new' | 'returnee',
          name:            updatedName,
          firstName:       profileData.firstName,
          middleName:      profileData.middleName,
          lastName:        profileData.lastName,
          profileCompleted: true,
        } : prev)

        setSuccess('Profile completed successfully! Redirecting to dashboard...')
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try { await signOutUser(); router.push('/auth') }
    catch (e) { console.error('Error signing out:', e) }
  }

  // ── Select helpers ────────────────────────────────────────────────────────
  const selectClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm disabled:bg-gray-100 disabled:cursor-not-allowed'
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm'

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">Please provide some additional information to get started</p>
          </div>

          {/* User info */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{user.displayName || user.email}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          )}

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Advisor Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Advisor Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-6">
                {(['new', 'returnee'] as const).map(v => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio" name="advisorType" value={v}
                      checked={profileData.advisorType === v}
                      onChange={e => setProfileData({ ...profileData, advisorType: e.target.value })}
                      className="w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                      required={v === 'new'}
                    />
                    <span className="text-sm text-gray-700">
                      {v === 'new' ? 'New' : 'Returnee'} Financial Advisor
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['firstName', 'middleName', 'lastName'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field === 'firstName' ? 'First Name' : field === 'middleName' ? 'Middle Name' : 'Last Name'}
                    {field === 'middleName'
                      ? <span className="text-gray-400 font-normal"> (Optional)</span>
                      : <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    type="text"
                    value={profileData[field]}
                    onChange={e => setProfileData({ ...profileData, [field]: e.target.value })}
                    className={inputClass}
                    placeholder={field === 'firstName' ? 'First name' : field === 'middleName' ? 'Middle name' : 'Last name'}
                    required={field !== 'middleName'}
                  />
                </div>
              ))}
            </div>

            {/* Contact + Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                <input
                  type="tel" value={profileData.contact}
                  onChange={e => setProfileData({ ...profileData, contact: e.target.value })}
                  className={inputClass} placeholder="e.g. 09123456789" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  value={profileData.gender}
                  onChange={e => setProfileData({ ...profileData, gender: e.target.value })}
                  className={selectClass} required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Birthday + Age */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday * (Must be 18+)</label>
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                  min={getMinDate()}
                  max={getMaxDate()}
                  className={inputClass} required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm flex items-center min-h-[38px]">
                  {computedAge !== null
                    ? <><span className="font-semibold text-blue-900">{computedAge}</span><span className="ml-1 text-gray-400">years old</span></>
                    : <span className="text-gray-400 italic">Auto-computed from birthday</span>}
                </div>
              </div>
            </div>

            {/* Birthplace */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthplace *</label>
              <input
                type="text" value={profileData.birthplace}
                onChange={e => setProfileData({ ...profileData, birthplace: e.target.value })}
                className={inputClass} placeholder="e.g. Daet, Camarines Norte" required
              />
            </div>

            {/* Civil Status + Educational Attainment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Civil Status *</label>
                <select
                  value={profileData.civilStatus}
                  onChange={e => setProfileData({ ...profileData, civilStatus: e.target.value })}
                  className={selectClass} required
                >
                  <option value="">Select civil status</option>
                  {['Single','Married','Widowed','Separated','Divorced','Annulled'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Educational Attainment *</label>
                <select
                  value={profileData.educationalAttainment}
                  onChange={e => setProfileData({ ...profileData, educationalAttainment: e.target.value })}
                  className={selectClass} required
                >
                  <option value="">Select education level</option>
                  {['High School','College Undergraduate','College Graduate',"Master's Degree",'PhD','Other'].map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Job */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Job * <span className="text-gray-400 font-normal">(Put N/A if none)</span>
              </label>
              <input
                type="text" value={profileData.currentJob}
                onChange={e => setProfileData({ ...profileData, currentJob: e.target.value })}
                className={inputClass} placeholder="e.g. Software Engineer, Teacher, N/A" required
              />
            </div>

            {/* ── Address Section ─────────────────────────────────────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">

                {/* House No. / Street — plain text, always editable */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    House No. / Street <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text" value={profileData.houseStreet}
                    onChange={e => setProfileData({ ...profileData, houseStreet: e.target.value })}
                    className={inputClass + ' bg-white'}
                    placeholder="e.g. 123 Rizal St."
                  />
                </div>

                {/* Region */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRegionCode}
                    onChange={e => {
                      const code = e.target.value
                      const name = regions.find(r => r.code === code)?.name || ''
                      setSelectedRegionCode(code)
                      setProfileData(prev => ({ ...prev, region: name, province: '' }))
                    }}
                    className={selectClass + ' bg-white'}
                    required
                  >
                    <option value="">Select region</option>
                    {regions.map(r => (
                      <option key={r.code} value={r.code}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Province — hidden for NCR */}
                {selectedRegionCode && !isNCR && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedProvinceCode}
                      onChange={e => {
                        const code = e.target.value
                        const name = provinces.find(p => p.code === code)?.name || ''
                        setSelectedProvinceCode(code)
                        setProfileData(prev => ({ ...prev, province: name }))
                      }}
                      className={selectClass + ' bg-white'}
                      disabled={loadingProvinces || provinces.length === 0}
                      required
                    >
                      <option value="">
                        {loadingProvinces ? 'Loading provinces…' : 'Select province'}
                      </option>
                      {provinces.map(p => (
                        <option key={p.code} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* NCR notice */}
                {isNCR && (
                  <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                    📍 <strong>NCR (Metro Manila)</strong> — no province. Select your city directly below.
                  </div>
                )}

                {/* City / Municipality */}
                {(isNCR || selectedProvinceCode) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      City / Municipality <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCityCode}
                      onChange={e => {
                        const code = e.target.value
                        const name = cities.find(c => c.code === code)?.name || ''
                        setSelectedCityCode(code)
                        setProfileData(prev => ({ ...prev, municipalityCity: name }))
                      }}
                      className={selectClass + ' bg-white'}
                      disabled={loadingCities || cities.length === 0}
                      required
                    >
                      <option value="">
                        {loadingCities ? 'Loading cities/municipalities…' : 'Select city / municipality'}
                      </option>
                      {cities.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Barangay */}
                {selectedCityCode && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Barangay <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={profileData.barangay}
                      onChange={e => setProfileData(prev => ({ ...prev, barangay: e.target.value }))}
                      className={selectClass + ' bg-white'}
                      disabled={loadingBarangays || barangays.length === 0}
                      required
                    >
                      <option value="">
                        {loadingBarangays ? 'Loading barangays…' : 'Select barangay'}
                      </option>
                      {barangays.map(b => (
                        <option key={b.code} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ZIP Code */}
                <div className="md:w-1/3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text" value={profileData.zipCode} maxLength={10}
                    onChange={e => setProfileData({ ...profileData, zipCode: e.target.value })}
                    className={inputClass + ' bg-white'}
                    placeholder="e.g. 4600" required
                  />
                </div>

              </div>
            </div>
            {/* ── End Address ─────────────────────────────────────────────── */}

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-2">
              <button
                type="submit" disabled={saving}
                className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? 'Saving...' : 'Complete Profile'}
              </button>
              <button
                type="button" onClick={handleSignOut}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Sign Out
              </button>
            </div>

          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
            <p className="mb-2">
              <strong>Note:</strong> Completing your profile is required to access the dashboard.
            </p>
            <p>Your information helps us personalize your learning experience.</p>
          </div>

        </div>
      </div>
    </div>
  )
}