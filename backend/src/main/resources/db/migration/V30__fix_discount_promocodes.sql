-- Fix existing promo codes and batches where reward_title mentions percentage discount
UPDATE promo_codes
SET reward_type = 'discount',
    discount_percent = 50
WHERE (reward_title ILIKE '%50%' AND (reward_title ILIKE '%жеңілдік%' OR reward_title ILIKE '%скидка%' OR reward_title ILIKE '%discount%'))
  AND (discount_percent IS NULL OR discount_percent = 0);

UPDATE promo_codes
SET reward_type = 'discount',
    discount_percent = 40
WHERE (reward_title ILIKE '%40%' AND (reward_title ILIKE '%жеңілдік%' OR reward_title ILIKE '%скидка%' OR reward_title ILIKE '%discount%'))
  AND (discount_percent IS NULL OR discount_percent = 0);

UPDATE promo_codes
SET reward_type = 'discount',
    discount_percent = 30
WHERE (reward_title ILIKE '%30%' AND (reward_title ILIKE '%жеңілдік%' OR reward_title ILIKE '%скидка%' OR reward_title ILIKE '%discount%'))
  AND (discount_percent IS NULL OR discount_percent = 0);

UPDATE promo_codes
SET reward_type = 'discount',
    discount_percent = 20
WHERE (reward_title ILIKE '%20%' AND (reward_title ILIKE '%жеңілдік%' OR reward_title ILIKE '%скидка%' OR reward_title ILIKE '%discount%'))
  AND (discount_percent IS NULL OR discount_percent = 0);

UPDATE promo_codes
SET reward_type = 'discount',
    discount_percent = 10
WHERE (reward_title ILIKE '%10%' AND (reward_title ILIKE '%жеңілдік%' OR reward_title ILIKE '%скидка%' OR reward_title ILIKE '%discount%'))
  AND (discount_percent IS NULL OR discount_percent = 0);

-- Update batches
UPDATE promo_batches
SET reward_type = 'discount'
WHERE reward_title ILIKE '%жеңілдік%' OR reward_title ILIKE '%скидка%' OR reward_title ILIKE '%discount%';
