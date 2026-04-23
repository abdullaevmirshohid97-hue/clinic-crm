-- Finalize queue table naming cleanup.
-- We standardize on public.queues.
-- If legacy public.queue has data, preserve it by renaming to public.queue_legacy_backup.
-- If legacy public.queue is empty, drop it.

DO $$
DECLARE
  queue_exists boolean;
  backup_exists boolean;
  legacy_rows bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'queue'
  ) INTO queue_exists;

  IF NOT queue_exists THEN
    RAISE NOTICE 'public.queue does not exist. Nothing to clean up.';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'queue_legacy_backup'
  ) INTO backup_exists;

  EXECUTE 'SELECT COUNT(*) FROM public.queue' INTO legacy_rows;

  IF legacy_rows = 0 THEN
    EXECUTE 'DROP TABLE public.queue';
    RAISE NOTICE 'Dropped empty legacy table public.queue.';
    RETURN;
  END IF;

  IF backup_exists THEN
    RAISE NOTICE 'public.queue has % rows but backup table already exists. Skipping rename/drop.', legacy_rows;
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.queue RENAME TO queue_legacy_backup';
  RAISE NOTICE 'Renamed public.queue to public.queue_legacy_backup with % rows preserved.', legacy_rows;
END $$;
