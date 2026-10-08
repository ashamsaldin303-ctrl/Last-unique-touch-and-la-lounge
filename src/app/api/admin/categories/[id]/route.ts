import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/categories/[id] — delete a category (protected).
 * Categories that still own products answer 409
 * `{ error:'has_products', productCount }` (Product.categoryId is a required
 * relation — deleting would cascade-break or orphan the products).
 * Success → 200 `{ ok: true }`.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await db.category.findFirst({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    const productCount = await db.product.count({ where: { categoryId: id } })
    if (productCount > 0) {
      return NextResponse.json({ error: 'has_products', productCount }, { status: 409 })
    }

    try {
      await db.category.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      throw error
    }

    logSecurityEvent('admin_category_delete', req, { id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/categories/[id]] DELETE error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
