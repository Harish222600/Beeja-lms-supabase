import React, { createContext, useContext, useRef, useState } from 'react'
import { apiConnector } from '../services/apiConnector'

const UploadContext = createContext()

export const useUpload = () => {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}

export const UploadProvider = ({ children }) => {
  const [activeUploads, setActiveUploads] = useState(new Map())
  const uploadSessionRef = useRef(0)

  // Generate unique upload session ID
  const generateUploadId = () => {
    uploadSessionRef.current += 1
    return `upload_${Date.now()}_${uploadSessionRef.current}`
  }

  // Cancel upload on backend
  const cancelUploadOnBackend = async (uploadId) => {
    try {
      console.log('🚫 Cancelling upload on backend:', uploadId)
      const response = await apiConnector('POST', `/api/v1/upload/cancel/${uploadId}`)
      console.log('✅ Backend upload cancelled:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Failed to cancel upload on backend:', error)
      // Don't throw error - frontend cancellation should still work
      return null
    }
  }

  // Cancel multiple uploads on backend
  const cancelMultipleUploadsOnBackend = async (uploadIds) => {
    try {
      console.log('🚫 Cancelling multiple uploads on backend:', uploadIds)
      const response = await apiConnector('POST', '/api/v1/upload/cancel-multiple', {
        uploadIds
      })
      console.log('✅ Backend uploads cancelled:', response.data)
      return response.data
    } catch (error) {
      console.error('❌ Failed to cancel uploads on backend:', error)
      // Don't throw error - frontend cancellation should still work
      return null
    }
  }

  // Register a new upload
  const registerUpload = (uploadId, abortController, metadata = {}) => {
    console.log('📝 Registering upload:', uploadId, metadata)
    setActiveUploads(prev => {
      const newMap = new Map(prev)
      newMap.set(uploadId, {
        abortController,
        metadata,
        startTime: Date.now(),
        status: 'uploading'
      })
      return newMap
    })
  }

  // Unregister an upload (completed or failed)
  const unregisterUpload = (uploadId) => {
    console.log('🗑️ Unregistering upload:', uploadId)
    setActiveUploads(prev => {
      const newMap = new Map(prev)
      newMap.delete(uploadId)
      return newMap
    })
  }

  // Cancel a specific upload
  const cancelUpload = async (uploadId) => {
    const upload = activeUploads.get(uploadId)
    if (upload) {
      console.log('❌ Cancelling upload:', uploadId)
      
      // Cancel frontend request
      upload.abortController.abort()
      
      // Update status to cancelled
      setActiveUploads(prev => {
        const newMap = new Map(prev)
        const uploadData = newMap.get(uploadId)
        if (uploadData) {
          uploadData.status = 'cancelled'
          newMap.set(uploadId, uploadData)
        }
        return newMap
      })

      // Cancel on backend if uploadId looks like a backend upload ID
      if (upload.metadata?.backendUploadId) {
        await cancelUploadOnBackend(upload.metadata.backendUploadId)
      }
    }
  }

  // Cancel all active uploads
  const cancelAllUploads = async () => {
    console.log('🚫 Cancelling all uploads. Active uploads:', activeUploads.size)
    
    const backendUploadIds = []
    
    activeUploads.forEach((upload, uploadId) => {
      if (upload.status === 'uploading') {
        console.log('❌ Cancelling upload:', uploadId, upload.metadata)
        upload.abortController.abort()
        
        // Collect backend upload IDs
        if (upload.metadata?.backendUploadId) {
          backendUploadIds.push(upload.metadata.backendUploadId)
        }
      }
    })
    
    // Cancel on backend if there are backend upload IDs
    if (backendUploadIds.length > 0) {
      await cancelMultipleUploadsOnBackend(backendUploadIds)
    }
    
    // Update all statuses to cancelled
    setActiveUploads(prev => {
      const newMap = new Map()
      prev.forEach((upload, uploadId) => {
        newMap.set(uploadId, {
          ...upload,
          status: 'cancelled'
        })
      })
      return newMap
    })

    // Clear all uploads after a short delay to allow cleanup
    setTimeout(() => {
      console.log('🧹 Clearing cancelled uploads')
      setActiveUploads(new Map())
    }, 1000)
  }

  // Check if an upload was cancelled
  const isUploadCancelled = (uploadId) => {
    const upload = activeUploads.get(uploadId)
    return upload?.status === 'cancelled' || false
  }

  // Get upload status
  const getUploadStatus = (uploadId) => {
    const upload = activeUploads.get(uploadId)
    return upload?.status || 'unknown'
  }

  // Get all active uploads
  const getActiveUploads = () => {
    return Array.from(activeUploads.entries()).map(([id, upload]) => ({
      id,
      ...upload
    }))
  }

  // Get active uploads count
  const getActiveUploadsCount = () => {
    return Array.from(activeUploads.values()).filter(
      upload => upload.status === 'uploading'
    ).length
  }

  const value = {
    // State
    activeUploads: getActiveUploads(),
    activeUploadsCount: getActiveUploadsCount(),
    
    // Methods
    generateUploadId,
    registerUpload,
    unregisterUpload,
    cancelUpload,
    cancelAllUploads,
    isUploadCancelled,
    getUploadStatus
  }

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  )
}

export default UploadContext
