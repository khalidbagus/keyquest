/**
 * Midnight Checkout Component
 * The haunted checkout interface with intentional defects
 * Requirements: 2.1, 2.3, 5.1 (Mouse-Only defect)
 */

import { useState, useCallback } from 'react';
import styles from './MidnightCheckout.module.css';

interface MidnightCheckoutProps {
  onDefectInteraction?: (defectType: string) => void;
}

export function MidnightCheckout({ onDefectInteraction }: MidnightCheckoutProps) {
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

  return (
    <div className={styles.checkout}>
      <h3 className={styles.shopTitle}>The Midnight Checkout</h3>
      
      <div className={styles.product}>
        {/* Product Image Placeholder */}
        <div className={styles.productImage} aria-hidden="true">
          <span className={styles.productEmoji}>🕯️</span>
        </div>

        {/* Product Info */}
        <div className={styles.productInfo}>
          <h4 className={styles.productName}>Enchanted Candle</h4>
          <p className={styles.productDescription}>
            A mysterious candle that never burns out. Perfect for midnight coding sessions.
          </p>
          
          {/* Price - placeholder for contrast defect */}
          <p className={styles.productPrice} data-testid="defect-low-contrast">
            $13.99
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        {/* Quantity selector */}
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
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={styles.quantityInput}
          />
        </div>

        {/* DEFECT: Mouse-Only Activation
         * This div acts like a button but ONLY responds to mouse clicks.
         * It has tabindex="0" so it's focusable, but no keyboard handlers.
         * This violates WCAG 2.1.1 (Keyboard).
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

      {/* Cart icon - placeholder for missing name defect */}
      <button
        className={styles.cartIcon}
        data-testid="defect-missing-name"
        type="button"
      >
        <span aria-hidden="true">🛒</span>
      </button>

      {/* Buy button - placeholder for invisible focus defect */}
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
