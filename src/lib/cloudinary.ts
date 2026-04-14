// Cloudinary configuration and upload utilities

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'divtweyoo'

const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'moutnrushmoreunit'

interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  format: string
  bytes: number
  resource_type: string
}

// 📌 Detect file category
const getFileCategory = (file: File): string => {
  const type = file.type

  if (type.startsWith('image/')) return 'images'
  if (type === 'application/pdf') return 'pdfs'

  if (
    type === 'application/msword' ||
    type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return 'documents'

  if (
    type === 'application/vnd.ms-excel' ||
    type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
    return 'spreadsheets'

  return 'others'
}

// 📌 Build user folder
const buildUserFolder = (
  baseFolder: string,
  userName?: string,
  userId?: string
): string => {
  if (userName) {
    const nameParts = userName.trim().split(' ')
    if (nameParts.length >= 2) {
      const lastName = nameParts[nameParts.length - 1]
      const firstName = nameParts.slice(0, -1).join('_')
      return `${baseFolder}/${lastName}_${firstName}`
    }
    return `${baseFolder}/${userName}`
  } else if (userId) {
    return `${baseFolder}/user_${userId}`
  }
  return baseFolder
}

// 📌 Upload single file
const uploadSingleFile = async (
  file: File,
  fullFolder: string,
  documentType?: string
): Promise<string> => {
  // Clean filename
  const cleanName = file.name.replace(/\s+/g, '_')
  const fileName = cleanName.replace(/\.[^/.]+$/, '')

  // Detect category
  const category = getFileCategory(file)

  // Final folder (user + category)
  const finalFolder = fullFolder

  // Determine resource type
  const isImage = file.type.startsWith('image/')
  const isPdf = file.type === 'application/pdf'
  const resourceType = (isImage || isPdf) ? 'image' : 'raw'

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', finalFolder)
  formData.append('public_id', fileName)

  console.log('Uploading:', {
    name: fileName,
    type: file.type,
    folder: finalFolder,
    resourceType,
  })

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()

    let errorMessage = 'Upload failed'
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.error?.message || errorMessage
    } catch {
      errorMessage = errorText || errorMessage
    }

    throw new Error(errorMessage)
  }

  const data: CloudinaryUploadResponse = await response.json()

  console.log('Upload success:', data)

  return data.secure_url
}

// 📌 Public API (single)
export const uploadToCloudinary = async (
  file: File,
  folder: string = 'mru-roadmap',
  userId?: string,
  userName?: string,
  documentType?: string
): Promise<string> => {
  try {
    const fullFolder = buildUserFolder(folder, userName, userId)
    return await uploadSingleFile(file, fullFolder, documentType)
  } catch (error) {
    console.error('Upload error:', error)
    throw new Error(
      `Failed to upload file: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    )
  }
}

// 📌 Public API (multiple)
export const uploadMultipleToCloudinary = async (
  files: File[],
  folder: string = 'mru-roadmap',
  userId?: string,
  userName?: string,
  documentType?: string
): Promise<string[]> => {
  try {
    const fullFolder = buildUserFolder(folder, userName, userId)

    const uploadPromises = files.map((file) =>
      uploadSingleFile(file, fullFolder, documentType)
    )

    return await Promise.all(uploadPromises)
  } catch (error) {
    console.error('Multiple upload error:', error)
    throw new Error('Failed to upload files')
  }
}