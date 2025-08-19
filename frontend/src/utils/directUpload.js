import { supabase, UPLOAD_CONFIG, getBucketForFileType, validateFile, shouldUseResumableUpload } from '../config/supabase'
import { v4 as uuidv4 } from 'uuid'

/**
 * Generate a unique filename with timestamp and UUID
 */
export const generateUniqueFilename = (originalName, folder = '') => {
  const timestamp = Date.now()
  const uuid = uuidv4().substring(0, 8)
  const extension = originalName.split('.').pop()
  const baseName = originalName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_')
  
  const filename = `${baseName}_${timestamp}_${uuid}.${extension}`
  return folder ? `${folder}/${filename}` : filename
}

/**
 * Get authentication token from Redux store or localStorage
 */
const getAuthToken = () => {
  // Try multiple methods to get the token
  
  // Method 1: Direct localStorage token
  const directToken = localStorage.getItem('token')
  if (directToken) {
    console.log('Found token via direct localStorage access')
    return directToken
  }
  
  // Method 2: Redux persist store
  const persistedState = localStorage.getItem('persist:root')
  if (persistedState) {
    try {
      const parsed = JSON.parse(persistedState)
      const authState = JSON.parse(parsed.auth || '{}')
      if (authState.token) {
        console.log('Found token via Redux persist store')
        return authState.token
      }
    } catch (error) {
      console.warn('Failed to get token from persisted state:', error)
    }
  }
  
  // Method 3: Check if Redux store is available globally
  if (typeof window !== 'undefined' && window.__REDUX_STORE__) {
    try {
      const state = window.__REDUX_STORE__.getState()
      const token = state.auth?.token
      if (token) {
        console.log('Found token via global Redux store')
        return token
      }
    } catch (error) {
      console.warn('Failed to get token from global Redux store:', error)
    }
  }
  
  console.warn('No authentication token found')
  return null
}

/**
 * Direct upload for small files (<50MB) using signed URLs
 */
export const directUpload = async (file, folder = '', options = {}) => {
  const { onProgress = null, uploadId = null, abortController = null, uploadContext = null } = options
  
  try {
    console.log('🚀 Starting direct upload:', {
      name: file.name,
      size: file.size,
      type: file.type,
      uploadId
    })

    const token = getAuthToken()
    if (!token) {
      throw new Error('Authentication token not found. Please login again.')
    }

    // Step 1: Get signed URL from backend
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:5001'
    const signedUrlResponse = await fetch(`${baseUrl}/api/v1/upload/signed-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        folder: folder
      }),
      signal: abortController?.signal
    })

    if (!signedUrlResponse.ok) {
      const errorData = await signedUrlResponse.json()
      throw new Error(errorData.message || 'Failed to get signed URL')
    }

    const { data: signedUrlData } = await signedUrlResponse.json()
    console.log('✅ Signed URL obtained:', signedUrlData.uploadId)

    // Register upload with context if provided
    if (uploadContext && uploadId) {
      uploadContext.registerUpload(uploadId, abortController, {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        backendUploadId: signedUrlData.uploadId // Store backend upload ID for cancellation
      })
    }

    // Check if upload was cancelled before proceeding
    if (abortController?.signal?.aborted) {
      throw new Error('Upload cancelled')
    }

    // Step 2: Upload file directly to Supabase using signed URL
    const uploadResponse = await fetch(signedUrlData.signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        'Cache-Control': 'max-age=3600'
      },
      signal: abortController?.signal
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
    }

    console.log('✅ File uploaded to storage')

    // Check if upload was cancelled before completing
    if (abortController?.signal?.aborted) {
      throw new Error('Upload cancelled')
    }

    // Step 3: Complete upload and get metadata
    const completeResponse = await fetch(`${baseUrl}/api/v1/upload/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        uploadId: signedUrlData.uploadId
      }),
      signal: abortController?.signal
    })

    if (!completeResponse.ok) {
      const errorData = await completeResponse.json()
      throw new Error(errorData.message || 'Failed to complete upload')
    }

    const { data: result } = await completeResponse.json()
    console.log('✅ Direct upload completed:', result)

    // Unregister upload from context on success
    if (uploadContext && uploadId) {
      uploadContext.unregisterUpload(uploadId)
    }

    return result

  } catch (error) {
    // Unregister upload from context on error
    if (uploadContext && uploadId) {
      uploadContext.unregisterUpload(uploadId)
    }

    if (error.name === 'AbortError' || error.message === 'Upload cancelled') {
      console.log('🚫 Direct upload cancelled:', file.name)
      throw new Error('Upload cancelled')
    }
    console.error('❌ Direct upload failed:', error)
    throw error
  }
}

/**
 * Main upload function that chooses between direct and resumable upload
 */
export const uploadFile = async (file, folder = '', options = {}) => {
  try {
    console.log('🔄 Determining upload strategy for:', {
      name: file.name,
      size: file.size,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    })

    // For now, use direct upload for all files
    // TODO: Implement resumable upload for large files
    console.log('🚀 Using direct upload')
    return await directUpload(file, folder, options)

  } catch (error) {
    console.error('❌ Upload failed:', error)
    throw error
  }
}

/**
 * Placeholder ResumableUploader class for future implementation
 */
export class ResumableUploader {
  constructor(file, folder = '', options = {}) {
    this.file = file
    this.folder = folder
    this.options = options
    console.log('📦 ResumableUploader initialized (placeholder)')
  }

  async start() {
    // For now, fallback to direct upload
    return await directUpload(this.file, this.folder, this.options)
  }

  pause() {
    console.log('⏸️ Pause not implemented yet')
  }

  resume() {
    console.log('▶️ Resume not implemented yet')
  }

  cancel() {
    console.log('❌ Cancel not implemented yet')
  }

  getProgress() {
    return {
      progress: 0,
      uploadedBytes: 0,
      totalBytes: this.file.size,
      isUploading: false,
      isPaused: false,
      isCompleted: false,
      isCancelled: false
    }
  }
}

export default {
  uploadFile,
  directUpload,
  ResumableUploader,
  generateUniqueFilename
}
