<?php
// GET approved reviews (newest first) plus a summary. Public, cacheable for a minute by the browser.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { cors(); http_response_code(204); exit; }

$approved = array_values(array_filter(load_reviews(), fn($r) => ($r['status'] ?? '') === 'approved'));
usort($approved, fn($a, $b) => strcmp($b['created'] ?? '', $a['created'] ?? ''));

$count = count($approved);
$avg = $count ? round(array_sum(array_map(fn($r) => (int)$r['rating'], $approved)) / $count, 1) : 0;

json_out([
    'summary' => ['count' => $count, 'average' => $avg],
    'reviews' => array_map('public_review', $approved),
]);
