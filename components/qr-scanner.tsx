'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface QRScannerProps {
  open: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function QRScanner({ open, onClose, onScan }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      // Clean up when dialog closes
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }
      setError(null)
      setIsInitializing(false)
      return
    }

    // Reset state when opening
    setError(null)
    setIsInitializing(true)

    // Small delay to ensure DOM is ready
    const initTimer = setTimeout(() => {
      const elementId = 'qr-reader'
      
      // Check if element exists
      const element = document.getElementById(elementId)
      if (!element) {
        setError('QR scanner container not found')
        setIsInitializing(false)
        return
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: [],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      }

      try {
        const scanner = new Html5QrcodeScanner(
          elementId,
          config,
          false // verbose
        )

        scanner.render(
          (decodedText) => {
            // Success callback
            try {
              scanner.clear()
            } catch (e) {
              // Ignore cleanup errors
            }
            scannerRef.current = null
            setIsInitializing(false)
            onScan(decodedText)
            onClose()
          },
          (errorMessage) => {
            // Error callback - this is called during scanning, not initialization
            // Only show error if it's a permission error
            if (errorMessage.includes('Permission') || errorMessage.includes('permission')) {
              setError('Camera permission denied. Please allow camera access and try again.')
              setIsInitializing(false)
            }
            // Other errors are normal during scanning, ignore them
          }
        )

        scannerRef.current = scanner
        setIsInitializing(false)
      } catch (err) {
        console.error('QR Scanner initialization error:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        
        if (errorMessage.includes('Permission') || errorMessage.includes('permission')) {
          setError('Camera permission denied. Please allow camera access in your browser settings and try again.')
        } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No camera')) {
          setError('No camera found. Please connect a camera and try again.')
        } else {
          setError('Failed to initialize QR scanner. Please check your camera permissions and try again.')
        }
        setIsInitializing(false)
      }
    }, 100)

    return () => {
      clearTimeout(initTimer)
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (e) {
          // Ignore cleanup errors
        }
        scannerRef.current = null
      }
    }
  }, [open, onScan, onClose])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isInitializing && !error && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Initializing camera...</p>
            </div>
          )}
          {error ? (
            <div className="space-y-4">
              <div className="p-4 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Tips:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Make sure you&apos;ve granted camera permissions to this website</li>
                  <li>Check your browser settings if permissions were denied</li>
                  <li>Try refreshing the page and allowing camera access when prompted</li>
                </ul>
              </div>
            </div>
          ) : (
            <div ref={containerRef} id="qr-reader" className="w-full min-h-[300px]"></div>
          )}
          <Button onClick={onClose} variant="outline" className="w-full">
            {error ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

