import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import type { Category, Product, ProductColor, ProductSize, ProductVariation } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';

interface AdminProductEditorProps {
  initialProduct?: Product | null;
  defaultType?: 'own' | 'affiliate';
  categories: Category[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const CLOTHING_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const SHOE_PRESETS = ['EU 39', 'EU 40', 'EU 41', 'EU 42', 'EU 43', 'EU 44', 'US 8', 'US 9', 'US 10', 'UK 7', 'UK 8'];
const GENERAL_PRESETS = ['Small', 'Medium', 'Large', 'Extra Large'];

const SPEC_TEMPLATES: Record<string, string[]> = {
  clothing: [
    'FabricType',
    'MaterialComposition',
    'FabricWeight',
    'FitType',
    'SleeveType',
    'NeckType',
    'Gender',
    'Season',
    'CareInstructions',
  ],
  electronics: [
    'Brand',
    'Model',
    'Processor',
    'RAM',
    'Storage',
    'Battery',
    'DisplaySize',
    'Connectivity',
    'OperatingSystem',
    'Warranty',
  ],
  shoes: [
    'UpperMaterial',
    'SoleMaterial',
    'InnerMaterial',
    'ClosureType',
    'HeelHeight',
    'ShoeWeight',
  ],
};

export function AdminProductEditor({
  initialProduct,
  defaultType = 'own',
  categories,
  onClose,
  onSaved,
}: AdminProductEditorProps) {
  const { adminToken, showToast } = useStore();

  const [productType, setProductType] = useState<'own' | 'affiliate'>(
    initialProduct?.product_type || defaultType
  );
  const [name, setName] = useState(initialProduct?.name || '');
  const [productCode, setProductCode] = useState(initialProduct?.product_code || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [brand, setBrand] = useState(initialProduct?.brand || '');
  const [manufacturer, setManufacturer] = useState(initialProduct?.manufacturer || '');
  const [categoryId, setCategoryId] = useState<number>(initialProduct?.category_id || categories[0]?.id || 1);
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory || '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(initialProduct?.country_of_origin || '');
  const [status, setStatus] = useState(initialProduct?.status || 'active');
  const [shortDescription, setShortDescription] = useState(initialProduct?.short_description || '');
  const [fullDescription, setFullDescription] = useState(initialProduct?.full_description || '');
  const [highlightsText, setHighlightsText] = useState((initialProduct?.highlights || []).join('\n'));
  const [images, setImages] = useState<string[]>(initialProduct?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState(initialProduct?.video_url || '');

  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured ?? false);
  const [isNewArrival, setIsNewArrival] = useState(initialProduct?.is_new_arrival ?? true);
  const [isTrending, setIsTrending] = useState(initialProduct?.is_trending ?? false);
  const [isBestSeller, setIsBestSeller] = useState(initialProduct?.is_best_seller ?? false);
  const [isSpecialOffer, setIsSpecialOffer] = useState(initialProduct?.is_special_offer ?? false);
  const [isRecommended, setIsRecommended] = useState(initialProduct?.is_recommended ?? true);
  const [collectionTag, setCollectionTag] = useState(initialProduct?.collection_tag || '');

  const [originalPrice, setOriginalPrice] = useState(String(initialProduct?.original_price ?? 100));
  const [sellingPrice, setSellingPrice] = useState(String(initialProduct?.selling_price ?? 85));
  const [salePrice, setSalePrice] = useState(String(initialProduct?.sale_price ?? 85));
  const [wholesalePrice, setWholesalePrice] = useState(String(initialProduct?.wholesale_price ?? 0));
  const [shippingCost, setShippingCost] = useState(String(initialProduct?.shipping_cost ?? 0));
  const [taxInfo, setTaxInfo] = useState(initialProduct?.tax_info || '');
  const [totalStock, setTotalStock] = useState(String(initialProduct?.total_stock ?? 20));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(initialProduct?.low_stock_threshold ?? 5));

  const [packageContents, setPackageContents] = useState(initialProduct?.package_contents || '');
  const [numberOfPieces, setNumberOfPieces] = useState(String(initialProduct?.number_of_pieces ?? 1));
  const [packageQuantity, setPackageQuantity] = useState(String(initialProduct?.package_quantity ?? 1));
  const [packageLength, setPackageLength] = useState(initialProduct?.package_length || '');
  const [packageWidth, setPackageWidth] = useState(initialProduct?.package_width || '');
  const [packageHeight, setPackageHeight] = useState(initialProduct?.package_height || '');
  const [packageWeight, setPackageWeight] = useState(initialProduct?.package_weight || '');
  const [shippingWeight, setShippingWeight] = useState(initialProduct?.shipping_weight || '');
  const [includedAccessories, setIncludedAccessories] = useState(initialProduct?.included_accessories || '');

  const [affiliateUrl, setAffiliateUrl] = useState(initialProduct?.affiliate_url || '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(initialProduct?.estimated_delivery || '');
  const [shippingInfo, setShippingInfo] = useState(initialProduct?.shipping_info || '');
  const [returnPolicy, setReturnPolicy] = useState(initialProduct?.return_policy || '');

  const [colors, setColors] = useState<ProductColor[]>(initialProduct?.colors || []);
  const [sizes, setSizes] = useState<ProductSize[]>(initialProduct?.sizes || []);
  const [variations, setVariations] = useState<ProductVariation[]>(initialProduct?.variations || []);
  const [specsList, setSpecsList] = useState<Array<{ key: string; value: string }>>(
    Object.entries(initialProduct?.specs || {}).map(([key, value]) => ({ key, value }))
  );

  const [saving, setSaving] = useState(false);

  // Live automatic calculation of valid/available colors, sizes, and variations
  const variationStats = useMemo(() => {
    const availColors = colors.filter((c) => c.is_available && c.stock > 0).length;
    const availSizes = sizes.filter((s) => s.is_available && s.stock > 0).length;
    const validVars =
      variations.length > 0
        ? variations.filter((v) => v.is_available && v.stock > 0).length
        : availColors > 0 && availSizes > 0
        ? availColors * availSizes
        : Math.max(availColors, availSizes, 1);
    return { availColors, availSizes, validVars };
  }, [colors, sizes, variations]);

  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>, target: 'image' | 'video' | { colorIdx: number }) => {
    const file = e.target.files?.[0];
    if (!file || !adminToken) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: fd,
    });
    if (!res.ok) {
      showToast('Upload failed', 'error');
      return;
    }
    const data = await res.json();
    if (target === 'image') {
      setImages((prev) => [...prev, data.url]);
    } else if (target === 'video') {
      setVideoUrl(data.url);
    } else {
      setColors((prev) =>
        prev.map((c, idx) => (idx === target.colorIdx ? { ...c, images: [...c.images, data.url] } : c))
      );
    }
    showToast('Media uploaded', 'success');
  };

  const applySpecTemplate = (template: 'clothing' | 'electronics' | 'shoes') => {
    const keys = SPEC_TEMPLATES[template];
    const existingKeys = new Set(specsList.map((s) => s.key));
    const additions = keys.filter((k) => !existingKeys.has(k)).map((key) => ({ key, value: '' }));
    setSpecsList((prev) => [...prev, ...additions]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSaving(true);
    try {
      const specsObj: Record<string, string> = {};
      for (const item of specsList) {
        if (item.key.trim() && item.value.trim()) {
          specsObj[item.key.trim()] = item.value.trim();
        }
      }

      const payload = {
        product_type: productType,
        product_code: productCode.trim(),
        sku: sku.trim(),
        name: name.trim(),
        brand: brand.trim(),
        manufacturer: manufacturer.trim(),
        category_id: categoryId,
        subcategory: subcategory.trim(),
        country_of_origin: countryOfOrigin.trim(),
        status,
        short_description: shortDescription.trim(),
        full_description: fullDescription.trim(),
        highlights: highlightsText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        images,
        video_url: videoUrl.trim(),
        is_featured: isFeatured,
        is_new_arrival: isNewArrival,
        is_trending: isTrending,
        is_best_seller: isBestSeller,
        is_special_offer: isSpecialOffer,
        is_recommended: isRecommended,
        collection_tag: collectionTag.trim(),
        original_price: Number(originalPrice || 0),
        selling_price: Number(sellingPrice || 0),
        sale_price: Number(salePrice || sellingPrice || 0),
        wholesale_price: Number(wholesalePrice || 0),
        shipping_cost: Number(shippingCost || 0),
        tax_info: taxInfo.trim(),
        total_stock: Number(totalStock || 0),
        low_stock_threshold: Number(lowStockThreshold || 5),
        package_contents: packageContents.trim(),
        number_of_pieces: Number(numberOfPieces || 1),
        package_quantity: Number(packageQuantity || 1),
        package_length: packageLength.trim(),
        package_width: packageWidth.trim(),
        package_height: packageHeight.trim(),
        package_weight: packageWeight.trim(),
        shipping_weight: shippingWeight.trim(),
        included_accessories: includedAccessories.trim(),
        affiliate_url: affiliateUrl.trim(),
        estimated_delivery: estimatedDelivery.trim(),
        shipping_info: shippingInfo.trim(),
        return_policy: returnPolicy.trim(),
        specs: specsObj,
        colors,
        sizes,
        variations,
      };

      const url = initialProduct ? `/api/admin/products/${initialProduct.id}` : '/api/admin/products';
      const method = initialProduct ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save product', 'error');
        return;
      }
      showToast(initialProduct ? 'Product updated' : 'Product created', 'success');
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-950 text-zinc-100 w-full max-w-5xl max-h-[92vh] flex flex-col border border-[#C9A227]/40 shadow-2xl">
        <div className="px-6 py-4 bg-black text-white flex items-center justify-between border-b border-[#C9A227]/40">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">
              {initialProduct ? `Edit Product: ${initialProduct.name}` : 'Create New Product'}
            </h2>
            <p className="text-xs text-[#E4C76B] font-mono tabular-nums mt-0.5">
              Auto-Calculation · Available Colors: {variationStats.availColors} · Available Sizes: {variationStats.availSizes} · Valid Variations: {variationStats.validVars}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 text-xs text-zinc-200">
          {/* Product Type & Basic Information */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B] border-b border-zinc-800 pb-2">
              1. Basic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Selling System *</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as 'own' | 'affiliate')}
                  className="w-full border border-zinc-700 px-3 py-2 bg-zinc-900 text-white font-semibold focus:border-[#C9A227] focus:outline-none"
                >
                  <option value="own" className="bg-zinc-950 text-white">Own Product (Direct SHOPNEXA ROBI HUB Checkout)</option>
                  <option value="affiliate" className="bg-zinc-950 text-white">Affiliate Product (AliExpress Redirect)</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full border border-zinc-700 px-3 py-2 bg-zinc-900 text-white focus:border-[#C9A227] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-zinc-950 text-white">{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Brand</label>
                <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Manufacturer</label>
                <input type="text" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Subcategory</label>
                <input type="text" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Product ID / Code</label>
                <input type="text" value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="Auto if blank" className="w-full border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">SKU</label>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Auto if blank" className="w-full border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Country of Origin</label>
                <input type="text" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full border border-zinc-700 px-3 py-2 bg-zinc-900 text-white focus:border-[#C9A227] focus:outline-none">
                  <option value="active" className="bg-zinc-950 text-white">Active</option>
                  <option value="draft" className="bg-zinc-950 text-white">Draft</option>
                  <option value="out_of_stock" className="bg-zinc-950 text-white">Out of Stock</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Collection Tag</label>
                <input type="text" value={collectionTag} onChange={(e) => setCollectionTag(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-zinc-200">
              {[
                { label: 'Featured', val: isFeatured, set: setIsFeatured },
                { label: 'New Arrival', val: isNewArrival, set: setIsNewArrival },
                { label: 'Trending', val: isTrending, set: setIsTrending },
                { label: 'Best Seller', val: isBestSeller, set: setIsBestSeller },
                { label: 'Special Offer', val: isSpecialOffer, set: setIsSpecialOffer },
                { label: 'Recommended', val: isRecommended, set: setIsRecommended },
              ].map((flag) => (
                <label key={flag.label} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={flag.val} onChange={(e) => flag.set(e.target.checked)} className="accent-[#C9A227]" />
                  <span>{flag.label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Short Description</label>
                <textarea rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Product Highlights (one per line)</label>
                <textarea rows={2} value={highlightsText} onChange={(e) => setHighlightsText(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium text-zinc-300 mb-1">Full Description</label>
                <textarea rows={3} value={fullDescription} onChange={(e) => setFullDescription(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
            </div>
          </section>

          {/* Affiliate Specific */}
          {productType === 'affiliate' && (
            <section className="bg-zinc-900 border border-[#C9A227]/50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">AliExpress Affiliate Configuration</h3>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Official AliExpress Affiliate Tracking URL *</label>
                <input
                  type="url"
                  required
                  value={affiliateUrl}
                  onChange={(e) => setAffiliateUrl(e.target.value)}
                  placeholder="https://s.click.aliexpress.com/e/..."
                  className="w-full border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none"
                />
              </div>
            </section>
          )}

          {/* Media Gallery & Video */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B] border-b border-zinc-800 pb-2">
              2. Product Images & Video
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste image URL"
                className="flex-1 min-w-[200px] border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newImageUrl.trim()) {
                    setImages((prev) => [...prev, newImageUrl.trim()]);
                    setNewImageUrl('');
                  }
                }}
                className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold transition-colors"
              >
                Add Image URL
              </button>
              <label className="px-3 py-2 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold cursor-pointer flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Image</span>
                <input type="file" accept="image/*" onChange={(e) => void handleUploadMedia(e, 'image')} className="hidden" />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative w-24 h-20 border border-zinc-700 bg-white">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/80 text-white p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Product Video URL (MP4 / WebM)"
                className="flex-1 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none"
              />
              <label className="px-3 py-2 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#C9A227] cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Video</span>
                <input type="file" accept="video/mp4,video/webm" onChange={(e) => void handleUploadMedia(e, 'video')} className="hidden" />
              </label>
            </div>
          </section>

          {/* Pricing & Inventory */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B] border-b border-zinc-800 pb-2">
              3. Pricing & Inventory (USD Base)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Original Price</label>
                <input type="number" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Selling Price *</label>
                <input type="number" step="0.01" required value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Sale Price</label>
                <input type="number" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Wholesale Price</label>
                <input type="number" step="0.01" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Base Total Stock</label>
                <input type="number" value={totalStock} onChange={(e) => setTotalStock(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Low Stock Alert At</label>
                <input type="number" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Shipping Cost</label>
                <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 font-mono focus:border-[#C9A227] focus:outline-none" />
              </div>
              <div>
                <label className="block font-medium text-zinc-300 mb-1">Tax Information</label>
                <input type="text" value={taxInfo} onChange={(e) => setTaxInfo(e.target.value)} className="w-full border border-zinc-700 bg-zinc-900 text-white px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              </div>
            </div>
          </section>

          {/* Colors Management */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B]">4. Colors ({colors.length})</h3>
              <button
                type="button"
                onClick={() =>
                  setColors((prev) => [
                    ...prev,
                    { name: 'Obsidian Black', hex_code: '#09090B', images: [], is_available: true, stock: 10, sku: '', price_override: null },
                  ])
                }
                className="px-3 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Color</span>
              </button>
            </div>
            {colors.map((c, idx) => (
              <div key={idx} className="border border-zinc-800 bg-zinc-900 p-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Color Name"
                  value={c.name}
                  onChange={(e) => setColors((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={c.hex_code}
                    onChange={(e) => setColors((p) => p.map((x, i) => (i === idx ? { ...x, hex_code: e.target.value } : x)))}
                    className="w-8 h-8 border border-zinc-700 bg-zinc-950"
                  />
                  <input
                    type="text"
                    value={c.hex_code}
                    onChange={(e) => setColors((p) => p.map((x, i) => (i === idx ? { ...x, hex_code: e.target.value } : x)))}
                    className="w-20 border border-zinc-700 bg-zinc-950 text-white px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Stock"
                  value={c.stock}
                  onChange={(e) => setColors((p) => p.map((x, i) => (i === idx ? { ...x, stock: Number(e.target.value) } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Color SKU"
                  value={c.sku}
                  onChange={(e) => setColors((p) => p.map((x, i) => (i === idx ? { ...x, sku: e.target.value } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price Override"
                  value={c.price_override ?? ''}
                  onChange={(e) =>
                    setColors((p) =>
                      p.map((x, i) =>
                        i === idx ? { ...x, price_override: e.target.value === '' ? null : Number(e.target.value) } : x
                      )
                    )
                  }
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="px-2 py-1 bg-zinc-800 border border-zinc-700 text-zinc-200 hover:border-[#C9A227] cursor-pointer">
                    Img ({c.images.length})
                    <input type="file" accept="image/*" onChange={(e) => void handleUploadMedia(e, { colorIdx: idx })} className="hidden" />
                  </label>
                  <button type="button" onClick={() => setColors((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Sizes Management */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B]">5. Sizes & Measurements ({sizes.length})</h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setSizes(
                      CLOTHING_PRESETS.map((l) => ({
                        category_type: 'clothing',
                        size_system: 'Standard',
                        label: l,
                        measurements: { chest: '', waist: '', length: '' },
                        stock: 10,
                        price_override: null,
                        is_available: true,
                      }))
                    )
                  }
                  className="px-2.5 py-1 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#C9A227] hover:text-white"
                >
                  + Clothing Preset
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSizes(
                      SHOE_PRESETS.slice(0, 5).map((l) => ({
                        category_type: 'shoes',
                        size_system: 'EU',
                        label: l,
                        measurements: { length: '' },
                        stock: 8,
                        price_override: null,
                        is_available: true,
                      }))
                    )
                  }
                  className="px-2.5 py-1 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#C9A227] hover:text-white"
                >
                  + Shoes Preset
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSizes((prev) => [
                      ...prev,
                      {
                        category_type: 'general',
                        size_system: 'Standard',
                        label: GENERAL_PRESETS[0],
                        measurements: {},
                        stock: 10,
                        price_override: null,
                        is_available: true,
                      },
                    ])
                  }
                  className="px-3 py-1 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold"
                >
                  + Add Custom Size
                </button>
              </div>
            </div>
            {sizes.map((s, idx) => (
              <div key={idx} className="border border-zinc-800 bg-zinc-900 p-3 grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
                <input
                  type="text"
                  placeholder="Size Label"
                  value={s.label}
                  onChange={(e) => setSizes((p) => p.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                />
                <select
                  value={s.size_system}
                  onChange={(e) => setSizes((p) => p.map((x, i) => (i === idx ? { ...x, size_system: e.target.value as any } : x)))}
                  className="border border-zinc-700 px-2 py-1.5 bg-zinc-950 text-white focus:border-[#C9A227] focus:outline-none"
                >
                  <option value="Standard" className="bg-zinc-950 text-white">Standard</option>
                  <option value="EU" className="bg-zinc-950 text-white">EU</option>
                  <option value="US" className="bg-zinc-950 text-white">US</option>
                  <option value="UK" className="bg-zinc-950 text-white">UK</option>
                  <option value="Custom" className="bg-zinc-950 text-white">Custom</option>
                </select>
                <input
                  type="number"
                  placeholder="Stock"
                  value={s.stock}
                  onChange={(e) => setSizes((p) => p.map((x, i) => (i === idx ? { ...x, stock: Number(e.target.value) } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Chest / Length"
                  value={s.measurements?.chest || s.measurements?.length || ''}
                  onChange={(e) =>
                    setSizes((p) =>
                      p.map((x, i) =>
                        i === idx ? { ...x, measurements: { ...x.measurements, length: e.target.value } } : x
                      )
                    )
                  }
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price Override"
                  value={s.price_override ?? ''}
                  onChange={(e) =>
                    setSizes((p) =>
                      p.map((x, i) =>
                        i === idx ? { ...x, price_override: e.target.value === '' ? null : Number(e.target.value) } : x
                      )
                    )
                  }
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                />
                <button type="button" onClick={() => setSizes((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 justify-self-end">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </section>

          {/* Models & Variations */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B]">6. Models & Variations ({variations.length})</h3>
              <button
                type="button"
                onClick={() =>
                  setVariations((prev) => [
                    ...prev,
                    {
                      color_id: null,
                      size_id: null,
                      model_number: '',
                      model_name: '',
                      style: '',
                      design: '',
                      pattern: '',
                      version: '',
                      material: '',
                      variant_name: '',
                      image_url: images[0] || '',
                      sku: '',
                      price: Number(salePrice || sellingPrice || 0),
                      stock: 10,
                      is_available: true,
                    },
                  ])
                }
                className="px-3 py-1.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variation</span>
              </button>
            </div>
            {variations.map((v, idx) => (
              <div key={idx} className="border border-zinc-800 bg-zinc-900 p-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  placeholder="Variant Name"
                  value={v.variant_name}
                  onChange={(e) => setVariations((p) => p.map((x, i) => (i === idx ? { ...x, variant_name: e.target.value } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Model Number / Name"
                  value={v.model_name}
                  onChange={(e) => setVariations((p) => p.map((x, i) => (i === idx ? { ...x, model_name: e.target.value } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Style / Material"
                  value={v.material}
                  onChange={(e) => setVariations((p) => p.map((x, i) => (i === idx ? { ...x, material: e.target.value } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price"
                  value={v.price}
                  onChange={(e) => setVariations((p) => p.map((x, i) => (i === idx ? { ...x, price: Number(e.target.value) } : x)))}
                  className="border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                />
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.stock}
                    onChange={(e) => setVariations((p) => p.map((x, i) => (i === idx ? { ...x, stock: Number(e.target.value) } : x)))}
                    className="w-20 border border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-500 px-2 py-1.5 font-mono focus:border-[#C9A227] focus:outline-none"
                  />
                  <button type="button" onClick={() => setVariations((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Specifications */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B]">7. Product Specifications</h3>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => applySpecTemplate('clothing')} className="px-2.5 py-1 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#C9A227] hover:text-white">+ Clothing Specs</button>
                <button type="button" onClick={() => applySpecTemplate('electronics')} className="px-2.5 py-1 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#C9A227] hover:text-white">+ Electronics Specs</button>
                <button type="button" onClick={() => applySpecTemplate('shoes')} className="px-2.5 py-1 border border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-[#C9A227] hover:text-white">+ Shoe Specs</button>
                <button
                  type="button"
                  onClick={() => setSpecsList((p) => [...p, { key: '', value: '' }])}
                  className="px-3 py-1 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold"
                >
                  + Custom Spec
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {specsList.map((sp, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Attribute"
                    value={sp.key}
                    onChange={(e) => setSpecsList((p) => p.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x)))}
                    className="w-1/2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-2 py-1.5 font-medium focus:border-[#C9A227] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={sp.value}
                    onChange={(e) => setSpecsList((p) => p.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))}
                    className="w-1/2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-2 py-1.5 focus:border-[#C9A227] focus:outline-none"
                  />
                  <button type="button" onClick={() => setSpecsList((p) => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Packaging & Delivery */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#E4C76B] border-b border-zinc-800 pb-2">
              8. Packaging, Dimensions & Shipping Info
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input type="text" placeholder="Package Contents" value={packageContents} onChange={(e) => setPackageContents(e.target.value)} className="col-span-2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="number" placeholder="Pieces" value={numberOfPieces} onChange={(e) => setNumberOfPieces(e.target.value)} className="border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="number" placeholder="Pkg Qty" value={packageQuantity} onChange={(e) => setPackageQuantity(e.target.value)} className="border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Length (e.g. 20cm)" value={packageLength} onChange={(e) => setPackageLength(e.target.value)} className="border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Width" value={packageWidth} onChange={(e) => setPackageWidth(e.target.value)} className="border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Height" value={packageHeight} onChange={(e) => setPackageHeight(e.target.value)} className="border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Weight / Shipping Wt" value={packageWeight} onChange={(e) => { setPackageWeight(e.target.value); setShippingWeight(e.target.value); }} className="border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Included Accessories" value={includedAccessories} onChange={(e) => setIncludedAccessories(e.target.value)} className="col-span-2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Estimated Delivery" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} className="col-span-2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Shipping Info" value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} className="col-span-2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
              <input type="text" placeholder="Return Policy" value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} className="col-span-2 border border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 px-3 py-2 focus:border-[#C9A227] focus:outline-none" />
            </div>
          </section>

          <div className="sticky bottom-0 bg-zinc-950 border-t border-zinc-800 pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white font-semibold transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#C9A227] hover:bg-[#E4C76B] text-black font-semibold transition-colors"
            >
              {saving ? 'Saving...' : initialProduct ? 'Save Changes' : 'Publish Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
