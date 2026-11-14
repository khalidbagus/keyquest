/**
 * Midnight Checkout Component
 * The haunted apothecary checkout interface with four intentional defects
 * Requirements: 2.1, 2.3, 4.1, 5.1, 6.1, 7.1
 */

import { useState, useCallback } from 'react';
import styles from './MidnightCheckout.module.css';

interface MidnightCheckoutProps {
  onDefectInteraction?: (defectType: string) => void;
}

export function MidnightCheckout({
  onDefectInteraction,
}: MidnightCheckoutProps) {
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = useCallback(() => {
    setAddedToCart(true);
    // Reset after a moment for demo purposes
    setTimeout(() => setAddedToCart(false), 2000);
  }, []);

  const handleDefectFocus = useCallback(() => {
    onDefectInteraction?.('mouse-only-activation');
  }, [onDefectInteraction]);

  const subtotal = (quantity * 13.99).toFixed(2);

  return (
    <div className={styles.checkout}>
      {/* Storefront Header */}
      <div className={styles.storeHeader}>
        <div className={styles.storeBrand}>
          <span className={styles.apothecaryTag}>
            NOCTURNE APOTHECARY · EST. 1899
          </span>
          <h3 className={styles.shopTitle}>The Midnight Checkout</h3>
        </div>

        {/* DEFECT 3: Missing Accessible Name
         * Icon-only button with no aria-label, text, or title.
         * Violates WCAG 4.1.2 (Name, Role, Value).
         */}
        <button
          className={styles.cartIcon}
          data-testid="defect-missing-name"
          type="button"
        >
          <span aria-hidden="true">🛒</span>
        </button>
      </div>

      {/* Featured Artifact Card */}
      <div className={styles.product}>
        {/* Bespoke Enchanted Candle SVG Illustration */}
        <div className={styles.productImage} aria-hidden="true">
          <svg
            viewBox="0 0 120 120"
            width="96"
            height="96"
            className={styles.candleSvg}
            aria-hidden="true"
            focusable="false"
          >
            {/* Ambient halo */}
            <circle
              cx="60"
              cy="32"
              r="22"
              fill="#fbbf24"
              fillOpacity="0.14"
              className={styles.flameHalo}
            />
            {/* Outer flame */}
            <path
              d="M60 12C60 12 71 25 69 35C67.5 42.5 63.5 46 60 46C56.5 46 52.5 42.5 51 35C49 25 60 12 60 12Z"
              fill="#fbbf24"
              className={styles.flameOuter}
            />
            {/* Inner flame core */}
            <path
              d="M60 22C60 22 65 30 64 36C63.2 40 61.5 42 60 42C58.5 42 56.8 40 56 36C55 30 60 22 60 22Z"
              fill="#fffbeb"
            />
            {/* Wick */}
            <line
              x1="60"
              y1="45"
              x2="60"
              y2="50"
              stroke="#eaeaea"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Candle body */}
            <rect
              x="44"
              y="50"
              width="32"
              height="44"
              rx="4"
              fill="#261c3a"
              stroke="#a78bfa"
              strokeWidth="1.5"
            />
            {/* Wax drips */}
            <path
              d="M44 54Q50 62 52 54T60 58T69 53T76 56"
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M50 54V66M66 54V62"
              stroke="#c4b5fd"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Brass holder base */}
            <path
              d="M34 94H86L80 102H40L34 94Z"
              fill="#b45309"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M82 94C89 94 92 88 89 83C86 79 81 82 81 86"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Product Info */}
        <div className={styles.productInfo}>
          <div className={styles.productBadgeRow}>
            <span className={styles.artifactBadge}>ARCANE ARTIFACT #04</span>
            <span className={styles.stockBadge}>In Stock</span>
          </div>

          <h4 className={styles.productName}>Enchanted Candle</h4>
          <p className={styles.productDescription}>
            A mysterious candle that never burns out. Perfect for midnight
            coding sessions and banishing shadowy UI bugs.
          </p>

          <div className={styles.priceRow}>
            <span className={styles.priceLabel}>Unit Price:</span>
            {/* DEFECT 4: Insufficient Contrast
             * Color #555555 on #16213e surface has ~2.09:1 contrast ratio.
             * Fails WCAG 1.4.3 (Contrast Minimum).
             */}
            <p
              className={styles.productPrice}
              data-testid="defect-low-contrast"
            >
              $13.99
            </p>
          </div>
        </div>
      </div>

      {/* Controls: Quantity + Add to Cart */}
      <div className={styles.controls}>
        <div className={styles.quantityControl}>
          <label htmlFor="quantity" className={styles.quantityLabel}>
            Quantity:
          </label>
          <input
            type="number"
            id="quantity"
            min={1}
            max={10}
            value={quantity}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              setQuantity(Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed)));
            }}
            className={styles.quantityInput}
          />
        </div>

        {/* DEFECT 2: Mouse-Only Activation
         * This div acts like a button but ONLY responds to mouse clicks.
         * It has tabindex="0" so it's focusable, but no keyboard handlers and no role="button".
         * Violates WCAG 2.1.1 (Keyboard).
         */}
        <div
          className={styles.addButton}
          tabIndex={0}
          onClick={handleAddToCart}
          onFocus={handleDefectFocus}
          data-testid="defect-mouse-only"
          aria-label="Add to cart"
        >
          {addedToCart ? '✓ Added!' : 'Add to Cart'}
        </div>
      </div>

      {/* Order Ledger Summary */}
      <div className={styles.orderLedger}>
        <div className={styles.ledgerRow}>
          <span>Midnight Courier Delivery</span>
          <span className={styles.ledgerFree}>FREE</span>
        </div>
        <div className={styles.ledgerRowTotal}>
          <span>Order Total ({quantity} {quantity === 1 ? 'item' : 'items'})</span>
          <span>${subtotal}</span>
        </div>
      </div>

      {/* DEFECT 1: Invisible Focus
       * Focus indicator is removed via outline: none with no replacement.
       * Violates WCAG 2.4.7 (Focus Visible).
       */}
      <button
        className={styles.buyButton}
        data-testid="defect-invisible-focus"
        type="button"
      >
        Buy Now
      </button>
    </div>
  );
}
