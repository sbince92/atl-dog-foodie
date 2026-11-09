<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';

/** Live data lives OUTSIDE the deployed folder when possible, so a redeploy never wipes reviews. */
function reviews_data_dir(): string
{
    static $dir = null;
    if ($dir !== null) return $dir;
    $candidates = [
        dirname(__DIR__, 2) . '/reviews-data',   // sibling of public_html on Hostinger
        dirname(__DIR__) . '/data/live',          // local fallback (gitignored)
    ];
    foreach ($candidates as $c) {
        if (!is_dir($c)) { @mkdir($c, 0755, true); }
        if (is_dir($c) && is_writable($c)) { $dir = $c; return $dir; }
    }
    json_out(['error' => 'Review storage is not writable on this server.'], 500);
}

function reviews_file(): string
{
    $f = reviews_data_dir() . '/reviews.json';
    if (!file_exists($f)) {
        $seed = dirname(__DIR__) . '/data/reviews.seed.json';
        file_put_contents($f, file_exists($seed) ? file_get_contents($seed) : '[]', LOCK_EX);
    }
    return $f;
}

function load_reviews(): array
{
    $raw = @file_get_contents(reviews_file());
    $arr = json_decode($raw ?: '[]', true);
    return is_array($arr) ? $arr : [];
}

function save_reviews(array $reviews): void
{
    $file = reviews_file();
    $json = json_encode(array_values($reviews), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    file_put_contents($file . '.tmp', $json, LOCK_EX);
    rename($file . '.tmp', $file);
}

/** Strip anything private before a review goes to the public API. */
function public_review(array $r): array
{
    return [
        'id'      => $r['id'] ?? '',
        'name'    => $r['name'] ?? '',
        'dog'     => $r['dog'] ?? '',
        'service' => $r['service'] ?? '',
        'rating'  => (int)($r['rating'] ?? 0),
        'text'    => $r['text'] ?? '',
        'created' => $r['created'] ?? '',
        'sample'  => !empty($r['sample']),
    ];
}

function cors(): void
{
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}

function json_out($data, int $code = 200): void
{
    http_response_code($code);
    cors();
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function admin_ok(?string $key): bool
{
    return is_string($key) && $key !== '' && ADMIN_KEY_HASH !== '__ADMIN_HASH__' && password_verify($key, ADMIN_KEY_HASH);
}

function client_ip_hash(): string
{
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . ADMIN_KEY_HASH);
}

function rate_limited(string $ipHash, int $max = RATE_LIMIT_MAX, int $window = 3600): bool
{
    $f = reviews_data_dir() . '/ratelimit.json';
    $now = time();
    $all = json_decode(@file_get_contents($f) ?: '{}', true);
    if (!is_array($all)) $all = [];
    $recent = array_values(array_filter($all[$ipHash] ?? [], fn($t) => $t > $now - $window));
    if (count($recent) >= $max) return true;
    $recent[] = $now;
    $all[$ipHash] = $recent;
    foreach ($all as $k => $times) {
        $keep = array_values(array_filter($times, fn($t) => $t > $now - $window));
        if ($keep) $all[$k] = $keep; else unset($all[$k]);
    }
    file_put_contents($f, json_encode($all), LOCK_EX);
    return false;
}

function site_base_url(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return ($https ? 'https' : 'http') . '://' . $host;
}

function notify_new_review(array $r): void
{
    if (NOTIFY_EMAIL === '' || !function_exists('mail')) return;
    $subject = 'New review from ' . $r['name'] . ' (' . $r['rating'] . '/5) — needs approval';
    $body = "A new review is waiting for approval.\n\n"
          . "Name: {$r['name']}\nDog: {$r['dog']}\nService: {$r['service']}\nRating: {$r['rating']}/5\n\n{$r['text']}\n\n"
          . "Approve or delete it here (use your admin key):\n" . site_base_url() . "/admin/\n";
    $headers = 'From: reviews@' . preg_replace('/^www\./', '', $_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n" . 'Content-Type: text/plain; charset=UTF-8';
    @mail(NOTIFY_EMAIL, $subject, $body, $headers);
}
