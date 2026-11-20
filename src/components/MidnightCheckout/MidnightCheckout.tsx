/**
 * Midnight Checkout Component (v2 Living Haunted Apothecary Storefront)
 * Contains four intentional accessibility defects inside the isolated sandbox,
 * Enchanted Candle cursed/purified artwork, Ghost Vision inspection callouts,
 * and live mascot barrier reactions.
 * Requirements: 2.1, 2.3, 4.1, 5.1, 6.1, 7.1
 */

import { useState, useCallback, type KeyboardEvent } from 'react';
import { useGame } from '../../context/GameContext';
import { useMascot } from '../../context/MascotContext';
import { CartBagIcon } from '../Icons/ApothecaryIcons';
import styles from './MidnightCheckout.module.css';

export type GhostVisionMode = 'normal' | 'xray' | 'contrast';

interface MidnightCheckoutProps {
  onDefectInteraction?: (defectType: string) => void;
  visionMode?: GhostVisionMode;
}

export function MidnightCheckout({
  onDefectInteraction,
  visionMode = 'normal',
}: MidnightCheckoutProps) {
  const { progress } = useGame();
  const { triggerCompanion } = useMascot();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const defects = progress.defects;
  const verifiedCount = Object.values(defects).filter((d) => d.verified).length;
  const isPurified = verifiedCount >= 3;

  const handleAddToCart = useCallback(() => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  }, []);

  // Defect 2: Mouse-only focus discovery + keyboard trap mascot reaction
  // NOTE: Never invokes click() when unrepaired so the intentional WCAG 2.1.1 barrier stays real!
  const handleMouseOnlyFocus = useCallback(() => {
    onDefectInteraction?.('mouse-only-activation');
  }, [onDefectInteraction]);

  const handleMouseOnlyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      const isRepaired = target.dataset.keyquestRepaired === 'mouse-only';
      if (!isRepaired && (event.key === 'Enter' || event.key === ' ')) {
        onDefectInteraction?.('mouse-only-activation');
        triggerCompanion(
          'reactFailure',
          'Blocked! The "Add to Cart" <div> completely ignored your keyboard key!',
          'warning'
        );
      }
    },
    [onDefectInteraction, triggerCompanion]
  );

  // Defect 1: Invisible Focus mascot reaction on keyboard focus, discovery on activation
  const handleBuyFocus = useCallback(() => {
    if (!defects['invisible-focus'].verified) {
      triggerCompanion(
        'reactFailure',
        'Spooky! "Buy Now" received focus, but outline: none hid your focus ring!',
        'warning'
      );
    }
  }, [defects, triggerCompanion]);

  const handleBuyClick = useCallback(() => {
    if (!defects['invisible-focus'].verified) {
      onDefectInteraction?.('invisible-focus');
      triggerCompanion(
        'reactFailure',
        'Caught it! Check "Buy Now" focus visibility — outline: none hides the ring!',
        'warning'
      );
    }
  }, [defects, onDefectInteraction, triggerCompanion]);

  // Defect 3: Missing Accessible Name discovery on cart interaction before repair
  const handleCartInspect = useCallback(() => {
    if (!defects['missing-accessible-name'].verified) {
      onDefectInteraction?.('missing-accessible-name');
      triggerCompanion(
        'reactFailure',
        'Silent button! Screen readers only announce "button" with no name!',
        'warning'
      );
    }
  }, [defects, onDefectInteraction, triggerCompanion]);

  // Defect 4: Low contrast discovery on price click/inspection before repair
  const handlePriceInspect = useCallback(() => {
    if (!defects['insufficient-contrast'].verified) {
      onDefectInteraction?.('insufficient-contrast');
      triggerCompanion(
        'reactFailure',
        'Hard to read! That $13.99 price only has ~2.0:1 contrast — below WCAG AA!',
        'warning'
      );
    }
  }, [defects, onDefectInteraction, triggerCompanion]);

  const subtotal = (quantity * 13.99).toFixed(2);

  return (
    <div
      className={`${styles.checkout} ${isPurified ? styles.checkoutPurified : ''}`}
    >
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
        <div className={styles.inspectAnchor}>
          <button
            className={styles.cartIcon}
            data-testid="defect-missing-name"
            type="button"
            onClick={handleCartInspect}
          >
            <CartBagIcon size={20} className={styles.cartSvg} />
          </button>

          {visionMode === 'xray' && (
            <span
              className={`${styles.visionPill} ${
                defects['missing-accessible-name'].verified
                  ? styles.visionPillPass
                  : styles.visionPillFail
              }`}
              aria-hidden="true"
            >
              {defects['missing-accessible-name'].verified
                ? '✓ "View shopping cart"'
                : '✕ name: "" (unnamed)'}
            </span>
          )}
        </div>
      </div>

      {/* Featured Artifact Card */}
      <div className={styles.product}>
        {/* Illustrated Enchanted Candle Artifact (Cursed -> Purified) */}
        <div
          className={`${styles.productImage} ${
            isPurified ? styles.productImagePurified : ''
          }`}
          aria-hidden="true"
        >
          <img
            src={isPurified ? '/art/candle-purified.png' : '/art/candle-cursed.png'}
            alt=""
            className={styles.candleImg}
            decoding="async"
          />
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

          <div className={styles.priceRow} onClick={handlePriceInspect}>
            <span className={styles.priceLabel}>Unit Price:</span>
            {/* DEFECT 4: Insufficient Contrast
             * Color #555555 on solid #231936 surface has ~2.0:1 contrast ratio.
             * Fails WCAG 1.4.3 (Contrast Minimum).
             */}
            <p
              className={`${styles.productPrice} ${
                visionMode === 'contrast' &&
                !defects['insufficient-contrast'].verified
                  ? styles.contrastFlagged
                  : ''
              }`}
              data-testid="defect-low-contrast"
            >
              $13.99
            </p>

            {visionMode === 'contrast' && (
              <span
                className={`${styles.visionInlinePill} ${
                  defects['insufficient-contrast'].verified
                    ? styles.visionPillPass
                    : styles.visionPillFail
                }`}
                aria-hidden="true"
              >
                {defects['insufficient-contrast'].verified
                  ? '✓ >10:1 AA Pass'
                  : '✕ ~2.0:1 Fails AA'}
              </span>
            )}
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
              setQuantity(
                Number.isNaN(parsed) ? 1 : Math.max(1, Math.min(10, parsed))
              );
            }}
            className={styles.quantityInput}
          />
        </div>

        {/* DEFECT 2: Mouse-Only Activation
         * This div acts like a button but ONLY responds to mouse clicks.
         * It has tabindex="0" so it's focusable, but no keyboard activation and no role="button".
         * Violates WCAG 2.1.1 (Keyboard).
         */}
        <div className={styles.inspectAnchor}>
          <div
            className={styles.addButton}
            tabIndex={0}
            onClick={handleAddToCart}
            onFocus={handleMouseOnlyFocus}
            onKeyDown={handleMouseOnlyKeyDown}
            data-testid="defect-mouse-only"
            aria-label="Add to cart"
          >
            {addedToCart ? '✓ Added!' : 'Add to Cart'}
          </div>

          {visionMode === 'xray' && (
            <span
              className={`${styles.visionPill} ${
                defects['mouse-only-activation'].verified
                  ? styles.visionPillPass
                  : styles.visionPillFail
              }`}
              aria-hidden="true"
            >
              {defects['mouse-only-activation'].verified
                ? '✓ role="button" + Keys'
                : '✕ generic <div> (no keys)'}
            </span>
          )}
        </div>
      </div>

      {/* Order Ledger Summary */}
      <div className={styles.orderLedger}>
        <div className={styles.ledgerRow}>
          <span>Midnight Courier Delivery</span>
          <span className={styles.ledgerFree}>FREE</span>
        </div>
        <div className={styles.ledgerRowTotal}>
          <span>
            Order Total ({quantity} {quantity === 1 ? 'item' : 'items'})
          </span>
          <span>${subtotal}</span>
        </div>
      </div>

      {/* DEFECT 1: Invisible Focus
       * Focus indicator is removed via outline: none with no replacement.
       * Violates WCAG 2.4.7 (Focus Visible).
       */}
      <div className={styles.buyWrapper}>
        <button
          className={styles.buyButton}
          data-testid="defect-invisible-focus"
          type="button"
          onFocus={handleBuyFocus}
          onClick={handleBuyClick}
        >
          Buy Now
        </button>

        {visionMode === 'contrast' && (
          <span
            className={`${styles.visionInlinePill} ${
              defects['invisible-focus'].verified
                ? styles.visionPillPass
                : styles.visionPillFail
            }`}
            aria-hidden="true"
          >
            {defects['invisible-focus'].verified
              ? '✓ 3px :focus-visible active'
              : '✕ outline: none (focus hidden)'}
          </span>
        )}
      </div>
    </div>
  );
}
