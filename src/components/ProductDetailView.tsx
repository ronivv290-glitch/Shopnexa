import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Heart,
  ZoomIn,
  ExternalLink,
  ShoppingBag,
  Star,
  Truck,
  RotateCcw,
  Package,
  ShieldCheck,
  Check,
  Upload,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { Review } from '../types.ts';
import { SmartImage } from './SmartImage.tsx';
import { ProductCard } from './ProductCard.tsx';
import { t } from '../i18n.ts';

export function ProductDetailView({ productId }: { productId: number }) {
  const {
    products,
    formatPrice,
    navigate,
    addToCart,
    wishlistIds,
    toggleWishlist,
    user,
    authToken,
    language,
    settings,
    showToast,
  } = useStore();

  const product = products.find((p) => p.id === productId);

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [selectedColorId, setSelectedColorId] = useState<number | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null);
  const [selectedVariationId, setSelectedVariationId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  const [productReviews, setProductReviews] = useState<Review[]>([]);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!product) return;
    setSelectedImageIdx(0);
    setSelectedColorId(product.colors.find((c) => c.is_available && c.stock > 0)?.id ?? product.colors[0]?.id ?? null);
    setSelectedSizeId(product.sizes.find((s) => s.is_available && s.stock > 0)?.id ?? product.sizes[0]?.id ?? null);
    setSelectedVariationId(
      product.variations.find((v) => v.is_available && v.stock > 0)?.id ?? product.variations[0]?.id ?? null
    );
    setQuantity(1);
    setReviewAuthor(user?.name || '');

    fetch(`/api/reviews/${product.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setProductReviews(data))
      .catch(() => setProductReviews([]));
  }, [product, user]);

  const selectedColor = useMemo(
    () => product?.colors.find((c) => c.id === selectedColorId) || null,
    [product, selectedColorId]
  );
  const selectedSize = useMemo(
    () => product?.sizes.find((s) => s.id === selectedSizeId) || null,
    [product, selectedSizeId]
  );
  const selectedVariation = useMemo(
    () => product?.variations.find((v) => v.id === selectedVariationId) || null,
    [product, selectedVariationId]
  );

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4 text-zinc-100">
        <p className="text-lg font-semibold text-white">Product not found</p>
        <button
          type="button"
          onClick={() => navigate({ page: 'shop', filter: 'all' })}
          className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold transition-colors"
        >
          Back to Catalog
        </button>
      </div>
    );
  }

  const galleryImages = useMemo(() => {
    const colorImgs = selectedColor?.images?.length ? selectedColor.images : [];
    const varImg = selectedVariation?.image_url ? [selectedVariation.image_url] : [];
    const combined = Array.from(new Set([...varImg, ...colorImgs, ...product.images])).filter(Boolean);
    return combined.length > 0 ? combined : [''];
  }, [product.images, selectedColor, selectedVariation]);

  const activeImage = galleryImages[selectedImageIdx] || galleryImages[0];

  const activePrice =
    selectedVariation?.price ||
    selectedSize?.price_override ||
    selectedColor?.price_override ||
    (product.sale_price > 0 ? product.sale_price : product.selling_price);

  const activeSku = selectedVariation?.sku || selectedColor?.sku || product.sku;

  const availableStock = selectedVariation
    ? selectedVariation.stock
    : selectedColor && selectedSize
    ? Math.min(selectedColor.stock, selectedSize.stock)
    : selectedColor
    ? selectedColor.stock
    : selectedSize
    ? selectedSize.stock
    : product.total_stock;

  const isWishlisted = wishlistIds.includes(product.id);
  const relatedProducts = products
    .filter((p) => p.id !== product.id && (p.category_id === product.category_id || p.product_type === product.product_type))
    .slice(0, 3);

  const handleAffiliateBuyNow = async () => {
    const res = await fetch('/api/affiliate/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        product_id: product.id,
        selected_color: selectedColor?.name || '',
        selected_size: selectedSize?.label || '',
        selected_model: selectedVariation?.model_name || selectedVariation?.variant_name || '',
      }),
    });
    const data = await res.json();
    if (res.ok && data.redirectUrl) {
      window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
    } else {
      window.open(product.affiliate_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authToken) {
      if (!authToken) showToast('Sign in to upload review photos.', 'info');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: form,
    });
    if (res.ok) {
      const data = await res.json();
      setReviewImages((prev) => [...prev, data.url]);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent, isQuestion = false) => {
    e.preventDefault();
    if (!reviewAuthor.trim()) {
      showToast('Please enter your name.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          product_id: product.id,
          author_name: reviewAuthor.trim(),
          rating: isQuestion ? 0 : reviewRating,
          title: isQuestion ? 'Product Question' : reviewTitle.trim(),
          comment: isQuestion ? '' : reviewComment.trim(),
          question: isQuestion ? questionText.trim() : '',
          images: reviewImages,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setProductReviews((prev) => [data, ...prev]);
        setReviewTitle('');
        setReviewComment('');
        setQuestionText('');
        setReviewImages([]);
        showToast(isQuestion ? 'Question posted' : 'Review published', 'success');
      } else {
        showToast(data.error || 'Could not submit', 'error');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 text-zinc-100">
      <button
        type="button"
        onClick={() => navigate({ page: 'shop', filter: 'all' })}
        className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-[#E4C76B] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </button>

      {/* Main Contiguous Purchase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: White Product Showcase Box + Thumbnails + Video */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-[4/3] bg-white border border-zinc-800 overflow-hidden group shadow-xl shadow-black/50">
            <SmartImage src={activeImage} alt={product.name} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="Zoom image"
              className="absolute bottom-4 right-4 px-3 py-2 bg-zinc-950/90 border border-zinc-700 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#C9A227] hover:text-black transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
              <span>Zoom</span>
            </button>
          </div>

          {galleryImages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {galleryImages.map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setSelectedImageIdx(i)}
                  className={`w-20 h-16 border bg-white overflow-hidden ${
                    selectedImageIdx === i ? 'border-[#C9A227] ring-2 ring-[#C9A227]' : 'border-zinc-700 opacity-85 hover:opacity-100'
                  }`}
                >
                  <SmartImage src={img} alt={`${product.name} view ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {product.video_url && (
            <div className="border border-zinc-800 bg-black p-2">
              <video controls className="w-full max-h-80" src={product.video_url}>
                Product demonstration video
              </video>
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2 border-b border-zinc-800 pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="font-semibold uppercase tracking-wider text-[#E4C76B]">{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span className="text-zinc-200">{product.category_name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-zinc-400">{product.product_code}</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-white leading-tight">
              {product.name}
            </h1>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(product.rating_avg) ? 'fill-[#C9A227] text-[#C9A227]' : 'text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono tabular-nums text-zinc-300">
                  {product.review_count > 0
                    ? `${product.rating_avg.toFixed(1)} (${product.review_count} reviews)`
                    : 'No reviews yet'}
                </span>
              </div>

              <span className="text-xs font-semibold text-[#E4C76B]">
                {product.product_type === 'affiliate' ? 'AliExpress Affiliate Product' : 'SHOPNEXA ROBI HUB Direct Vault'}
              </span>
            </div>

            <div className="pt-3 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-semibold font-mono tabular-nums text-white">
                {formatPrice(activePrice)}
              </span>
              {product.original_price > activePrice && (
                <>
                  <span className="text-base font-mono tabular-nums text-zinc-500 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                  <span className="text-xs font-semibold text-[#E4C76B]">
                    Save {product.discount_percentage}% ({formatPrice(product.original_price - activePrice)})
                  </span>
                </>
              )}
            </div>

            <p className="text-xs font-mono text-zinc-400">SKU: {activeSku}</p>
          </div>

          <p className="text-sm text-zinc-200 leading-relaxed">{product.short_description}</p>

          {/* Colors Selection */}
          {product.colors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Color: <span className="font-normal text-zinc-300">{selectedColor?.name || 'Select'}</span>
                </span>
                <span className="font-mono tabular-nums text-zinc-400">
                  Available Colors: {product.total_colors}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.id ?? c.name}
                    type="button"
                    disabled={!c.is_available || c.stock <= 0}
                    onClick={() => {
                      setSelectedColorId(c.id ?? null);
                      setSelectedImageIdx(0);
                    }}
                    className={`px-3 py-1.5 border text-xs flex items-center gap-2 transition-colors ${
                      selectedColorId === c.id
                        ? 'border-[#C9A227] bg-[#C9A227] text-black font-semibold'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-[#C9A227]'
                    } ${!c.is_available || c.stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="w-3.5 h-3.5 border border-zinc-400" style={{ backgroundColor: c.hex_code }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes Selection */}
          {product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">
                  Size: <span className="font-normal text-zinc-300">{selectedSize?.label || 'Select'}</span>
                </span>
                <span className="font-mono tabular-nums text-zinc-400">
                  Available Sizes: {product.total_sizes}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s.id ?? s.label}
                    type="button"
                    disabled={!s.is_available || s.stock <= 0}
                    onClick={() => setSelectedSizeId(s.id ?? null)}
                    className={`px-3 py-1.5 border text-xs font-medium transition-colors ${
                      selectedSizeId === s.id
                        ? 'border-[#C9A227] bg-[#C9A227] text-black font-semibold'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-[#C9A227]'
                    } ${!s.is_available || s.stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Models / Variations Selection */}
          {product.variations.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Model / Variation</span>
                <span className="font-mono tabular-nums text-zinc-400">
                  Valid Variations: {product.total_variations}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {product.variations.map((v) => (
                  <button
                    key={v.id ?? v.sku}
                    type="button"
                    disabled={!v.is_available || v.stock <= 0}
                    onClick={() => setSelectedVariationId(v.id ?? null)}
                    className={`p-3 border text-left text-xs flex items-center justify-between transition-colors ${
                      selectedVariationId === v.id
                        ? 'border-[#C9A227] bg-zinc-900 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-600'
                    } ${!v.is_available || v.stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <p className="font-semibold text-white">{v.variant_name || v.model_name}</p>
                      <p className="text-zinc-400 mt-0.5">
                        {[v.model_number, v.style, v.material].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <p className="font-semibold text-[#E4C76B]">{formatPrice(v.price)}</p>
                      <p className="text-[11px] text-zinc-400">{v.stock} in stock</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & Stock */}
          <div className="flex items-center justify-between border-y border-zinc-800 py-3 text-xs">
            {product.product_type === 'own' ? (
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">Quantity</span>
                <div className="flex items-center border border-zinc-700 bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3 py-1.5 text-white hover:bg-zinc-800"
                  >
                    -
                  </button>
                  <span className="px-4 font-mono tabular-nums font-semibold text-white">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, availableStock), q + 1))}
                    className="px-3 py-1.5 text-white hover:bg-zinc-800"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : (
              <span className="font-medium text-zinc-300">Partner Fulfillment via AliExpress</span>
            )}

            <span className={`font-mono tabular-nums font-medium ${availableStock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {availableStock > 0 ? `${availableStock} available` : 'Out of stock'}
            </span>
          </div>

          {/* Primary Purchase Actions (Strictly Separated: Own vs Affiliate) */}
          {product.product_type === 'own' ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={() =>
                    addToCart(product, {
                      colorId: selectedColorId,
                      sizeId: selectedSizeId,
                      variationId: selectedVariationId,
                      quantity,
                    })
                  }
                  className="flex-1 py-3.5 px-5 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 text-black text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{t(language, 'addToCart')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void toggleWishlist(product.id)}
                  aria-label="Wishlist"
                  className="px-4 border border-zinc-700 bg-zinc-900 hover:border-[#C9A227] text-white flex items-center justify-center transition-colors"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#C9A227] text-[#C9A227]' : ''}`} />
                </button>
              </div>
              <button
                type="button"
                disabled={availableStock <= 0}
                onClick={() => {
                  const res = addToCart(product, {
                    colorId: selectedColorId,
                    sizeId: selectedSizeId,
                    variationId: selectedVariationId,
                    quantity,
                  });
                  if (res.ok) navigate({ page: 'checkout' });
                }}
                className="w-full py-3.5 px-5 bg-[#C9A227] hover:bg-[#E4C76B] disabled:bg-zinc-700 disabled:text-zinc-400 text-black text-xs font-semibold tracking-wide transition-colors"
              >
                {t(language, 'buyNowDirect')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-zinc-900 border border-[#C9A227]/40 p-4 text-xs text-zinc-200 space-y-1.5">
                <p className="font-semibold text-[#E4C76B]">Affiliate Disclosure & Partner Checkout</p>
                <p className="leading-relaxed">
                  {settings?.affiliate_disclosure ||
                    'This is an official AliExpress affiliate product. Clicking BUY NOW redirects you to AliExpress through our tracked partner link. AliExpress handles final checkout, payment, and buyer protection.'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleAffiliateBuyNow()}
                  className="flex-1 py-3.5 px-5 bg-[#C9A227] hover:bg-[#E4C76B] text-black text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors"
                >
                  <span>{t(language, 'buyOnAliExpress')}</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleWishlist(product.id)}
                  aria-label="Wishlist"
                  className="px-4 border border-zinc-700 bg-zinc-900 hover:border-[#C9A227] text-white flex items-center justify-center"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#C9A227] text-[#C9A227]' : ''}`} />
                </button>
              </div>
            </div>
          )}

          {/* Shipping & Return Summary */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 space-y-2.5 text-xs text-zinc-300">
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-[#E4C76B] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Estimated Delivery: {product.estimated_delivery || '2–7 Business Days'}</p>
                <p>{product.shipping_info}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <RotateCcw className="w-4 h-4 text-[#E4C76B] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Return Policy</p>
                <p>{product.return_policy}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E4C76B] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Origin & Authenticity</p>
                <p>Country of Origin: {product.country_of_origin || 'International'} · Manufacturer: {product.manufacturer || product.brand}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Description, Highlights, Specs, Packaging & Size Chart */}
      <div className="mt-16 pt-12 border-t border-zinc-800 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-semibold text-white">Product Description</h2>
            <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{product.full_description}</p>
          </div>

          {product.highlights.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Key Highlights</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {product.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-200">
                    <Check className="w-4 h-4 text-[#E4C76B] shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.size_chart.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Size Chart & Measurements</h3>
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-black text-[#E4C76B]">
                    <tr>
                      {Object.keys(product.size_chart[0]).map((col) => (
                        <th key={col} className="px-4 py-2.5 font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {product.size_chart.map((row, idx) => (
                      <tr key={idx} className="bg-zinc-900">
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 font-mono tabular-nums text-zinc-200">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Technical Specifications & Packaging */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-zinc-800 bg-zinc-900">
            <div className="px-5 py-3 bg-black text-[#E4C76B] text-xs font-semibold tracking-wider border-b border-zinc-800">
              SPECIFICATIONS
            </div>
            <dl className="divide-y divide-zinc-800 text-xs">
              {Object.entries(product.specs).map(([k, v]) => (
                <div key={k} className="px-5 py-2.5 flex justify-between gap-4">
                  <dt className="text-zinc-400 font-medium">{k}</dt>
                  <dd className="text-white font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="border border-zinc-800 bg-zinc-900">
            <div className="px-5 py-3 bg-black text-[#E4C76B] text-xs font-semibold tracking-wider flex items-center gap-2 border-b border-zinc-800">
              <Package className="w-4 h-4 text-[#E4C76B]" />
              <span>PACKAGING & DIMENSIONS</span>
            </div>
            <dl className="divide-y divide-zinc-800 text-xs">
              <div className="px-5 py-2.5 flex justify-between gap-4">
                <dt className="text-zinc-400">Package Contents</dt>
                <dd className="text-white text-right">{product.package_contents || 'Standard retail unit'}</dd>
              </div>
              <div className="px-5 py-2.5 flex justify-between gap-4">
                <dt className="text-zinc-400">Number of Pieces</dt>
                <dd className="font-mono tabular-nums text-white">{product.number_of_pieces}</dd>
              </div>
              <div className="px-5 py-2.5 flex justify-between gap-4">
                <dt className="text-zinc-400">Dimensions (L × W × H)</dt>
                <dd className="font-mono text-white">
                  {[product.package_length, product.package_width, product.package_height].filter(Boolean).join(' × ') || 'Standard'}
                </dd>
              </div>
              <div className="px-5 py-2.5 flex justify-between gap-4">
                <dt className="text-zinc-400">Package / Shipping Weight</dt>
                <dd className="font-mono text-white">
                  {product.package_weight || 'N/A'} / {product.shipping_weight || 'N/A'}
                </dd>
              </div>
              {product.included_accessories && (
                <div className="px-5 py-2.5 flex justify-between gap-4">
                  <dt className="text-zinc-400">Included Accessories</dt>
                  <dd className="text-white text-right">{product.included_accessories}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Product Questions */}
      <div className="mt-16 pt-12 border-t border-zinc-800 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <h3 className="font-display text-2xl font-semibold text-white">Write a Review</h3>
            <form onSubmit={(e) => void handleSubmitReview(e, false)} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={reviewAuthor}
                onChange={(e) => setReviewAuthor(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 text-white placeholder:text-zinc-400 focus:border-[#C9A227] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <span className="font-medium text-zinc-200">Rating:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setReviewRating(n)}
                    className="p-1"
                  >
                    <Star
                      className={`w-4 h-4 ${n <= reviewRating ? 'fill-[#C9A227] text-[#C9A227]' : 'text-zinc-700'}`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                placeholder="Review headline"
                className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 text-white placeholder:text-zinc-400 focus:border-[#C9A227] focus:outline-none"
              />
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your authentic experience with this product..."
                className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 text-white placeholder:text-zinc-400 focus:border-[#C9A227] focus:outline-none"
              />
              <label className="flex items-center gap-2 text-zinc-300 cursor-pointer hover:text-[#E4C76B]">
                <Upload className="w-4 h-4" />
                <span>Attach Photo (signed-in customers)</span>
                <input type="file" accept="image/*" onChange={(e) => void handleReviewImageUpload(e)} className="hidden" />
              </label>
              {reviewImages.length > 0 && (
                <div className="flex gap-2">
                  {reviewImages.map((u, idx) => (
                    <img key={idx} src={u} alt="Review upload" className="w-12 h-12 object-cover border border-zinc-700 bg-white" />
                  ))}
                </div>
              )}
              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors"
              >
                Submit Review
              </button>
            </form>
          </div>

          <div className="border border-zinc-800 bg-zinc-900 p-6 space-y-3">
            <h3 className="text-sm font-semibold text-white">Ask a Product Question</h3>
            <form onSubmit={(e) => void handleSubmitReview(e, true)} className="space-y-3 text-xs">
              <input
                type="text"
                required
                value={reviewAuthor}
                onChange={(e) => setReviewAuthor(e.target.value)}
                placeholder="Your Name"
                className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 text-white placeholder:text-zinc-400 focus:border-[#C9A227] focus:outline-none"
              />
              <textarea
                required
                rows={2}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ask about sizing, compatibility, or delivery..."
                className="w-full bg-zinc-950 border border-zinc-700 px-3 py-2 text-white placeholder:text-zinc-400 focus:border-[#C9A227] focus:outline-none"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 border border-[#C9A227] text-[#E4C76B] font-semibold hover:bg-[#C9A227] hover:text-black transition-colors"
              >
                Post Question
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-display text-2xl font-semibold text-white">
            Customer Reviews & Questions ({productReviews.length})
          </h3>
          {productReviews.length === 0 ? (
            <div className="border border-zinc-800 bg-zinc-900 p-8 text-xs text-zinc-300">
              No reviews or questions yet for this product. Be the first to share your thoughts.
            </div>
          ) : (
            <div className="space-y-4">
              {productReviews.map((rev) => (
                <div key={rev.id} className="border border-zinc-800 p-5 space-y-2 bg-zinc-900 text-zinc-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{rev.author_name}</span>
                    <span className="text-zinc-400 font-mono">{rev.created_at.slice(0, 10)}</span>
                  </div>
                  {rev.rating > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i < rev.rating ? 'fill-[#C9A227] text-[#C9A227]' : 'text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      {rev.is_verified_purchase && (
                        <span className="text-[11px] font-medium text-[#E4C76B]">Verified Purchase</span>
                      )}
                    </div>
                  )}
                  {rev.title && <p className="text-sm font-semibold text-white">{rev.title}</p>}
                  {rev.comment && <p className="text-xs text-zinc-300 leading-relaxed">{rev.comment}</p>}
                  {rev.question && (
                    <p className="text-xs text-zinc-200 font-medium">Question: {rev.question}</p>
                  )}
                  {rev.answer && (
                    <div className="bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300">
                      <span className="font-semibold text-[#E4C76B]">SHOPNEXA ROBI HUB Response: </span>
                      {rev.answer}
                    </div>
                  )}
                  {rev.images.length > 0 && (
                    <div className="flex gap-2 pt-2">
                      {rev.images.map((u, idx) => (
                        <img key={idx} src={u} alt="Customer review" className="w-16 h-16 object-cover border border-zinc-700 bg-white" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related Products (White Product Cards on Dark Obsidian) */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-12 border-t border-zinc-800">
          <h2 className="font-display text-3xl font-semibold text-white mb-6">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-hidden border border-[#C9A227]/40 bg-white p-2">
            <SmartImage src={activeImage} alt={product.name} className="max-h-[85vh] w-auto object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
