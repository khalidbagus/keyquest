/**
 * Midnight Checkout Component (Adventure Room 1)
 * The counter (lantern + Buy Now) comes first so the room's puzzle object and
 * its control are visible together. The shopper's order follows.
 * Contains four intentional accessibility defects inside the isolated sandbox.
 * Room decisions are made by the parent; this component reports interactions.
 * Requirements: 2.1, 2.3, 4.1, 5.1, 6.1, 7.1
 */

import { useState, useCallback, type KeyboardEvent, type MouseEvent } from 'react';
import { useGame } from '../../context/GameContext';
import { CartBagIcon } from '../Icons/ApothecaryIcons';
import { CounterLantern, PantryKey } from './CounterProps';
import { countVerified } from '../../registry/roomRegistry';
import styles from './MidnightCheckout.module.css';

export type GhostVisionMode = 'normal' | 'xray' | 'contrast' | 'grayscale';

export type DefectInteraction = 'focus' | 'activate' | 'blocked';

interface MidnightCheckoutProps {
  onDefectInteraction?: (defectType: string, interaction?: DefectInteraction) => void;
  onBuyNow?: () => void;
  onAddToCart?: () => void;
  onBagChecked?: (open: boolean) => void;
  visionMode?: GhostVisionMode;
}

export function MidnightCheckout({
  onDefectInteraction,
  onBuyNow,
  onAddToCart,
  onBagChecked,
  visionMode = 'normal',
}: MidnightCheckoutProps) {
  const { progress } = useGame();
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);

  const defects = progress.defects;
  const room = progress.checkout;
  const isPurified = countVerified(progress) === 4;

  const handleAddToCart = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      // Presses dispatched by the live keyboard check are not the player's.
      if (event.currentTarget.dataset.keyquestVerifying === 'true') return;
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
      onAddToCart?.();
    },
    [onAddToCart]
  );

  // Defect 2: Mouse-only. Found by trying Enter or Space, not by focus (focus
  // itself shows a ring and gives nothing away). Never invokes click() when
  // unrepaired so the intentional WCAG 2.1.1 barrier stays real.
  const handleMouseOnlyKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const isRepaired =
        event.currentTarget.dataset.keyquestRepaired === 'mouse-only';
      if (!isRepaired && (event.key === 'Enter' || event.key === ' ')) {
        onDefectInteraction?.('mouse-only-activation', 'blocked');
      }
    },
    [onDefectInteraction]
  );

  // Defect 1: Invisible focus. Focus on Buy Now is a direct discovery path.
  const handleBuyFocus = useCallback(() => {
    if (!defects['invisible-focus'].verified) {
      onDefectInteraction?.('invisible-focus', 'focus');
    }
  }, [defects, onDefectInteraction]);

  // Defect 3: Missing accessible name. Once named, the button shows the bag.
  const handleCartPress = useCallback(() => {
    if (!defects['missing-accessible-name'].verified) {
      onDefectInteraction?.('missing-accessible-name', 'activate');
      return;
    }
    const next = !bagOpen;
    setBagOpen(next);
    onBagChecked?.(next);
  }, [bagOpen, defects, onDefectInteraction, onBagChecked]);

  // Defect 4: Low contrast discovery on price click.
  const handlePriceInspect = useCallback(() => {
    if (!defects['insufficient-contrast'].verified) {
      onDefectInteraction?.('insufficient-contrast', 'activate');
    }
  }, [defects, onDefectInteraction]);

  const subtotal = (quantity * 13.99).toFixed(2);

  return (
    <div
      className={`${styles.checkout} ${isPurified ? styles.checkoutPurified : ''}`}
    >
      {/* The shopper's order, kept compact so the counter stays near the top */}
      <div className={styles.order}>
        <div className={styles.orderHeader}>
          <div className={styles.storeBrand}>
            <span className={styles.apothecaryTag}>NOCTURNE APOTHECARY</span>
            <h3 className={styles.shopTitle}>Shopper’s order</h3>
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
              onClick={handleCartPress}
              aria-expanded={
                defects['missing-accessible-name'].verified ? bagOpen : undefined
              }
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

        {bagOpen && defects['missing-accessible-name'].verified && (
          <p className={styles.bagReadout} data-testid="bag-readout">
            {room.candleAdded
              ? `In the bag: ${quantity} × Enchanted Candle`
              : 'The bag is empty.'}
          </p>
        )}

        <div className={styles.product}>
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

          <div className={styles.productInfo}>
            <h4 className={styles.productName}>Enchanted Candle</h4>
            <p className={styles.productDescription}>
              A candle that never burns out.
            </p>

            <div className={styles.priceRow} onClick={handlePriceInspect}>
              <span className={styles.priceLabel}>Price:</span>
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

        <div className={styles.ledgerRowTotal} data-testid="order-total">
          <span>
            {room.candleAdded
              ? `Order: ${quantity} × Enchanted Candle`
              : 'Order: empty'}
          </span>
          <span>{room.candleAdded ? `$${subtotal}` : '$0.00'}</span>
        </div>
      </div>
      {/* The counter comes last, like a real checkout, so the next Tab after
       * Buy Now leaves the sandbox and reaches the Repair Studio. */}
      <div className={styles.counter} data-testid="checkout-counter">
        <div className={styles.counterProps}>
          <CounterLantern lit={room.lanternLit} />
          {room.orderPlaced && <PantryKey />}
          <span className={styles.counterCaption}>
            {room.orderPlaced
              ? 'Key on the counter'
              : room.lanternLit
                ? 'Lantern lit'
                : 'Lantern out'}
          </span>
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
            onClick={onBuyNow}
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
    </div>
  );
}
