/**
 * Potion Pantry scene (Adventure Room 2), rendered inside the sandbox.
 * The ingredient shelf holds the intentional defect: jars are told apart by
 * color alone and have no accessible names until the label repair is applied.
 * The cauldron below is accessible: its contents are listed as text, and any
 * ingredient can be removed right away. Room decisions are made by the parent.
 */

import { useGame } from '../../context/GameContext';
import type { GhostVisionMode } from '../MidnightCheckout/MidnightCheckout';
import type { DefectInteraction } from '../MidnightCheckout/MidnightCheckout';
import {
  INGREDIENTS,
  LANTERN_POTION_RECIPE,
  getCauldronStatus,
  getIngredient,
} from '../../registry/pantryRegistry';
import type { IngredientId } from '../../types';
import { CauldronProp, LanternPotion, type CauldronMood } from './PantryProps';
import styles from './PotionPantry.module.css';

interface PotionPantryProps {
  visionMode: GhostVisionMode;
  onDefectInteraction: (type: string, interaction?: DefectInteraction) => void;
  onJar: (ingredient: IngredientId) => void;
  onRemove: (index: number) => void;
  onBottle: () => void;
}

export function PotionPantry({
  visionMode,
  onDefectInteraction,
  onJar,
  onRemove,
  onBottle,
}: PotionPantryProps) {
  const { progress } = useGame();
  const curse = progress.defects['color-only-ingredients'];
  const pantry = progress.pantry;
  const status = getCauldronStatus(pantry.cauldron);

  const mood: CauldronMood = pantry.brewed
    ? 'brewed'
    : status.wrongIndex !== -1
      ? 'murky'
      : pantry.cauldron.length > 0
        ? 'brewing'
        : 'empty';

  const caption = pantry.potionTaken
    ? 'Potion bottled'
    : pantry.brewed
      ? 'Lantern potion brewed'
      : status.wrongIndex !== -1
        ? 'The brew turned murky'
        : `${pantry.cauldron.length} of ${LANTERN_POTION_RECIPE.length} ingredients`;

  return (
    <div className={styles.pantry}>
      <div className={styles.shelfHeader}>
        <span className={styles.tag}>NOCTURNE APOTHECARY</span>
        <h3 className={styles.title}>Ingredient shelf</h3>
      </div>

      {/* The lens wraps the shelf so the shelf's own class list stays stable
          for the repair class added by the RepairEngine. */}
      <div className={visionMode === 'grayscale' ? styles.grayscaleLens : undefined}>
        {/* DEFECT: Color-Only Ingredients
         * Each jar's symbol and name are hidden (display: none) until the
         * repair class is added, so color is the only cue and the buttons have
         * no accessible name. Violates WCAG 1.4.1 and 4.1.2.
         */}
        <div className={styles.shelf} data-testid="defect-color-only">
          {INGREDIENTS.map((ingredient) => (
            <div key={ingredient.id} className={styles.jarSlot}>
              <button
                type="button"
                className={styles.jar}
                data-ingredient={ingredient.id}
                style={{ ['--jar-color' as string]: ingredient.color }}
                onFocus={() => {
                  if (!curse.verified) onDefectInteraction('color-only-ingredients', 'focus');
                }}
                onClick={() => onJar(ingredient.id)}
              >
                <span className={styles.swatch} aria-hidden="true" />
                <span className="keyquest-ingredient-label">
                  <span className={styles.symbol} aria-hidden="true">
                    {ingredient.symbol}
                  </span>
                  <span data-ingredient-label>{ingredient.name}</span>
                </span>
              </button>
              {visionMode === 'xray' && (
                <span
                  className={`${styles.visionPill} ${curse.verified ? styles.pass : styles.fail}`}
                  aria-hidden="true"
                >
                  {curse.verified ? `✓ "${ingredient.name}"` : '✕ name: ""'}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* The cauldron (accessible): contents as text, remove any ingredient */}
      <div className={styles.cauldronArea} data-testid="cauldron">
        <div className={styles.cauldronProps}>
          <CauldronProp level={pantry.cauldron.length} mood={mood} />
          {pantry.brewed && <LanternPotion />}
          <span className={styles.caption}>{caption}</span>
        </div>

        <div className={styles.potBody}>
          <h4 className={styles.potTitle} id="cauldron-title">
            Cauldron
          </h4>
          {pantry.cauldron.length === 0 ? (
            <p className={styles.potEmpty}>Empty.</p>
          ) : (
            <ol className={styles.potList} aria-labelledby="cauldron-title">
              {pantry.cauldron.map((id, index) => {
                const item = getIngredient(id);
                const wrong = status.wrongIndex !== -1 && index >= status.wrongIndex;
                return (
                  <li key={`${id}-${index}`} className={styles.potItem}>
                    <span className={styles.potName}>
                      <span aria-hidden="true">{item.symbol}</span> {item.name}
                      {wrong && <span className={styles.wrong}> (not this step)</span>}
                    </span>
                    {!pantry.brewed && (
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => onRemove(index)}
                        data-testid={`remove-ingredient-${index}`}
                      >
                        Remove<span className="visually-hidden"> {item.name}</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {/* The payoff action sits beside the brewed cauldron. */}
          {pantry.brewed && !pantry.potionTaken && (
            <button
              type="button"
              className={styles.bottleButton}
              onClick={onBottle}
              data-testid="bottle-potion"
            >
              Bottle the lantern potion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
