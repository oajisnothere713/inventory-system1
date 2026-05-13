import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function CameraQRScanner({ onDetected, onClose }: { onDetected: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [detectedBox, setDetectedBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let canvas: HTMLCanvasElement | null = null
    async function start() {
      setError(null)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera not supported on this device')
        return
      }
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (!mounted) { stream.getTracks().forEach(t=>t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // ensure autoplay works
          try {
            videoRef.current.muted = true
          } catch (e) {}
          try { videoRef.current.playsInline = true } catch (e) {}
          try {
            await videoRef.current.play()
          } catch (e) {
            // ignore play errors; will attempt frames anyway
          }
        }
        setScanning(true)
        // create offscreen canvas for jsQR fallback
        canvas = document.createElement('canvas')
        scanLoop()
      } catch (e: any) {
        setError(e?.message || 'Could not access camera')
      }
    }

    let raf = 0
    const scanLoop = async () => {
      try {
        if (!videoRef.current) return
        const video = videoRef.current
        // Use native BarcodeDetector when available
        const BarcodeDetectorClass = (window as any).BarcodeDetector
        if (BarcodeDetectorClass) {
            const detector = new BarcodeDetectorClass({ formats: ['qr_code'] })
          // Some platforms perform better if we pass an ImageBitmap instead of the video element
          try {
            let img: ImageBitmap | null = null
            try {
              img = await createImageBitmap(video as any)
            } catch (_) {
              img = null
            }
            const target = img || video
            const results = await detector.detect(target)
            if (img) img.close()
            if (results && results.length) {
              const res = results[0]
              // boundingBox may be available
              const bb = (res as any).boundingBox
              if (bb && video) {
                // compute scale from video intrinsic to displayed size
                const vw = video.videoWidth || 1
                const vh = video.videoHeight || 1
                const cw = video.clientWidth || vw
                const ch = video.clientHeight || vh
                const scaleX = cw / vw
                const scaleY = ch / vh
                const x = bb.x * scaleX
                const y = bb.y * scaleY
                const w = bb.width * scaleX
                const h = bb.height * scaleY
                setDetectedBox({ x, y, w, h })
              } else {
                setDetectedBox(null)
              }

              // debounce confirmation: wait briefly so pointer visible, then trigger
              if (!detectTimerRef.current) {
                detectTimerRef.current = window.setTimeout(() => {
                  detectTimerRef.current = null
                  const code = res.rawValue || (res as any).rawData || ''
                  try { stop() } catch (e) {}
                  onDetected(code)
                }, 350)
              }
              return
            } else {
              // no results -> clear any visible pointer
              setDetectedBox(null)
            }
          } catch (detErr) {
            // detector failed on this frame, continue
          }
        } else {
          // Fallback using jsQR: draw to canvas and decode pixels
          try {
            if (!canvas) canvas = document.createElement('canvas')
            const w = video.videoWidth || 640
            const h = video.videoHeight || 480
            canvas.width = w
            canvas.height = h
            let ctx: CanvasRenderingContext2D | null = null
            try {
              ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D
            } catch (e) {
              ctx = canvas.getContext('2d')
            }
            if (ctx) {
              try {
                ctx.drawImage(video, 0, 0, w, h)
              } catch (err) {
                // drawImage may fail if video not ready
              }
              let imageData: ImageData | null = null
              try {
                imageData = ctx.getImageData(0, 0, w, h)
              } catch (gdErr) {
                // getImageData may fail; show hint
                // console.warn('getImageData failed', gdErr)
                imageData = null
              }
              if (imageData) {
                try {
                  const jsqrMod = await import('jsqr')
                  const jsQR = (jsqrMod && (jsqrMod as any).default) || (jsqrMod as any)
                  const qr = jsQR(imageData.data, w, h)
                  if (qr) {
                    const tl = qr.location.topLeftCorner
                    const br = qr.location.bottomRightCorner
                    const minX = Math.min(tl.x, br.x)
                    const minY = Math.min(tl.y, br.y)
                    const boxW = Math.abs(br.x - tl.x)
                    const boxH = Math.abs(br.y - tl.y)
                    const vw = video.videoWidth || 1
                    const vh = video.videoHeight || 1
                    const cw = video.clientWidth || vw
                    const ch = video.clientHeight || vh
                    const scaleX = cw / vw
                    const scaleY = ch / vh
                    setDetectedBox({ x: minX * scaleX, y: minY * scaleY, w: boxW * scaleX, h: boxH * scaleY })
                    if (!detectTimerRef.current) {
                      detectTimerRef.current = window.setTimeout(() => {
                        detectTimerRef.current = null
                        try { stop() } catch (e) {}
                        onDetected(qr.data)
                      }, 350)
                    }
                    return
                  } else {
                    setDetectedBox(null)
                  }
                } catch (impErr) {
                  // import or decode failed
                  // console.warn('jsQR error', impErr)
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore detection errors
      }
      raf = requestAnimationFrame(scanLoop)
    }

    function stop() {
      setScanning(false)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
    }

    start()

    return () => {
      mounted = false
      stop()
      try { cancelAnimationFrame(raf) } catch (e) {}
      if (detectTimerRef.current) {
        clearTimeout(detectTimerRef.current)
        detectTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function processImageFile(file: File) {
    setUploadError(null)
    try {
      // Try native BarcodeDetector first
      const BarcodeDetectorClass = (window as any).BarcodeDetector
      let bitmap: ImageBitmap | null = null
      try {
        bitmap = await createImageBitmap(file as any)
      } catch (e) {
        bitmap = null
      }

      if (BarcodeDetectorClass && bitmap) {
        try {
          const detector = new BarcodeDetectorClass({ formats: ['qr_code'] })
          const results = await detector.detect(bitmap)
          if (results && results.length) {
            const res = results[0]
            const code = res.rawValue || (res as any).rawData || ''
            try { if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()) } catch(e){}
            setScanning(false)
            try { bitmap.close && bitmap.close() } catch(e){}
            onDetected(code)
            return
          }
        } catch (e) {
          // fall through to jsQR fallback
        } finally {
          try { bitmap && (bitmap as any).close && (bitmap as any).close() } catch(e){}
        }
      }

      // jsQR fallback: draw image to canvas and decode
      try {
        let imgBitmap: ImageBitmap | null = null
        try { imgBitmap = await createImageBitmap(file as any) } catch (e) { imgBitmap = null }
        const canvas = document.createElement('canvas')
        const w = (imgBitmap && imgBitmap.width) || 1024
        const h = (imgBitmap && imgBitmap.height) || 1024
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas not available')
        if (imgBitmap) ctx.drawImage(imgBitmap as any, 0, 0, w, h)
        else {
          // fallback: load via Image
          const img = await new Promise<HTMLImageElement>((res, rej) => {
            const i = new Image()
            i.onload = () => res(i)
            i.onerror = rej
            i.src = URL.createObjectURL(file)
          })
          ctx.drawImage(img, 0, 0, w, h)
          URL.revokeObjectURL(img.src)
        }
        let imageData: ImageData | null = null
        try { imageData = ctx.getImageData(0, 0, w, h) } catch (e) { imageData = null }
        if (imageData) {
          const jsqrMod = await import('jsqr')
          const jsQR = (jsqrMod && (jsqrMod as any).default) || (jsqrMod as any)
          const qr = jsQR(imageData.data, w, h)
          if (qr) {
            try { if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()) } catch(e){}
            setScanning(false)
            onDetected(qr.data)
            return
          }
        }
      } catch (e: any) {
        // decoding failed
      }

      setUploadError('No QR code found in the selected image')
    } catch (e: any) {
      setUploadError(e?.message || 'Failed to process image')
    }
  }

  function openFilePicker() {
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    processImageFile(f)
  }

    const modal = (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 480, maxWidth: '94%', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>Scan QR</div>
          <button onClick={() => { try { if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop()) } catch(e){}; onClose() }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
          {error ? (
            <div style={{ color: '#b91c1c' }}>{error}</div>
          ) : (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div ref={containerRef} style={{ position: 'relative', width: 360, height: 270 }}>
                <video ref={videoRef} style={{ width: '100%', height: '100%', background: '#000', borderRadius: 6, objectFit: 'cover' }} playsInline muted />
                {detectedBox && (
                  <div style={{ position: 'absolute', left: detectedBox.x, top: detectedBox.y, width: detectedBox.w, height: detectedBox.h, pointerEvents: 'none' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                      {/* four corner Ls */}
                      <div style={{ position: 'absolute', left: -2, top: -2, width: 24, height: 24, borderLeft: '4px solid #2d7a52', borderTop: '4px solid #2d7a52', borderRadius: 2 }} />
                      <div style={{ position: 'absolute', right: -2, top: -2, width: 24, height: 24, borderRight: '4px solid #2d7a52', borderTop: '4px solid #2d7a52', borderRadius: 2 }} />
                      <div style={{ position: 'absolute', left: -2, bottom: -2, width: 24, height: 24, borderLeft: '4px solid #2d7a52', borderBottom: '4px solid #2d7a52', borderRadius: 2 }} />
                      <div style={{ position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRight: '4px solid #2d7a52', borderBottom: '4px solid #2d7a52', borderRadius: 2 }} />
                      <div style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, boxShadow: '0 0 0 9999px rgba(0,0,0,0.0) inset', borderRadius: 6 }} />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ maxWidth: 200, fontSize: 13, color: '#555' }}>
                <div style={{ marginBottom: 8 }}>{scanning ? 'Point the camera at a QR code to scan. Avoid glare and hold steady.' : 'Initializing camera...'}</div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  Tips: increase camera distance, improve lighting, and avoid glare. If detection fails, try scanning with your phone camera.
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={openFilePicker}
                    aria-label="Upload image"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                      border: '1px solid #e5e7eb',
                      borderRadius: 6,
                      background: '#fff',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 10l5-5 5 5" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 5v12" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Upload image</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
                {uploadError && <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 12 }}>{uploadError}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(modal, document.body)
}
