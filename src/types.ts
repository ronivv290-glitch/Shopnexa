export type ProductType = 'own' | 'affiliate';
export type ProductStatus = 'active' | 'draft' | 'out_of_stock';

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string;
  image_url: string;
  sort_order: number;
  is_featured: number;
  product_count?: number;
}

export interface ProductColor {
  id?: number;
  product_id?: number;
  name: string;
  hex_code: string;
  images: string[];
  is_available: boolean;
  stock: number;
  sku: string;
  price_override: number | null;
}

export interface SizeMeasurements {
  chest?: string;
  waist?: string;
  length?: string;
  width?: string;
  height?: string;
  weight?: string;
}

export interface ProductSize {
  id?: number;
  product_id?: number;
  category_type: 'clothing' | 'shoes' | 'general';
  size_system: 'Standard' | 'EU' | 'US' | 'UK' | 'Custom';
  label: string;
  measurements: SizeMeasurements;
  stock: number;
  price_override: number | null;
  is_available: boolean;
}

export interface ProductVariation {
  id?: number;
  product_id?: number;
  color_id: number | null;
  size_id: number | null;
  color_name?: string;
  size_label?: string;
  model_number: string;
  model_name: string;
  style: string;
  design: string;
  pattern: string;
  version: string;
  material: string;
  variant_name: string;
  image_url: string;
  sku: string;
  price: number;
  stock: number;
  is_available: boolean;
}

export interface Product {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  brand: string;
  manufacturer: string;
  product_type: ProductType;
  category_id: number;
  category_name?: string;
  subcategory: string;
  short_description: string;
  full_description: string;
  highlights: string[];
  country_of_origin: string;
  images: string[];
  video_url: string;
  status: ProductStatus;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_trending: boolean;
  is_best_seller: boolean;
  is_special_offer: boolean;
  is_recommended: boolean;
  collection_tag: string;

  original_price: number;
  selling_price: number;
  discount_amount: number;
  discount_percentage: number;
  sale_price: number;
  currency: string;
  wholesale_price: number;
  shipping_cost: number;
  tax_rate: number;
  tax_info: string;

  package_contents: string;
  number_of_pieces: number;
  package_quantity: number;
  package_length: string;
  package_width: string;
  package_height: string;
  package_weight: string;
  shipping_weight: string;
  included_accessories: string;

  specs: Record<string, string>;
  size_chart: Array<Record<string, string>>;

  total_stock: number;
  low_stock_threshold: number;
  total_colors: number;
  total_sizes: number;
  total_variations: number;

  affiliate_url: string;
  estimated_delivery: string;
  shipping_info: string;
  return_policy: string;

  rating_avg: number;
  review_count: number;
  created_at: string;
  updated_at: string;

  colors: ProductColor[];
  sizes: ProductSize[];
  variations: ProductVariation[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  avatar_url: string;
  status: 'active' | 'suspended';
  created_at: string;
}

export interface CustomerAddress {
  id?: number;
  user_id?: number;
  label: string;
  is_default: boolean;
  full_name: string;
  mobile: string;
  alt_phone: string;
  email: string;
  country: string;
  division: string;
  district: string;
  upazila: string;
  thana: string;
  union_name: string;
  municipality: string;
  city: string;
  village: string;
  area: string;
  road_number: string;
  house_number: string;
  apartment_number: string;
  floor_number: string;
  state_province: string;
  street_address: string;
  postal_code: string;
  landmark: string;
  instructions: string;
}

export interface CartItem {
  id: number;
  product_id: number;
  color_id: number | null;
  size_id: number | null;
  variation_id: number | null;
  quantity: number;
  product: Product;
  selected_color?: ProductColor | null;
  selected_size?: ProductSize | null;
  selected_variation?: ProductVariation | null;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Ready to Ship'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Returned'
  | 'Refunded';

export type PaymentMethod = 'bkash' | 'nagad' | 'cod' | 'international_card';
export type PaymentStatus = 'pending' | 'verified' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  sku: string;
  color_name: string;
  size_label: string;
  model_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Order {
  id: number;
  order_number: string;
  user_id: number | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  alt_phone: string;
  address: CustomerAddress;
  country: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id: string;
  gateway_reference: string;
  order_status: OrderStatus;
  subtotal: number;
  discount_amount: number;
  coupon_code: string;
  shipping_charge: number;
  tax_amount: number;
  final_total: number;
  currency: string;
  courier_id: number | null;
  courier_name?: string;
  tracking_number: string;
  estimated_delivery: string;
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface Coupon {
  id: number;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number;
  used_count: number;
  expires_at: string;
  is_active: boolean;
  campaign_name: string;
}

export interface Review {
  id: number;
  product_id: number;
  product_name?: string;
  user_id: number | null;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  images: string[];
  question: string;
  answer: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface ShippingZone {
  id: number;
  name: string;
  country: string;
  district: string;
  area: string;
  base_fee: number;
  per_kg_fee: number;
  free_shipping_threshold: number;
  estimated_days: string;
  is_active: boolean;
}

export interface CourierService {
  id: number;
  name: string;
  contact_phone: string;
  tracking_url_template: string;
  supported_regions: string;
  base_rate: number;
  is_active: boolean;
}

export interface PaymentSetting {
  id: number;
  gateway: PaymentMethod;
  is_enabled: boolean;
  display_name: string;
  instructions: string;
  merchant_number: string;
  sandbox_mode: boolean;
  env_configured?: boolean;
}

export interface SiteSettings {
  brand_name: string;
  tagline: string;
  logo_slogan?: string;
  logo_url: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_text: string;
  hero_image: string;
  promo_banner_text: string;
  promo_banner_enabled: boolean;
  contact_email: string;
  business_address: string;
  facebook_url: string;
  youtube_url: string;
  telegram_channel_url: string;
  instagram_url: string;
  telegram_support_username: string;
  telegram_support_url: string;
  telegram_support_instructions: string;
  telegram_alerts: {
    new_order: boolean;
    new_customer: boolean;
    payment: boolean;
    low_stock: boolean;
    order_status: boolean;
    support: boolean;
  };
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  about_story: string;
  shipping_policy: string;
  return_policy: string;
  refund_policy: string;
  privacy_policy: string;
  terms_conditions: string;
  affiliate_disclosure: string;
  email_notifications_enabled: boolean;
  customer_download_buyers_only?: boolean;
  telegram_configured?: boolean;
}

export interface NotificationItem {
  id: number;
  user_id: number | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
