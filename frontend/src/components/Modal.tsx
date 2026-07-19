import type { ReactNode } from 'react'
import { X } from 'lucide-react'
export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title?: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="sheet" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.stopPropagation()}><div className="sheet-grip" /><div className="sheet-header">{title && <h2>{title}</h2>}<button className="icon-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div>{children}</section></div>
}
