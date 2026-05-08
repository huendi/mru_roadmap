import { v2 as cloudinary } from 'cloudinary'

export const uploadBufferToCloudinary = async (
  buffer: Buffer,
  fileName: string
) => {
  // Config called at runtime so env vars are always available
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  // Generate unique public_id to avoid corruption from overwrites
  const timestamp = Date.now()
  const cleanName = fileName.replace(/\s+/g, '_').replace(/\.docx$/i, '')
  const uniquePublicId = `${cleanName}_${timestamp}`

  return await new Promise<any>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto', // Let Cloudinary detect the resource type
        folder: 'question_uploads',
        public_id: uniquePublicId,
        overwrite: false, // Prevent overwrites to avoid corruption
        format: 'docx', // Ensure format is preserved
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )

    stream.write(buffer)
    stream.end()
  })
}