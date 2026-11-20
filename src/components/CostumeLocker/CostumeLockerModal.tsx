/**
 * Costume Locker Modal
 * Accessible native <dialog> letting players pick any of the 10 KeyQuest v2
 * animated ghost costumes as their active companion.
 */

import { useEffect, useRef, useCallback, type RefObject } from 'react';
import { useMascot } from '../../context/MascotContext';
import {
  MASCOT_ROSTER,
  type MascotId,
} from '../../registry/mascotRegistry';
import { CostumeMaskIcon } from '../Icons/ApothecaryIcons';
import styles from './CostumeLockerModal.module.css';

interface CostumeLockerModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}

export function CostumeLockerModal({
  isOpen,
  onClose,
  returnFocusRef,
}: CostumeLockerModalProps) {
  const { companion, setCompanionId } = useMascot();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      closeButtonRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
      returnFocusRef?.current?.focus();
    }
  }, [isOpen, returnFocusRef]);

  const handleDialogCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose]
  );

  const handleDialogClose = useCallback(() => {
    if (isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Fallback for browsers without native <dialog closedby="any"> light-dismiss (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return undefined;
    if (
      typeof HTMLDialogElement !== 'undefined' &&
      'closedBy' in HTMLDialogElement.prototype
    ) {
      return undefined;
    }

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        onClose();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (id: MascotId) => {
      setCompanionId(id);
      onClose();
    },
    [setCompanionId, onClose]
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onCancel={handleDialogCancel}
      onClose={handleDialogClose}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="costume-locker-title"
      aria-describedby="costume-locker-desc"
      data-testid="costume-locker-dialog"
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 id="costume-locker-title" className={styles.title}>
              <CostumeMaskIcon size={22} className={styles.titleIcon} />
              Costume Locker
            </h2>
            <p id="costume-locker-desc" className={styles.description}>
              Pick any of the 10 animated KeyQuest ghosts to join your lab
              session. Each ghost performs its own signature celebration!
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close costume locker"
            data-testid="costume-locker-close"
          >
            Close
          </button>
        </div>

        <ul className={styles.grid} role="list">
          {MASCOT_ROSTER.map((mascot) => {
            const isSelected = mascot.id === companion.id;
            return (
              <li key={mascot.id} className={styles.gridItem}>
                <button
                  type="button"
                  className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
                  onClick={() => handleSelect(mascot.id)}
                  aria-pressed={isSelected}
                  data-testid={`costume-option-${mascot.id}`}
                >
                  <span className={styles.avatarStage} aria-hidden="true">
                    <img
                      src={mascot.posterUrl}
                      alt=""
                      className={styles.avatarImg}
                      loading="lazy"
                      decoding="async"
                    />
                  </span>
                  <span className={styles.cardMeta}>
                    <span className={styles.nameRow}>
                      <span className={styles.cardName}>{mascot.name}</span>
                      {isSelected && (
                        <span className={styles.equippedBadge}>Equipped</span>
                      )}
                    </span>
                    <span className={styles.cardAction}>
                      Celebration: {mascot.signatureAction}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
