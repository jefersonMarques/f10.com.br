ALTER TABLE help_contents
ADD COLUMN IF NOT EXISTS quick_guide text NOT NULL DEFAULT '';

UPDATE help_categories
SET icon = CASE
  WHEN slug = 'uncategorized' THEN 'CircleHelp'
  WHEN icon IN (
    'FolderKanban',
    'Users',
    'UserRoundCog',
    'Building2',
    'BriefcaseBusiness',
    'CircleDollarSign',
    'GraduationCap',
    'CalendarDays',
    'ClipboardList',
    'FileText',
    'Settings',
    'Headphones',
    'CircleHelp'
  ) THEN icon
  ELSE 'FolderKanban'
END,
updated_at = now();
