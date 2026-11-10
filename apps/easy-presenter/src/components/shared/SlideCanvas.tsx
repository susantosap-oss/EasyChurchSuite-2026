'use client'

import type { CSSProperties } from 'react'
import type { SlideBackground, TextStyle, VerticalPosition } from '../types'

const DESIGN_WIDTH = 1920

function verticalStyle(pos: VerticalPosition, offsetPx: number): CSSProperties {
  const off = `${offsetPx}px`
  switch (pos) {
    case 'top':    return { justifyContent: 'flex-start', paddingTop: `calc(8% + ${off})`,  paddingBottom: '4%' }
    case 'upper':  return { justifyContent: 'flex-start', paddingTop: `calc(22% + ${off})`, paddingBottom: '4%' }
    case 'center': return { justifyContent: 'center',     paddingTop: '5%',                 paddingBottom: '5%' }
    case 'lower':  return { justifyContent: 'flex-end',   paddingTop: '4%',  paddingBottom: `calc(22% + ${off})` }
    case 'bottom': return { justifyContent: 'flex-end',   paddingTop: '4%',  paddingBottom: `calc(2% + ${off})` }
    default:       return { justifyContent: 'center' }
  }
}

interface Props {
  text: string
  background: SlideBackground
  textStyle: TextStyle
  /** Pixel width of the outer container. Used to scale font size. Default: 284 */
  containerWidth?: number
  /** If true, renders at DESIGN_WIDTH (1920px) then CSS-scales down — more accurate preview */
  scaled?: boolean
}

export function SlideCanvas({ text, background, textStyle, containerWidth = 284, scaled = false }: Props) {
  const scale  = containerWidth / DESIGN_WIDTH
  const scaledOffset = scaled ? textStyle.positionOffset : textStyle.positionOffset * scale
  const fSize  = scaled ? textStyle.fontSize : Math.max(8, textStyle.fontSize * scale)

  // Background element — only apply CSS class for the 4 built-in animated presets
  const bgClass = background.type === 'animated' && background.animated && background.animated !== 'custom'
    ? `slide-bg-${background.animated}` : ''

  const bgInline: CSSProperties = (() => {
    switch (background.type) {
      case 'solid':    return { background: background.color ?? '#0a0f1a' }
      case 'gradient': return { background: background.gradient ?? 'linear-gradient(135deg,#0f172a,#1e1b4b)' }
      case 'image':
      case 'video':    return {}
      default:         return {}
    }
  })()

  const textAlignItems: CSSProperties['alignItems'] =
    textStyle.textAlign === 'left'  ? 'flex-start' :
    textStyle.textAlign === 'right' ? 'flex-end'   : 'center'

  const textContainerStyle: CSSProperties = {
    display:       'flex',
    flexDirection: 'column',
    alignItems:    textAlignItems,
    paddingLeft:   scaled ? '8%' : '5%',
    paddingRight:  scaled ? '8%' : '5%',
    width:         '100%',
    height:        '100%',
    position:      'absolute',
    inset:         0,
    zIndex:        2,
    ...verticalStyle(textStyle.verticalPosition, scaledOffset),
  }

  const textP: CSSProperties = {
    fontFamily:       textStyle.fontFamily,
    fontSize:         scaled ? textStyle.fontSize : fSize,
    fontWeight:       textStyle.fontWeight,
    textAlign:        textStyle.textAlign,
    color:            textStyle.color,
    lineHeight:       textStyle.lineHeight,
    textShadow:       textStyle.shadow ? '0 2px 8px rgba(0,0,0,0.9), 0 0 24px rgba(0,0,0,0.6)' : 'none',
    WebkitTextStroke: textStyle.outline ? `2px ${textStyle.outlineColor}` : '0',
    whiteSpace:       'pre-line',
    margin:           0,
    maxWidth:         '100%',
  }

  const W = scaled ? DESIGN_WIDTH       : '100%'
  const H = scaled ? DESIGN_WIDTH * 9/16 : '100%'

  const inner = (
    <div
      className={bgClass}
      style={{
        position:     'relative',
        width:        W,
        height:       H,
        overflow:     'hidden',
        ...(scaled ? { transformOrigin: 'top left', transform: `scale(${scale})` } : {}),
        ...bgInline,
      }}
    >
      {/* Image background */}
      {background.type === 'image' && background.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={background.imageUrl}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        />
      )}

      {/* Video background */}
      {background.type === 'video' && background.videoUrl && (
        <video
          src={background.videoUrl}
          autoPlay loop muted playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        />
      )}

      {/* Custom animated background (uploaded video or GIF) */}
      {background.type === 'animated' && background.animated === 'custom' && background.animatedCustomUrl && (
        background.animatedCustomType === 'gif' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={background.animatedCustomUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          />
        ) : (
          <video
            src={background.animatedCustomUrl}
            autoPlay loop muted playsInline
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
          />
        )
      )}

      {/* Dark overlay (image + video + custom animated) */}
      {(background.type === 'image' || background.type === 'video' ||
        (background.type === 'animated' && background.animated === 'custom')) && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: `rgba(0,0,0,${background.imageOverlayOpacity ?? 0.4})`,
          }}
        />
      )}

      {/* Text layer */}
      <div style={textContainerStyle}>
        <p style={textP}>{text}</p>
      </div>
    </div>
  )

  if (scaled) {
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {inner}
      </div>
    )
  }
  return inner
}
