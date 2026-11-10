'use client'

export function MediaLibrary() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-4">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: '#1e2535', border: '2px dashed #2a3347' }}
      >
        <svg className="w-8 h-8" style={{ color: '#475569' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium" style={{ color: '#64748b' }}>Drag &amp; drop media di sini</p>
        <p className="text-[10px] mt-1" style={{ color: '#374151' }}>JPG, PNG, MP4, MOV</p>
      </div>
      <button
        className="text-xs px-3 py-1.5 rounded-lg"
        style={{ background: '#1e2535', color: '#3b82f6', border: '1px solid #2a3347' }}
      >
        Pilih File...
      </button>
    </div>
  )
}
