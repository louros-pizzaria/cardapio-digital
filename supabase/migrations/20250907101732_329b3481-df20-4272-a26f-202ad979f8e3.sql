-- Update payment_method enum to support new payment types
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'credit_card_online';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'debit_card_online';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'credit_card_delivery';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'debit_card_delivery';