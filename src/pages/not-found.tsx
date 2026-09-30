'use client'

import { useRouter } from '@/lib/router'

export default function NotFoundPage() {
  const { navigate } = useRouter()
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="font-display text-7xl text-primary mb-4">404</div>
      <p className="text-muted-foreground mb-8">الصفحة غير موجودة — Page not found</p>
      <button onClick={() => navigate('/')} className="btn-lux px-8 py-3 rounded-full text-sm cursor-pointer border-0">العودة للرئيسية</button>
    </div>
  )
}
