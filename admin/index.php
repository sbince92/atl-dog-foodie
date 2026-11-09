<?php
// Review moderation. Open /admin/ and enter the admin key (ADMIN-KEY.txt).
declare(strict_types=1);
require dirname(__DIR__) . '/api/lib.php';

$key = $_POST['key'] ?? $_GET['key'] ?? '';
$authed = admin_ok(is_string($key) ? $key : '');
$notice = '';

if ($authed && $_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST['action']) && !empty($_POST['id'])) {
    $reviews = load_reviews();
    foreach ($reviews as $i => $r) {
        if (($r['id'] ?? '') !== $_POST['id']) continue;
        switch ($_POST['action']) {
            case 'approve':   $reviews[$i]['status'] = 'approved'; $notice = 'Review published.'; break;
            case 'unpublish': $reviews[$i]['status'] = 'pending';  $notice = 'Review hidden.'; break;
            case 'delete':    unset($reviews[$i]);                 $notice = 'Review deleted.'; break;
        }
    }
    save_reviews($reviews);
}

$reviews = $authed ? load_reviews() : [];
usort($reviews, fn($a, $b) => strcmp($b['created'] ?? '', $a['created'] ?? ''));
$pending  = array_filter($reviews, fn($r) => ($r['status'] ?? '') !== 'approved');
$approved = array_filter($reviews, fn($r) => ($r['status'] ?? '') === 'approved');
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$stars = fn(int $n) => str_repeat('★', $n) . str_repeat('☆', 5 - $n);
header('X-Robots-Tag: noindex');
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Reviews — moderation</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{--sand:#F0E5DB;--paper:#FAF5EF;--mocha:#474329;--pink:#FC75B4;--pink-deep:#E2559A;--line:rgba(71,67,41,.14);--muted:rgba(71,67,41,.62)}
  *{box-sizing:border-box}body{margin:0;background:var(--sand);color:var(--mocha);font:15px/1.5 "Inter Tight",system-ui,sans-serif}
  .wrap{max-width:860px;margin:0 auto;padding:40px 20px 80px}
  h1{font-size:28px;font-weight:500;letter-spacing:-.02em;margin:0 0 6px}h2{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--pink-deep);margin:40px 0 14px}
  .muted{color:var(--muted)}.notice{background:var(--pink);color:var(--mocha);padding:10px 14px;border-radius:6px;display:inline-block;margin:14px 0 0;font-weight:500}
  .card{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin-bottom:12px}
  .card header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:baseline;margin-bottom:8px}
  .card header strong{font-weight:600}.stars{color:var(--pink-deep);letter-spacing:2px}
  .card p{margin:0 0 12px;white-space:pre-wrap}.meta{font-size:12px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap}
  .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  button,.btn{font:inherit;font-size:12px;letter-spacing:.1em;text-transform:uppercase;font-weight:600;padding:10px 14px;border-radius:4px;border:1px solid var(--mocha);background:transparent;color:var(--mocha);cursor:pointer}
  button.primary{background:var(--mocha);color:var(--sand)}button.danger{border-color:#B8321F;color:#B8321F}button:hover{background:var(--pink);border-color:var(--pink);color:var(--mocha)}
  input[type=password]{font:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:6px;background:var(--paper);width:100%;max-width:360px}
  .tag{font-size:11px;letter-spacing:.1em;text-transform:uppercase;background:var(--pink);padding:2px 8px;border-radius:999px}
  .empty{color:var(--muted);padding:20px;border:1px dashed var(--line);border-radius:10px}
  form.inline{display:inline}
</style>
</head>
<body><div class="wrap">
<h1>Review moderation</h1>
<p class="muted">Pending reviews are hidden from the site until you publish them. Deleting is permanent.</p>

<?php if (!$authed): ?>
  <form method="post" style="margin-top:24px">
    <label><span class="muted" style="display:block;font-size:12px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">Admin key</span>
    <input type="password" name="key" autocomplete="current-password" autofocus></label>
    <div class="actions"><button class="primary" type="submit">Open</button></div>
    <?php if ($key !== ''): ?><p class="muted">That key didn't match.</p><?php endif; ?>
  </form>
<?php else: ?>
  <?php if ($notice): ?><div class="notice"><?= $h($notice) ?></div><?php endif; ?>

  <h2>Waiting for approval (<?= count($pending) ?>)</h2>
  <?php if (!$pending): ?><div class="empty">Nothing waiting. New reviews land here first.</div><?php endif; ?>
  <?php foreach ($pending as $r): ?>
    <div class="card">
      <header><strong><?= $h($r['name']) ?><?= $r['dog'] ? ' · ' . $h($r['dog']) : '' ?></strong><span class="stars"><?= $stars((int)$r['rating']) ?></span></header>
      <p><?= $h($r['text']) ?></p>
      <div class="meta"><span><?= $h(substr((string)$r['created'], 0, 10)) ?></span><?php if (!empty($r['service'])): ?><span><?= $h($r['service']) ?></span><?php endif; ?><?php if (!empty($r['email'])): ?><span><?= $h($r['email']) ?> (private)</span><?php endif; ?></div>
      <div class="actions">
        <form method="post" class="inline"><input type="hidden" name="key" value="<?= $h($key) ?>"><input type="hidden" name="id" value="<?= $h($r['id']) ?>"><button class="primary" name="action" value="approve">Publish</button></form>
        <form method="post" class="inline" onsubmit="return confirm('Delete this review permanently?')"><input type="hidden" name="key" value="<?= $h($key) ?>"><input type="hidden" name="id" value="<?= $h($r['id']) ?>"><button class="danger" name="action" value="delete">Delete</button></form>
      </div>
    </div>
  <?php endforeach; ?>

  <h2>Published (<?= count($approved) ?>)</h2>
  <?php if (!$approved): ?><div class="empty">No published reviews yet.</div><?php endif; ?>
  <?php foreach ($approved as $r): ?>
    <div class="card">
      <header><strong><?= $h($r['name']) ?><?= $r['dog'] ? ' · ' . $h($r['dog']) : '' ?> <?php if (!empty($r['sample'])): ?><span class="tag">sample — delete before launch</span><?php endif; ?></strong><span class="stars"><?= $stars((int)$r['rating']) ?></span></header>
      <p><?= $h($r['text']) ?></p>
      <div class="meta"><span><?= $h(substr((string)$r['created'], 0, 10)) ?></span><?php if (!empty($r['service'])): ?><span><?= $h($r['service']) ?></span><?php endif; ?></div>
      <div class="actions">
        <form method="post" class="inline"><input type="hidden" name="key" value="<?= $h($key) ?>"><input type="hidden" name="id" value="<?= $h($r['id']) ?>"><button name="action" value="unpublish">Hide</button></form>
        <form method="post" class="inline" onsubmit="return confirm('Delete this review permanently?')"><input type="hidden" name="key" value="<?= $h($key) ?>"><input type="hidden" name="id" value="<?= $h($r['id']) ?>"><button class="danger" name="action" value="delete">Delete</button></form>
      </div>
    </div>
  <?php endforeach; ?>
  <p class="muted" style="margin-top:40px"><a href="../experience.html#reviews">View the public reviews page →</a> · Share the review link: <code><?= $h(site_base_url()) ?>/review.html</code></p>
<?php endif; ?>
</div></body></html>
