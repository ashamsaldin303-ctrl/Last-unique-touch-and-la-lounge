'use client'

/**
 * ADMIN — Products create/edit dialog (extracted from products-panel.tsx
 * in wave 5, task 37-6-c — the panel was a 2,639-line monolith).
 *
 * The full product editor: three sections (bilingual data · price & stock
 * · image manager), inline category management, the zod schema mirroring
 * the server's ProductInput rules, and the upload + submit flow.
 *
 * Props (clean seam back into the panel):
 *   - `product: null` → CREATE (brand select editable); non-null → EDIT
 *     (brand immutable, stored values seeded).
 *   - `brand` — the create-mode default brand (the panel derives it from
 *     its active filter; edit mode always uses the product's own brand).
 *   - `categories` — seed list from the panel's list response, filtered
 *     to the dialog's brand so the select offers options immediately;
 *     the dialog still re-scopes via its own `/api/admin/categories`
 *     fetch (same endpoint + behavior as before the split).
 *   - `onOpenChange` — close request (dirty-state guard runs first).
 *   - `onSaved(item, created)` — fired after a successful POST/PATCH with
 *     the server's row (null if the body failed to parse) and whether it
 *     was a create; the dialog closes itself right after.
 *   - `onUnauthorized` — 401 branch; the panel callback dispatches the
 *     wave-wide `admin:unauthorized` event + flags its session state.
 *   - `locale?` — defaults to the active i18n locale; pass only when the
 *     dialog is embedded outside the provider.
 *
 * API contract (unchanged from the pre-split panel):
 *   POST   /api/admin/products                body ProductInput → 201 { item }
 *          | 400 { error:'validation', details:{field:code} } | 409 { error:'slug_exists' }
 *   PATCH  /api/admin/products/{id}           partial ProductInput → 200 { item } | 400 | 409
 *   POST   /api/admin/upload                  multipart 'files' (1..6 ≤5MB) → 201 { urls }
 *   GET    /api/admin/categories?brand=       → { categories }
 *   POST   /api/admin/categories              → 201 { category } | 409 category_exists
 *   DELETE /api/admin/categories/{id}         → 200 | 409 { error:'has_products', productCount }
 *   401 → onUnauthorized() (the panel signals the admin shell).
 *
 * Toasts render through the single shell-level <Toaster> (src/views/admin.tsx).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  ListPlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { useI18n, type Locale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

/* ================= Shared product domain (imported by the panel) ================= */

export type Brand = 'LUT' | 'LA_LOUNGE' | 'YOUR_BIRTHDAY'

export interface CategoryItem {
  id: string
  nameAr: string
  nameEn: string
  brand: Brand
  productCount: number
}

export interface ProductItem {
  id: string
  slug: string
  brand: Brand
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  priceKwd: number
  depositKwd: number
  stock: number
  isActive: boolean
  categoryId: string | null
  categoryNameAr: string | null
  categoryNameEn: string | null
  images: string[]
  bookingsCount: number
  createdAt: string
  updatedAt: string
}

/** Brand badge tokens (dark glass) — shared with the panel's rows. */
export const BRAND_BADGE: Record<Brand, string> = {
  LUT: 'border-[#C9A25E]/45 bg-[#C9A25E]/12 text-[#E5C878]',
  LA_LOUNGE: 'border-[#E6007E]/45 bg-[#E6007E]/12 text-[#FF85C8]',
  YOUR_BIRTHDAY: 'border-[#F5B914]/45 bg-[#F5B914]/12 text-[#FFD25E]',
}

export const BRAND_LABEL_KEY: Record<Brand, string> = {
  LUT: 'products.brandFilter.lut',
  LA_LOUNGE: 'products.brandFilter.lalounge',
  YOUR_BIRTHDAY: 'products.brandFilter.birthday',
}

export function localizedName(p: ProductItem, locale: Locale): string {
  return locale === 'ar' ? p.nameAr : p.nameEn
}

export function localizedCategoryName(c: CategoryItem, locale: Locale): string {
  return locale === 'ar' ? c.nameAr : c.nameEn
}

/* ================= Dialog-local types ================= */

/** Image manager entry — either an already-uploaded path or a picked File. */
type ImageEntry =
  | { kind: 'remote'; url: string }
  | { kind: 'local'; file: File; objectUrl: string }

interface ProductFormState {
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  slug: string
  priceKwd: string
  depositKwd: string
  stock: string
}

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

/* ================= Contract limits & tokens ================= */

/** Contract limits for the image manager / upload endpoint. */
const MAX_IMAGES = 10
const MAX_FILES_PER_PICK = 6
const MAX_FILE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const NAME_MAX = 120
const DESCRIPTION_MAX = 5000

const BRAND_OPTIONS: Array<Brand> = ['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY']

/** Select value meaning "no category" (categoryId omitted in the payload). */
const NO_CATEGORY = 'none'

/* ================= Helpers ================= */

/** Slug preview derived from the English name (hint placeholder only). */
function slugifyNameEn(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Field ids in DOM order — used to focus the first invalid field. */
const FIELD_IDS: Record<string, string> = {
  nameAr: 'product-field-name-ar',
  nameEn: 'product-field-name-en',
  slug: 'product-field-slug',
  brand: 'product-field-brand',
  categoryId: 'product-field-category',
  priceKwd: 'product-field-price',
  depositKwd: 'product-field-deposit',
  stock: 'product-field-stock',
}

const FIELD_ORDER: Array<string> = [
  'nameAr',
  'nameEn',
  'slug',
  'brand',
  'categoryId',
  'priceKwd',
  'depositKwd',
  'stock',
]

function focusFirstFieldError(errors: Record<string, string>) {
  for (const field of FIELD_ORDER) {
    if (errors[field]) {
      document.getElementById(FIELD_IDS[field])?.focus()
      return
    }
  }
}

/**
 * zod schema mirroring the server's ProductInput rules, with localized
 * messages. Numeric fields stay strings (raw input values) and are refined.
 */
function makeProductSchema(t: TranslateFn, categoryIds: readonly string[]) {
  return z.object({
    nameAr: z
      .string()
      .trim()
      .min(1, t('admin.products.errors.nameArRequired'))
      .max(NAME_MAX, t('admin.products.errors.nameArMaxLength')),
    nameEn: z
      .string()
      .trim()
      .min(1, t('admin.products.errors.nameEnRequired'))
      .max(NAME_MAX, t('admin.products.errors.nameEnMaxLength')),
    descriptionAr: z.string().max(DESCRIPTION_MAX, t('admin.products.errors.descriptionMaxLength')),
    descriptionEn: z.string().max(DESCRIPTION_MAX, t('admin.products.errors.descriptionMaxLength')),
    slug: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^[a-z0-9-]{1,80}$/.test(v),
        t('admin.products.errors.slugInvalid')
      ),
    brand: z.enum(['LUT', 'LA_LOUNGE', 'YOUR_BIRTHDAY']),
    categoryId: z.string().refine(
      (v) => v === NO_CATEGORY || categoryIds.includes(v),
      t('admin.products.errors.categoryRequired')
    ),
    priceKwd: z.string().refine((v) => {
      const n = Number(v)
      return v.trim() !== '' && Number.isFinite(n) && n > 0 && n <= 99999
    }, t('admin.products.errors.priceInvalid')),
    depositKwd: z.string().refine((v) => {
      const n = Number(v)
      return v.trim() === '' || (Number.isFinite(n) && n >= 0 && n <= 99999)
    }, t('admin.products.errors.depositInvalid')),
    stock: z.string().refine((v) => {
      const n = Number(v)
      return v.trim() === '' || (Number.isInteger(n) && n >= 0 && n <= 9999)
    }, t('admin.products.errors.stockInvalid')),
  })
}

/** Map server 400 `details:{field:code}` to localized messages. */
const SERVER_FIELD_ERRORS: Record<string, Record<string, string>> = {
  nameAr: {
    required: 'admin.products.errors.nameArRequired',
    min: 'admin.products.errors.nameArRequired',
    empty: 'admin.products.errors.nameArRequired',
    max: 'admin.products.errors.nameArMaxLength',
    too_long: 'admin.products.errors.nameArMaxLength',
  },
  nameEn: {
    required: 'admin.products.errors.nameEnRequired',
    min: 'admin.products.errors.nameEnRequired',
    empty: 'admin.products.errors.nameEnRequired',
    max: 'admin.products.errors.nameEnMaxLength',
    too_long: 'admin.products.errors.nameEnMaxLength',
  },
  descriptionAr: { max: 'admin.products.errors.descriptionMaxLength', too_long: 'admin.products.errors.descriptionMaxLength' },
  descriptionEn: { max: 'admin.products.errors.descriptionMaxLength', too_long: 'admin.products.errors.descriptionMaxLength' },
  slug: {
    invalid: 'admin.products.errors.slugInvalid',
    pattern: 'admin.products.errors.slugInvalid',
    format: 'admin.products.errors.slugInvalid',
    max: 'admin.products.errors.slugInvalid',
    too_long: 'admin.products.errors.slugInvalid',
  },
  categoryId: { invalid: 'admin.products.errors.categoryRequired', required: 'admin.products.errors.categoryRequired' },
  priceKwd: { invalid: 'admin.products.errors.priceInvalid', min: 'admin.products.errors.priceInvalid', required: 'admin.products.errors.priceInvalid' },
  depositKwd: { invalid: 'admin.products.errors.depositInvalid', min: 'admin.products.errors.depositInvalid' },
  stock: { invalid: 'admin.products.errors.stockInvalid', min: 'admin.products.errors.stockInvalid', required: 'admin.products.errors.stockInvalid' },
  images: { too_many: 'admin.products.errors.imagesTooMany', max: 'admin.products.errors.imagesTooMany', invalid: 'admin.products.errors.imageInvalidType' },
}

function serverFieldMessage(field: string, code: string, t: TranslateFn): string {
  const table = SERVER_FIELD_ERRORS[field]
  const key = table?.[code] ?? (table ? table[Object.keys(table)[0]] : undefined)
  if (!key) return t('admin.common.validationError')
  if (key === 'admin.products.errors.imagesTooMany') return t(key, { max: MAX_IMAGES })
  return t(key)
}

/* ================= Initial state builders ================= */

function initialForm(product: ProductItem | null): ProductFormState {
  return {
    nameAr: product?.nameAr ?? '',
    nameEn: product?.nameEn ?? '',
    descriptionAr: product?.descriptionAr ?? '',
    descriptionEn: product?.descriptionEn ?? '',
    slug: product?.slug ?? '',
    priceKwd: product ? String(product.priceKwd) : '',
    depositKwd: product ? String(product.depositKwd) : '',
    stock: product ? String(product.stock) : '',
  }
}

function initialImages(product: ProductItem | null): ImageEntry[] {
  return (product?.images ?? [])
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
    .map((url) => ({ kind: 'remote', url }))
}

/* ================= The dialog ================= */

export interface ProductsDialogProps {
  /** Controlled open flag (the panel mounts on demand with `open`). */
  open: boolean
  /** Close request — runs after the unsaved-changes guard clears. */
  onOpenChange: () => void
  /** Product to edit, or null to create. */
  product: ProductItem | null
  /** Seed categories from the panel's list response (see module header). */
  categories: CategoryItem[]
  /** Create-mode default brand (edit mode uses the product's brand). */
  brand: Brand
  /** Locale override — defaults to the active i18n locale. */
  locale?: Locale
  /** Success callback — receives the saved row (or null) + created flag. */
  onSaved: (item: ProductItem | null, created: boolean) => void
  /** 401 branch — the panel dispatches the admin:unauthorized signal. */
  onUnauthorized: () => void
}

export default function ProductsDialog({
  open,
  onOpenChange,
  product,
  categories: categoriesSeed,
  brand: defaultBrand,
  locale: localeProp,
  onSaved,
  onUnauthorized,
}: ProductsDialogProps) {
  const { t, locale: contextLocale } = useI18n()
  const locale = localeProp ?? contextLocale
  const isEdit = product !== null

  const [form, setForm] = useState<ProductFormState>(() => initialForm(product))
  const [entries, setEntries] = useState<ImageEntry[]>(() => initialImages(product))
  const [brand, setBrand] = useState<Brand>(product?.brand ?? defaultBrand)
  const [categoryId, setCategoryId] = useState<string>(product?.categoryId ?? NO_CATEGORY)
  /* Seed with the panel's categories for the dialog's brand — the fetch
     below re-scopes and stays authoritative (same endpoint as before). */
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    categoriesSeed.filter((c) => c.brand === (product?.brand ?? defaultBrand))
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false)
  /** Inline category manager (popover) state. */
  const [catManageOpen, setCatManageOpen] = useState(false)
  const [newCatAr, setNewCatAr] = useState('')
  const [newCatEn, setNewCatEn] = useState('')
  const [catBusy, setCatBusy] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  /** Latest entries — used by the unmount cleanup to revoke object URLs. */
  const entriesRef = useRef<ImageEntry[]>(entries)
  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  /* Revoke every remaining object URL when the dialog unmounts. */
  useEffect(() => {
    return () => {
      for (const entry of entriesRef.current) {
        if (entry.kind === 'local') URL.revokeObjectURL(entry.objectUrl)
      }
    }
  }, [])

  /* ---- Categories for the active brand (refreshed on brand change) ---- */
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    fetch(`/api/admin/categories?brand=${encodeURIComponent(brand)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!active) return
        if (res.status === 401) {
          onUnauthorized()
          return
        }
        if (!res.ok) throw new Error(`categories ${res.status}`)
        const json = (await res.json()) as { categories?: CategoryItem[] }
        if (!active) return
        const list = Array.isArray(json.categories) ? json.categories : []
        setCategories(list)
        // Keep a valid selection; default to the first category on CREATE.
        setCategoryId((prev) => {
          if (list.some((c) => c.id === prev)) return prev
          if (isEdit) return prev // trust the stored value in edit mode
          return list[0]?.id ?? NO_CATEGORY
        })
      })
      .catch((err: unknown) => {
        if (!active) return
        if ((err as { name?: string } | null)?.name === 'AbortError') return
        // Non-fatal: the select simply offers no categories until retried.
        setCategories([])
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [brand, onUnauthorized, isEdit])

  const categoryIds = useMemo(() => categories.map((c) => c.id), [categories])
  const schema = useMemo(
    () => makeProductSchema(t, categoryIds),
    [t, categoryIds]
  )

  /* ---- Field helpers ---- */
  const setField = useCallback(<K extends keyof ProductFormState>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
    setFieldErrors((prev) => {
      if (!prev[key as string]) return prev
      const next = { ...prev }
      delete next[key as string]
      return next
    })
  }, [])

  /* ---- Image manager ---- */
  const handleFilesPicked = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      if (files.length > MAX_FILES_PER_PICK) {
        toast.error(t('admin.products.errors.imagesTooMany', { max: MAX_FILES_PER_PICK }))
        return
      }
      for (const file of files) {
        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
          toast.error(t('admin.products.errors.imageInvalidType'))
          return
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(t('admin.products.errors.imageTooLarge'))
          return
        }
      }
      if (entries.length + files.length > MAX_IMAGES) {
        toast.error(t('admin.products.errors.imagesTooMany', { max: MAX_IMAGES }))
        return
      }
      const newEntries: ImageEntry[] = files.map((file) => ({
        kind: 'local',
        file,
        objectUrl: URL.createObjectURL(file),
      }))
      setEntries((prev) => [...prev, ...newEntries])
      setDirty(true)
      setFieldErrors((prev) => {
        if (!prev.images) return prev
        const next = { ...prev }
        delete next.images
        return next
      })
    },
    [entries.length, t]
  )

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) => {
      const entry = prev[index]
      if (entry?.kind === 'local') URL.revokeObjectURL(entry.objectUrl)
      return prev.filter((_, i) => i !== index)
    })
    setDirty(true)
  }, [])

  /** Swap adjacent indices — `delta` is -1 (earlier) / +1 (later). */
  const moveEntry = useCallback((index: number, delta: -1 | 1) => {
    setEntries((prev) => {
      const target = index + delta
      if (index < 0 || index >= prev.length || target < 0 || target >= prev.length) {
        return prev
      }
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      return next
    })
    setDirty(true)
  }, [])

  /* ---- Close gating (unsaved changes) ---- */
  const requestClose = useCallback(() => {
    if (dirty && !submitting) {
      setConfirmLeaveOpen(true)
      return
    }
    onOpenChange()
  }, [dirty, submitting, onOpenChange])

  /* ---- Submit ---- */
  const uploadNewFiles = useCallback(
    async (files: File[]): Promise<{ ok: true; urls: string[] } | { ok: false; message: string }> => {
      const body = new FormData()
      for (const file of files) body.append('files', file)
      try {
        const res = await fetch('/api/admin/upload', { method: 'POST', body })
        if (res.status === 401) {
          onUnauthorized()
          return { ok: false, message: t('admin.errors.unauthorized') }
        }
        if (res.status === 400) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null
          const code = json?.error
          if (code === 'too_many_files') {
            return { ok: false, message: t('admin.products.errors.imagesTooMany', { max: MAX_FILES_PER_PICK }) }
          }
          if (code === 'file_too_large') {
            return { ok: false, message: t('admin.products.errors.imageTooLarge') }
          }
          if (code === 'invalid_type') {
            return { ok: false, message: t('admin.products.errors.imageInvalidType') }
          }
          return { ok: false, message: t('admin.products.errors.uploadFailed') }
        }
        if (!res.ok) throw new Error(`upload ${res.status}`)
        const json = (await res.json()) as { urls?: string[] }
        const urls = Array.isArray(json.urls) ? json.urls.filter((u) => typeof u === 'string') : []
        return { ok: true, urls }
      } catch {
        return { ok: false, message: t('admin.products.errors.uploadFailed') }
      }
    },
    [t, onUnauthorized]
  )

  const handleSubmit = useCallback(
    async (event: { preventDefault: () => void }) => {
      event.preventDefault()
      if (submitting || uploading) return

      // 1. Client-side validation (mirrors the server rules).
      const parsed = schema.safeParse({ ...form, brand, categoryId })
      if (!parsed.success) {
        const errors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          const field = String(issue.path[0] ?? '')
          if (field && !errors[field]) errors[field] = issue.message
        }
        setFieldErrors(errors)
        focusFirstFieldError(errors)
        return
      }
      setFieldErrors({})

      // 2. Upload newly-picked files in a single POST, then merge in order.
      const localFiles: File[] = []
      for (const entry of entries) {
        if (entry.kind === 'local') localFiles.push(entry.file)
      }
      let uploadedUrls: string[] = []
      if (localFiles.length > 0) {
        setUploading(true)
        const result = await uploadNewFiles(localFiles)
        setUploading(false)
        if (!result.ok) {
          toast.error(result.message)
          return
        }
        uploadedUrls = result.urls
        if (uploadedUrls.length !== localFiles.length) {
          toast.error(t('admin.products.errors.uploadFailed'))
          return
        }
      }
      const uploadedIter = uploadedUrls[Symbol.iterator]()
      const images = entries.map((entry) =>
        entry.kind === 'remote' ? entry.url : (uploadedIter.next().value as string)
      )

      // 3. Build the payload (empty optionals are omitted).
      const payload: Record<string, unknown> = {
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        brand,
        priceKwd: Number(parsed.data.priceKwd),
        depositKwd: parsed.data.depositKwd.trim() === '' ? 0 : Number(parsed.data.depositKwd),
        stock: parsed.data.stock.trim() === '' ? 0 : Number(parsed.data.stock),
        images,
      }
      if (parsed.data.descriptionAr) payload.descriptionAr = parsed.data.descriptionAr
      if (parsed.data.descriptionEn) payload.descriptionEn = parsed.data.descriptionEn
      if (parsed.data.slug) payload.slug = parsed.data.slug
      // "No category" omits categoryId (PATCH keeps the stored value).
      if (categoryId !== NO_CATEGORY) payload.categoryId = categoryId

      // 4. POST (create) or PATCH (edit).
      setSubmitting(true)
      try {
        const url = isEdit
          ? `/api/admin/products/${encodeURIComponent(product?.id ?? '')}`
          : '/api/admin/products'
        const res = await fetch(url, {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'same-origin',
        })
        if (res.status === 401) {
          onUnauthorized()
          return
        }
        if (res.status === 400) {
          const json = (await res.json().catch(() => null)) as {
            error?: string
            details?: Record<string, string>
          } | null
          if (json?.error === 'validation' && json.details) {
            const errors: Record<string, string> = {}
            for (const [field, code] of Object.entries(json.details)) {
              errors[field] = serverFieldMessage(field, code, t)
            }
            setFieldErrors(errors)
            focusFirstFieldError(errors)
            toast.error(t('admin.common.validationError'))
            return
          }
          toast.error(t('admin.products.saveError'))
          return
        }
        if (res.status === 409) {
          const json = (await res.json().catch(() => null)) as { error?: string } | null
          if (json?.error === 'slug_exists') {
            setFieldErrors({ slug: t('admin.products.errors.slugExists') })
            document.getElementById(FIELD_IDS.slug)?.focus()
            return
          }
          toast.error(t('admin.common.conflict'))
          return
        }
        if (!res.ok) {
          toast.error(t('admin.products.saveError'))
          return
        }
        // Hand the saved row back to the panel (body is advisory only).
        const json = (await res.json().catch(() => null)) as { item?: ProductItem } | null
        toast.success(t('admin.products.saved'))
        onSaved(json?.item ?? null, !isEdit)
        onOpenChange()
      } catch {
        toast.error(t('admin.products.saveError'))
      } finally {
        setSubmitting(false)
      }
    },
    [
      schema,
      form,
      brand,
      categoryId,
      entries,
      uploading,
      submitting,
      uploadNewFiles,
      t,
      isEdit,
      product?.id,
      onSaved,
      onOpenChange,
      onUnauthorized,
    ]
  )

  /* ---- Inline category management ---- */
  const createCategory = useCallback(async () => {
    const nameAr = newCatAr.trim()
    const nameEn = newCatEn.trim()
    if (catBusy || !nameAr || !nameEn) return
    setCatBusy(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameAr, nameEn, brand }),
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        onUnauthorized()
        return
      }
      if (res.status === 409) {
        toast.error(t('admin.products.categories.exists'))
        return
      }
      if (!res.ok) throw new Error(`create category ${res.status}`)
      const json = (await res.json().catch(() => null)) as { category?: CategoryItem } | null
      if (json?.category) {
        const created = json.category
        setCategories((prev) => [...prev, created])
        setCategoryId(created.id)
        setNewCatAr('')
        setNewCatEn('')
        setDirty(true)
        toast.success(t('admin.products.categories.createSuccess'))
      }
    } catch {
      toast.error(t('admin.common.error'))
    } finally {
      setCatBusy(false)
    }
  }, [catBusy, newCatAr, newCatEn, brand, t, onUnauthorized])

  const deleteSelectedCategory = useCallback(async () => {
    if (catBusy || categoryId === NO_CATEGORY) return
    setCatBusy(true)
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(categoryId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (res.status === 401) {
        onUnauthorized()
        return
      }
      if (res.status === 409) {
        const json = (await res.json().catch(() => null)) as { productCount?: number } | null
        const count = typeof json?.productCount === 'number' ? json.productCount : 0
        toast.error(t('admin.products.categories.deleteHasProducts', { count }))
        return
      }
      if (!res.ok) throw new Error(`delete category ${res.status}`)
      setCategories((prev) => prev.filter((c) => c.id !== categoryId))
      setCategoryId(() => {
        const next = categories.find((c) => c.id !== categoryId)
        return isEdit ? NO_CATEGORY : (next?.id ?? NO_CATEGORY)
      })
      toast.success(t('admin.common.updated'))
    } catch {
      toast.error(t('admin.common.error'))
    } finally {
      setCatBusy(false)
    }
  }, [catBusy, categoryId, categories, t, onUnauthorized])

  /* ---- Derived labels ---- */
  const slugPlaceholder = slugifyNameEn(form.nameEn) || 'gold-mirror-01'
  const productAlt = form.nameAr || form.nameEn || ''
  const sectionTitleClass = 'font-display text-sm font-bold text-[#E5C878]'
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const categorySelectLabel =
    categoryId === NO_CATEGORY
      ? t('admin.products.fields.noCategory')
      : selectedCategory
        ? localizedCategoryName(selectedCategory, locale)
        : (locale === 'ar' ? product?.categoryNameAr : product?.categoryNameEn) || categoryId

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose() }}>
        <DialogContent
          closeAriaLabel={t('common.close')}
          className="max-h-[88vh] overflow-y-auto border-[#C9A25E]/25 bg-[#1A160E] text-[#F2EDE3] sm:max-w-2xl"
        >
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-[#F2EDE3]">
              {isEdit ? t('admin.products.edit') : t('admin.products.create')}
            </DialogTitle>
            <DialogDescription className="text-[#B6AD9C]">
              {isEdit ? localizedName(product, locale) : t(BRAND_LABEL_KEY[brand])}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="flex flex-col gap-6"
            noValidate
          >
            {/* ---- Section 1 · البيانات ---- */}
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="mb-1 flex w-full items-center gap-3">
                <span className={sectionTitleClass}>{t('admin.products.dialog.sections.data')}</span>
                <span className="h-px flex-1 bg-white/[0.08]" aria-hidden="true" />
              </legend>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={FIELD_IDS.nameAr} className="text-[#B6AD9C]">
                      {t('admin.products.fields.nameAr')} <span aria-hidden="true">*</span>
                    </Label>
                    <CharCounter value={form.nameAr.length} max={NAME_MAX} />
                  </div>
                  <Input
                    id={FIELD_IDS.nameAr}
                    dir="rtl"
                    maxLength={NAME_MAX}
                    value={form.nameAr}
                    onChange={(e) => setField('nameAr', e.target.value)}
                    aria-invalid={fieldErrors.nameAr ? true : undefined}
                    aria-describedby={fieldErrors.nameAr ? `${FIELD_IDS.nameAr}-error` : undefined}
                    className="h-11 border-white/12 bg-white/[0.03] text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                  />
                  <FieldError id={`${FIELD_IDS.nameAr}-error`} message={fieldErrors.nameAr} />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={FIELD_IDS.nameEn} className="text-[#B6AD9C]">
                      {t('admin.products.fields.nameEn')} <span aria-hidden="true">*</span>
                    </Label>
                    <CharCounter value={form.nameEn.length} max={NAME_MAX} />
                  </div>
                  <Input
                    id={FIELD_IDS.nameEn}
                    dir="ltr"
                    maxLength={NAME_MAX}
                    value={form.nameEn}
                    onChange={(e) => setField('nameEn', e.target.value)}
                    aria-invalid={fieldErrors.nameEn ? true : undefined}
                    aria-describedby={fieldErrors.nameEn ? `${FIELD_IDS.nameEn}-error` : undefined}
                    className="h-11 border-white/12 bg-white/[0.03] text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                  />
                  <FieldError id={`${FIELD_IDS.nameEn}-error`} message={fieldErrors.nameEn} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="product-field-desc-ar" className="text-[#B6AD9C]">
                  {t('admin.products.fields.descriptionAr')}
                </Label>
                <Textarea
                  id="product-field-desc-ar"
                  dir="rtl"
                  rows={3}
                  maxLength={DESCRIPTION_MAX}
                  value={form.descriptionAr}
                  onChange={(e) => setField('descriptionAr', e.target.value)}
                  aria-invalid={fieldErrors.descriptionAr ? true : undefined}
                  aria-describedby={
                    fieldErrors.descriptionAr ? 'product-field-desc-ar-error' : undefined
                  }
                  className="min-h-22 border-white/12 bg-white/[0.03] text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                />
                <FieldError id="product-field-desc-ar-error" message={fieldErrors.descriptionAr} />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="product-field-desc-en" className="text-[#B6AD9C]">
                  {t('admin.products.fields.descriptionEn')}
                </Label>
                <Textarea
                  id="product-field-desc-en"
                  dir="ltr"
                  rows={3}
                  maxLength={DESCRIPTION_MAX}
                  value={form.descriptionEn}
                  onChange={(e) => setField('descriptionEn', e.target.value)}
                  aria-invalid={fieldErrors.descriptionEn ? true : undefined}
                  aria-describedby={
                    fieldErrors.descriptionEn ? 'product-field-desc-en-error' : undefined
                  }
                  className="min-h-22 border-white/12 bg-white/[0.03] text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                />
                <FieldError id="product-field-desc-en-error" message={fieldErrors.descriptionEn} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={FIELD_IDS.slug} className="text-[#B6AD9C]">
                    {t('admin.products.fields.slug')}
                  </Label>
                  <Input
                    id={FIELD_IDS.slug}
                    dir="ltr"
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    placeholder={slugPlaceholder}
                    aria-invalid={fieldErrors.slug ? true : undefined}
                    aria-describedby={`${FIELD_IDS.slug}-hint${fieldErrors.slug ? ` ${FIELD_IDS.slug}-error` : ''}`}
                    className="h-11 border-white/12 bg-white/[0.03] font-mono text-sm text-[#F2EDE3] placeholder:text-[#8A8072]/70 focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                  />
                  <p id={`${FIELD_IDS.slug}-hint`} className="text-[0.6875rem] text-[#8A8072]">
                    {t('admin.products.fields.slugHint')}
                  </p>
                  <FieldError id={`${FIELD_IDS.slug}-error`} message={fieldErrors.slug} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={FIELD_IDS.brand} className="text-[#B6AD9C]">
                    {t('admin.products.brand')}
                  </Label>
                  {isEdit ? (
                    // Brand is immutable after creation — read-only badge.
                    <div
                      id={FIELD_IDS.brand}
                      className="flex h-11 items-center rounded-md border border-white/12 bg-white/[0.03] px-3"
                    >
                      <span
                        className={cn(
                          'rounded-md border px-2 py-0.5 text-xs font-semibold',
                          BRAND_BADGE[brand]
                        )}
                      >
                        {t(BRAND_LABEL_KEY[brand])}
                      </span>
                    </div>
                  ) : (
                    <Select
                      value={brand}
                      onValueChange={(value) => {
                        // '' arrives from Radix's hidden native form-sync when
                        // the value references a not-yet-mounted item — ignore.
                        if (!value) return
                        setBrand(value as Brand)
                        setDirty(true)
                        // The categories effect will re-scope and default the value.
                        setCategoryId(NO_CATEGORY)
                      }}
                    >
                      <SelectTrigger
                        id={FIELD_IDS.brand}
                        className="h-11 border-white/12 bg-white/[0.03] text-[#F2EDE3] shadow-none focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                      >
                        {/* Explicit label — Radix can't resolve a value whose
                            item hasn't mounted (content opens lazily). */}
                        <span className="truncate">{t(BRAND_LABEL_KEY[brand])}</span>
                      </SelectTrigger>
                      <SelectContent className="border-[#C9A25E]/25 bg-[#17130C]/95 text-[#F2EDE3] backdrop-blur-xl">
                        {BRAND_OPTIONS.map((option) => (
                          <SelectItem
                            key={option}
                            value={option}
                            className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE3]"
                          >
                            {t(BRAND_LABEL_KEY[option])}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FieldError id={`${FIELD_IDS.brand}-error`} message={fieldErrors.brand} />
                </div>
              </div>

              {/* Category select + inline management */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={FIELD_IDS.categoryId} className="text-[#B6AD9C]">
                    {t('admin.products.category')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={categoryId}
                      onValueChange={(value) => {
                        // '' arrives from Radix's hidden native form-sync when
                        // the value references a not-yet-mounted item — ignore.
                        if (!value) return
                        setCategoryId(value)
                        setDirty(true)
                      }}
                    >
                      <SelectTrigger
                        id={FIELD_IDS.categoryId}
                        className="h-11 w-full border-white/12 bg-white/[0.03] text-[#F2EDE3] shadow-none focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                      >
                        {/* Explicit label — covers unmounted items and the
                            stored-but-unlisted category in edit mode. */}
                        <span className="truncate">{categorySelectLabel}</span>
                      </SelectTrigger>
                      <SelectContent className="border-[#C9A25E]/25 bg-[#17130C]/95 text-[#F2EDE3] backdrop-blur-xl">
                        <SelectItem
                          value={NO_CATEGORY}
                          className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE3]"
                        >
                          {t('admin.products.fields.noCategory')}
                        </SelectItem>
                        {categories.map((c) => (
                          <SelectItem
                            key={c.id}
                            value={c.id}
                            className="text-[13px] focus:bg-[#C9A25E]/10 focus:text-[#F2EDE3]"
                          >
                            {localizedCategoryName(c, locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Popover open={catManageOpen} onOpenChange={setCatManageOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={t('admin.products.categories.manage')}
                          className="size-11 shrink-0 border-white/12 bg-white/[0.03] text-[#E5C878] hover:bg-white/[0.07] hover:text-[#F2EDE3]"
                        >
                          <ListPlus className="size-4" aria-hidden="true" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-80 border-[#C9A25E]/25 bg-[#1A160E] text-[#F2EDE3]"
                      >
                        <div className="flex flex-col gap-3">
                          <p className="font-display text-sm font-bold text-[#E5C878]">
                            {t('admin.products.categories.manage')}
                          </p>
                          <Input
                            id="admin-new-cat-ar"
                            dir="rtl"
                            value={newCatAr}
                            onChange={(e) => setNewCatAr(e.target.value)}
                            placeholder={t('admin.products.categories.newNameAr')}
                            aria-label={t('admin.products.categories.newNameAr')}
                            className="h-11 border-white/12 bg-white/[0.03] text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                          />
                          <Input
                            id="admin-new-cat-en"
                            dir="ltr"
                            value={newCatEn}
                            onChange={(e) => setNewCatEn(e.target.value)}
                            placeholder={t('admin.products.categories.newNameEn')}
                            aria-label={t('admin.products.categories.newNameEn')}
                            className="h-11 border-white/12 bg-white/[0.03] text-[#F2EDE3] placeholder:text-[#8A8072] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                          />
                          <Button
                            type="button"
                            onClick={() => void createCategory()}
                            disabled={catBusy || !newCatAr.trim() || !newCatEn.trim()}
                            className="min-h-11 gap-2 bg-[#C9A25E] font-semibold text-[#17130A] hover:bg-[#D9B56E]"
                          >
                            {catBusy ? (
                              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            ) : (
                              <Plus className="size-4" aria-hidden="true" />
                            )}
                            {t('admin.products.categories.create')}
                          </Button>
                          {categoryId !== NO_CATEGORY ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void deleteSelectedCategory()}
                              disabled={catBusy}
                              className="min-h-11 gap-2 border-[#dc2626]/40 bg-transparent text-[#F87171] hover:bg-[#dc2626]/10 hover:text-[#FCA5A5]"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                              {t('admin.products.categories.delete')}
                            </Button>
                          ) : null}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FieldError id={`${FIELD_IDS.categoryId}-error`} message={fieldErrors.categoryId} />
                </div>
              </div>
            </fieldset>

            {/* ---- Section 2 · السعر والكمية ---- */}
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="mb-1 flex w-full items-center gap-3">
                <span className={sectionTitleClass}>{t('admin.products.dialog.sections.pricing')}</span>
                <span className="h-px flex-1 bg-white/[0.08]" aria-hidden="true" />
              </legend>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={FIELD_IDS.priceKwd} className="text-[#B6AD9C]">
                    {t('admin.products.price')} <span aria-hidden="true">*</span>
                  </Label>
                  <Input
                    id={FIELD_IDS.priceKwd}
                    type="number"
                    inputMode="decimal"
                    dir="ltr"
                    min={0}
                    step={0.001}
                    value={form.priceKwd}
                    onChange={(e) => setField('priceKwd', e.target.value)}
                    aria-invalid={fieldErrors.priceKwd ? true : undefined}
                    aria-describedby={fieldErrors.priceKwd ? `${FIELD_IDS.priceKwd}-error` : undefined}
                    className="h-11 border-white/12 bg-white/[0.03] text-end tabular-nums text-[#F2EDE3] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                  />
                  <FieldError id={`${FIELD_IDS.priceKwd}-error`} message={fieldErrors.priceKwd} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={FIELD_IDS.depositKwd} className="text-[#B6AD9C]">
                    {t('admin.products.deposit')}
                  </Label>
                  <Input
                    id={FIELD_IDS.depositKwd}
                    type="number"
                    inputMode="decimal"
                    dir="ltr"
                    min={0}
                    step={0.001}
                    value={form.depositKwd}
                    onChange={(e) => setField('depositKwd', e.target.value)}
                    aria-invalid={fieldErrors.depositKwd ? true : undefined}
                    aria-describedby={
                      fieldErrors.depositKwd ? `${FIELD_IDS.depositKwd}-error` : undefined
                    }
                    className="h-11 border-white/12 bg-white/[0.03] text-end tabular-nums text-[#F2EDE3] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                  />
                  <FieldError id={`${FIELD_IDS.depositKwd}-error`} message={fieldErrors.depositKwd} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={FIELD_IDS.stock} className="text-[#B6AD9C]">
                    {t('admin.products.stock')}
                  </Label>
                  <Input
                    id={FIELD_IDS.stock}
                    type="number"
                    inputMode="numeric"
                    dir="ltr"
                    min={0}
                    step={1}
                    value={form.stock}
                    onChange={(e) => setField('stock', e.target.value)}
                    aria-invalid={fieldErrors.stock ? true : undefined}
                    aria-describedby={fieldErrors.stock ? `${FIELD_IDS.stock}-error` : undefined}
                    className="h-11 border-white/12 bg-white/[0.03] text-end tabular-nums text-[#F2EDE3] focus-visible:border-[#C9A25E]/50 focus-visible:ring-[#C9A25E]/25"
                  />
                  <FieldError id={`${FIELD_IDS.stock}-error`} message={fieldErrors.stock} />
                </div>
              </div>
            </fieldset>

            {/* ---- Section 3 · الصور ---- */}
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="mb-1 flex w-full items-center gap-3">
                <span className={sectionTitleClass}>{t('admin.products.dialog.sections.images')}</span>
                <span className="h-px flex-1 bg-white/[0.08]" aria-hidden="true" />
              </legend>

              <p className="text-[0.6875rem] text-[#8A8072]">
                {t('admin.products.images.limit', { max: MAX_IMAGES })}
              </p>

              <div
                role="group"
                aria-label={t('admin.products.images.reorder')}
                className="grid grid-cols-3 gap-3 sm:grid-cols-4"
              >
                {entries.map((entry, index) => (
                  <ImageTile
                    key={entry.kind === 'local' ? entry.objectUrl : `${entry.kind}-${entry.url}`}
                    src={entry.kind === 'remote' ? entry.url : entry.objectUrl}
                    alt={productAlt}
                    locale={locale}
                    isFirst={index === 0}
                    isLast={index === entries.length - 1}
                    onRemove={() => removeEntry(index)}
                    onMoveEarlier={() => moveEntry(index, -1)}
                    onMoveLater={() => moveEntry(index, 1)}
                  />
                ))}

                {/* Add tile (hidden multi-file input behind it) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={entries.length >= MAX_IMAGES}
                  aria-label={t('admin.products.images.add')}
                  className="flex aspect-square min-h-11 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-white/15 bg-white/[0.02] text-[#8A8072] transition-colors hover:border-[#C9A25E]/40 hover:bg-[#C9A25E]/[0.06] hover:text-[#E5C878] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ImagePlus className="size-5" aria-hidden="true" />
                  <span className="px-1 text-center text-[0.625rem] leading-tight">
                    {t('admin.products.images.add')}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleFilesPicked(e.target.files)
                    // Reset so re-picking the same file re-fires onChange.
                    e.target.value = ''
                  }}
                />
              </div>
              <FieldError id="product-images-error" message={fieldErrors.images} />
            </fieldset>

            {/* ---- Footer ---- */}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={requestClose}
                disabled={submitting}
                className="min-h-11 border-white/15 bg-transparent text-[#E5D9BE] hover:bg-white/[0.06] hover:text-[#F2EDE3]"
              >
                {t('admin.common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={submitting || uploading}
                className="min-h-11 min-w-32 gap-2 bg-[#C9A25E] font-semibold text-[#17130A] hover:bg-[#D9B56E]"
              >
                {submitting || uploading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : null}
                {uploading
                  ? t('admin.products.images.uploading')
                  : submitting
                    ? t('admin.common.loading')
                    : t('admin.common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---- Unsaved-changes guard (outside the form) ---- */}
      <AlertDialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <AlertDialogContent className="border-[#C9A25E]/25 bg-[#1A160E] text-[#F2EDE3]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-lg text-[#F2EDE3]">
              {t('admin.common.unsavedChanges')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#B6AD9C]">
              {t('admin.common.confirmLeave')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="min-h-11 border-white/15 bg-transparent text-[#E5D9BE] hover:bg-white/[0.06] hover:text-[#F2EDE3] focus-visible:ring-[#C9A25E]/30">
              {t('admin.common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeaveOpen(false)
                onOpenChange()
              }}
              className="min-h-11 bg-[#DC2626] text-[13px] text-white hover:bg-[#DC2626]/85 focus-visible:ring-[#DC2626]/40"
            >
              {t('admin.common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/* ================= Image tile (editor) ================= */

function ImageTile({
  src,
  alt,
  locale,
  isFirst,
  isLast,
  onRemove,
  onMoveEarlier,
  onMoveLater,
}: {
  src: string
  alt: string
  locale: Locale
  isFirst: boolean
  isLast: boolean
  onRemove: () => void
  onMoveEarlier: () => void
  onMoveLater: () => void
}) {
  const { t } = useI18n()
  // Logical arrows: in RTL "earlier" points start-ward (right), LTR → left.
  const EarlierIcon = locale === 'ar' ? ChevronRight : ChevronLeft
  const LaterIcon = locale === 'ar' ? ChevronLeft : ChevronRight

  return (
    <div className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-white/[0.04]">
      {/* blob:/uploads previews — plain img keeps this config-free. */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('admin.products.images.remove')}
        className="absolute top-1 end-1 flex size-11 items-start justify-end p-1.5 text-white/90 transition-colors hover:text-white"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
          <X className="size-3.5" aria-hidden="true" />
        </span>
      </button>
      {/* Reorder (bottom, logical direction) */}
      <div className="absolute bottom-1 start-1 end-1 flex items-center justify-between">
        <button
          type="button"
          onClick={onMoveEarlier}
          disabled={isFirst}
          aria-label={t('admin.products.images.moveEarlier')}
          className="flex size-11 items-center justify-center p-1.5 text-white/90 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <EarlierIcon className="size-3.5" aria-hidden="true" />
          </span>
        </button>
        <button
          type="button"
          onClick={onMoveLater}
          disabled={isLast}
          aria-label={t('admin.products.images.moveLater')}
          className="flex size-11 items-center justify-center p-1.5 text-white/90 transition-colors hover:text-white disabled:pointer-events-none disabled:opacity-30"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <LaterIcon className="size-3.5" aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  )
}

/* ================= Form atoms (dialog-local) ================= */

/** Inline field error line (dialog forms). */
function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-xs font-medium text-[#F87171]">
      {message}
    </p>
  )
}

/** x/max character counter (names). */
function CharCounter({ value, max }: { value: number; max: number }) {
  return (
    <span
      dir="ltr"
      className={cn('text-[0.6875rem] tabular-nums', value > max ? 'text-[#F87171]' : 'text-[#8A8072]')}
    >
      {value}/{max}
    </span>
  )
}
