'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChange, updateUserProfile, signOutUser } from '@/lib/auth'
import { User } from '@/types'

export default function CompleteProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form data
  const [profileData, setProfileData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    contact: '',
    birthday: '',
    birthplace: '',
    // Split address
    houseStreet: '',
    barangay: '',
    municipalityCity: '',
    province: '',
    zipCode: '',
    gender: '',
    educationalAttainment: '',
    civilStatus: '',
    currentJob: '',
  })

  // Auto-computed age
  const [computedAge, setComputedAge] = useState<number | null>(null)

  // Re-compute age whenever birthday changes
  useEffect(() => {
    if (!profileData.birthday) {
      setComputedAge(null)
      return
    }
    const birth = new Date(profileData.birthday)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    setComputedAge(age)
  }, [profileData.birthday])

  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      if (!currentUser) {
        router.push('/auth')
        return
      }

      if (currentUser.role === 'admin') {
        router.push('/admin')
        return
      }

      if (currentUser.status === 'pending') {
        router.push('/waiting-for-approval')
        return
      }

      if (currentUser.profileCompleted) {
        router.push('/dashboard')
        return
      }

      setUser(currentUser)
      setProfileData({
        firstName: currentUser.firstName || '',
        middleName: currentUser.middleName || '',
        lastName: currentUser.lastName || (currentUser.displayName?.split(' ').slice(-1)[0] || ''),
        contact: currentUser.contact || '',
        birthday: currentUser.birthday || '',
        birthplace: currentUser.birthplace || '',
        houseStreet: currentUser.houseStreet || '',
        barangay: currentUser.barangay || '',
        municipalityCity: currentUser.municipalityCity || '',
        province: currentUser.province || '',
        zipCode: currentUser.zipCode || '',
        gender: currentUser.gender || '',
        educationalAttainment: currentUser.educationalAttainment || '',
        civilStatus: currentUser.civilStatus || '',
        currentJob: currentUser.currentJob || '',
      })
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const getMaxDate = () => {
    const today = new Date()
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
    return maxDate.toISOString().split('T')[0]
  }

  const validateAge = (birthDate: string): boolean => {
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age >= 18
  }

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
          .filter(Boolean)
          .join(' ')

        await updateUserProfile(user.uid, {
          firstName: profileData.firstName,
          middleName: profileData.middleName,
          lastName: profileData.lastName,
          name: updatedName,
          contact: profileData.contact,
          birthday: profileData.birthday,
          birthplace: profileData.birthplace,
          houseStreet: profileData.houseStreet,
          barangay: profileData.barangay,
          municipalityCity: profileData.municipalityCity,
          province: profileData.province,
          zipCode: profileData.zipCode,
          gender: profileData.gender as 'male' | 'female' | 'other',
          educationalAttainment: profileData.educationalAttainment,
          civilStatus: profileData.civilStatus,
          currentJob: profileData.currentJob,
          profileCompleted: true,
        })

          setUser(prev => prev ? {
          ...prev,
          name: updatedName,
          firstName: profileData.firstName,
          middleName: profileData.middleName,
          lastName: profileData.lastName,
          profileCompleted: true
        } : prev)

        setSuccess('Profile completed successfully! Redirecting to dashboard...')
        setTimeout(() => router.push('/dashboard'), 2000)
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOutUser()
      router.push('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center px-4 py-10">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
            <p className="text-gray-600">Please provide some additional information to get started</p>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={profileData.middleName}
                  onChange={(e) => setProfileData({ ...profileData, middleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  placeholder="Middle name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            {/* Contact + Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                <input
                  type="tel"
                  value={profileData.contact}
                  onChange={(e) => setProfileData({ ...profileData, contact: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  placeholder="e.g. 09123456789"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                <select
                  value={profileData.gender}
                  onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Birthday + Age (auto-computed) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday * (Must be 18+)</label>
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => setProfileData({ ...profileData, birthday: e.target.value })}
                  max={getMaxDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm flex items-center min-h-[38px]">
                  {computedAge !== null
                    ? <><span className="font-semibold text-blue-900">{computedAge}</span><span className="ml-1 text-gray-400">years old</span></>
                    : <span className="text-gray-400 italic">Auto-computed from birthday</span>
                  }
                </div>
              </div>
            </div>

            {/* Birthplace */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthplace *</label>
              <input
                type="text"
                value={profileData.birthplace}
                onChange={(e) => setProfileData({ ...profileData, birthplace: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                placeholder="e.g. Daet, Camarines Norte"
                required
              />
            </div>

            {/* Civil Status + Educational Attainment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Civil Status *</label>
                <select
                  value={profileData.civilStatus}
                  onChange={(e) => setProfileData({ ...profileData, civilStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="">Select civil status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Separated">Separated</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Annulled">Annulled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Educational Attainment *</label>
                <select
                  value={profileData.educationalAttainment}
                  onChange={(e) => setProfileData({ ...profileData, educationalAttainment: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                  required
                >
                  <option value="">Select education level</option>
                  <option value="High School">High School</option>
                  <option value="College Undergraduate">College Undergraduate</option>
                  <option value="College Graduate">College Graduate</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Current Job */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Job * <span className="text-gray-400 font-normal">(Put N/A if none)</span>
              </label>
              <input
                type="text"
                value={profileData.currentJob}
                onChange={(e) => setProfileData({ ...profileData, currentJob: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                placeholder="e.g. Software Engineer, Teacher, N/A"
                required
              />
            </div>

            {/* Address Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50">

                {/* House No. / Street */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    House No. / Street <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.houseStreet}
                    onChange={(e) => setProfileData({ ...profileData, houseStreet: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm bg-white"
                    placeholder="e.g. 123 Rizal St."
                  />
                </div>

                {/* Barangay */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Barangay <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.barangay}
                    onChange={(e) => setProfileData({ ...profileData, barangay: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm bg-white"
                    placeholder="e.g. Barangay Poblacion"
                    required
                  />
                </div>

                {/* Municipality/City + Province */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Municipality / City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.municipalityCity}
                      onChange={(e) => setProfileData({ ...profileData, municipalityCity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm bg-white"
                      placeholder="e.g. Daet"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileData.province}
                      onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm bg-white"
                      placeholder="e.g. Camarines Norte"
                      required
                    />
                  </div>
                </div>

                {/* ZIP Code */}
                <div className="md:w-1/3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.zipCode}
                    onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm bg-white"
                    placeholder="e.g. 4600"
                    maxLength={10}
                    required
                  />
                </div>

              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-yellow-600 text-white py-3 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? 'Saving...' : 'Complete Profile'}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Sign Out
              </button>
            </div>

          </form>

          {/* Footer note */}
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