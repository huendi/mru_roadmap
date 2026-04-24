'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange, updateUserProfile, changePassword, uploadProfilePicture, signOutUser } from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'
import { User } from '@/types'
import Navbar from '@/components/Navbar'

// ─── PSGC ─────────────────────────────────────────────────────────────────────
interface PsgcItem { code: string; name: string }
const PSGC = 'https://psgc.cloud/api'
const NCR_CODE = '1300000000'

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)

  const [profileData, setProfileData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contact: '',
    birthday: '',
    birthplace: '',
    houseStreet: '',
    barangay: '',
    municipalityCity: '',
    province: '',
    region: '',
    zipCode: '',
    gender: undefined as 'male' | 'female' | 'other' | undefined,
    educationalAttainment: '',
    civilStatus: '',
    currentJob: '',
  })

  const [computedAge, setComputedAge] = useState<number | null>(null)
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null)
  const [previewURL, setPreviewURL] = useState<string | null>(null)
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })

  // ── PSGC state ───────────────────────────────────────────────────────────
  const [regions, setRegions]     = useState<PsgcItem[]>([])
  const [provinces, setProvinces] = useState<PsgcItem[]>([])
  const [cities, setCities]       = useState<PsgcItem[]>([])
  const [barangays, setBarangays] = useState<PsgcItem[]>([])

  const [selectedRegionCode,   setSelectedRegionCode]   = useState('')
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('')
  const [selectedCityCode,     setSelectedCityCode]     = useState('')

  const [loadingProvinces,  setLoadingProvinces]  = useState(false)
  const [loadingCities,     setLoadingCities]     = useState(false)
  const [loadingBarangays,  setLoadingBarangays]  = useState(false)

  const isNCR = selectedRegionCode === NCR_CODE

  // ── Age ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!profileData.birthday) { setComputedAge(null); return }
    const birth = new Date(profileData.birthday)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    setComputedAge(age)
  }, [profileData.birthday])

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChange((userData) => {
      if (!userData) { router.push('/auth'); return }
      setUser(userData)
      setProfileData({
        firstName:             userData.firstName             || '',
        middleName:            userData.middleName            || '',
        lastName:              userData.lastName              || '',
        contact:               userData.contact               || '',
        birthday:              userData.birthday              || '',
        birthplace:            userData.birthplace            || '',
        houseStreet:           userData.houseStreet           || '',
        barangay:              userData.barangay              || '',
        municipalityCity:      userData.municipalityCity      || '',
        province:              userData.province              || '',
        region:                userData.region                || '',
        zipCode:               userData.zipCode               || '',
        gender:                userData.gender                || undefined,
        educationalAttainment: userData.educationalAttainment || '',
        civilStatus:           userData.civilStatus           || '',
        currentJob:            userData.currentJob            || '',
      })
      setLoading(false)
    })
    return () => unsubscribe()
  }, [router])

  // ── Load regions on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${PSGC}/regions`)
      .then(r => r.json())
      .then((data: PsgcItem[]) => setRegions(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(console.error)
  }, [])

  // ── When regions load + user has a saved region, pre-select it ──────────
  useEffect(() => {
    if (!regions.length || !profileData.region) return
    const match = regions.find(r => r.name === profileData.region)
    if (match && !selectedRegionCode) setSelectedRegionCode(match.code)
  }, [regions, profileData.region])

  // ── Provinces when region changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedRegionCode) { setProvinces([]); setCities([]); setBarangays([]); return }

    // Only reset downstream if this is a user-driven change (not initial hydration)
    setProvinces([]); setCities([]); setBarangays([])
    setSelectedProvinceCode(''); setSelectedCityCode('')

    if (isNCR) {
      setLoadingCities(true)
      fetch(`${PSGC}/regions/${selectedRegionCode}/cities-municipalities`)
        .then(r => r.json())
        .then((data: PsgcItem[]) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
        .catch(console.error)
        .finally(() => setLoadingCities(false))
    } else {
      setLoadingProvinces(true)
      fetch(`${PSGC}/regions/${selectedRegionCode}/provinces`)
        .then(r => r.json())
        .then((data: PsgcItem[]) => setProvinces(data.sort((a, b) => a.name.localeCompare(b.name))))
        .catch(console.error)
        .finally(() => setLoadingProvinces(false))
    }
  }, [selectedRegionCode])

  // ── Pre-select province after provinces load ─────────────────────────────
  useEffect(() => {
    if (!provinces.length || !profileData.province || selectedProvinceCode) return
    const match = provinces.find(p => p.name === profileData.province)
    if (match) setSelectedProvinceCode(match.code)
  }, [provinces])

  // ── Cities when province changes ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedProvinceCode || isNCR) return
    setCities([]); setBarangays([])
    setSelectedCityCode('')

    setLoadingCities(true)
    fetch(`${PSGC}/provinces/${selectedProvinceCode}/cities-municipalities`)
      .then(r => r.json())
      .then((data: PsgcItem[]) => setCities(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(console.error)
      .finally(() => setLoadingCities(false))
  }, [selectedProvinceCode])

  // ── Pre-select city after cities load ────────────────────────────────────
  useEffect(() => {
    if (!cities.length || !profileData.municipalityCity || selectedCityCode) return
    const match = cities.find(c => c.name === profileData.municipalityCity)
    if (match) setSelectedCityCode(match.code)
  }, [cities])

  // ── Barangays when city changes ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedCityCode) { setBarangays([]); return }
    setBarangays([])

    setLoadingBarangays(true)
    fetch(`${PSGC}/cities-municipalities/${selectedCityCode}/barangays`)
      .then(r => r.json())
      .then((data: PsgcItem[]) => setBarangays(data.sort((a, b) => a.name.localeCompare(b.name))))
      .catch(console.error)
      .finally(() => setLoadingBarangays(false))
  }, [selectedCityCode])

  // ── Cancel edit — restore saved values + PSGC codes ──────────────────────
  const handleCancelEdit = () => {
    if (!user) return
    setProfileData({
      firstName:             user.firstName             || '',
      middleName:            user.middleName            || '',
      lastName:              user.lastName              || '',
      contact:               user.contact               || '',
      birthday:              user.birthday              || '',
      birthplace:            user.birthplace            || '',
      houseStreet:           user.houseStreet           || '',
      barangay:              user.barangay              || '',
      municipalityCity:      user.municipalityCity      || '',
      province:              user.province              || '',
      region:                user.region                || '',
      zipCode:               user.zipCode               || '',
      gender:                user.gender                || undefined,
      educationalAttainment: user.educationalAttainment || '',
      civilStatus:           user.civilStatus           || '',
      currentJob:            user.currentJob            || '',
    })
    // Re-sync PSGC codes from saved region name
    const regionMatch = regions.find(r => r.name === (user.region || ''))
    setSelectedRegionCode(regionMatch?.code || '')
    setSelectedProvinceCode('')
    setSelectedCityCode('')
    setPreviewURL(null)
    setProfilePictureFile(null)
    setIsEditMode(false)
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isEditMode) return
    try {
      setSaving(true); setError(''); setSuccess('')
      let profileImageURL = user.photoURL || ''
      if (profilePictureFile) {
        try {
          setUploadingImage(true)
          const fullName = [profileData.firstName, profileData.middleName, profileData.lastName].filter(Boolean).join(' ')
          const url = await uploadToCloudinary(profilePictureFile, 'mru-roadmap', user?.uid, fullName || user?.displayName, `Profile_picture_${profileData.lastName || user?.displayName}`)
          profileImageURL = url
          setPreviewURL(null)
        } catch (err: any) {
          setError(err.message || 'Failed to upload profile picture'); return
        } finally {
          setUploadingImage(false)
        }
      }
      const fullName = [profileData.firstName, profileData.middleName, profileData.lastName].filter(Boolean).join(' ')
      const updateData: Partial<User> = {
        firstName:             profileData.firstName,
        middleName:            profileData.middleName,
        lastName:              profileData.lastName,
        name:                  fullName,
        contact:               profileData.contact,
        birthday:              profileData.birthday,
        birthplace:            profileData.birthplace,
        houseStreet:           profileData.houseStreet,
        barangay:              profileData.barangay,
        municipalityCity:      profileData.municipalityCity,
        province:              profileData.province,    // '' for NCR
        region:                profileData.region,
        zipCode:               profileData.zipCode,
        educationalAttainment: profileData.educationalAttainment,
        civilStatus:           profileData.civilStatus,
        currentJob:            profileData.currentJob,
        profileImage:          profileImageURL,
        photoURL:              profileImageURL,
      }
      if (profileData.gender) updateData.gender = profileData.gender
      await updateUserProfile(user.uid, updateData)
      setUser({ ...user, ...updateData })
      setIsEditMode(false)
      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (passwordData.newPassword.length < 6) { setError('Password must be at least 6 characters long'); return }
    if (passwordData.newPassword !== passwordData.confirmPassword) { setError('Password and confirm password do not match'); return }
    setSaving(true)
    try {
      await changePassword(passwordData.newPassword)
      setSuccess(user?.hasPassword === false
        ? 'Password set up successfully! You can now sign in with your email and password.'
        : 'Password changed successfully!')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordSection(false)
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message || 'Failed to set up password')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 5 * 1024 * 1024) { setError('Image size must be less than 5MB'); return }
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    setProfilePictureFile(file)
    setPreviewURL(URL.createObjectURL(file))
  }

  const handleSignOut = async () => {
    try { await signOutUser(); router.push('/auth') }
    catch (e) { console.error('Error signing out:', e) }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  const displayImage = previewURL || user?.photoURL || null
  const displayName  = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ')
    || user?.name || user?.displayName || 'No name set'

  // ── shared class helpers ──────────────────────────────────────────────────
  const fieldClass = (extra = '') =>
    `w-full px-3 py-2 border border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm disabled:bg-gray-50 disabled:text-gray-500 ${extra}`
  const addrFieldClass = (extra = '') =>
    `w-full px-3 py-2 border border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm disabled:bg-white disabled:text-gray-500 ${extra}`
  const selectAddrClass =
    'w-full px-3 py-2 border border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all text-sm disabled:bg-white disabled:text-gray-400 disabled:cursor-not-allowed'

  const EyeIcon = ({ visible }: { visible: boolean }) => visible ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <Navbar />

      <main className="w-[90%] mx-auto px-4 py-8">

        {error   && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">{success}</div>}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 justify-center w-full max-w-7xl mx-auto">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:w-[30%] w-full">

            {/* Action buttons */}
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={isEditMode ? handleCancelEdit : () => router.push('/dashboard')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                {isEditMode ? 'Cancel' : 'Dashboard'}
              </button>
              {!isEditMode ? (
                <button type="button" onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 rounded-lg font-semibold transition-colors text-sm bg-yellow-400 text-white hover:bg-yellow-500">
                  Edit Profile
                </button>
              ) : (
                <button type="button" disabled={saving}
                  onClick={() => (document.getElementById('profileForm') as HTMLFormElement)?.requestSubmit()}
                  className="px-4 py-2 rounded-lg font-semibold transition-colors text-sm bg-yellow-400 text-white hover:bg-yellow-500 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>

            {/* Profile Picture */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {displayImage ? (
                    <img className="w-32 h-32 rounded-full object-cover" src={displayImage} alt={displayName} />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-yellow-400 flex items-center justify-center">
                      <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900 text-lg">{displayName}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  {user?.advisorType && (
                    <span className={`inline-block mt-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                      user.advisorType === 'new' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.advisorType === 'new' ? 'New Financial Advisor' : 'Returnee Financial Advisor'}
                    </span>
                  )}
                  {previewURL && <p className="text-xs text-yellow-600 mt-1">New picture selected — save to apply</p>}
                </div>
                <input disabled={!isEditMode} ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button type="button" disabled={!isEditMode} onClick={() => fileInputRef.current?.click()}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors text-sm ${isEditMode ? 'bg-yellow-400 text-white hover:bg-yellow-500' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                  Choose New Picture
                </button>
                <p className="text-xs text-gray-400 text-center">Max 5MB · JPG, PNG, GIF, WEBP</p>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-gray-900">
                  {user?.hasPassword === false ? 'Set Up Password' : 'Change Password'}
                </h2>
                <button type="button" disabled={!isEditMode}
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className={`text-sm font-medium ${isEditMode ? 'text-blue-600 hover:text-blue-700' : 'text-gray-400 cursor-not-allowed'}`}>
                  {showPasswordSection ? 'Cancel' : (user?.hasPassword === false ? 'Set Up' : 'Change')}
                </button>
              </div>
              {!showPasswordSection && user?.hasPassword === false && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> You signed in with Google. Set up a password to enable email/password sign-in.
                  </p>
                </div>
              )}
              {!showPasswordSection && user?.hasPassword !== false && (
                <p className="text-sm text-gray-500">Update your account password anytime.</p>
              )}
              {showPasswordSection && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {user?.hasPassword !== false && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                      <div className="relative">
                        <input disabled={!isEditMode} type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className={fieldClass('pr-10')} placeholder="••••••••" required />
                        <button type="button" tabIndex={-1}
                          onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                          <EyeIcon visible={showPasswords.current} />
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {user?.hasPassword === false ? 'Password' : 'New Password'}
                    </label>
                    <div className="relative">
                      <input disabled={!isEditMode} type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className={fieldClass('pr-10')} placeholder="••••••••" minLength={6} required />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                        <EyeIcon visible={showPasswords.new} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Must be at least 6 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm {user?.hasPassword === false ? 'Password' : 'New Password'}
                    </label>
                    <div className="relative">
                      <input disabled={!isEditMode} type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className={fieldClass('pr-10')} placeholder="••••••••" minLength={6} required />
                      <button type="button" tabIndex={-1}
                        onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                        <EyeIcon visible={showPasswords.confirm} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={saving}
                      className="bg-blue-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 text-sm">
                      {saving ? 'Saving...' : (user?.hasPassword === false ? 'Set Up Password' : 'Change Password')}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>

          {/* ── RIGHT COLUMN — Personal Info ── */}
          <div className="lg:w-[60%] w-full">
            <form id="profileForm" onSubmit={handleProfileUpdate} className="bg-white rounded-xl shadow-lg p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              </div>

              <div className="space-y-4">

                {/* Name */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(['firstName', 'middleName', 'lastName'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field === 'firstName' ? 'First Name' : field === 'middleName' ? 'Middle Name' : 'Last Name'}
                        {field === 'middleName' && <span className="text-gray-400 font-normal"> (Optional)</span>}
                      </label>
                      <input disabled={!isEditMode} type="text" value={profileData[field]}
                        onChange={e => setProfileData({ ...profileData, [field]: e.target.value })}
                        className={fieldClass()} placeholder={field === 'firstName' ? 'First name' : field === 'middleName' ? 'Middle name' : 'Last name'} />
                    </div>
                  ))}
                </div>

                {/* Email · Contact · Gender */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email <span className="text-gray-400 font-normal text-xs">(not editable)</span>
                    </label>
                    <input disabled type="email" value={user?.email || ''}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                    <input disabled={!isEditMode} type="tel" value={profileData.contact}
                      onChange={e => setProfileData({ ...profileData, contact: e.target.value })}
                      className={fieldClass()} placeholder="e.g. 09123456789" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select disabled={!isEditMode} value={profileData.gender || ''}
                      onChange={e => setProfileData({ ...profileData, gender: e.target.value as 'male' | 'female' | 'other' | undefined })}
                      className={fieldClass()}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Birthday · Age */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Birthday</label>
                    <input disabled={!isEditMode} type="date" value={profileData.birthday}
                      onChange={e => setProfileData({ ...profileData, birthday: e.target.value })}
                      className={fieldClass()}
                      min={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 100); return d.toISOString().split('T')[0] })()}
                      max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0] })()}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center min-h-[38px]">
                      {computedAge !== null
                        ? <><span className="font-semibold text-blue-900">{computedAge}</span><span className="ml-1 text-gray-400">years old</span></>
                        : <span className="text-gray-400 italic">Auto-computed from birthday</span>}
                    </div>
                  </div>
                </div>

                {/* Birthplace · Civil Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Birthplace</label>
                    <input disabled={!isEditMode} type="text" value={profileData.birthplace}
                      onChange={e => setProfileData({ ...profileData, birthplace: e.target.value })}
                      className={fieldClass()} placeholder="e.g. Daet, Camarines Norte" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Civil Status</label>
                    <select disabled={!isEditMode} value={profileData.civilStatus}
                      onChange={e => setProfileData({ ...profileData, civilStatus: e.target.value })}
                      className={fieldClass()}>
                      <option value="">Select civil status</option>
                      {['Single','Married','Widowed','Separated','Divorced','Annulled'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Education · Job */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Educational Attainment</label>
                    <select disabled={!isEditMode} value={profileData.educationalAttainment}
                      onChange={e => setProfileData({ ...profileData, educationalAttainment: e.target.value })}
                      className={fieldClass()}>
                      <option value="">Select education level</option>
                      {['High School','College Undergraduate','College Graduate',"Master's Degree",'PhD','Other'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Job <span className="text-gray-400 font-normal">(N/A if none)</span>
                    </label>
                    <input disabled={!isEditMode} type="text" value={profileData.currentJob}
                      onChange={e => setProfileData({ ...profileData, currentJob: e.target.value })}
                      className={fieldClass()} placeholder="e.g. Teacher, N/A" />
                  </div>
                </div>

                {/* ── Address ── */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Address</label>
                  <div className="space-y-3 p-4 border border-gray-100 rounded-lg bg-gray-50">

                    {/* House No. / Street */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        House No. / Street <span className="text-gray-400">(Optional)</span>
                      </label>
                      <input disabled={!isEditMode} type="text" value={profileData.houseStreet}
                        onChange={e => setProfileData({ ...profileData, houseStreet: e.target.value })}
                        className={addrFieldClass()} placeholder="e.g. 123 Rizal St." />
                    </div>

                    {/* Region */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Region <span className="text-red-500">*</span>
                      </label>
                      {isEditMode ? (
                        <select value={selectedRegionCode}
                          onChange={e => {
                            const code = e.target.value
                            const name = regions.find(r => r.code === code)?.name || ''
                            setSelectedRegionCode(code)
                            setProfileData(prev => ({ ...prev, region: name, province: '', municipalityCity: '', barangay: '' }))
                          }}
                          className={selectAddrClass} required>
                          <option value="">Select region</option>
                          {regions.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 min-h-[38px]">
                          {profileData.region || <span className="text-gray-400 italic">—</span>}
                        </div>
                      )}
                    </div>

                    {/* Province — hidden for NCR */}
                    {selectedRegionCode && !isNCR && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Province <span className="text-red-500">*</span>
                        </label>
                        {isEditMode ? (
                          <select value={selectedProvinceCode}
                            onChange={e => {
                              const code = e.target.value
                              const name = provinces.find(p => p.code === code)?.name || ''
                              setSelectedProvinceCode(code)
                              setProfileData(prev => ({ ...prev, province: name, municipalityCity: '', barangay: '' }))
                            }}
                            className={selectAddrClass}
                            disabled={loadingProvinces || provinces.length === 0} required>
                            <option value="">{loadingProvinces ? 'Loading provinces…' : 'Select province'}</option>
                            {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
                          </select>
                        ) : (
                          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 min-h-[38px]">
                            {profileData.province || <span className="text-gray-400 italic">—</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* NCR notice (edit mode only) */}
                    {isEditMode && isNCR && (
                      <div className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
                        📍 <strong>NCR (Metro Manila)</strong> — no province. Select your city directly below.
                      </div>
                    )}

                    {/* View-mode province display when NCR */}
                    {!isEditMode && profileData.region && !profileData.province && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Province</label>
                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-blue-700 min-h-[38px]">
                          N/A <span className="text-gray-400">(NCR — no province)</span>
                        </div>
                      </div>
                    )}

                    {/* City / Municipality */}
                    {(isNCR || selectedProvinceCode) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          City / Municipality <span className="text-red-500">*</span>
                        </label>
                        {isEditMode ? (
                          <select value={selectedCityCode}
                            onChange={e => {
                              const code = e.target.value
                              const name = cities.find(c => c.code === code)?.name || ''
                              setSelectedCityCode(code)
                              setProfileData(prev => ({ ...prev, municipalityCity: name, barangay: '' }))
                            }}
                            className={selectAddrClass}
                            disabled={loadingCities || cities.length === 0} required>
                            <option value="">{loadingCities ? 'Loading cities/municipalities…' : 'Select city / municipality'}</option>
                            {cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                          </select>
                        ) : (
                          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 min-h-[38px]">
                            {profileData.municipalityCity || <span className="text-gray-400 italic">—</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* City (view mode, no region code loaded yet) */}
                    {!isEditMode && !selectedRegionCode && profileData.municipalityCity && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City / Municipality</label>
                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 min-h-[38px]">
                          {profileData.municipalityCity}
                        </div>
                      </div>
                    )}

                    {/* Barangay */}
                    {(selectedCityCode || (!isEditMode && profileData.barangay)) && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Barangay <span className="text-red-500">*</span>
                        </label>
                        {isEditMode ? (
                          <select value={profileData.barangay}
                            onChange={e => setProfileData(prev => ({ ...prev, barangay: e.target.value }))}
                            className={selectAddrClass}
                            disabled={loadingBarangays || barangays.length === 0} required>
                            <option value="">{loadingBarangays ? 'Loading barangays…' : 'Select barangay'}</option>
                            {barangays.map(b => <option key={b.code} value={b.name}>{b.name}</option>)}
                          </select>
                        ) : (
                          <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 min-h-[38px]">
                            {profileData.barangay || <span className="text-gray-400 italic">—</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ZIP Code */}
                    <div className="md:w-1/3">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        ZIP Code <span className="text-red-500">*</span>
                      </label>
                      <input disabled={!isEditMode} type="text" value={profileData.zipCode} maxLength={10}
                        onChange={e => setProfileData({ ...profileData, zipCode: e.target.value })}
                        className={addrFieldClass()} placeholder="e.g. 4600" />
                    </div>

                  </div>
                </div>
                {/* ── End Address ── */}

              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}