<?php
// POST a new review. Stored as "pending" until approved in /admin/.
declare(strict_types=1);
require __DIR__ . '/lib.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { cors(); http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error' => 'POST only'], 405);

$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) $in = $_POST;

// Honeypot: real people never fill this field.
if (!empty($in['website'])) json_out(['ok' => true], 201);

$clean = fn(string $k, int $max): string => mb_substr(trim(strip_tags((string)($in[$k] ?? ''))), 0, $max);
$name    = $clean('name', 60);
$dog     = $clean('dog', 60);
$service = $clean('service', 40);
$text    = $clean('text', 1200);
$email   = $clean('email', 120);
$rating  = (int)($in['rating'] ?? 0);

$errors = [];
if ($name === '')                         $errors[] = 'name';
if (mb_strlen($text) < 10)                $errors[] = 'text';
if ($rating < 1 || $rating > 5)           $errors[] = 'rating';
if (empty($in['consent']))                $errors[] = 'consent';
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($errors) json_out(['error' => 'Please check the highlighted fields.', 'fields' => $errors], 422);

$ip = client_ip_hash();
if (rate_limited($ip)) json_out(['error' => 'Too many reviews from this connection. Please try again later.'], 429);

$review = [
    'id'      => bin2hex(random_bytes(6)),
    'name'    => $name,
    'dog'     => $dog,
    'service' => $service,
    'rating'  => $rating,
    'text'    => $text,
    'email'   => $email,
    'created' => gmdate('c'),
    'status'  => 'pending',
    'ip'      => $ip,
];

$reviews = load_reviews();
$reviews[] = $review;
save_reviews($reviews);
notify_new_review($review);

json_out(['ok' => true, 'id' => $review['id']], 201);
