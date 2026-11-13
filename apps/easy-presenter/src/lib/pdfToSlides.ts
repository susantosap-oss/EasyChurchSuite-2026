// Client-only: render each PDF page to a JPG and store it on the server

const TARGET_WIDTH = 1920
const JPEG_QUALITY = 0.9

export interface PdfProgress { done: number; total: number }

/** Returns one image URL per page (server URL, or a session blob URL if the upload fails) */
export async function convertPdfToSlides(file: File, onProgress?: (p: PdfProgress) => void): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/api/pdf-worker/'

  const doc  = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
  const deck = `deck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const urls: string[] = []
  onProgress?.({ done: 0, total: doc.numPages })

  for (let n = 1; n <= doc.numPages; n++) {
    const page     = await doc.getPage(n)
    const base     = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: TARGET_WIDTH / base.width })

    const canvas  = document.createElement('canvas')
    canvas.width  = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'               // PDFs assume a white page
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Render gagal'))), 'image/jpeg', JPEG_QUALITY))
    urls.push(await uploadPage(deck, `page-${String(n).padStart(3, '0')}.jpg`, blob))
    page.cleanup()
    onProgress?.({ done: n, total: doc.numPages })
  }

  await doc.destroy()
  return urls
}

async function uploadPage(deck: string, name: string, blob: Blob): Promise<string> {
  try {
    const body = new FormData()
    body.append('deck', deck)
    body.append('name', name)
    body.append('file', blob, name)
    const res  = await fetch('/api/slides/', { method: 'POST', body })
    const data = await res.json() as { url?: string; error?: string }
    if (!res.ok || !data.url) throw new Error(data.error ?? 'upload failed')
    return data.url
  } catch {
    return URL.createObjectURL(blob)   // works for this session only
  }
}
