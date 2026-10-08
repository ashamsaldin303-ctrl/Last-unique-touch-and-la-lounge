import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { guardBodySize } from '@/app/api/_lib/guards'
import { logSecurityEvent, requireAdmin } from '@/lib/admin-auth'
import {
  ACTIVE_BOOKING_STATUSES,
  productInclude,
  productPatchSchema,
  serializeProduct,
  validationDetails,
} from '@/app/api/_lib/product-shape'

export const dynamic = 'force-dynamic'

/** Body-size cap for JSON patch payloads (images are URLs, not blobs). */
const MAX_BODY_BYTES = 256 * 1024

/**
 * PATCH /api/admin/products/[id] — partial product update (protected).
 * Accepts any subset of the create schema plus `isActive` (legacy minimal
 * patch `{ isActive?, stock? }` from the deployed panel keeps working).
 * At least one field is required; explicit `slug` colliding with another
 * product of the same brand → 409 `{ error:'slug_exists' }`; explicit
 * `categoryId` must exist and match the product's (effective) brand.
 * Returns 200 `{ item }` re-serialized through the shared serializer.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  const oversized = guardBodySize(req, MAX_BODY_BYTES)
  if (oversized) return oversized

  try {
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = productPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation', details: validationDetails(parsed.error) },
        { status: 400 },
      )
    }
    const input = parsed.data
    if (Object.keys(input).length === 0) {
      return NextResponse.json({ error: 'validation', details: {} }, { status: 400 })
    }

    const existing = await db.product.findFirst({
      where: { id },
      select: { id: true, brand: true, categoryId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Effective brand: an explicit brand switch must keep the category chain
    // consistent (categoryId provided must match it; otherwise the first
    // category of the NEW brand is auto-assigned).
    const effectiveBrand = input.brand ?? existing.brand

    let categoryId: string | undefined
    if (input.categoryId) {
      const category = await db.category.findFirst({
        where: { id: input.categoryId, brand: effectiveBrand },
        select: { id: true },
      })
      if (!category) {
        const exists = await db.category.findUnique({
          where: { id: input.categoryId },
          select: { brand: true },
        })
        return NextResponse.json(
          {
            error: 'validation',
            details: { categoryId: exists ? 'brand_mismatch' : 'not_found' },
          },
          { status: 400 },
        )
      }
      categoryId = input.categoryId
    } else if (input.brand !== undefined && input.brand !== existing.brand) {
      // Brand switched without a category → adopt the new brand's first category.
      const first = await db.category.findFirst({
        where: { brand: input.brand },
        orderBy: { nameAr: 'asc' },
        select: { id: true },
      })
      if (!first) {
        return NextResponse.json({ error: 'no_categories' }, { status: 400 })
      }
      categoryId = first.id
    }

    if (input.slug !== undefined) {
      const clash = await db.product.findFirst({
        where: { brand: effectiveBrand, slug: input.slug, id: { not: id } },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json({ error: 'slug_exists' }, { status: 409 })
      }
    }

    const data: Prisma.ProductUpdateInput = {}
    if (input.nameAr !== undefined) data.nameAr = input.nameAr
    if (input.nameEn !== undefined) data.nameEn = input.nameEn
    if (input.descriptionAr !== undefined) data.descriptionAr = input.descriptionAr
    if (input.descriptionEn !== undefined) data.descriptionEn = input.descriptionEn
    if (input.slug !== undefined) data.slug = input.slug
    if (input.brand !== undefined) data.brand = input.brand
    if (categoryId !== undefined) data.category = { connect: { id: categoryId } }
    if (input.priceKwd !== undefined) data.rentalPricePerDay = input.priceKwd
    if (input.depositKwd !== undefined) data.securityDeposit = input.depositKwd
    if (input.stock !== undefined) data.stock = input.stock
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.images !== undefined) data.images = JSON.stringify(input.images)

    try {
      const product = await db.product.update({
        where: { id },
        data,
        include: productInclude,
      })

      logSecurityEvent('admin_product_update', req, { id })
      return NextResponse.json({ item: serializeProduct(product) })
    } catch (error) {
      // TOCTOU: row deleted between the findFirst and the update.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      // Lost slug uniqueness race against a concurrent create/patch.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({ error: 'slug_exists' }, { status: 409 })
      }
      throw error
    }
  } catch (error) {
    console.error('[api/admin/products/[id]] PATCH error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/products/[id] — delete a product (protected).
 * Products with PENDING/CONFIRMED bookings answer 409
 * `{ error:'has_bookings', bookingsCount }` (deleting those would strand
 * active rentals). Completed/cancelled history is preserved: the schema's
 * Booking→Product relation is `ON DELETE SET NULL`, so those rows simply
 * lose their product link. Success → 200 `{ ok: true }`.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(req)
  if (denied) return denied

  try {
    const { id } = await params
    const existing = await db.product.findFirst({ where: { id }, select: { id: true } })
    if (!existing) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }

    // Shared constant (r2 NEW-6): keep the delete pre-check and the
    // `productInclude` booking count in lockstep with one status list.
    const bookingsCount = await db.booking.count({
      where: { productId: id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
    })
    if (bookingsCount > 0) {
      return NextResponse.json({ error: 'has_bookings', bookingsCount }, { status: 409 })
    }

    try {
      await db.product.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json({ error: 'not_found' }, { status: 404 })
      }
      // Defensive FK guard (schema says SET NULL; if a future migration turns
      // the relation restrictive, still answer 409 instead of a raw 500).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        const total = await db.booking.count({ where: { productId: id } })
        return NextResponse.json({ error: 'has_bookings', bookingsCount: total }, { status: 409 })
      }
      throw error
    }

    logSecurityEvent('admin_product_delete', req, { id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[api/admin/products/[id]] DELETE error:', error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
