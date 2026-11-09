<?php
// ATL Dog Foodie — review system settings.
// Safe to commit: only a password HASH lives here. The actual admin key is in ADMIN-KEY.txt (not committed).
declare(strict_types=1);

// password_hash() of the moderation key. Regenerate with:  php -r 'echo password_hash("your-new-key", PASSWORD_DEFAULT);'
const ADMIN_KEY_HASH = '$2y$12$H74zQeMeE0UgOaiYH.ct9urGHAlK.O1YpVwPCM3DkOnz4fHmikwWG';

// Where to email when a new review arrives (leave '' to disable).
const NOTIFY_EMAIL = 'info@atldogfoodie.com';

// Max reviews per visitor per hour (basic spam brake).
const RATE_LIMIT_MAX = 3;
