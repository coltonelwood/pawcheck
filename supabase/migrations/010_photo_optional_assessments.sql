-- =====================================================
-- Migration 010: Photo-optional assessments
-- =====================================================
-- Assessments can now be created from a photo, a free-text description, and/or
-- a guided symptom questionnaire. photo_url becomes nullable, and we persist
-- how the assessment was entered plus the structured questionnaire answers
-- (a long-term symptom dataset).
-- =====================================================

alter table public.queries alter column photo_url drop not null;

alter table public.queries
  add column if not exists input_method text not null default 'photo'
    check (input_method in ('photo', 'describe', 'guided')),
  add column if not exists structured_symptoms jsonb;
